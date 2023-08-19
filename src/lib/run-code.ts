const supportedJS = ["js", "javascript"];
const supportedLanguages = supportedJS;

function isJS(language: string) {
  return supportedJS.includes(language);
}

export function isRunnable(language: string) {
  return supportedLanguages.includes(language);
}

/**
 * Run JavaScript code in eval() context, to support returning values from simple expressions `1+1`
 * and also support `import * as esbuild from 'https://cdn.skypack.dev/esbuild-wasm@0.19.2'` via ES6 modules fallback
 */
async function runJS(code: string) {
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
          "Chatcraft: Evaling code in a module context, must `export default =` at end to return a value"
        );
      }
      const module = await import("data:text/javascript;base64," + btoa(code));
      return module.default;
    } else {
      throw error;
    }
  }
}

export async function runCode(code: string, language: string) {
  if (isJS(language)) {
    return runJS(code);
  }
  throw new Error(`Unsupported language: ${language}`);
}
