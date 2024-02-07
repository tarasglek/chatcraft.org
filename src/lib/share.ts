import { ChatCraftChat, SerializedChatCraftChat } from "./ChatCraftChat";
import * as yaml from "yaml";

export function createShareUrl(chat: ChatCraftChat, user: User) {
  // Create a share URL we can give to other people
  const { origin } = new URL(location.href);
  const shareUrl = new URL(`/c/${user.username}/${chat.id}`, origin);

  return shareUrl.href;
}

/**
 * Generate static html with our messages in yaml form so they can both be parsed by us and by scrapers/browsers/etc
 * Uses our index.html as a base
 * @param chat Chatcraft chat
 * @returns sane-looking html
 */
function generateSharingHTML(chat: ChatCraftChat) {
  // clone document. Then find <main> element and empty it, then console log it
  const cloned = document.cloneNode(true);

  // Ensure the cloned node is treated as a Document
  const clonedDocument = cloned instanceof Document ? cloned : null;

  // Find the <main> element in the cloned document
  const mainElement = clonedDocument?.querySelector("main");

  // Check if the main element exists to avoid errors
  if (!clonedDocument || !mainElement) {
    throw new Error("index.html changed without updating this code!");
  }
  // Empty the <main> element
  mainElement.innerHTML = "";
  // put chat in there as yaml so it's accessible to both us and search engines
  mainElement.textContent = yaml.stringify(chat.toJSON());

  const lastMessage = chat.messages().pop();
  const lastMessageText = lastMessage?.text;

  // Remove existing OG tags
  const existingOgTags = clonedDocument.head.querySelectorAll("meta[property^='og:']");
  existingOgTags.forEach((tag) => tag.remove());

  // create OG structure with lastMessageText
  const ogTitle = document.createElement("meta");
  ogTitle.setAttribute("property", "og:title");
  ogTitle.setAttribute("content", chat.summary);
  clonedDocument.head.appendChild(ogTitle);

  if (lastMessageText) {
    const ogDescription = document.createElement("meta");
    ogDescription.setAttribute("property", "og:description");
    ogDescription.setAttribute("content", lastMessageText);
    clonedDocument.head.appendChild(ogDescription);
  }

  // Console log the modified cloned document
  return clonedDocument.documentElement.outerHTML;
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
  // We don't need to send credentials for this request
  const res = await fetch(`/api/share/${user}/${id}`);
  if (!res.ok) {
    throw new Error("Unable to load shared chat" + (await res.json()).message);
  }

  const serialized: SerializedChatCraftChat = await res.json();
  return ChatCraftChat.fromJSON(serialized);
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
