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
export interface SQLType {
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
export type SQLField = SQLType & {
  name: string;
};
export function arrowToSQLType(type: arrow.DataType): SQLType {
  switch (type.typeId) {
    case arrow.Type.Binary:
      return { sqlType: "binary" };
    case arrow.Type.Bool:
      return { sqlType: "bool" };
    case arrow.Type.Date:
      return { sqlType: "date" };
    case arrow.Type.DateDay:
      return { sqlType: "date32[d]" };
    case arrow.Type.DateMillisecond:
      return { sqlType: "date64[ms]" };
    case arrow.Type.Decimal: {
      const dec = type as arrow.Decimal;
      return { sqlType: "decimal", precision: dec.precision, scale: dec.scale };
    }
    case arrow.Type.Float:
      return { sqlType: "float" };
    case arrow.Type.Float16:
      return { sqlType: "float16" };
    case arrow.Type.Float32:
      return { sqlType: "float32" };
    case arrow.Type.Float64:
      return { sqlType: "float64" };
    case arrow.Type.Int:
      return { sqlType: "int32" };
    case arrow.Type.Int16:
      return { sqlType: "int16" };
    case arrow.Type.Int32:
      return { sqlType: "int32" };
    case arrow.Type.Int64:
      return { sqlType: "int64" };
    case arrow.Type.Uint16:
      return { sqlType: "uint16" };
    case arrow.Type.Uint32:
      return { sqlType: "uint32" };
    case arrow.Type.Uint64:
      return { sqlType: "uint64" };
    case arrow.Type.Uint8:
      return { sqlType: "uint8" };
    case arrow.Type.IntervalDayTime:
      return { sqlType: "interval[dt]" };
    case arrow.Type.IntervalYearMonth:
      return { sqlType: "interval[m]" };
    case arrow.Type.List: {
      const list = type as arrow.List;
      return {
        sqlType: "list",
        valueType: arrowToSQLType(list.valueType),
      };
    }
    case arrow.Type.FixedSizeBinary: {
      const bin = type as arrow.FixedSizeBinary;
      return { sqlType: "fixedsizebinary", byteWidth: bin.byteWidth };
    }
    case arrow.Type.Null:
      return { sqlType: "null" };
    case arrow.Type.Utf8:
      return { sqlType: "utf8" };
    case arrow.Type.Struct: {
      const struct_ = type as arrow.Struct;
      return {
        sqlType: "struct",
        fields: struct_.children.map((c) => arrowToSQLField(c.name, c.type)),
      };
    }
    case arrow.Type.Map: {
      const map_ = type as arrow.Map_;
      return {
        sqlType: "map",
        keyType: arrowToSQLType(map_.keyType),
        valueType: arrowToSQLType(map_.valueType),
      };
    }
    case arrow.Type.Time:
      return { sqlType: "time[s]" };
    case arrow.Type.TimeMicrosecond:
      return { sqlType: "time[us]" };
    case arrow.Type.TimeMillisecond:
      return { sqlType: "time[ms]" };
    case arrow.Type.TimeNanosecond:
      return { sqlType: "time[ns]" };
    case arrow.Type.TimeSecond:
      return { sqlType: "time[s]" };
    case arrow.Type.Timestamp: {
      const ts = type as arrow.Timestamp;
      return { sqlType: "timestamp", timezone: ts.timezone || undefined };
    }
    case arrow.Type.TimestampSecond: {
      const ts = type as arrow.TimestampSecond;
      return { sqlType: "timestamp[s]", timezone: ts.timezone || undefined };
    }
    case arrow.Type.TimestampMicrosecond: {
      const ts = type as arrow.TimestampMicrosecond;
      return { sqlType: "timestamp[us]", timezone: ts.timezone || undefined };
    }
    case arrow.Type.TimestampNanosecond: {
      const ts = type as arrow.TimestampNanosecond;
      return { sqlType: "timestamp[ns]", timezone: ts.timezone || undefined };
    }
    case arrow.Type.TimestampMillisecond: {
      const ts = type as arrow.TimestampMillisecond;
      return { sqlType: "timestamp[ms]", timezone: ts.timezone || undefined };
    }
  }
  throw new Error(`unsupported arrow type: ${type.toString()}`);
}
export function arrowToSQLField(name: string, type: arrow.DataType): SQLField {
  const t = arrowToSQLType(type) as SQLField;
  t.name = name;
  return t;
}
export declare enum JSONTableShape {
  ROW_ARRAY = "row-array",
  COLUMN_OBJECT = "column-object",
}
export interface JSONInsertOptions {
  name: string;
  schema?: string;
  create?: boolean;
  shape?: JSONTableShape;
  columns?: {
    [key: string]: arrow.DataType;
  };
  columnsFlat?: SQLField[];
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
  columns?: {
    [key: string]: arrow.DataType;
  };
  columnsFlat?: SQLField[];
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

    // Process column definitions if provided
    if (options.columns) {
      options.columnsFlat = [];
      for (const k in options.columns) {
        options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
      }
    }

    const finalOptions: CSVInsertOptions = {
      name: tableName,
      schema: "main",
      create: true,
      header: true,
      ...options,
      // Replace columns with processed columnsFlat
      columns: undefined,
      columnsFlat: options.columnsFlat,
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

      // First drop the table if it exists and we're creating a new one
      if (finalOptions.create) {
        await conn.query(`DROP TABLE IF EXISTS ${finalOptions.schema}.${finalOptions.name}`);
      }

      await conn.query(`
        CREATE TABLE IF NOT EXISTS ${finalOptions.schema}.${finalOptions.name} AS
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

    // Process column definitions if provided
    if (options.columns) {
      options.columnsFlat = [];
      for (const k in options.columns) {
        options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
      }
    }

    const finalOptions: JSONInsertOptions = {
      name: tableName,
      schema: "main",
      create: true,
      ...options,
      // Replace columns with processed columnsFlat
      columns: undefined,
      columnsFlat: options.columnsFlat,
    };

    try {
      await duckdb.registerFileBuffer(bufferName, new TextEncoder().encode(content));

      const optionsStr = finalOptions.shape ? `, format='${finalOptions.shape}'` : "";

      // First drop the table if it exists and we're creating a new one
      if (finalOptions.create) {
        await conn.query(`DROP TABLE IF EXISTS ${finalOptions.schema}.${finalOptions.name}`);
      }

      await conn.query(`
        CREATE TABLE IF NOT EXISTS ${finalOptions.schema}.${finalOptions.name} AS
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
