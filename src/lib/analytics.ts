import { query } from "./duckdb";

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

export async function processAnalytics(
  startDate: Date,
  endDate: Date,
  period: "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL"
): Promise<ProcessedAnalytics> {
  // Convert dates to ISO strings for SQL
  const start = startDate?.toISOString() || "2019-01-01";
  const end = endDate?.toISOString() || new Date().toISOString();

  const summaryQuery = `
    WITH message_stats AS (
      SELECT
        CAST(COUNT(DISTINCT chatId) AS DOUBLE) as total_chats,
        CAST(COUNT(*) AS DOUBLE) as total_messages,
        CAST(SUM(LENGTH(text)) AS DOUBLE) as total_characters
      FROM messages
      WHERE date BETWEEN '${start}' AND '${end}'
    ),
    max_stats AS (
      SELECT
        CAST(MAX(chats) AS DOUBLE) as max_chats,
        CAST(MAX(messages) AS DOUBLE) as max_messages,
        CAST(MAX(chars) AS DOUBLE) as max_characters
      FROM (
        SELECT
          DATE_TRUNC('day', CAST(date AS TIMESTAMP)) as day,
          COUNT(DISTINCT chatId) as chats,
          COUNT(*) as messages,
          SUM(LENGTH(text)) as chars
        FROM messages
        WHERE date BETWEEN '${start}' AND '${end}'
        GROUP BY 1
      )
    )
    SELECT
      m.*,
      x.*,
      CAST(ROUND(CAST(m.total_messages AS DOUBLE) /
        NULLIF(m.total_chats, 0), 1) AS DOUBLE) as avg_messages_per_chat,
      CAST(ROUND(CAST(m.total_characters AS DOUBLE) /
        NULLIF(m.total_messages, 0), 0) AS DOUBLE) as avg_chars_per_message
    FROM message_stats m
    CROSS JOIN max_stats x
  `;

  const timeSeriesQuery = `
    WITH RECURSIVE
    time_series AS (
      SELECT
        CASE '${period}'
          WHEN '1H' THEN
            DATE_TRUNC('minute', CAST('${start}' AS TIMESTAMP))
          WHEN '1D' THEN
            DATE_TRUNC('hour', CAST('${start}' AS TIMESTAMP))
          WHEN '1W' THEN
            DATE_TRUNC('day', CAST('${start}' AS TIMESTAMP))
          WHEN '1M' THEN
            DATE_TRUNC('day', CAST('${start}' AS TIMESTAMP))
          ELSE
            DATE_TRUNC('month', CAST('${start}' AS TIMESTAMP))
        END as period
      UNION ALL
      SELECT
        CASE '${period}'
          WHEN '1H' THEN period + INTERVAL 1 MINUTE
          WHEN '1D' THEN period + INTERVAL 1 HOUR
          WHEN '1W' THEN period + INTERVAL 1 DAY
          WHEN '1M' THEN period + INTERVAL 1 DAY
          ELSE period + INTERVAL 1 MONTH
        END
      FROM time_series
      WHERE period < CAST('${end}' AS TIMESTAMP)
    ),
    message_stats AS (
      SELECT
        CASE '${period}'
          WHEN '1H' THEN DATE_TRUNC('minute', CAST(date AS TIMESTAMP))
          WHEN '1D' THEN DATE_TRUNC('hour', CAST(date AS TIMESTAMP))
          WHEN '1W' THEN DATE_TRUNC('day', CAST(date AS TIMESTAMP))
          WHEN '1M' THEN DATE_TRUNC('day', CAST(date AS TIMESTAMP))
          ELSE DATE_TRUNC('month', CAST(date AS TIMESTAMP))
        END as period,
        CAST(COUNT(DISTINCT chatId) AS DOUBLE) AS chats,
        CAST(COUNT(*) AS DOUBLE) AS messages,
        CAST(ROUND(SUM(LENGTH(text)) / 1000.0) AS DOUBLE) AS characters
      FROM messages
      WHERE date BETWEEN '${start}' AND '${end}'
      GROUP BY 1
    )
    SELECT
      ts.period,
      COALESCE(ms.chats, 0) as chats,
      COALESCE(ms.messages, 0) as messages,
      COALESCE(ms.characters, 0) as characters
    FROM time_series ts
    LEFT JOIN message_stats ms ON ts.period = ms.period
    ORDER BY ts.period
  `;

  const modelUsageQuery = `
    WITH model_counts AS (
      SELECT
        model,
        CAST(COUNT(*) AS DOUBLE) as message_count
      FROM messages
      WHERE date BETWEEN '${start}' AND '${end}'
        AND model IS NOT NULL
      GROUP BY model
    ),
    total_messages AS (
      SELECT CAST(SUM(message_count) AS DOUBLE) as total
      FROM model_counts
    )
    SELECT
      model as name,
      CAST(message_count AS DOUBLE) as value,
      CAST(ROUND(CAST(message_count AS DOUBLE) * 100 / total, 1) AS DOUBLE) as percentage
    FROM model_counts
    CROSS JOIN total_messages
    ORDER BY message_count DESC
  `;

  const [summaryResult, timeSeriesResult, modelUsageResult] = await Promise.all([
    query(summaryQuery),
    query(timeSeriesQuery),
    query(modelUsageQuery),
  ]);

  const summary = summaryResult.toArray()[0];

  return {
    summary: {
      totals: {
        chats: summary.total_chats,
        messages: summary.total_messages,
        characters: summary.total_characters,
      },
      max: {
        chats: summary.max_chats,
        messages: summary.max_messages,
        characters: summary.max_characters,
      },
      averages: {
        messagesPerChat: summary.avg_messages_per_chat,
        charactersPerMessage: summary.avg_chars_per_message,
      },
    },
    timeSeriesData: timeSeriesResult.toArray().map((row) => ({
      period: row.period,
      chats: row.chats,
      messages: row.messages,
      characters: row.characters,
    })),
    modelUsage: modelUsageResult.toArray(),
  };
}
