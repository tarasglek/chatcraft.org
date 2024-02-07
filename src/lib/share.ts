import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";
import * as yaml from "yaml";

export function createShareUrl(chat: ChatCraftChat, user: User) {
  // Create a share URL we can give to other people
  const { origin } = new URL(location.href);
  const shareUrl = new URL(`/api/share/${user.username}/${chat.id}`, origin);

  return shareUrl.href;
}

/**
 * Generate static html with our messages in yaml form so they can both be parsed by us and by scrapers/browsers/etc
 * Uses our index.html as a base
 * @param chat Chatcraft chat
 * @returns sane-looking html
 */
function generateSharingHTML(chat: ChatCraftChat) {
  const cloned = document.cloneNode(true);
  const clonedDocument = cloned instanceof Document ? cloned : null;
  const mainElement = clonedDocument?.querySelector("main");

  if (!clonedDocument || !mainElement) {
    throw new Error("index.html changed without updating this code!");
  }

  mainElement.innerHTML = "";
  // Use html-escaped yaml for payload
  mainElement.textContent = yaml.stringify(chat.toJSON());

  const lastMessage = chat.messages().pop();
  const lastMessageText = lastMessage?.text;

  // remove style
  clonedDocument.head.querySelector("style")?.remove();

  // Set various types of titles/summaries
  setMetaContent(clonedDocument, "og:title", chat.summary);
  setMetaContent(clonedDocument, "description", chat.summary);
  setDocumentTitle(clonedDocument, chat.summary);
  // Set OG bulk text to be that of last message
  if (lastMessageText) {
    setMetaContent(clonedDocument, "og:description", lastMessageText);
  }

  return clonedDocument.documentElement.outerHTML;
}

function setMetaContent(document: Document, property: string, content: string) {
  // First, try to find an existing tag with the same property and remove it
  document.head.querySelector(`meta[property='${property}']`)?.remove();

  // Then, create a new meta tag with the specified property and content
  const metaTag = document.createElement("meta");
  metaTag.setAttribute("property", property);
  metaTag.setAttribute("content", content);
  document.head.prepend(metaTag);
}

function setDocumentTitle(document: Document, title: string) {
  let titleElement = document.head.querySelector("title");
  if (!titleElement) {
    titleElement = document.createElement("title");
    document.head.prepend(titleElement);
  }
  titleElement.textContent = title;
}

export async function createShare(chat: ChatCraftChat, user: User) {
  const res = await fetch(`/api/share/${user.username}/${chat.id}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "text/html",
    },
    body: generateSharingHTML(chat),
  });

  if (!res.ok) {
    const {
      message,
    }: {
      message?: string;
    } = await res.json();
    throw new Error(`Unable to share chat: ${message || "unknown error"}`);
  }
}

export async function loadShare(user: string, id: string) {
  const res = await fetch(`/api/share/${user}/${id}`);
  if (!res.ok) {
    throw new Error("Unable to load shared chat" + (await res.text()));
  }

  const text = await res.text();

  try {
    // Try to parse the response as JSON
    const serialized: SerializedChatCraftChat = JSON.parse(text);
    return ChatCraftChat.fromJSON(serialized);
  } catch (error) {
    // If JSON parsing fails, try to parse as HTML with embedded yaml
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const yamlText = doc.querySelector("main")?.textContent;
  if (!yamlText) {
    throw new Error("No shared found in the shared html");
  }
  const parsedYaml = yaml.parse(yamlText);
  return ChatCraftChat.fromJSON(parsedYaml); // Assuming fromJSON can handle YAML parsed object
}

export async function deleteShare(user: User, chatId: string) {
  const res = await fetch(`/api/share/${user.username}/${chatId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!res.ok) {
    const {
      message,
    }: {
      message?: string;
    } = await res.json();
    throw new Error(`Unable to unshare chat: ${message || "unknown error"}`);
  }
}
