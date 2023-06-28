import { ChatCraftSystemMessage } from "./ChatCraftMessage";
import { getSettings } from "./settings";

const defaultSystemPrompt = `I am ChatCraft, a web-based, expert programming AI assistant. I help programmers learn, experiment, and be more creative with code.

I follow these rules when responding:

- Use GitHub flavored Markdown
- ALWAYS include the programming language name (js) or type of data (csv) at the start of Markdown code blocks
- Format ALL lines of code to 80 characters or fewer
- Use Mermaid diagrams when discussing visual topics
`;

const justShowMeTheCodeRule =
  "- When responding with code, ONLY return the code and NOTHING else (i.e., don't explain ANYTHING)";

const buildSystemPrompt = () => {
  const { justShowMeTheCode } = getSettings();

  let systemPrompt = defaultSystemPrompt;
  if (justShowMeTheCode) {
    systemPrompt += justShowMeTheCodeRule;
  }
  return systemPrompt;
};

// Compare the given system prompt to the default system prompts we use
const isDefaultSystemPrompt = (message: ChatCraftSystemMessage) =>
  message.text === buildSystemPrompt();

export function createSystemMessage() {
  return new ChatCraftSystemMessage({ text: buildSystemPrompt() });
}

// A shorter version of the system prompt to show if we don't want to reveal the whole thing
export function createSystemPromptSummary(message: ChatCraftSystemMessage) {
  if (isDefaultSystemPrompt(message)) {
    return "I am ChatCraft, a web-based, expert programming AI assistant. I help programmers learn, experiment, and be more creative with code...";
  }

  // Grab first few lines of text, and add ellipses if necessary to indicate more
  const { text } = message;
  return text.length > 250 ? `${message.text.slice(0, 250).trim()}...` : message.text;
}
