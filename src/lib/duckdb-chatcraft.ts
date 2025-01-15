import { DataType } from "apache-arrow";
import db, { CHATCRAFT_TABLES, ChatCraftTableName, isChatCraftTableName } from "./db";
import { withConnection, insertJSON, QueryResult, query } from "./duckdb";

/**
 * Extracts chatcraft schema table references from a SQL query
 * @param sql The SQL query to analyze
 * @returns Array of table names referenced in the chatcraft schema
 */
function extractChatCraftTables(sql: string): string[] {
  // Match "chatcraft.table_name" or "chatcraft.table_name;"
  const regex = /chatcraft\.(\w+)(?:\s|;|$)/g;
  const matches = [...sql.matchAll(regex)];
  return [...new Set(matches.map((match) => match[1]))];
}

/**
 * Synchronizes a single ChatCraft table to DuckDB
 * @param tableName The name of the table to synchronize
 * @returns Promise resolving when sync is complete
 */
async function syncChatCraftTable(tableName: ChatCraftTableName): Promise<void> {
  const data = await db.byTableName(tableName).toArray();

  // Convert dates to ISO strings for JSON serialization
  const jsonData = data.map((record) => ({
    ...record,
    date: record.date instanceof Date ? record.date.toISOString() : record.date,
  }));

  await insertJSON(tableName, JSON.stringify(jsonData), { schema: "chatcraft" });
}

/**
 * Enhanced query function that handles ChatCraft db data synchronization silently
 * @param sql The SQL query to execute
 * @param params Optional parameters for prepared statement
 * @returns Query results as an Arrow Table
 */
export async function chatCraftQuery<T extends { [key: string]: DataType } = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    // First attempt to execute the query
    return await query<T>(sql, params);
  } catch (error: unknown) {
    // Check if error matches the catalog error pattern
    const catalogErrorPattern = /Catalog Error: Table with name (\w+) does not exist!/;
    const match = error instanceof Error && error.message.match(catalogErrorPattern);

    if (match) {
      const tableName = match[1];

      // If the missing table is a chatcraft table, sync and retry
      if (isChatCraftTableName(tableName)) {
        // Create schema if needed
        await withConnection(async (conn) => {
          await conn.query(`CREATE SCHEMA IF NOT EXISTS chatcraft`);
        });

        await syncChatCraftTable(tableName);

        // Retry the query after syncing
        return await query<T>(sql, params);
      }
    }

    // If not a catalog error or not a chatcraft table, rethrow
    throw error;
  }
}

// Replace the original query export with the enhanced, ChatCraft version
export { chatCraftQuery as query };
