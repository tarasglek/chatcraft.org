import {
  AsyncDuckDB,
  ConsoleLogger,
  VoidLogger,
  getJsDelivrBundles,
  selectBundle,
  AsyncDuckDBConnection,
  WebFile,
} from "@duckdb/duckdb-wasm";
// NOTE: duckdb-wasm uses v17.0.0 currently vs. v18.x, see:
// https://github.com/duckdb/duckdb-wasm/blob/b42a8e78d60b30363139a966e42bd33a3dd305a5/packages/duckdb-wasm/package.json#L26C9-L26C34
import * as arrow from "apache-arrow";

async function init(logToConsole = true) {
  // NOTE: the wasm bundles are too large for CloudFlare pages, so we load externally
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
 * Whether or not we've currently loaded and are using DuckDB.
 * Use `requireDuckDB()` to load or get the db.
 */
export const isUsingDuckDB = (): boolean => !!_duckdb;

/**
 * Gets or initializes the DuckDB instance
 * @param logToConsole Whether to log DuckDB operations to console
 * @returns Promise resolving to the DuckDB instance
 */
export const requireDuckDB = async (logToConsole?: boolean) => {
  if (!_duckdb) {
    _duckdb = await init(logToConsole);
  }

  return _duckdb;
};

/** Type alias for query results using Arrow Tables */
export type QueryResult<T extends { [key: string]: arrow.DataType } = any> = arrow.Table<T>;

// Helper to turn a query result into JSON.
// https://duckdb.org/docs/api/wasm/query.html#arrow-table-to-json
export function queryResultToJson(result: QueryResult) {
  return result.toArray().map((row: any) => row.toJSON());
}

// Manage connection lifecycle, closing when done
export async function withConnection<T>(
  callback: (conn: AsyncDuckDBConnection, duckdb: AsyncDuckDB) => Promise<T>
): Promise<T> {
  let conn: AsyncDuckDBConnection | null = null;
  try {
    const duckdb = await requireDuckDB();
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
 * @throws {DuckDBCatalogError} If the query references a non-existent table
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
    try {
      if (!params?.length) {
        return await conn.query<T>(sql);
      }

      const stmt = await conn.prepare<T>(sql);
      try {
        return await stmt.query(...params);
      } finally {
        await stmt.close();
      }
    } catch (err) {
      if (DuckDBCatalogError.isCatalogError(err)) {
        throw new DuckDBCatalogError(err);
      }
      if (DuckDBFileError.isFileError(err)) {
        throw new DuckDBFileError(err);
      }
      throw err;
    }
  });
}

/**
 * Loads text content from a File, Blob or URL
 * @param source the URL, File, or Blob to load
 * @returns the text of the file
 */
async function loadTextContent(source: URL | File | Blob): Promise<string> {
  if (source instanceof File || source instanceof Blob) {
    return await source.text();
  }
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Format options for SQL query, handling both CSV and JSON specific options
 */
function formatOptionsForSqlQuery(options: CSVOptions | JSONOptions) {
  // Remove schema from options as it's handled separately
  const { schema, ...opts } = options;

  // Special handling for CSV-specific options
  if ("types" in opts || "names" in opts || "nullstr" in opts) {
    const csvOpts = opts as CSVOptions;
    return Object.entries({
      ...opts,
      types: Array.isArray(csvOpts.types)
        ? csvOpts.types.join(", ")
        : JSON.stringify(csvOpts.types),
      names: csvOpts.names?.join(", "),
      nullstr: Array.isArray(csvOpts.nullstr) ? csvOpts.nullstr.join(", ") : csvOpts.nullstr,
    })
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => {
        if (typeof v === "boolean") return `${k}=${v}`;
        if (Array.isArray(v)) return `${k}=[${v}]`;
        return `${k}='${v}'`;
      })
      .join(", ");
  }

  // Handle JSON options
  return Object.entries(opts)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => {
      if (typeof v === "boolean") return `${k}=${v}`;
      if (typeof v === "number") return `${k}=${v}`;
      return `${k}='${v}'`;
    })
    .join(", ");
}

/**
 * Options for CSV file imports, see docs:
 * https://duckdb.org/docs/data/csv/overview.html#parameters
 */
export interface CSVOptions {
  /** Database schema (default: 'main') */
  schema?: string;
  /** Whether file has a header row (default: false) */
  header?: boolean;
  /** Column separator (default: ',') */
  delim?: string;
  /** Quote character (default: '"') */
  quote?: string;
  /** Escape character (default: '"') */
  escape?: string;
  /** Number of rows to skip (default: 0) */
  skip?: number;
  /** Date format string */
  dateformat?: string;
  /** Timestamp format string */
  timestampformat?: string;
  /** Ignore parsing errors and skip problematic rows */
  ignore_errors?: boolean;
  /** Treat all columns as VARCHAR */
  all_varchar?: boolean;
  /** Column names as list */
  names?: string[];
  /** Column types by position or name */
  types?: string[] | Record<string, string>;
  /** String that represents NULL values */
  nullstr?: string | string[];
  /** The decimal separator character (default: '.') */
  decimal_separator?: string;
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
  source: string | URL | File | Blob,
  options: CSVOptions = {}
): Promise<void> {
  return withConnection(async (conn, duckdb) => {
    const content = typeof source === "string" ? source : await loadTextContent(source);
    const bufferName = `temp_${tableName}_${Date.now()}`;
    const schema = options.schema || "main";

    try {
      await duckdb.registerFileBuffer(bufferName, new TextEncoder().encode(content));

      const optionsStr = formatOptionsForSqlQuery(options);

      await conn.query(`
        CREATE OR REPLACE TABLE ${schema}.${tableName} AS
        SELECT * FROM read_csv('${bufferName}'${optionsStr})
      `);
    } finally {
      await duckdb.dropFile(bufferName);
    }
  });
}

/**
 * Insert arbitrary data as a DuckDB File
 * @param name the name of the file
 * @param data the file data
 * @throws {Error} If the insertion fails
 */
export async function insertFile(name: string, source: string | File | Blob): Promise<void> {
  return withConnection(async (_conn, duckdb) => {
    let buf: Uint8Array;
    if (typeof source === "string") {
      buf = new TextEncoder().encode(source);
    } else {
      buf = new Uint8Array(await source.arrayBuffer());
    }

    await duckdb.registerFileBuffer(name, buf);
  });
}

/**
 * Options for JSON file imports, see docs:
 * https://duckdb.org/docs/data/json/loading_json#parameters
 */
export interface JSONOptions {
  /** Database schema (default: 'main') */
  schema?: string;
  /** JSON format: 'auto', 'unstructured', 'newline_delimited', or 'array' */
  format?: "auto" | "unstructured" | "newline_delimited" | "array";
  /** Compression type: 'auto', 'none', 'gzip', or 'zstd' */
  compression?: "auto" | "none" | "gzip" | "zstd";
  /** Whether to include filename column in result */
  filename?: boolean;
  /** Whether to interpret path as Hive partitioned */
  hive_partitioning?: boolean;
  /** Ignore parse errors (only for newline_delimited format) */
  ignore_errors?: boolean;
  /** Maximum number of JSON files sampled for auto-detection */
  maximum_sample_files?: number;
  /** Maximum size of a JSON object in bytes */
  maximum_object_size?: number;
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
  source: string | URL | File | Blob,
  options: JSONOptions = {}
): Promise<void> {
  return withConnection(async (conn, duckdb) => {
    const content = typeof source === "string" ? source : await loadTextContent(source);
    const bufferName = `temp_${tableName}_${Date.now()}`;
    const schema = options.schema || "main";

    try {
      await duckdb.registerFileBuffer(bufferName, new TextEncoder().encode(content));

      const optionsStr = formatOptionsForSqlQuery(options);

      await conn.query(`
        CREATE OR REPLACE TABLE ${schema}.${tableName} AS
        SELECT * FROM read_json('${bufferName}'${optionsStr ? ", " + optionsStr : ""})
      `);
    } finally {
      await duckdb.dropFile(bufferName);
    }
  });
}

/**
 * Get metadata about files
 * @param path the path or glob pattern to use. Defaults to '*'
 * @returns list of WebFile objects, see https://github.com/duckdb/duckdb-wasm/blob/main/packages/duckdb-wasm/src/bindings/web_file.ts
 */
export async function globFiles(path = "*"): Promise<WebFile[]> {
  return withConnection<WebFile[]>((_conn, duckdb) => {
    return duckdb.globFiles(path);
  });
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

/**
 * Custom error for identifying DuckDB Catalog Errors with missing Table
 */
export class DuckDBCatalogError extends Error {
  static readonly ERROR_NAME = "DuckDBCatalogError" as const;

  private static readonly catalogErrorPattern =
    /Catalog Error: Table with name (\w+) does not exist!/;

  readonly tableName: string;

  constructor(error: unknown) {
    if (!DuckDBCatalogError.isCatalogError(error)) {
      throw new Error("Not a DuckDB catalog error");
    }

    const tableName = DuckDBCatalogError.extractTableName(error);
    if (!tableName) {
      throw new Error("Failed to extract table name from error message");
    }

    super(`Table '${tableName}' does not exist in DuckDB catalog`);

    this.tableName = tableName;
    this.name = DuckDBCatalogError.ERROR_NAME;
  }

  static isCatalogError(error: unknown): error is Error {
    return error instanceof Error && DuckDBCatalogError.extractTableName(error) !== null;
  }

  static extractTableName(error: Error): string | null {
    const match = error.message.match(DuckDBCatalogError.catalogErrorPattern);
    return match?.[1] ?? null;
  }
}

/**
 * Custom error for identifying DuckDB IO Errors with missing files
 */
export class DuckDBFileError extends Error {
  static readonly ERROR_NAME = "DuckDBFileError" as const;

  private static readonly ioErrorPattern = /IO Error: No files found that match the pattern "(.+)"/;

  readonly filePath: string;

  constructor(error: unknown) {
    if (!DuckDBFileError.isFileError(error)) {
      throw new Error("Not a DuckDB IO error");
    }

    const filePath = DuckDBFileError.extractFilePath(error);
    if (!filePath) {
      throw new Error("Failed to extract file path from error message");
    }

    super(`File '${filePath}' not found`);

    this.filePath = filePath;
    this.name = DuckDBFileError.ERROR_NAME;
  }

  static isFileError(error: unknown): error is Error {
    return error instanceof Error && DuckDBFileError.extractFilePath(error) !== null;
  }

  static extractFilePath(error: Error): string | null {
    const match = error.message.match(DuckDBFileError.ioErrorPattern);
    return match?.[1] ?? null;
  }
}
