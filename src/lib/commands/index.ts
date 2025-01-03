import { ChatCraftCommandRegistry } from "../ChatCraftCommandRegistry";
export { ChatCraftCommandRegistry };

import { NewCommand } from "./NewCommand";
import { ClearCommand } from "./ClearCommand";
import { SummaryCommand } from "./SummaryCommand";
import { HelpCommand } from "./HelpCommand";
import { ImportCommand } from "./ImportCommand";
import { CommandsHelpCommand } from "./CommandsHelpCommand";
import { ImageCommand } from "./ImageCommand";
import { StatsCommand } from "./StatsCommand";
import { DuckCommand } from "./DuckCommand";
import { AnalyticsCommand } from "./AnalyticsCommand";

// Register all our commands
ChatCraftCommandRegistry.registerCommand(new NewCommand());
ChatCraftCommandRegistry.registerCommand(new ClearCommand());
ChatCraftCommandRegistry.registerCommand(new SummaryCommand());
ChatCraftCommandRegistry.registerCommand(new HelpCommand());
ChatCraftCommandRegistry.registerCommand(new CommandsHelpCommand());
ChatCraftCommandRegistry.registerCommand(new ImportCommand());
ChatCraftCommandRegistry.registerCommand(new ImageCommand());
ChatCraftCommandRegistry.registerCommand(new StatsCommand());
ChatCraftCommandRegistry.registerCommand(new DuckCommand());
ChatCraftCommandRegistry.registerCommand(new AnalyticsCommand());
