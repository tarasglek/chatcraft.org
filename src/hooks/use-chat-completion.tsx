import { ChatCraftFunctionCallMessage, ChatCraftHumanMessage } from "../lib/ChatCraftMessage";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";
import { ChatCraftCommand } from "../lib/ChatCraftCommand";
import { WebHandler } from "../lib/WebHandler";
import { ChatCraftCommandRegistry } from "../lib/commands";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { useAlert } from "../hooks/use-alert";
import useChatOpenAI from "./use-chat-openai";
import { ChatCompletionError } from "../lib/ai";
import { useUser } from "../hooks/use-user";
import { useSettings } from "./use-settings";

function useChatCompletion() {
  const { error } = useAlert();
  const { callChatApi } = useChatOpenAI();
  const { user } = useUser();
  const { settings } = useSettings();

  const chatCompletion = async (prompt: string = "", chat: ChatCraftChat, imageUrls?: string[]) => {
    if (!chat) {
      throw new Error("Chat is not defined");
    }
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
          await chatCompletion(prompt, chat, imageUrls);
        }
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
    }
  };

  return { chatCompletion };
}

export default useChatCompletion;
