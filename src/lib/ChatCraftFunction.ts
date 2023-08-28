import { nanoid } from "nanoid";
import db, { ChatCraftFunctionTable } from "./db";
import { formatAsCodeBlock } from "./utils";
import { ChatCraftFunctionResultMessage } from "./ChatCraftMessage";
import OpenAI from "openai";
import { parseTypeScript } from "typescript2openai";
import { toJavaScript } from "./run-code";
export type FunctionModule = {
  name: string;
  description: string;
  parameters: object;
  // eslint-disable-next-line @typescript-eslint/ban-types
  default: Function;
};

export const formatFunctionName = (id: string, name: string) => {
  const formatted = `${name}()`;

  if (id.startsWith("https://")) {
    const { hostname } = new URL(id);
    return `${hostname} - ${formatted}`;
  }

  return formatted;
};

/**
 * Given a prompt string, return a list of ChatCraftFunction objects mentioned.
 * We use `@fn: name1, name2, ...` to indicate local functions in db to use and
 * `@fn-url:https://...` for remote functions by URL.
 */
export const parseFunctionNames = (text: string) => {
  const fixUrl = (url: string) => {
    // Fix gist URLs to get /raw data vs. HTML
    const gistRegex = /^https:\/\/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-f0-9]+)$/;
    const match = url.match(gistRegex);
    if (match) {
      const [, username, gistId] = match;
      return `https://gist.githubusercontent.com/${username}/${gistId}/raw`;
    }

    // Use the url unchanged
    return url;
  };

  const match = text.match(/@(fn): ?([\w\s,]+)|@(fn-url): ?(https:\/\/[^\s]+)/);
  if (!match) {
    return [];
  }

  // If it's a URL, return it directly
  if (match[3] === "fn-url") {
    return [fixUrl(match[4])];
  }

  // If it's a function name or names, split it on commas and trim whitespace
  const fnNames = match[2].split(",").map((func) => func.trim());
  return fnNames;
};

/**
 * Given a list of function names/URLs, load from db or remote server
 * and parse into ChatCraftFunction objects. Any function that can't be loaded
 * by name/URL will be skipped.
 */
export const loadFunctions = async (fnNames: string[], onError?: (err: Error) => void) => {
  const fromDb = async (fnNames: string[]) => {
    const records = await db.functions
      .where("name")
      .anyOfIgnoreCase(...fnNames)
      .toArray();
    return Promise.all(records.map((record) => ChatCraftFunction.fromDB(record)));
  };

  const fromUrl = async (urls: string[]) =>
    Promise.all(
      urls.map((url) =>
        ChatCraftFunction.fromUrl(new URL(url)).catch((err) => {
          console.warn(`Unable to load remote function ${url}`, err);
          if (onError) {
            onError(new Error(`Unable to load remote function at ${url} (${err.message})`));
          }
          return undefined;
        })
      )
    );

  const [dbFuncs, urlFuncs] = await Promise.all([
    fromDb(fnNames.filter((fnName) => !fnName.startsWith("https://"))),
    fromUrl(fnNames.filter((fnName) => fnName.startsWith("https://"))),
  ]);

  // Get rid of any non-ChatCraftFunction objects from the list and return it
  // or use `undefined` if there aren't any functions to use.
  const functions = [...dbFuncs, ...urlFuncs].filter((func): func is ChatCraftFunction => !!func);
  return functions.length ? functions : undefined;
};

export const initialFunctionCode = `/**
* Example Function Module. Each function needs you to define the following:
* 1. jsdoc comment with function description and @param descriptions
* 2. exported named function in typescript
*/

/**
 * This function echoes back the input passed to it.
 * @param txt The text to echo back
 */
export async function echo(txt: string) {
 return txt;
}
`;

/**
 *  Use esbuild to parse the code and return a module we can import.
 */
const parseModule = async (ts_code: string) => {
  // strip typescript
  const js = await toJavaScript(ts_code);

  // pull out function declarations
  const functionDeclarations = parseTypeScript(ts_code);

  const blob = new Blob([js], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);
    const exportedFunctionCount = Object.keys(module).length;
    if (exportedFunctionCount === 0) {
      throw new Error("No functions exported in module");
    }
    // we only use the first function for now
    const firstFunction = functionDeclarations[0];
    // eslint-disable-next-line @typescript-eslint/ban-types
    const fn = module[firstFunction.name] as Function;

    // convert openai func( {param1:, param2...}) to func(param1, param2...)
    // eslint-disable-next-line no-inner-declarations
    function wrapper(obj: object) {
      const props = Object.values(obj);
      return fn(...props);
    }
    return {
      name: firstFunction.name,
      description: firstFunction.description || "",
      parameters: firstFunction.parameters,
      default: wrapper,
    };
  } catch (err: any) {
    console.warn("Unable to parse module", err);
    throw new Error(`Unable to parse module: ${err.message}`);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export class ChatCraftFunction {
  id: string;
  date: Date;
  name: string;
  description: string;
  parameters: object;
  code: string;

  constructor({
    id,
    date,
    name,
    description,
    parameters,
    code,
  }: {
    id?: string;
    date?: Date;
    name: string;
    description: string;
    parameters: object;
    code: string;
  }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.code = code;
  }

  get prettyName() {
    return formatFunctionName(this.id, this.name);
  }

  // If this is a remote function, use its URL. Otherwise, provide a way to load in app
  get url() {
    return this.id.startsWith("https://") ? this.id : `/f/${this.id}`;
  }

  // Convert code to an ES Module we can run
  toESModule() {
    return parseModule(this.code);
  }

  static async parse(code: string) {
    const { name, description, parameters } = await parseModule(code);
    return new ChatCraftFunction({ name, description, parameters, code });
  }

  // Find in db or load via URL
  static async find(id: string) {
    if (id.startsWith("https://")) {
      return ChatCraftFunction.fromUrl(new URL(id));
    }

    const func = await db.functions.get(id);
    if (!func) {
      return;
    }

    return new ChatCraftFunction(func);
  }

  // Save to db
  async save() {
    // Update the date to indicate we've update the chat
    this.date = new Date();

    // Try to update the name/description, since they might have changed
    try {
      const { name, description, parameters } = await this.toESModule();

      this.name = name;
      this.description = description;
      this.parameters = parameters;
    } catch (err) {
      console.error(err);
      const errorMsg = `Unable to parse code: ${(err as Error).message}`;
      this.name = "function";
      this.description = errorMsg;
      this.parameters = { error: errorMsg };
    }

    // Upsert Chat itself
    return db.functions.put(this.toDB());
  }

  // Pass args from LLM to the function and call it
  async invoke(data: object) {
    const { id } = this;
    const { name, default: fn } = await this.toESModule();

    let result: any;
    try {
      result = await fn(data);

      const text =
        typeof result === "string"
          ? result
          : formatAsCodeBlock(JSON.stringify(result, null, 2), "json");

      return new ChatCraftFunctionResultMessage({
        text,
        func: {
          id,
          name,
          result,
        },
      });
    } catch (err: any) {
      const response = `**Error**:\n\n${formatAsCodeBlock(err)}\n`;

      return new ChatCraftFunctionResultMessage({
        text: response,
        func: {
          id,
          name,
          result: err.toString(),
        },
      });
    }
  }

  toJSON() {
    return {
      id: this.id,
      date: this.date.toISOString(),
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      code: this.code,
    };
  }

  toDB(): ChatCraftFunctionTable {
    return {
      id: this.id,
      date: this.date,
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      code: this.code,
    };
  }

  toOpenAIFunction(): OpenAI.Chat.Completions.CompletionCreateParams.Function {
    const openaiParameters: Record<string, unknown> = this.parameters as Record<string, unknown>;
    return {
      name: this.name,
      description: this.description,
      parameters: openaiParameters,
    };
  }

  static async delete(id: string) {
    const func = await ChatCraftFunction.find(id);
    if (!func) {
      return;
    }

    return db.functions.delete(id);
  }

  static fromDB(func: ChatCraftFunctionTable) {
    return new ChatCraftFunction({ ...func });
  }

  static async fromUrl(url: URL) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Unable to download function: ${res.statusText}`);
    }
    const code = await res.text();
    const { name, description, parameters } = await parseModule(code);
    return new ChatCraftFunction({ id: url.href, name, description, parameters, code });
  }
}
