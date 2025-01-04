import { MessageType } from "./ChatCraftMessage";
import db from "./db";

type Period = "day" | "week" | "month";

// Get a standardized key for a time period
function getPeriodKey(date: Date, periodType: Period = "day"): string {
  switch (periodType) {
    case "day":
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    case "week": {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      return startOfWeek.toISOString().slice(0, 10);
    }
    case "month":
      return date.toISOString().slice(0, 7); // YYYY-MM
    default:
      throw new Error(`Invalid period type: ${periodType}`);
  }
}

// Base metrics without calculation fields
interface BaseMetrics {
  messageCount: number;
  characterCount: number;
  conversationCount: number;
  avgResponseTime: number;
  uniqueModels: string[];
}

// Working metrics with calculation fields
interface WorkingPeriodMetrics extends BaseMetrics {
  totalResponseTime: number;
  responseCount: number;
  conversationIds: Set<string>;
}

// Working model metrics
interface WorkingModelMetrics {
  messageCount: number;
  characterCount: number;
  avgResponseLength: number;
  avgResponseTime: number;
  totalResponseTime: number;
  responseCount: number;
}

// Final model metrics
interface ModelMetrics {
  messageCount: number;
  characterCount: number;
  avgResponseLength: number;
  avgResponseTime: number;
}

export interface ChatAnalytics {
  timeMetrics: {
    byPeriod: Record<string, BaseMetrics>;
    hourlyDistribution: Record<number, number>;
    weekdayDistribution: Record<number, number>;
  };
  modelMetrics: {
    usage: Record<string, ModelMetrics>;
    transitions: Record<string, Record<string, number>>;
  };
  contentMetrics: {
    messageTypes: Record<MessageType, number>;
    avgMessageLength: number;
    codeSnippetCount: number;
    conversationDepth: {
      min: number;
      max: number;
      avg: number;
      distribution: Record<number, number>;
    };
  };
}

export interface AnalyticsSummary {
  totals: {
    chats: number;
    messages: number;
    characters: number;
  };
  max: {
    chats: number;
    messages: number;
    characters: number;
  };
  averages: {
    messagesPerChat: number;
    charactersPerMessage: number;
  };
}

export interface FormattedModelUsage {
  name: string;
  value: number;
  percentage: number;
}

export interface ProcessedAnalytics {
  timeSeriesData: Array<{
    period: string;
    chats: number;
    messages: number;
    characters: number;
  }>;
  modelUsage: FormattedModelUsage[];
  summary: AnalyticsSummary;
}

export async function generateAnalytics(startDate?: Date, endDate?: Date): Promise<ChatAnalytics> {
  const messages = await db.messages
    .where("date")
    .between(startDate || new Date(0), endDate || new Date())
    .toArray();

  const chats = await db.chats.toArray();
  const workingMetrics: Record<string, WorkingPeriodMetrics> = {};
  const workingModelMetrics: Record<string, WorkingModelMetrics> = {};

  // First, organize chats by period based on their creation date
  const chatsByPeriod: Record<string, Set<string>> = {};
  chats.forEach((chat) => {
    // Use the first message's date as the chat creation date
    const firstMessage = messages.find((m) => m.chatId === chat.id);
    if (firstMessage) {
      const period = getPeriodKey(firstMessage.date);
      if (!chatsByPeriod[period]) {
        chatsByPeriod[period] = new Set();
      }
      chatsByPeriod[period].add(chat.id);
    }
  });

  // Initialize period metrics with the correct conversation counts
  Object.entries(chatsByPeriod).forEach(([period, chatIds]) => {
    workingMetrics[period] = {
      messageCount: 0,
      characterCount: 0,
      conversationCount: chatIds.size,
      avgResponseTime: 0,
      uniqueModels: [],
      totalResponseTime: 0,
      responseCount: 0,
      conversationIds: chatIds,
    };
  });

  // Initialize results structure
  const results: ChatAnalytics = {
    timeMetrics: {
      byPeriod: {},
      hourlyDistribution: {},
      weekdayDistribution: {},
    },
    modelMetrics: {
      usage: {},
      transitions: {},
    },
    contentMetrics: {
      messageTypes: {} as Record<MessageType, number>,
      avgMessageLength: 0,
      codeSnippetCount: 0,
      conversationDepth: {
        min: Infinity,
        max: 0,
        avg: 0,
        distribution: {},
      },
    },
  };

  // Process messages in a single pass
  messages.forEach((msg, idx, arr) => {
    const period = getPeriodKey(msg.date);
    const hour = msg.date.getHours();
    const weekday = msg.date.getDay();

    // Initialize period metrics if needed
    if (!workingMetrics[period]) {
      workingMetrics[period] = {
        messageCount: 0,
        characterCount: 0,
        conversationCount: 0,
        avgResponseTime: 0,
        uniqueModels: [],
        totalResponseTime: 0,
        responseCount: 0,
        conversationIds: new Set(),
      };
    }

    const periodMetrics = workingMetrics[period];

    // Basic message counting
    periodMetrics.messageCount++;
    periodMetrics.characterCount += msg.text.length;

    // Track response times for AI messages
    if (msg.type === "ai" && idx > 0) {
      const prevMsg = arr[idx - 1];
      if (prevMsg.chatId === msg.chatId && prevMsg.type === "human") {
        const responseTime = msg.date.getTime() - prevMsg.date.getTime();
        periodMetrics.totalResponseTime += responseTime;
        periodMetrics.responseCount++;
      }
    }

    // Track models
    if (msg.model) {
      if (!periodMetrics.uniqueModels.includes(msg.model)) {
        periodMetrics.uniqueModels.push(msg.model);
      }
    }

    // Update distributions
    results.timeMetrics.hourlyDistribution[hour] =
      (results.timeMetrics.hourlyDistribution[hour] || 0) + 1;
    results.timeMetrics.weekdayDistribution[weekday] =
      (results.timeMetrics.weekdayDistribution[weekday] || 0) + 1;

    // Model metrics
    if (msg.model) {
      if (!workingModelMetrics[msg.model]) {
        workingModelMetrics[msg.model] = {
          messageCount: 0,
          characterCount: 0,
          avgResponseLength: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
          responseCount: 0,
        };
      }

      const modelMetrics = workingModelMetrics[msg.model];
      modelMetrics.messageCount++;
      modelMetrics.characterCount += msg.text.length;

      // Track model response times
      if (msg.type === "ai" && idx > 0) {
        const prevMsg = arr[idx - 1];
        if (prevMsg.chatId === msg.chatId && prevMsg.type === "human") {
          const responseTime = msg.date.getTime() - prevMsg.date.getTime();
          modelMetrics.totalResponseTime += responseTime;
          modelMetrics.responseCount++;
        }
      }

      // Track model transitions
      if (idx > 0 && arr[idx - 1].model && arr[idx - 1].model !== msg.model) {
        const prevModel = arr[idx - 1].model;
        if (prevModel) {
          if (!results.modelMetrics.transitions[prevModel]) {
            results.modelMetrics.transitions[prevModel] = {};
          }
          results.modelMetrics.transitions[prevModel][msg.model] =
            (results.modelMetrics.transitions[prevModel][msg.model] || 0) + 1;
        }
      }
    }

    // Content metrics
    results.contentMetrics.messageTypes[msg.type] =
      (results.contentMetrics.messageTypes[msg.type] || 0) + 1;
    results.contentMetrics.codeSnippetCount += (msg.text.match(/```/g) || []).length / 2;

    console.log(`Period ${period}:`, {
      messages: periodMetrics.messageCount,
      conversations: periodMetrics.conversationIds.size,
      responseTimes: {
        total: periodMetrics.totalResponseTime,
        count: periodMetrics.responseCount,
        avg: periodMetrics.responseCount
          ? periodMetrics.totalResponseTime / periodMetrics.responseCount
          : 0,
      },
      models: periodMetrics.uniqueModels,
    });
  });

  // Process chats for conversation depth
  chats.forEach((chat) => {
    const depth = chat.messageIds.length;
    results.contentMetrics.conversationDepth.min = Math.min(
      results.contentMetrics.conversationDepth.min,
      depth
    );
    results.contentMetrics.conversationDepth.max = Math.max(
      results.contentMetrics.conversationDepth.max,
      depth
    );
    results.contentMetrics.conversationDepth.distribution[depth] =
      (results.contentMetrics.conversationDepth.distribution[depth] || 0) + 1;
  });

  // Calculate final averages
  results.contentMetrics.avgMessageLength =
    messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length;
  results.contentMetrics.conversationDepth.avg =
    chats.reduce((sum, chat) => sum + chat.messageIds.length, 0) / chats.length;

  // Convert working metrics to final format
  Object.entries(workingMetrics).forEach(([period, metrics]) => {
    results.timeMetrics.byPeriod[period] = {
      messageCount: metrics.messageCount,
      characterCount: metrics.characterCount,
      conversationCount: metrics.conversationCount,
      avgResponseTime: metrics.responseCount
        ? metrics.totalResponseTime / metrics.responseCount
        : 0,
      uniqueModels: metrics.uniqueModels,
    };
  });

  // Convert working model metrics to final format
  Object.entries(workingModelMetrics).forEach(([model, metrics]) => {
    results.modelMetrics.usage[model] = {
      messageCount: metrics.messageCount,
      characterCount: metrics.characterCount,
      avgResponseLength: metrics.messageCount ? metrics.characterCount / metrics.messageCount : 0,
      avgResponseTime: metrics.responseCount
        ? metrics.totalResponseTime / metrics.responseCount
        : 0,
    };
  });

  return results;
}

export async function processAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<ProcessedAnalytics> {
  const rawAnalytics = await generateAnalytics(startDate, endDate);

  const summary: AnalyticsSummary = {
    totals: {
      chats: Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
        (sum, stats) => sum + stats.conversationCount,
        0
      ),
      messages: Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
        (sum, stats) => sum + stats.messageCount,
        0
      ),
      characters: Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
        (sum, stats) => sum + stats.characterCount,
        0
      ),
    },
    max: {
      chats: Math.max(
        ...Object.values(rawAnalytics.timeMetrics.byPeriod).map((stats) => stats.conversationCount)
      ),
      messages: Math.max(
        ...Object.values(rawAnalytics.timeMetrics.byPeriod).map((stats) => stats.messageCount)
      ),
      characters: Math.max(
        ...Object.values(rawAnalytics.timeMetrics.byPeriod).map((stats) => stats.characterCount)
      ),
    },
    averages: {
      messagesPerChat: Number(
        (
          Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
            (sum, stats) => sum + stats.messageCount,
            0
          ) /
          Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
            (sum, stats) => sum + stats.conversationCount,
            0
          )
        ).toFixed(1)
      ),
      charactersPerMessage: Number(
        (
          Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
            (sum, stats) => sum + stats.characterCount,
            0
          ) /
          Object.values(rawAnalytics.timeMetrics.byPeriod).reduce(
            (sum, stats) => sum + stats.messageCount,
            0
          )
        ).toFixed(0)
      ),
    },
  };

  const timeSeriesData = Object.entries(rawAnalytics.timeMetrics.byPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, stats]) => ({
      period,
      chats: stats.conversationCount,
      messages: stats.messageCount,
      characters: Math.round(stats.characterCount / 1000),
    }));

  const totalMessages = Object.values(rawAnalytics.modelMetrics.usage).reduce(
    (sum, stats) => sum + stats.messageCount,
    0
  );

  const modelUsage = Object.entries(rawAnalytics.modelMetrics.usage)
    .map(([model, stats]) => ({
      name: model,
      value: stats.messageCount,
      percentage: Number(((stats.messageCount / totalMessages) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value);

  return {
    timeSeriesData,
    modelUsage,
    summary,
  };
}
