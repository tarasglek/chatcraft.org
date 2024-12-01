import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";
import { getPerformanceStats } from "../performance";

export class StatsCommand extends ChatCraftCommand {
  constructor() {
    super("stats", "/stats", "Shows performance statistics for all operations");
  }

  async execute(chat: ChatCraftChat) {
    const stats = getPerformanceStats();

    if (stats.size === 0) {
      return chat.addMessage(
        new ChatCraftAppMessage({
          text: "No performance statistics available.",
        })
      );
    }

    // Convert stats to array and sort by operation count
    const results = Array.from(stats.entries())
      .map(([name, stat]) => ({
        name,
        ops: stat.operations,
        min: Number(stat.minDuration.toFixed(2)),
        avg: Number((stat.totalDuration / stat.operations).toFixed(2)),
        max: Number(stat.maxDuration.toFixed(2))
      }))
      .sort((a, b) => b.ops - a.ops);

    // Format message with concise table
    const message = [
      "```",
      "Operation            Ops    min/avg/max(ms)",
      "-------------------------------------------",
      ...results.map(r => 
        `${r.name.padEnd(20)} ${r.ops.toString().padStart(5)}  ${r.min}/${r.avg}/${r.max}`
      ),
      "```"
    ].join('\n');

    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
