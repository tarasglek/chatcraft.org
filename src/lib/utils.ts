import { ChatCraftMessage } from "./ChatCraftMessage";

export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();

export const formatNumber = (n: number) => n.toLocaleString();

export const formatCurrency = (n: number) =>
  Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

let current = Date.now();
export const unique = () => String(current++);

export function download(text: string, filename: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.setAttribute("download", filename);
  anchor.setAttribute("href", url);
  anchor.click();
}

// Turn the messages into Markdown, with each message separated with an hr
export const messagesToMarkdown = (messages: ChatCraftMessage[]) =>
  messages.map((message) => message.text).join("\n\n---\n\n");
