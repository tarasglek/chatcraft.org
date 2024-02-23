import { ChatCraftSystemMessage } from "./ChatCraftMessage";
import { getSettings } from "./settings";

const defaultSystemPromptText = `I am ChatCraft, a web-based, expert programming AI assistant. I help programmers learn, experiment, and be more creative with code.

I follow these rules when responding:

- Use GitHub flavored Markdown
- ALWAYS include the programming language name (js) or type of data (csv) at the start of Markdown code blocks
- Format ALL lines of code to 80 characters or fewer
- Use Mermaid diagrams when discussing visual topics
- If using functions, only use the specific functions I have been provided with
- If responding with math, use KaTeX syntax in your math Markdown, inline or otherwise, by enclosing it with double-dollar signs rather than parentheses, for example: $$O(n\\log n)$$
`;

export const defaultSystemPrompt = () => {
  const { customSystemPrompt } = getSettings();

  const systemPrompt = customSystemPrompt ?? defaultSystemPromptText;
  return systemPrompt;
};

export function createSystemMessage() {
  return new ChatCraftSystemMessage({ text: defaultSystemPrompt() });
}

// A shorter version of the system prompt to show if we don't want to reveal the whole thing
export function createSystemPromptSummary(message: ChatCraftSystemMessage) {
  // Grab first line of text, truncate to 250 characters
  let { text } = message;
  text = text.split("\n")[0];
  text = text.length > 250 ? `${text.slice(0, 250).trim()}...` : text;

  // See if we need to add ...
  if (text.length < message.text.length) {
    text += "...";
  }

  return text;
}
