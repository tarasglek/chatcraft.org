import db, { SharedChatCraftChatTable } from "./db";
import { ChatCraftChat } from "./ChatCraftChat";
import { deleteShare } from "./share";

export class SharedChatCraftChat {
  id: string;
  url: string;
  date: Date;
  summary: string;
  chat: ChatCraftChat;

  constructor({
    id,
    url,
    date,
    summary,
    chat,
  }: {
    id: string;
    url: string;
    date: Date;
    summary: string;
    chat: ChatCraftChat;
  }) {
    this.id = id;
    this.url = url;
    this.date = date;
    this.summary = summary;
    this.chat = chat;
  }

  toDB(): SharedChatCraftChatTable {
    return {
      id: this.id,
      url: this.url,
      date: this.date,
      summary: this.summary,
      chat: this.chat.serialize(),
    };
  }

  static fromDB(shared: SharedChatCraftChatTable) {
    return new SharedChatCraftChat({ ...shared, chat: ChatCraftChat.fromJSON(shared.chat) });
  }

  static async delete(user: User, id: string) {
    if (!(await await db.shared.get(id))) {
      return;
    }

    return Promise.all([deleteShare(user, id), db.shared.delete(id)]);
  }
}
