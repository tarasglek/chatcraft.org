import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";

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
const supportedLanguages = [...supportedJS, ...supportedTS];

function isJavaScript(language: string) {
  return supportedJS.includes(language);
}

function isTypeScript(language: string) {
  return supportedTS.includes(language);
}

export function isRunnable(language: string) {
  return supportedLanguages.includes(language);
}

/**
 * Run JavaScript code in eval() context, to support returning values from simple expressions `1+1`
 * and also support `import * as esbuild from 'https://cdn.skypack.dev/esbuild-wasm@0.19.2'` via ES6 modules fallback
 */
async function runJavaScript(code: string) {
  try {
    const fn = new Function(`return eval(${JSON.stringify(code)});`);
    return fn();
  } catch (error: any) {
    const msgLower = error.message.toLowerCase();
    const maybeES6Module =
      error instanceof SyntaxError &&
      // Cannot use import statement outside a module
      // import declarations may only appear at top level of a module
      msgLower.includes("module") &&
      msgLower.includes("import");
    if (maybeES6Module) {
      // check if code has export.*default regexp
      if (!/export\s+default\s+/.test(code)) {
        console.warn(
          "ChatCraft: Eval'ing code in a module context, must `export default <your val>` at end to return a value"
        );
      }
      const blob = new Blob([code], { type: "text/javascript" });
      const module = await import(URL.createObjectURL(blob) /* @vite-ignore */);
      return module.default;
    } else {
      throw error;
    }
  }
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

export async function runCode(code: string, language: string) {
  if (isTypeScript(language)) {
    code = await toJavaScript(code);
    language = "js";
  }
  if (isJavaScript(language)) {
    return runJavaScript(code);
  }
  throw new Error(`Unsupported language: ${language}`);
}
