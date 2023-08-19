const supportedJS = ["js", "javascript"];
const supportedLanguages = supportedJS;

function isJS(language: string) {
  return supportedJS.includes(language);
}

export function isRunnable(language: string) {
  return supportedLanguages.includes(language);
}

export async function runCode(code: string, language: string) {
  if (isJS(language)) {
    const fn = new Function(`return eval(${JSON.stringify(code)});`);
    return fn();
  }
  throw new Error(`Unsupported language: ${language}`);
}
