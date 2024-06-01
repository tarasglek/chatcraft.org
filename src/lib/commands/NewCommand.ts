import { ChatCraftCommand } from "../ChatCraftCommand";

export class NewCommand extends ChatCraftCommand {
  constructor() {
    super("new", {
      helpTitle: "/new",
      helpDescription: "Creates a new chat.",
    });
  }

  async execute() {
    location.href = "/c/new";
  }
}
