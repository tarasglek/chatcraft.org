import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";
import db from "../../lib/db";
import * as duckdb_lib from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import type { Utf8 } from "apache-arrow";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

async function duckdb_start() {
  const bundle = await duckdb_lib.selectBundle(MANUAL_BUNDLES);
  // Instantiate the asynchronus version of DuckDB-wasm
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb_lib.ConsoleLogger();
  const duckdb = new duckdb_lib.AsyncDuckDB(logger, worker);
  await duckdb.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return duckdb;
}

async function idbExport(): Promise<Blob> {
  // Don't load this unless it's needed (150K)
  const { exportDB } = await import("dexie-export-import");
  const blob = await exportDB(db);
  return blob;
}

export class DuckCommand extends ChatCraftCommand {
  constructor() {
    super("duck", "/duck", "Do some SQL queries");
  }

  async execute(chat: ChatCraftChat) {
    //
    // const duckdb = await import("@duckdb/duckdb-wasm");
    // Select a bundle based on browser checks
    const duckdb = await duckdb_start();
    const jsonBlob = await idbExport();
    await duckdb.registerFileBuffer("dexie.json", new Uint8Array(await jsonBlob.arrayBuffer()));
    const sql_import_dexie_json = `CREATE TABLE dexie_json AS
WITH json_data AS (
    SELECT
        unnest(data.data) AS data
    FROM
        read_json('dexie.json', maximum_object_size=${jsonBlob.size})
)
SELECT
    data.tableName AS table_name,
    data.rows AS rows
FROM
    json_data;`;
    const sql_select_dexie_tables = `SELECT table_name FROM dexie_json`;
    const c = await duckdb.connect();
    globalThis.window.c = c;
    await c.query(sql_import_dexie_json);
    const json = (await c.query<{ table_name: Utf8 }>(sql_select_dexie_tables)).toArray();

    const message = [
      "## SQL\n",
      "```json",
      `${JSON.stringify(json, null, 2)}`,
      "```",
      // ...results.map((r) => `| ${r.name} | ${r.ops} | ${r.min}/${r.avg}/${r.max} | ${r.total} |`),
    ].join("\n");
    (globalThis.window as any).db = {
      duckdb,
      jsonBlob,
    };
    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
