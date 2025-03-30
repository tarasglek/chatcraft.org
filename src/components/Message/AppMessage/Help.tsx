import { memo, useMemo } from "react";

import { ChatCraftCommand } from "../../../lib/ChatCraftCommand";
import { ChatCraftCommandRegistry } from "../../../lib/ChatCraftCommandRegistry";
import { ChatCraftAppMessage } from "../../../lib/ChatCraftMessage";
import MessageBase, { type MessageBaseProps } from "../MessageBase";

function getCommandsHelpText(supportedCommands: ChatCraftCommand[]) {
  return `## Commands

  You can use "slash" commands to help accomplish various tasks. Any prompt that begins
  with a "/" (e.g., "/help") will be interpreted as a command that ChatCraft should run.
  Some commands accept arguments as well.

  | Command | Description |
  |-----|------|
  ${supportedCommands.map((command) => `| ${command.helpTitle} | ${command.helpDescription} |`).join("\n")}
  `;
}

function getHelpText(commandsHelpText: string) {
  return `## ChatCraft.org Help

  ChatCraft.org lets you chat with large language models (LLM) from various vendors and
  store your chat history locally in your browser. It has many many [features](https://github.com/tarasglek/chatcraft.org/blob/main/README.md)
  designed to make it easy for software developers to discuss their code with AI and each other.

  ## How to Chat

  You can ask questions, copy/paste code, get help with error messages, etc.

  If you'd like to use your voice instead of typing, press and hold the microphone
  icon, ask your question, and release when done.  Your voice will be transcribed by
  OpenAI and added to the chat as text. You can also cancel an audio recording by
  sliding the icon to the left and releasing.

  ## Examples

  Here are a few examples to get you started:

  ### Example 1: Learning Technologies and Concepts

  > I'm trying to learn React, and a I need a basic intro with some diagrams and links

  You can ask for code examples, links to tutorials, diagrams and more.  You can also
  try copy/pasting some text for a web site and asking for more explanation:

  > I don't understand what this paragraph means, explain it in more simple terms:
  >
  > ...paste the text that you don't understand here...

  ### Example 2: Writing Code with AI

  > Give me a regular expression for working with license plates in the US. I'm working in python.

  When you know what you want to do, but not **how** exactly, talking with AI can help
  you accomplish your task more quickly.

  All code has bugs, even code written by AI.  You'll often need to ask for clarification
  or edit the code yourself to get to your desired end goal.

  ### Example 3: Solving Tasks

  > I need to trim the first 5 seconds from a video. I'm on a Mac and want to use ffmpeg.

  AI is great at helping find the syntax for common problems without wasting time searching
  through documentation.

  ### Example 4: Understanding Code and Errors

  > I'm writing the function below, and when I run it I get an error. What does it mean?
  >
  > \`\`\`
  > ...function...
  > \`\`\`
  >
  > \`\`\`
  > ...text of error message
  > \`\`\`

  When you're stuck on a problem and need "another set of eyes," asking AI to read through
  your code and errors can help you find your bug.

  ## Markdown support

  If you're [comfortable with Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), you can
  use it anywhere in your prompt, and the LLMs will do the same. ChatCraft knows how to render Markdown.

  For example, similar to GitHub, if you [wrap code in triple-backtick code blocks](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks), ChatCraft will
  properly display it for you.  You can also specify the language to use (e.g., typescript):

  \`\`\`typescript
  function greeting(name: string) {
    return "Hello " + name;
  }
  \`\`\`

  You can also use [headings](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#headings), [lists](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#lists), [tables](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables#creating-a-table), [links](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#links),
  etc. to create more readable text.

  ${commandsHelpText}

  ## Functions

  Some models support function calling (e.g, OpenAI models). ChatCraft provides a way
  to write, load, and run these functions using a special syntax. Functions are ES6 Modules
  written in TypeScript.

  To create a function within ChatCraft, use the [/f/new](/f/new) URL, which will create
  a new function and load the editor.

  You can also host your function module somewhere (e.g., [gist.github.com](https:/gist.github.com))
  and have ChatCraft load it dynamically.

  During your chat, you can ask a model to use your function by using the following syntax in your prompt:

  - \`@fn:name\` - use a function called 'name' stored locally within ChatCraft (i.e., written in editor)
  - \`@fn-url:url\` - use a function hosted at the given 'url'. ChatCraft will attempt to load and parse it.

  Functions mentioned in the chat's System Prompt are suggestions for the LLM, whereas a function
  you define in a message is an instruction to use the function.  For example, the following
  prompt will cause the LLM to use the sum function:

  > add 1334134, 1324134, and 135223452 @fn:sum

  If you instead wanted to make the LLM aware of the sum function, and let it choose when to use it,
  customize the System Prompt to include it:

  > - When you need to add numbers, use @fn:sum

  ## Getting More Help

  ChatCraft is still very young and evolving quickly. If you want to talk more about a problem,
  have an idea for a feature, or think you've found a bug, get in touch with us:

  - [GitHub](https://github.com/tarasglek/chatcraft.org)
  - [Discord](https://discord.gg/PE2GWHnR)
  `;
}

interface HelpMessageProps extends MessageBaseProps {
  onlyCommands?: boolean;
  // This property can be used to report the
  // closest matching command in the future
  queriedCommand?: string;
}

function Help(props: HelpMessageProps) {
  const supportedCommands = useMemo(() => {
    return ChatCraftCommandRegistry.getCommands();
  }, []);

  // Override the text of the message
  const isQueriedCommandValid =
    props.onlyCommands && props.queriedCommand && ChatCraftCommand.isCommand(props.queriedCommand);

  const messageText =
    props.onlyCommands && props.queriedCommand?.length && !isQueriedCommandValid
      ? `**"${props.queriedCommand}" is not a valid command!**\n\n${getCommandsHelpText(supportedCommands)}`
      : props.onlyCommands
        ? getCommandsHelpText(supportedCommands)
        : getHelpText(getCommandsHelpText(supportedCommands));

  const message = new ChatCraftAppMessage({
    ...props.message,
    text: messageText,
  });

  return <MessageBase {...props} message={message} />;
}

export default memo(Help);
