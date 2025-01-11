import {
  AsyncDuckDB,
  ConsoleLogger,
  VoidLogger,
  getJsDelivrBundles,
  selectBundle,
  AsyncDuckDBConnection,
} from "@duckdb/duckdb-wasm";
// NOTE: duckdb-wasm uses v17.0.0 currently vs. v18.x, see:
// https://github.com/duckdb/duckdb-wasm/blob/b42a8e78d60b30363139a966e42bd33a3dd305a5/packages/duckdb-wasm/package.json#L26C9-L26C34
import * as arrow from "apache-arrow";

// These duckdb types aren't exported, so recreate here so we can export
interface SQLType {
  sqlType: string;
  nullable?: boolean;
  precision?: number;
  scale?: number;
  timezone?: string;
  byteWidth?: number;
  keyType?: SQLType;
  valueType?: SQLType;
  fields?: SQLField[];
}
type SQLField = SQLType & {
  name: string;
};
export declare enum JSONTableShape {
  ROW_ARRAY = "row-array",
  COLUMN_OBJECT = "column-object",
}
export interface JSONInsertOptions {
  name: string;
  schema?: string;
  create?: boolean;
  shape?: JSONTableShape;
}
export interface CSVInsertOptions {
  name: string;
  schema?: string;
  create?: boolean;
  header?: boolean;
  delimiter?: string;
  quote?: string;
  escape?: string;
  skip?: number;
  detect?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
}
export interface ArrowInsertOptions {
  name: string;
  schema?: string;
  create?: boolean;
}

async function init(logToConsole = true) {
  const JSDELIVR_BUNDLES = getJsDelivrBundles();
  // Select a bundle based on browser checks
  const bundle = await selectBundle(JSDELIVR_BUNDLES);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: "text/javascript" })
  );

  // Instantiate the asynchronous version of DuckDB-wasm
  const worker = new Worker(workerUrl);
  const logger = logToConsole ? new ConsoleLogger() : new VoidLogger();
  const duckdb = new AsyncDuckDB(logger, worker);
  await duckdb.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  return duckdb;
}

let _duckdb: AsyncDuckDB | null;

/**
 * Gets or initializes the DuckDB instance
 * @param logToConsole Whether to log DuckDB operations to console
 * @returns Promise resolving to the DuckDB instance
 */
export const getDuckdb = async (logToConsole?: boolean) => {
  if (!_duckdb) {
    _duckdb = await init(logToConsole);
  }

  return _duckdb;
};

/** Type alias for query results using Arrow Tables */
export type QueryResult<T extends { [key: string]: arrow.DataType } = any> = arrow.Table<T>;

// Manage connection lifecycle
async function withConnection<T>(
  callback: (conn: AsyncDuckDBConnection, duckdb: AsyncDuckDB) => Promise<T>
): Promise<T> {
  let conn: AsyncDuckDBConnection | null = null;
  try {
    const duckdb = await getDuckdb();
    conn = await duckdb.connect();
    return await callback(conn, duckdb);
  } finally {
    await conn?.close();
  }
}

/**
 * Executes a SQL query and returns the results as an Arrow Table
 * @param sql The SQL query to execute
 * @param params Optional parameters for prepared statement
 * @returns Promise resolving to an Arrow Table containing the results
 * @throws {Error} If the query fails
 * @example
 * // Simple query
 * const results = await query('SELECT * FROM users');
 *
 * // Prepared statement with parameters
 * const results = await query(
 *   'SELECT * FROM users WHERE age > ?',
 *   [18]
 * );
 */
export async function query<T extends { [key: string]: arrow.DataType } = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return withConnection(async (conn) => {
    if (!params?.length) {
      return await conn.query<T>(sql);
    }

    const stmt = await conn.prepare<T>(sql);
    try {
      return await stmt.query(...params);
    } finally {
      await stmt.close();
    }
  });
}

/**
 * Executes a SQL query and returns a stream of results
 * @param text The SQL query to execute
 * @returns Promise resolving to an Arrow stream reader
 * @throws {Error} If the query fails
 */
export async function streamQuery<T extends { [key: string]: arrow.DataType } = any>(
  text: string
): Promise<arrow.AsyncRecordBatchStreamReader<T>> {
  return withConnection((conn) => conn.send<T>(text));
}

/**
 * Inserts an Arrow table into DuckDB
 * @param tableName Name of the table to create
 * @param table Arrow table containing the data
 * @param options Optional configuration for the insertion
 * @throws {Error} If the insertion fails
 */
export async function insertArrowTable(
  tableName: string,
  table: arrow.Table,
  options?: Partial<ArrowInsertOptions>
): Promise<void> {
  return withConnection(async (conn) => {
    const defaultOptions: ArrowInsertOptions = {
      name: tableName,
      schema: "main",
      create: true,
    };
    await conn.insertArrowTable(table, { ...defaultOptions, ...options });
  });
}

async function loadContent(source: URL | File): Promise<string> {
  if (source instanceof File) {
    return await source.text();
  }
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Inserts CSV data into DuckDB
 * @param tableName Name of the table to create
 * @param source CSV data as string, URL, or File
 * @param options Optional configuration for CSV insertion
 * @throws {Error} If the insertion fails
 */
export async function insertCSV(
  tableName: string,
  source: string | URL | File,
  options: Partial<CSVInsertOptions> = {}
): Promise<void> {
  return withConnection(async (conn, duckdb) => {
    const content = typeof source === "string" ? source : await loadContent(source);
    const bufferName = `temp_${tableName}_${Date.now()}`;

    const finalOptions: CSVInsertOptions = {
      name: tableName,
      schema: "main",
      create: true,
      header: true,
      ...options,
    };

    try {
      await duckdb.registerFileBuffer(bufferName, new TextEncoder().encode(content));

      // Use the full options in the SQL query
      const optionsStr = Object.entries({
        header: finalOptions.header,
        delimiter: finalOptions.delimiter,
        quote: finalOptions.quote,
        escape: finalOptions.escape,
        skip: finalOptions.skip,
        dateFormat: finalOptions.dateFormat,
        timestampFormat: finalOptions.timestampFormat,
      })
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => (typeof v === "boolean" ? `${k}=${v}` : `${k}='${v}'`))
        .join(", ");

      await conn.query(`
        CREATE OR REPLACE TABLE ${finalOptions.schema}.${finalOptions.name} AS
        SELECT * FROM read_csv_auto('${bufferName}'${optionsStr})
      `);
    } finally {
      await duckdb.dropFile(bufferName);
    }
  });
}

/**
 * Inserts JSON data into DuckDB
 * @param tableName Name of the table to create
 * @param source JSON data as string, URL, or File
 * @param options Optional configuration for JSON insertion
 * @throws {Error} If the insertion fails
 */
export async function insertJSON(
  tableName: string,
  source: string | URL | File,
  options: Partial<JSONInsertOptions> = {}
): Promise<void> {
  return withConnection(async (conn, duckdb) => {
    const content = typeof source === "string" ? source : await loadContent(source);
    const bufferName = `temp_${tableName}_${Date.now()}`;

    const finalOptions: JSONInsertOptions = {
      name: tableName,
      schema: "main",
      create: true,
      ...options,
    };

    try {
      await duckdb.registerFileBuffer(bufferName, new TextEncoder().encode(content));

      const optionsStr = finalOptions.shape ? `, format='${finalOptions.shape}'` : "";

      await conn.query(`
        CREATE OR REPLACE TABLE ${finalOptions.schema}.${finalOptions.name} AS
        SELECT * FROM read_json_auto('${bufferName}'${optionsStr})
      `);
    } finally {
      await duckdb.dropFile(bufferName);
    }
  });
}

/**
 * Gets the names of all tables in the database
 * @param query Optional query to filter tables (defaults to all tables)
 * @returns Promise resolving to array of table names
 * @throws {Error} If the query fails
 */
export async function getTableNames(query = "SELECT * FROM main.sqlite_master"): Promise<string[]> {
  return withConnection((conn) => conn.getTableNames(query));
}

/**
 * Resets the DuckDB instance, terminating the connection
 * @throws {Error} If termination fails
 */
export async function reset(): Promise<void> {
  if (_duckdb) {
    await _duckdb.dropFiles();
    await _duckdb.terminate();
    _duckdb = null;
  }
}
