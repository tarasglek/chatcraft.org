import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";
import { queryToMarkdown } from "./duckdb-chatcraft";

// By default, we haven't loaded the esbuild wasm module, and
// the esbuild module doesn't have a concept of checking if it's
// already loaded.
declare global {
  // eslint-disable-next-line no-var
  var __esbuildWasmLoaded: boolean;
}
globalThis.__esbuildWasmLoaded = false;

const supportedJS = ["js", "javascript"];
const supportedTS = ["ts", "typescript"];
const supportedPY = ["py", "python"];
const supportedRuby = ["rb", "ruby"];
const SupportedBrowserLanguages = [
  ...supportedJS,
  ...supportedTS,
  ...supportedPY,
  ...supportedRuby,
  "sql",
];

function isJavaScript(language: string) {
  return supportedJS.includes(language);
}

function isTypeScript(language: string) {
  return supportedTS.includes(language);
}

function isPython(language: string) {
  return supportedPY.includes(language);
}

function isRuby(language: string) {
  return supportedRuby.includes(language);
}

export function isRunnableInBrowser(language: string) {
  return SupportedBrowserLanguages.includes(language);
}

type ExecutionResult = {
  ret: any;
  logs: string | undefined;
};

async function captureConsole<T>(callback: () => Promise<T>): Promise<ExecutionResult> {
  // Save the original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Prepare a string to store the captured messages
  let capturedMessages = "";

  // Function to create an overridden console method
  const createOverriddenMethod = (method: keyof Console) => {
    return (...args: any[]) => {
      capturedMessages += `[${method}] ` + args.map((arg) => String(arg)).join(" ") + "\n";
      // If you want to still print the messages, uncomment the next line
      (originalConsole as any)[method].apply(console, args);
    };
  };

  // Override console methods
  console.log = createOverriddenMethod("log");
  console.info = createOverriddenMethod("info");
  console.warn = createOverriddenMethod("warn");
  console.error = createOverriddenMethod("error");

  let returnValue: T;
  try {
    // Call the async callback function and capture the return value
    returnValue = await callback();
  } finally {
    // Restore the original console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }

  // Return the captured messages as a single string, or undefined if nothing was captured, along with the return value
  return {
    logs: capturedMessages.trim() || undefined,
    ret: returnValue,
  };
}

/**
 * Run JavaScript code in eval() context, to support returning values from simple expressions `1+1`
 * and also support `import * as esbuild from 'https://cdn.skypack.dev/esbuild-wasm@0.19.2'` via ES6 modules fallback
 */
async function runJavaScript(code: string): Promise<ExecutionResult> {
  try {
    const generated = `return eval(${JSON.stringify(code)});`;
    const fn = new Function(generated);
    return await captureConsole(() => fn());
  } catch (error: any) {
    let maybeES6Module = false;
    if (error instanceof SyntaxError) {
      const msg = error.message;
      // Cannot use import statement outside a module
      // import declarations may only appear at top level of a module
      maybeES6Module = msg.includes("module") || msg.includes("import") || msg.includes("export");
    }
    if (maybeES6Module) {
      const blob = new Blob([code], { type: "text/javascript" });
      const execution = await captureConsole(
        async () => await import(/* @vite-ignore */ URL.createObjectURL(blob))
      );
      const module = execution.ret;
      if (!("default" in module)) {
        throw new Error("No default export in ES6 module");
      }
      return { ...execution, ret: module.default };
    }
    throw error;
  }
}

async function runInWasi(code: string, language: string): Promise<ExecutionResult> {
  const { WASI } = await import("@antonz/runno");

  let url: string;
  let args: string[];
  if (language === "python") {
    url = "https://unpkg.com/@antonz/python-wasi/dist/python.wasm";
    args = ["python", "-c", code];
  } else if (language === "ruby") {
    url = "https://unpkg.com/@antonz/ruby-wasi/dist/ruby.wasm";
    args = ["ruby", "-e", code];
  } else {
    throw new Error("Unsupported language");
  }

  const executionResult = await captureConsole(async () => {
    const executionPromise = new Promise<void>((resolve, reject) => {
      WASI.start(fetch(url), {
        args: args,
        stdout: (out) => {
          console.log(out);
        },
        stderr: (err) => {
          console.error(err);
        },
      })
        .then((result) => {
          if (result.exitCode === 0) {
            resolve();
          } else {
            reject(new Error("Script execution failed"));
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
    return executionPromise;
  });

  return executionResult;
}

// Load esbuild lazily, only on demand, for size savings
async function loadEsBuild() {
  try {
    const esbuild = await import("esbuild-wasm");

    // If we've already initialized the module, don't do it again
    if (!globalThis.__esbuildWasmLoaded) {
      await esbuild.initialize({ wasmURL: esbuildWasmUrl });
      globalThis.__esbuildWasmLoaded = true;
    }

    return esbuild;
  } catch (error: any) {
    if (!error.message.includes('Cannot call "initialize" more than once')) {
      throw error;
    }
  }
}

export async function toJavaScript(tsCode: string) {
  // Compile TypeScript code
  const esbuild = await loadEsBuild();
  if (!esbuild) {
    throw new Error("Unable to load esbuild, needed to parse TS code");
  }
  const js = await esbuild.transform(tsCode, {
    loader: "ts",
  });
  return js.code;
}

async function runSQL(sql: string): Promise<ExecutionResult> {
  try {
    // TODO: need to plumb the chat through to here, so we can inject files when we query...
    const result = await queryToMarkdown(sql);
    return { ret: result, logs: undefined };
  } catch (error) {
    return { ret: "", logs: error instanceof Error ? error.stack : String(error) };
  }
}

export async function runCode(code: string, language: string): Promise<ExecutionResult> {
  if (isTypeScript(language)) {
    code = await toJavaScript(code);
    language = "js";
  }

  if (isJavaScript(language)) {
    return runJavaScript(code);
  } else if (isPython(language)) {
    return runInWasi(code, "python");
  } else if (isRuby(language)) {
    return runInWasi(code, "ruby");
  } else if (language === "sql") {
    return runSQL(code);
  } else {
    return { ret: "", logs: `Unsupported language: ${language}` };
  }
}
