import { DataType } from "apache-arrow";
import db, { CHATCRAFT_TABLES, ChatCraftTableName, isChatCraftTableName } from "./db";
import {
  withConnection,
  insertJSON,
  QueryResult,
  query,
  DuckDBCatalogError,
  queryResultToJson,
  insertCSV,
  DuckDBFileError,
} from "./duckdb";
import { jsonToMarkdownTable } from "./utils";
import { ChatCraftFile } from "./ChatCraftFile";
import { ChatCraftChat } from "./ChatCraftChat";
import { ls } from "./fs";

/**
 * Extracts chatcraft schema table references from a SQL query
 * TODO: Implement this function using json_serialize_sql and AST traversal
 * @param sql The SQL query to analyze
 * @returns Array of table names referenced in the chatcraft schema
 */
function extractChatCraftTables(sql: string): string[] {
  const tables = new Set<string>();

  // Look for table names and match "chatcraft.table_name" or "chatcraft.table_name;"
  const regex = /chatcraft\.(\w+)(?:\s|;|$)/g;
  const matches = [...sql.matchAll(regex)];
  matches.forEach((match) => {
    tables.add(match[1]);
  });

  return [...tables];
}

// Convert dates to ISO strings for JSON serialization
const convertDatesToISOString = (record: any, dateFields: string[]) => {
  return dateFields.reduce((acc, field) => {
    if (field in record && record[field] instanceof Date) {
      return {
        ...acc,
        [field]: record[field].toISOString(),
      };
    }
    return acc;
  }, record);
};

/**
 * Synchronizes a single ChatCraft table to DuckDB
 * @param tableName The name of the table to synchronize
 * @returns Promise resolving when sync is complete
 */
async function syncChatCraftTable(tableName: ChatCraftTableName): Promise<void> {
  const data = await db.byTableName(tableName).toArray();

  const jsonData = data.map((record) => {
    const dateFields = ["date", "created"];
    return convertDatesToISOString({ ...record }, dateFields);
  });

  await insertJSON(tableName, JSON.stringify(jsonData), { schema: "chatcraft" });
}

/**
 * Enhanced query function that handles ChatCraft db data synchronization silently
 * @param sql The SQL query to execute
 * @param params Optional parameters for prepared statement
 * @param chat Optional ChatCraftChat context where this sql is being run
 * @returns Query results as an Arrow Table
 */
async function chatCraftQuery<T extends { [key: string]: DataType } = any>(
  sql: string,
  { params, chat }: { params?: any[]; chat?: ChatCraftChat } = {}
): Promise<QueryResult<T>> {
  try {
    // First, attempt to execute the query assuming everything is already created
    return await query<T>(sql, params);
  } catch (error: unknown) {
    // If the query fails, see if the error is due to a missing table that we can provide
    // by injecting ChatCraft data from Dexie. NOTE: if a user happens to create a table
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

    if (error instanceof DuckDBFileError) {
      if (!chat) {
        throw error;
      }

      const files = chat.files();
      if (!files.length) {
        throw error;
      }

      const filename = error.filePath;
      const file = files.find((f) => f.id === filename || f.name === filename);
      if (file) {
        await copyFileToDuckDB(file, filename);
      }

      // Retry the query after syncing
      return await query<T>(sql, params);
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
 * @param chat Optional ChatCraftChat, the context where this query is being run
 * @returns Promise resolving to a Markdown formatted table string
 * @throws {Error} If the query fails
 */
export async function queryToMarkdown(
  sql: string,
  { params, chat }: { params?: any[]; chat?: ChatCraftChat } = {}
): Promise<string> {
  const result = await chatCraftQuery(sql, { params, chat });
  const json = queryResultToJson(result);
  return jsonToMarkdownTable(json);
}

/**
 * Get a list of all available tables, including the "virtual"
 * chatcraft.* tables we can sync into duckdb on demand. If a
 * chat is included, get the list of files as well.
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

/**
 * Get a list of all files available in DuckDB's virtual
 * filesystem, as well as any files that we could inject
 * from the chat's files. If there are no files, we return
 * the empty string
 * @param chat the ChatCraftChat, potentially with files
 */
export async function getFiles(chat: ChatCraftChat) {
  const files = await ls(chat);
  const json = files.map((file) => ({ file: file.name }));
  return json.length ? jsonToMarkdownTable(json) : "";
}

/**
 * Copies a ChatCraftFile into the DuckDB virtual filesystem
 * @param file the ChatCraftFile to copy
 * @param virtualPath an optional filename to use instead of the file's name
 */
export async function copyFileToDuckDB(file: ChatCraftFile, virtualPath?: string) {
  // Use provided virtual path or original filename
  const path = virtualPath || file.name;

  // Convert Blob to Uint8Array
  const buffer = new Uint8Array(await file.content.arrayBuffer());

  await withConnection(async (_, duckdb) => {
    // Register the file in DuckDB's virtual filesystem
    await duckdb.registerFileBuffer(path, buffer);
  });
}

/**
 * Attempts to create a new Table in DuckDB for the ChatCraftFile's contents
 * Currently only CSV and JSON files are supported.
 * @param file the file to use for the table's content
 * @param tableName the name of the table to create
 */
export async function fileToDuckDBTable(file: ChatCraftFile, tableName: string) {
  if (file.isCSV()) {
    return await insertCSV(tableName, file.content);
  }

  if (file.isJSON()) {
    return await insertJSON(tableName, file.content);
  }

  throw new Error(`Unable to create DuckDB Table from file type ${file.type}`);
}
