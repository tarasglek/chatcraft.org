import { nanoid } from "nanoid";
import db, { type ChatCraftStarredSystemPromptTable } from "./db";

export type SerializedChatCraftStarredSystemPrompt = {
  id: string;
  date: string;
  text: string;
};

export class ChatCraftStarredSystemPrompt {
  id: string;
  date: Date;
  text: string;

  constructor({ id, date, text }: { id?: string; date?: Date; text: string }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.text = text;
  }

  clone() {
    return new ChatCraftStarredSystemPrompt({
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

  static async exists(text: string): Promise<boolean> {
    return db.starred
      .where("text")
      .equalsIgnoreCase(text)
      .count()
      .then((count) => {
        return count > 0;
      });
  }

  toDB(): ChatCraftStarredSystemPromptTable {
    return {
      id: this.id,
      date: this.date,
      text: this.text,
    };
  }
}
