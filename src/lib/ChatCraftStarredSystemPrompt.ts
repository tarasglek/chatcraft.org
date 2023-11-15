import db, { type ChatCraftStarredSystemPromptTable } from "./db";

export class ChatCraftStarredSystemPrompt {
  text: string;
  title: string;
  date: Date;
  usage: number;

  constructor({
    text,
    title,
    date,
    usage,
  }: {
    text: string;
    title?: string;
    date?: Date;
    usage?: number;
  }) {
    this.text = text;
    this.title = title ?? text.split("\n")[0].substring(0, 42);
    this.date = date ?? new Date();
    this.usage = usage ?? 1;
  }

  clone() {
    return new ChatCraftStarredSystemPrompt({
      text: this.text,
    });
  }

  async save() {
    return db.starred.get(this.text).then((starred) => {
      if (starred === undefined) {
        return db.starred.put(this.toDB());
      }
      return starred.text;
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
      title: this.title,
      date: this.date,
      usage: this.usage,
    };
  }
}
