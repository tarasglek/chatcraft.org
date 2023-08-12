import { ChatCraftCommand } from "../ChatCraftCommand";

export class NewCommand extends ChatCraftCommand {
  constructor() {
    super("new");
  }

  async execute() {
    location.href = "/c/new";
  }
}
