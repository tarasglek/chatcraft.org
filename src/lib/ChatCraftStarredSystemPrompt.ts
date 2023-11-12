import db, { type ChatCraftStarredSystemPromptTable } from "./db";

export type SerializedChatCraftStarredSystemPrompt = {
  text: string;
  date: string;
};

export class ChatCraftStarredSystemPrompt {
  text: string;
  date: Date;

  constructor({ text, date }: { text: string; date?: Date }) {
    this.text = text;
    this.date = date ?? new Date();
  }

  clone() {
    return new ChatCraftStarredSystemPrompt({
      text: this.text,
    });
  }

  async save() {
    return db.starred.get(this.text).then((starred) => {
      if (starred === undefined) {
        db.starred.put(this.toDB());
      }
      return this.text;
    });
  }

  remove() {
    return db.starred.delete(this.text);
  }

  static exists(text: string): Promise<boolean> {
    return db.starred.get(text).then((entry) => entry !== undefined);
  }

  toDB(): ChatCraftStarredSystemPromptTable {
    return {
      text: this.text,
      date: this.date,
    };
  }
}
