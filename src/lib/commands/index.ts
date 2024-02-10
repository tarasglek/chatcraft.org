import { ChatCraftCommandRegistry } from "../ChatCraftCommandRegistry";
export { ChatCraftCommandRegistry };

import { NewCommand } from "./NewCommand";
import { ClearCommand } from "./ClearCommand";
import { SummaryCommand } from "./SummaryCommand";
import { HelpCommand } from "./HelpCommand";
import { ImportCommand } from "./ImportCommand";
import { CommandsHelpCommand } from "./CommandsHelpCommand";

// Register all our commands
ChatCraftCommandRegistry.registerCommand(new NewCommand());
ChatCraftCommandRegistry.registerCommand(new ClearCommand());
ChatCraftCommandRegistry.registerCommand(new SummaryCommand());
ChatCraftCommandRegistry.registerCommand(new HelpCommand());
ChatCraftCommandRegistry.registerCommand(new CommandsHelpCommand());
ChatCraftCommandRegistry.registerCommand(new ImportCommand());
