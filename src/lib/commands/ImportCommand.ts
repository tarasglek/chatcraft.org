import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftHumanMessage } from "../ChatCraftMessage";

// To keep this small, just deal with some common cases vs doing proper parser/list
const guessType = (contentType: string | null) => {
  if (!contentType) {
    return "text";
  }
  contentType = contentType.toLowerCase().trim();

  const typeMap: { [key: string]: string } = {
    "text/html": "html",
    "text/javascript": "javascript",
    "application/javascript": "javascript",
    "application/xml": "xml",
    "application/atom+xml": "xml",
    "application/rss+xml": "xml",
    "application/json": "json",
    "text/css": "css",
    "text/markdown": "markdown",
    "text/yaml": "yaml",
    "text/x-python": "python",
  };

  for (const key in typeMap) {
    if (contentType.startsWith(key)) {
      return typeMap[key];
    }
  }

  return "text";
};

export class ImportCommand extends ChatCraftCommand {
  constructor() {
    super("import", {
      helpTitle: "/import <url>",
      helpDescription:
        "	Loads the provided URL and imports the text. Where possible, ChatCraft will try to get raw text vs. HTML from sites like GitHub. NOTE: to prevent abuse, you must be logged into use the import command.",
    });
  }

  async execute(chat: ChatCraftChat, user: User | undefined, args?: string[]) {
    if (!user) {
      throw new Error("you must be logged-in before you can use the /import command");
    }

    if (!(args && args[0])) {
      throw new Error("must include a URL in command arguments");
    }

    const [url] = args;

    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      throw new Error(`Unable to proxy request for URL: ${res.statusText}`);
    }

    const type = guessType(res.headers.get("Content-Type"));
    const content = (await res.text()).trim();

    const command = `**Command**: import [${url}](${url})`;
    const text =
      `${command}\n\n` +
      // If it's already markdown, dump it into the message as is;
      // otherwise, wrap it in a code block with appropriate type
      (type === "markdown" ? content : `\`\`\`${type}\n${content}` + `\n\`\`\``);

    return chat.addMessage(new ChatCraftHumanMessage({ user, text }));
  }
}
