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

  // remove style tags
  clonedDocument.head.querySelectorAll("style")?.forEach((x) => x.remove());

  // Set various types of titles/summaries
  setMetaContent(clonedDocument, "property", "og:title", chat.summary);
  setMetaContent(clonedDocument, "name", "description", chat.summary);
  setDocumentTitle(clonedDocument, chat.summary);
  // Set OG bulk text to be that of last message
  if (lastMessageText) {
    setMetaContent(clonedDocument, "property", "og:description", lastMessageText);
  }

  return clonedDocument.documentElement.outerHTML;
}

function setMetaContent(
  document: Document,
  name_or_propery: string,
  property: string,
  content: string
) {
  // First, try to find an existing tag
  let metaElement = document.head.querySelector(`meta[${name_or_propery}='${property}']`);

  // create a new meta tag with the specified property and content
  if (!metaElement) {
    // Try to insert the new tag next to other similar ones
    metaElement = document.createElement("meta");
    // Initially set lastInit to the last child of the head
    let lastNode = document.head.lastChild;
    if (!lastNode) {
      lastNode = document.createTextNode("\n");
      document.head.appendChild(lastNode);
    }
    // Query all existing meta tags in the document head
    const metas = document.head.querySelectorAll(`meta[${name_or_propery}]`);

    if (metas.length > 0) {
      // If there are existing meta tags, update lastInit to the last meta tag
      lastNode = metas[metas.length - 1];
    }

    lastNode.after(document.createTextNode("\n"));
    lastNode.after(metaElement);
    lastNode.after(document.createTextNode("\n"));
  }
  metaElement.setAttribute(name_or_propery, property);
  metaElement.setAttribute("content", content);
}

function setDocumentTitle(document: Document, title: string) {
  let titleElement = document.head.querySelector("title");
  if (!titleElement) {
    titleElement = document.createElement("title");
    document.head.appendChild(titleElement);
    document.head.appendChild(document.createTextNode("\n"));
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
