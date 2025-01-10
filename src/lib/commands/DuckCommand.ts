import { ChatCraftCommand } from "../ChatCraftCommand";
import { ChatCraftChat } from "../ChatCraftChat";
import { ChatCraftAppMessage } from "../ChatCraftMessage";
import db from "../../lib/db";
import * as duckdb_lib from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

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
  const logger = new duckdb.ConsoleLogger();
  const duckdb = new duckdb.AsyncDuckDB(logger, worker);
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
    const message = [
      "## SQL\n",
      "| Operation | Count | min/avg/max (ms) | Total (ms) |",
      "|-----------|--------|-----------------|------------|",
      `${duckdb}`,
      // ...results.map((r) => `| ${r.name} | ${r.ops} | ${r.min}/${r.avg}/${r.max} | ${r.total} |`),
    ].join("\n");

    return chat.addMessage(new ChatCraftAppMessage({ text: message }));
  }
}
