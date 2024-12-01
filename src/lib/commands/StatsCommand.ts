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
        operations: stat.operations,
        totalMs: Math.round(stat.totalDuration * 100) / 100,
        avgMs: Math.round((stat.totalDuration / stat.operations) * 100) / 100,
        minMs: Math.round(stat.minDuration * 100) / 100,
        maxMs: Math.round(stat.maxDuration * 100) / 100,
        lastMs: Math.round(stat.lastDuration * 100) / 100,
      }))
      .sort((a, b) => b.totalMs - a.totalMs);

    // Format message with markdown table
    const message = [
      "## Performance Statistics\n",
      "| Operation | Count | Avg (ms) | Min (ms) | Max (ms) | Total (ms) |",
      "|-----------|--------|----------|----------|----------|------------|",
      ...results.map(
        (r) =>
          `| ${r.name} | ${r.operations} | ${r.avgMs} | ${r.minMs} | ${r.maxMs} | ${r.totalMs} |`
      ),
    ].join("\n");

    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
