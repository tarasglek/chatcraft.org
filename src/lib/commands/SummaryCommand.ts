import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage, ChatCraftSystemMessage } from "../ChatCraftMessage";
import { chatWithLLM } from "../ai";

export class SummaryCommand extends ChatCraftCommand {
  constructor() {
    super("summary", {
      helpTitle: "/summary [max-length]",
      helpDescription:
        "Uses ChatGPT to create a summary of the current chat. Optionally takes a maximum word length (defaults to 500).",
    });
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    const wordCount = Number(args?.[0]) ?? 500;

    const systemChatMessage = new ChatCraftSystemMessage({
      text: `You are an expert at summarizing chat history. You respond ONLY with the summary text and focus on the main content of the chat, NEVER mentioning the process, participants, and DON'T refer to "the chat"; that is, give a content summary and not a statement like "The chat involved..."`,
    });

    const summarizeInstruction = new ChatCraftHumanMessage({
      text: `Summarize in ${wordCount} words or fewer.`,
    });

    const messages = chat.messages({ includeAppMessages: false, includeSystemMessages: false });

    return chatWithLLM([systemChatMessage, ...messages, summarizeInstruction]).promise.then(
      (message) => {
        const command = `**Command**: summary`;
        const text = `${command}\n\n${message.text}`;
        chat.addMessage(new ChatCraftHumanMessage({ user, text }));
      }
    );
  }
}
