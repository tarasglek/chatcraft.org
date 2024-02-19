import { nanoid } from "nanoid";
import db, { type ChatCraftAttachmentTable } from "./db";

export class ChatCraftAttachment {
  id: string;
  date: Date;
  name?: string;
  blob: Blob;

  constructor({ id, date, name, blob }: { id?: string; name?: string; date?: Date; blob: Blob }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.name = name;
    this.blob = blob;
  }

  get type() {
    return this.blob.type;
  }

  get size() {
    return this.blob.size;
  }

  get url() {
    return URL.createObjectURL(this.blob);
  }

  static async find(id: string) {
    const record = await db.attachments.get(id);
    if (!record) {
      return null;
    }

    return ChatCraftAttachment.fromDB(record);
  }

  async save() {
    // Update the date to indicate we've updated the attachment
    this.date = new Date();
    return db.attachments.put(this.toDB());
  }

  async sha256() {
    const buf = await this.blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
  }

  static async delete(id: string) {
    return db.attachments.delete(id);
  }

  // Suitable for inclusion in JSON, along with .type
  toBase64() {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) {
          reject(new Error("Error reading attachment as base64"));
          return;
        }

        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = uint8Array.reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        );
        const base64String = btoa(binaryString);
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(this.blob);
    });
  }

  async toMarkdown() {
    const { type } = this.blob;

    if (
      type.startsWith("text/") ||
      type === "application/xhtml+xml" ||
      type === "application/javascript"
    ) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // TODO: should do proper syntax highlighting for common types
            resolve("```text\n" + e.target.result + "\n```");
          } else {
            reject(new Error("Unable to read attachment as text"));
          }
        };
        reader.onerror = () => {
          reject(new Error("Error reading attachment as text"));
        };
        reader.readAsText(this.blob);
      });
    }

    // Easy binary types
    if (type.startsWith("image/")) {
      return `![${this.name || ""}](${this.url})`;
    }
    if (type.startsWith("audio/")) {
      return `<audio src=${this.url} controls title=${this.name}></audio>`;
    }
    if (type.startsWith("video/")) {
      return `<video src=${this.url} controls title=${this.name}></video>`;
    }

    // Anything else we'll let you download
    return `[${this.name || "download"}](${this.url})`;
  }

  // TODO: how to handle JSON for different types?
  toJSON() {}

  toDB(): ChatCraftAttachmentTable {
    return {
      id: this.id,
      date: this.date,
      blob: this.blob,
    };
  }

  static fromDB(attachment: ChatCraftAttachmentTable) {
    return new ChatCraftAttachment({ ...attachment });
  }
}
