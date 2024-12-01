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

    // Convert stats to array and sort by total duration
    const results = Array.from(stats.entries())
      .map(([name, stat]) => ({
        name,
        ops: stat.operations,
        min: Number(stat.minDuration.toFixed(2)),
        avg: Number((stat.totalDuration / stat.operations).toFixed(2)),
        max: Number(stat.maxDuration.toFixed(2)),
        total: Number(stat.totalDuration.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total);

    // Format message with markdown table
    const message = [
      "## Performance Statistics\n",
      "| Operation | Count | min/avg/max (ms) | Total (ms) |",
      "|-----------|--------|-----------------|------------|",
      ...results.map((r) => `| ${r.name} | ${r.ops} | ${r.min}/${r.avg}/${r.max} | ${r.total} |`),
    ].join("\n");

    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
