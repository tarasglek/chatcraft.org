import { ChatCraftChat } from "./ChatCraftChat";

type ShareResponse = {
  message: string;
  url: string;
  id: string;
};

export async function createShare(user: User, token: string, chat: ChatCraftChat) {
  const res = await fetch(`/api/share/${user.username}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(chat.serialize()),
  });

  const { message, id, url }: ShareResponse = await res.json();

  if (!res.ok) {
    throw new Error(`Unable to share chat: ${message || "unknown error"}`);
  }

  return { id, url };
}
