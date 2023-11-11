import { nanoid } from "nanoid";
import db, { type ChatCraftStarredTextTable } from "./db";

export type SerializedChatCraftStarredText = {
  id: string;
  date: string;
  text: string;
};

export class ChatCraftStarredText {
  id: string;
  date: Date;
  text: string;

  constructor({ id, date, text }: { id?: string; date?: Date; text: string }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.text = text;
  }

  clone() {
    return new ChatCraftStarredText({
      text: this.text,
    });
  }

  async save() {
    const promptText = this.text;
    return db.starred
      .where("text")
      .equalsIgnoreCase(promptText)
      .count()
      .then((count) => {
        if (count == 0) {
          db.starred.put(this.toDB());
        } else {
          console.warn(`${promptText} was already found in DB. Ignoring`);
        }
      })
      .catch((error) => {
        console.error("Failed to query the systemPrompts table:", error);
      });
  }

  async remove() {
    const promptText = this.text;
    return db.starred
      .where("text")
      .equalsIgnoreCase(promptText)
      .toArray()
      .then((entries) => {
        entries.forEach((entry) => {
          return db.starred.delete(entry.id);
        });
      })
      .catch((error) => {
        console.error("Failed to query the systemPrompts table:", error);
      });
  }

  static async check(text: string): Promise<boolean> {
    return db.starred
      .where("text")
      .equalsIgnoreCase(text)
      .count()
      .then((count) => {
        if (count > 0) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });
  }

  // static fromJSON(message: SerializedChatCraftStarredText) {
  //   return new ChatCraftSystemMessage({
  //     id: message.id,
  //     date: new Date(message.date),
  //     text: message.text,
  //   });
  // }

  toDB(): ChatCraftStarredTextTable {
    return {
      id: this.id,
      date: this.date,
      text: this.text,
    };
  }

  // static fromDB(message: ChatCraftStarredTextTable) {
  //   return new ChatCraftSystemMessage({
  //     id: message.id,
  //     date: message.date,
  //     text: message.text,
  //   });
  // }
}
