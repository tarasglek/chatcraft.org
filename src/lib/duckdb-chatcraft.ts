import { DataType } from "apache-arrow";
import db, { CHATCRAFT_TABLES, ChatCraftTableName, isChatCraftTableName } from "./db";
import {
  withConnection,
  insertJSON,
  QueryResult,
  query,
  DuckDBCatalogError,
  queryResultToJson,
} from "./duckdb";
import { jsonToMarkdownTable } from "./utils";

/**
 * Extracts chatcraft schema table references from a SQL query
 * TODO: Implement this function using json_serialize_sql and AST traversal
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
async function chatCraftQuery<T extends { [key: string]: DataType } = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    // First, attempt to execute the query assuming everything is already created
    return await query<T>(sql, params);
  } catch (error: unknown) {
    // If the query fails, see if the error is due to a missing table that we can provide
    // by injecting ChatCraft data from Dexie. NOTE: if a user happens to create a tabled
    // that shares the same name as our injected tables (e.g., chatcraft.messages), we'll
    // let them use theirs instead of generating a new one. This also reduces the risk of
    // overhead from premature table creation.
    if (error instanceof DuckDBCatalogError) {
      const referencedTables = extractChatCraftTables(sql);

      // If we have referenced tables, sync them
      if (referencedTables.length > 0) {
        // Create schema if needed
        await withConnection(async (conn) => {
          await conn.query(`CREATE SCHEMA IF NOT EXISTS chatcraft`);
        });

        // Sync all referenced chatcraft tables
        for (const tableName of referencedTables) {
          if (isChatCraftTableName(tableName)) {
            await syncChatCraftTable(tableName);
          }
        }

        // Retry the query after syncing
        return await query<T>(sql, params);
      }
    }

    // If not a catalog error or no referenced tables, rethrow
    throw error;
  }
}

// Replace the original query export with the enhanced, ChatCraft version
export { chatCraftQuery as query };

/**
 * Executes a SQL query and returns the results as a Markdown table
 * @param sql The SQL query to execute
 * @param params Optional parameters for prepared statement
 * @returns Promise resolving to a Markdown formatted table string
 * @throws {Error} If the query fails
 */
export async function queryToMarkdown(sql: string, params?: any[]): Promise<string> {
  const result = await chatCraftQuery(sql, params);
  const json = queryResultToJson(result);
  return jsonToMarkdownTable(json);
}

/**
 * Get a list of all available tables, including the "virtual"
 * chatcraft.* tables we can sync into duckdb on demand.
 */
export async function getTables() {
  const result = await query("show tables");
  const json = queryResultToJson(result);
  // TODO: this isn't really accurate, since `show tables` only shows what's in the current schema (main)
  CHATCRAFT_TABLES.forEach((table) => {
    json.push({ name: `chatcraft.${table}` });
  });
  return jsonToMarkdownTable(json);
}
