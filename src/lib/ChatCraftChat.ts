import { nanoid } from "nanoid";
import * as yaml from "yaml";

import {
  ChatCraftAiMessage,
  ChatCraftAppMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftHumanMessage,
  ChatCraftMessage,
  ChatCraftSystemMessage,
  type SerializedChatCraftMessage,
} from "./ChatCraftMessage";
import db, {
  ChatCraftFileTable,
  FileRef,
  isFileRef,
  type ChatCraftChatTable,
  type ChatCraftMessageTable,
} from "./db";
import summarize from "./summarize";
import { createSystemMessage } from "./system-prompt";
import { createDataShareUrl, createShare } from "./share";
import { SharedChatCraftChat } from "./SharedChatCraftChat";
import { ChatCompletionError, countTokensInMessages } from "./ai";
import { parseFunctionNames, loadFunctions, ChatCraftFunction } from "./ChatCraftFunction";
import { ChatCraftFile } from "./ChatCraftFile";
import { ChatCraftCommand } from "./ChatCraftCommand";
import { WebHandler } from "../lib/WebHandler";
import { ChatCraftCommandRegistry } from "../lib/commands";

export type SerializedChatCraftChat = {
  id: string;
  date: string;
  summary?: string;
  messages: SerializedChatCraftMessage[];
};
function createSummary(chat: ChatCraftChat, maxLength = 200) {
  // We only want to consider human prompts and ai responses for our summary
  const messages = chat
    .messages({ includeAppMessages: false, includeSystemMessages: false })
    .map((message) => message.text);
  if (messages.length > 1) {
    // remove last message as it will get summarized in OG
    messages.pop();
  }
  const markdown = messages.join("\n\n");

  const summary = summarize(markdown);
  return summary.length > maxLength ? summary.slice(0, maxLength) + "..." : summary;
}

// We store both the fileRef and file object in files
type FileRefWithFile = { ref: FileRef; file: ChatCraftFile };

export class ChatCraftChat {
  id: string;
  readonly: boolean;
  date: Date;
  private _summary?: string;
  private _messages: ChatCraftMessage[];
  // For files associated with a chat, we store both the hydrated ChatCraftFile objects (i.e., `files`)
  // and also the actual FileRefs (`fileRefs`) that are part of the chat's database record. The filenames
  // we use come from the fileRefs.
  private _files?: Map<string, FileRefWithFile>;

  constructor({
    id,
    date,
    summary,
    messages,
    files,
    fileRefs,
    readonly,
  }: {
    id?: string;
    date?: Date;
    summary?: string;
    messages?: ChatCraftMessage[];
    files?: ChatCraftFile[];
    fileRefs?: FileRef[];
    readonly?: boolean;
  } = {}) {
    this.id = id ?? nanoid();
    this._messages = messages ?? [createSystemMessage()];
    this.date = date ?? new Date();
    // If the user provides a summary, use it, otherwise we'll generate something
    this._summary = summary;
    // When we load a chat remotely (from JSON vs. DB) readonly=true
    this.readonly = readonly === true;

    // Validate and initialize files
    if (files || fileRefs) {
      if (!files || !fileRefs) {
        throw new Error("Both files and fileRefs must be provided together");
      }
      const fileIds = new Set(files.map((f) => f.id));
      const refIds = new Set(fileRefs.map((r) => r.id));
      const _files = new Map();

      files.forEach((file) => {
        const ref = fileRefs.find((r) => r.id === file.id);
        if (ref) {
          _files.set(file.id, { file, ref });
        }
      });

      // Log any mismatches
      const missingFiles = [...refIds].filter((id) => !fileIds.has(id));
      if (missingFiles.length) {
        console.warn(`Missing files for refs: ${missingFiles.join(", ")}`);
      }

      this._files = _files;
    }
  }

  /**
   * Helper for safely getting a value from `files` Map.
   */
  private getFileValues<T>(mapper: (f: FileRefWithFile) => T): T[] {
    return Array.from(this._files?.values() ?? []).map(mapper);
  }

  async completion(
    prompt: string,
    chat: ChatCraftChat,
    user: any,
    settings: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    clearAudioQueue: Function,
    callChatApi: Function,
    forceScroll: Function,
    error: Function,
    imageUrls?: string[]
  ) {
    // Special-case for "help", to invoke /help command
    if (prompt?.toLowerCase() === "help") {
      prompt = "/help";
    }
    // If we have a web handler registered for this url
    const handler = WebHandler.getMatchingHandler(prompt ?? "");

    if (prompt && handler) {
      try {
        const result = await handler.executeHandler(prompt);

        chat.addMessage(new ChatCraftHumanMessage({ user, text: result }));
        forceScroll();
      } catch (err: any) {
        error({
          title: "Error running Web Handler",
          message: err.message,
        });
      }
      return;
    }
    // If this is a slash command, execute that instead of prompting LLM
    if (prompt && ChatCraftCommandRegistry.isCommand(prompt)) {
      const commandFunction = ChatCraftCommandRegistry.getCommand(prompt);

      if (commandFunction) {
        try {
          await commandFunction(chat, user);
          forceScroll();
        } catch (err: any) {
          error({
            title: `Error Running Command`,
            message: `There was an error running the command: ${err.message}.`,
          });
        }
      } else {
        // The input was a command, but not a recognized one.
        // Handle this case as appropriate for your application.

        // We are sure that this won't return null
        // since prompt is definitely a command
        const { command } = ChatCraftCommand.parseCommand(prompt)!;
        const commandFunction = ChatCraftCommandRegistry.getCommand(`/commands ${command}`)!;
        try {
          await commandFunction(chat, user);
          forceScroll();
        } catch (err: any) {
          error({
            title: `Error Running Command`,
            message: `There was an error running the command: ${err.message}.`,
          });
        }
      }
      return;
    }
    try {
      let promptMessage: ChatCraftHumanMessage | undefined;
      if (prompt) {
        // Add this prompt message to the chat
        promptMessage = new ChatCraftHumanMessage({ text: prompt, imageUrls, user });
        await chat.addMessage(promptMessage);
      } else if (imageUrls?.length) {
        // Add only image to the chat
        promptMessage = new ChatCraftHumanMessage({ text: "", imageUrls, user });
        await chat.addMessage(promptMessage);
      }

      // If there's any problem loading referenced functions, show an error
      const onError = (err: Error) => {
        error({
          title: `Error Loading Function`,
          message: err.message,
        });
      };

      // If there are any functions mentioned in the chat (via @fn or @fn-url),
      // pass those through to the LLM to use if necessary.
      const functions = await chat.functions(onError);

      // If the user has specified a single function in this prompt, ask LLM to call it.
      let functionToCall: ChatCraftFunction | undefined;
      if (promptMessage && functions) {
        const messageFunctions = await promptMessage.functions(onError);
        if (messageFunctions?.length === 1) {
          functionToCall = messageFunctions[0];
        }
      }

      // NOTE: we strip out the ChatCraft App messages before sending to OpenAI.
      const messages = chat.messages({ includeAppMessages: false });

      // Clear any previous audio clips
      clearAudioQueue();

      const response = await callChatApi(messages, {
        functions,
        functionToCall,
      });

      // Add this response message to the chat
      await chat.addMessage(response);

      // If it's a function call message, invoke the function
      if (response instanceof ChatCraftFunctionCallMessage) {
        const func = await ChatCraftFunction.find(response.func.id);
        if (!func) {
          error({
            title: `Function Error`,
            message: `No such function: ${response.func.name} (${response.func.id}`,
          });
          return;
        }

        const result = await func.invoke(response.func.params);
        // Add this result message to the chat
        await chat.addMessage(result);

        // If the user has opted to always send function results back to LLM, do it now
        if (settings.alwaysSendFunctionResult) {
          await chat.completion(
            prompt ?? "",
            chat,
            user,
            settings,
            clearAudioQueue,
            callChatApi,
            forceScroll,
            error
          );
        }

        forceScroll();
      }
    } catch (err: any) {
      if (err instanceof ChatCompletionError && err.incompleteResponse) {
        // Add this partial response to the chat
        await chat.addMessage(err.incompleteResponse);
      }

      error({
        title: `Response Error`,
        message: err.message,
      });
      console.error(err);
    }
  }

  /**
   * We store all message types, but they can be requested with or
   * without the ChatCraftAppMessages and ChatCraftSystemMessages. For
   * display and db, requesting with app messages is correct
   * (`chat.messages({ includeAppMessages: true })`. For serialization
   * or sending to an LLM, use `chat.messages({ includeAppMessages: false })`.
   */
  messages(
    options: {
      includeAppMessages?: boolean;
      includeSystemMessages?: boolean;
      includeHumanMessages?: boolean;
      includeAiMessages?: boolean;
    } = {}
  ) {
    const defaultOptions = {
      includeAppMessages: true,
      includeSystemMessages: true,
      includeHumanMessages: true,
      includeAiMessages: true,
    };
    const selectedOptions = { ...defaultOptions, ...options };

    const includeAppMessages = selectedOptions.includeAppMessages === true;
    const includeSystemMessages = selectedOptions.includeSystemMessages === true;
    const includeHumanMessages = selectedOptions.includeHumanMessages === true;
    const includeAiMessages = selectedOptions.includeAiMessages === true;

    return this._messages.filter((message) => {
      if (!includeAppMessages && message instanceof ChatCraftAppMessage) {
        return false;
      }
      if (!includeSystemMessages && message instanceof ChatCraftSystemMessage) {
        return false;
      }
      if (!includeHumanMessages && message instanceof ChatCraftHumanMessage) {
        return false;
      }
      if (!includeAiMessages && message instanceof ChatCraftAiMessage) {
        return false;
      }

      return true;
    });
  }

  files() {
    return this.getFileValues((f) => f.file);
  }

  // Get a list of functions mentioned via @fn or fn-url from db or remote servers
  async functions(onError?: (err: Error) => void) {
    // We scan the entire set of human and system messages in the chat for functions
    const humanAndSystemMessages = this.messages({
      includeAppMessages: false,
      includeAiMessages: false,
    });

    // Extract all unique function names/urls from the messages
    const fnNames: Set<string> = new Set();
    for (const message of humanAndSystemMessages) {
      parseFunctionNames(message.text).forEach((fnName) => fnNames.add(fnName));
    }

    // Load all functions by name/url into ChatCraftFunction objects
    return loadFunctions([...fnNames], onError);
  }

  async tokens() {
    const messages = this.messages({
      includeAppMessages: false,
      includeSystemMessages: true,
    });
    return countTokensInMessages(messages);
  }

  get summary() {
    return this._summary || createSummary(this);
  }

  set summary(summary: string) {
    this._summary = summary;
  }

  async addMessage(message: ChatCraftMessage) {
    if (this.readonly) {
      return;
    }

    this._messages = [...this._messages, message];
    return this.save();
  }

  async removeMessage(id: string) {
    if (this.readonly) {
      return;
    }

    await ChatCraftMessage.delete(id);
    this._messages = this._messages.filter((message) => message.id !== id);
    return this.save();
  }

  async addFile(file: ChatCraftFile, name?: string) {
    if (this.readonly) {
      return;
    }

    // Validate the name
    const fileName = (name || file.name).trim();
    if (!fileName) {
      throw new Error("File name is required");
    }

    this._files = this._files ?? new Map();
    this._files.set(file.id, { file, ref: { id: file.id, name: fileName } });

    return this.save();
  }

  async removeFile(fileOrfileId: ChatCraftFile | string) {
    if (this.readonly) {
      return;
    }

    const id = typeof fileOrfileId === "string" ? fileOrfileId : fileOrfileId.id;

    if (!this._files?.has(id)) {
      throw new Error(`No file found with id ${id}`);
    }

    this._files.delete(id);
    return this.save();
  }

  async renameFile(fileOrFileId: ChatCraftFile | string, newName: string) {
    if (this.readonly) {
      return;
    }

    const id = typeof fileOrFileId === "string" ? fileOrFileId : fileOrFileId.id;
    newName = newName.trim();
    if (!newName) {
      throw new Error("File name is required");
    }

    if (!this._files?.has(id)) {
      throw new Error(`No file found with id ${id}`);
    }

    const fileData = this._files.get(id)!;
    this._files.set(id, {
      ...fileData,
      ref: { ...fileData.ref, name: newName },
    });

    return this.save();
  }

  // Remove all messages in the chat *before* the message with the given id,
  // keeping only the system message.
  async removeMessagesBefore(id: string) {
    if (this.readonly) {
      return;
    }

    const anchorIndex = this._messages.findIndex((m) => m.id === id);
    if (anchorIndex === -1) {
      console.warn(`No such message at id ${id} in current chat, unable to delete messages`);
      return;
    }

    let messagesToDelete = this._messages.slice(0, anchorIndex);
    // See if we need to keep the first message (i.e., if it's a system message)
    if (messagesToDelete[0] instanceof ChatCraftSystemMessage) {
      messagesToDelete = messagesToDelete.slice(1);
    }

    // Remove these messages from db
    const idsToDelete = messagesToDelete.map((m) => m.id);
    await db.messages.bulkDelete(idsToDelete);

    // Remove these messages from chat and save
    this._messages = this._messages.filter((m) => !idsToDelete.includes(m.id));
    return this.save();
  }

  // Remove all messages in the chat *after* the message with the given id
  async removeMessagesAfter(id: string) {
    if (this.readonly) {
      return;
    }

    const anchorIndex = this._messages.findIndex((m) => m.id === id);
    if (anchorIndex === -1) {
      console.warn(`No such message at id ${id} in current chat, unable to delete messages`);
      return;
    }

    const messagesToDelete = this._messages.slice(anchorIndex + 1);

    // Remove these messages from db
    const idsToDelete = messagesToDelete.map((m) => m.id);
    await db.messages.bulkDelete(idsToDelete);

    // Remove these messages from chat and save
    this._messages = this._messages.filter((m) => !idsToDelete.includes(m.id));
    return this.save();
  }

  async resetMessages() {
    if (this.readonly) {
      return;
    }

    // Delete existing messages from db
    await db.messages.bulkDelete(this._messages.map(({ id }) => id));
    // Make a new set of messages
    this._messages = [createSystemMessage()];
    // Update the db
    return this.save();
  }

  toMarkdown() {
    // Turn the messages into Markdown, with each message separated with an <hr />
    // Strip out the app messages.
    return this.messages({ includeAppMessages: false })
      .map((message) => message.text)
      .join("\n\n---\n\n");
  }

  // Find in db - return
  static async find(id: string) {
    // Get the chat itself
    const chat = await db.chats.get(id);
    if (!chat) {
      return;
    }

    // Rehydrate the messages from their IDs
    const messages = await db.messages.bulkGet(chat.messageIds);

    // Rehydrate the files from their IDs and use the filenames in the chat's fileRefs
    const { fileRefs } = chat;
    if (fileRefs?.length) {
      const files = await db.files.bulkGet(fileRefs.map((ref) => ref.id));
      // Update the filenames, based on the fileRefs, skipping any that don't have a matching file
      const validFiles = files
        .filter((file): file is ChatCraftFileTable => !!file)
        .map((file) => {
          const fileRef = fileRefs.find((ref) => ref.id === file.id);
          if (!fileRef) {
            // No matching fileRef for this file, skip it
            return;
          }

          // Use the fileRef's name vs. the original file name
          const chatFile = ChatCraftFile.fromDB(file);
          Object.defineProperty(chatFile, "name", {
            value: fileRef.name,
            writable: false,
          });
          return chatFile;
        })
        .filter((file): file is ChatCraftFile => !!file);

      return ChatCraftChat.fromDB(chat, messages, validFiles);
    }

    return ChatCraftChat.fromDB(chat, messages);
  }

  // Save to db
  async save() {
    if (this.readonly) {
      return;
    }

    const chatId = this.id;
    // Update the date to indicate we've update the chat
    this.date = new Date();

    await db.transaction("rw", db.chats, db.messages, async () => {
      // Upsert Messages in Chat first
      await db.messages.bulkPut(this._messages.map((message) => message.toDB(chatId)));

      // Upsert Chat itself
      await db.chats.put(this.toDB());
    });
  }

  // Create a new chat based on the messages in this one
  async fork(messageId?: string) {
    // Skip the app message
    let messages = this.messages({ includeAppMessages: false, includeSystemMessages: true });
    if (messageId) {
      const idx = messages.findIndex((message) => message.id === messageId);
      if (idx) {
        messages = messages.slice(0, idx + 1);
      }
    }

    const chat = new ChatCraftChat({
      messages: messages.map((message) => message.clone()),
      files: this.getFileValues((f) => f.file),
      fileRefs: this.getFileValues((f) => f.ref),
      summary: this.summary,
    });
    await chat.save();
    return chat;
  }

  clone() {
    // Generate a new `id` and `date` in the constructor
    return new ChatCraftChat({
      summary: this.summary,
      messages: this._messages,
      readonly: this.readonly,
      files: this.getFileValues((f) => f.file),
      fileRefs: this.getFileValues((f) => f.ref),
    });
  }

  toOpenAiFormat(model: string): { messages: { role: string; content: string }[]; model: string } {
    return {
      messages: this._messages.map((message) => ({ role: message.type, content: message.text })),
      model,
    };
  }

  toJSON(): SerializedChatCraftChat {
    return {
      id: this.id,
      date: this.date.toISOString(),
      summary: this.summary,
      // In JSON, we strip out the app messages
      messages: this.messages({ includeAppMessages: false, includeSystemMessages: true }).map(
        (message) => message.toJSON()
      ),
      // We don't attempt to serialize files in JSON
    };
  }

  toYAML(): string {
    return yaml.stringify(this.toJSON());
  }

  toDB(): ChatCraftChatTable {
    return {
      id: this.id,
      date: this.date,
      summary: this.summary,
      // In the DB, we store the app messages, since that's what we show in the UI
      messageIds: this._messages.map(({ id }) => id),
      // In the DB, we store only the fileRefs associated with a chat
      fileRefs: this.getFileValues((f) => f.ref),
    };
  }

  async share(user: User, summary?: string) {
    // Because shared chats are immutable, we'll give this chat its own
    // unique `id`, separate to the current one.
    const cloned = this.clone();
    // If we get a new summary, use that
    if (summary) {
      cloned.summary = summary;
    }

    // Generate a public share URL
    const shareUrl = createDataShareUrl(cloned, user);
    await createShare(cloned, user);

    const shared = new SharedChatCraftChat({
      id: cloned.id,
      url: shareUrl,
      date: cloned.date,
      summary: cloned.summary,
      chat: cloned,
      // We don't include the files
    });

    // Cache this locally in our db as well
    await db.shared.add(shared.toDB());

    return shared;
  }

  async shareSingleMessage(user: User, messageId: string) {
    // Find the message to be shared
    const messageToShare = this._messages.find((message) => message.id === messageId);
    if (!messageToShare) {
      throw new Error("Message not found");
    }

    // Clone the chat but only include the specified message
    const clonedChatWithSingleMessage = new ChatCraftChat({
      messages: [messageToShare],
      summary: this.summary, // You might want to adjust the summary for the shared content
    });

    // Use the existing sharing logic to share the cloned chat
    const shareUrl = createDataShareUrl(clonedChatWithSingleMessage, user);
    await createShare(clonedChatWithSingleMessage, user);

    const shared = new SharedChatCraftChat({
      id: clonedChatWithSingleMessage.id,
      url: shareUrl,
      date: clonedChatWithSingleMessage.date,
      summary: clonedChatWithSingleMessage.summary,
      chat: clonedChatWithSingleMessage,
    });

    // Cache this locally in your db as well
    await db.shared.add(shared.toDB());

    return shared;
  }

  static async delete(id: string) {
    return db
      .transaction("rw", [db.chats, db.messages, db.files], async () => {
        // Lock the chat record first
        const chat = await db.chats.get(id);
        if (!chat?.fileRefs?.every(isFileRef)) {
          throw new Error("Missing or invalid chat");
        }

        // Get all data we need to process while holding locks
        const messageIds = chat.messageIds;
        const fileRefs = chat.fileRefs ?? [];

        // Delete the chat first to prevent new references
        await db.chats.delete(id);

        // Delete all messages
        await db.messages.bulkDelete(messageIds);

        // Handle orphaned files
        for (const fileRef of fileRefs) {
          // Count remaining references to this file
          const remainingRefs = await db.chats
            .filter(
              (c) => Array.isArray(c.fileRefs) && c.fileRefs.some((ref) => ref.id === fileRef.id)
            )
            .count();

          // If no more references, delete the associated file
          if (remainingRefs === 0) {
            await db.files.delete(fileRef.id);
          }
        }
      })
      .catch((error) => {
        console.error("Failed to delete chat:", error);
        throw new Error(`Failed to delete chat ${id}. Some data may be in an inconsistent state.`);
      });
  }

  // Parse from serialized JSON
  static fromJSON({ id, date, summary, messages }: SerializedChatCraftChat): ChatCraftChat {
    return new ChatCraftChat({
      id,
      date: new Date(date),
      summary,
      messages: messages.map((message) => ChatCraftMessage.fromJSON(message)),
      // We can't modify a chat loaded outside the db
      readonly: true,
      // We don't attempt to deserialize files in JSON
    });
  }

  static fromYAML(str: string): ChatCraftChat {
    return ChatCraftChat.fromJSON(yaml.parse(str));
  }

  // Parse from db representation, where chat and messages are separate.
  // Assumes all messages have already been obtained for messageIds, but
  // deals with any that are missing (undefined). The files are stored
  // as FileRefs (id and name only)
  static fromDB(
    chat: ChatCraftChatTable,
    messages: (ChatCraftMessageTable | undefined)[],
    files?: (ChatCraftFileTable | undefined)[]
  ) {
    // Create arrays of files and fileRefs that we'll pass to the constructor
    const hydratedFiles: ChatCraftFile[] = [];
    const validFileRefs: FileRef[] = [];

    // Only create FileRefs for files that actually exist
    if (files?.length && chat.fileRefs?.length) {
      files
        .filter((file): file is ChatCraftFileTable => !!file)
        .forEach((file) => {
          const fileRef = chat.fileRefs?.find((ref) => ref.id === file.id);
          if (fileRef) {
            const chatFile = ChatCraftFile.fromDB(file);
            Object.defineProperty(chatFile, "name", {
              value: fileRef.name,
              writable: false,
            });
            hydratedFiles.push(chatFile);
            validFileRefs.push(fileRef);
          }
        });
    }

    return new ChatCraftChat({
      ...chat,
      messages: messages
        .filter((message): message is ChatCraftMessageTable => !!message)
        .map((message) => ChatCraftMessage.fromDB(message)),
      files: hydratedFiles,
      fileRefs: validFileRefs,
    });
  }
}
