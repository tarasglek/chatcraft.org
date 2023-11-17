import db, { type ChatCraftStarredSystemPromptTable } from "./db";

export class ChatCraftStarredSystemPrompt {
  text: string;
  date: Date;
  usage: number;

  constructor({ text, date, usage }: { text: string; date?: Date; usage?: number }) {
    this.text = text;
    this.date = date ?? new Date();
    this.usage = usage ?? 1;
  }

  title() {
    return this.text.split("\n")[0].substring(0, 42);
  }

  // Find in db
  static async find(text: string) {
    const starred = await db.starred.get(text);
    if (!starred) {
      return;
    }

    return new ChatCraftStarredSystemPrompt(starred);
  }

  async save() {
    return db.starred.get(this.text).then((starred) => {
      if (starred === undefined) {
        return db.starred.put(this.toDB());
      }
      return starred.text;
    });
  }

  static async delete(text: string) {
    const starred = await ChatCraftStarredSystemPrompt.find(text);
    if (!starred) {
      return;
    }

    return db.starred.delete(text);
  }

  static exists(text: string): Promise<boolean> {
    return ChatCraftStarredSystemPrompt.find(text).then((entry) => entry !== undefined);
  }

  toDB(): ChatCraftStarredSystemPromptTable {
    return {
      text: this.text,
      date: this.date,
      usage: this.usage,
    };
  }
}
