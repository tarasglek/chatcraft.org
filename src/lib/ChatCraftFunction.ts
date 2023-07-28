import { nanoid } from "nanoid";
import db, { ChatCraftFunctionTable } from "./db";
import { formatAsCodeBlock } from "./utils";
import { ChatCraftFunctionResultMessage } from "./ChatCraftMessage";

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
export const loadFunctions = async (fnNames: string[]) => {
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
* Example Function Module. Each function needs you to define 4 things:
*/

/* 1. Name of your function (should be unique) */
export const name = "example";

/* 2. Description of function, used to describe what it does to an LLM */
export const description = "This function echoes back the input passed to it.";

/**
* 3. A JSON Schema defining the function's parameters. See:
*
* - https://platform.openai.com/docs/guides/gpt/function-calling
* - https://json-schema.org/learn/getting-started-step-by-step
*/
export const parameters = {
 type: "object",
 properties: {
   value: {
     type: "string",
     description: "The value to echo back",
   },
   required: ["value"],
 },
};

/**
 * 4. The function itself, must be async. It should accept an Object
 * matching the schema defined in parameters and should return a Promise
 * to a string or any other JavaScript object.
 *
 * If you return a non-string, it will be displayed as JSON.
 *
 * If you return a string, you can format it as a Markdown code block
 * so that it gets displayed correctly.  For example:
 *
 * return "\`\`\`html\n" + result + "\`\`\`";
 */
export default async function (data) {
 return data.value;
}
`;

/* Turn the raw JS code into a ES Module and import so we can work with the values */
const parseModule = async (code: string) => {
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);

    // Validate that the module has what we expect
    const { name, description, parameters, default: fn } = module;
    if (typeof name !== "string") {
      throw new Error("missing `name` export");
    }
    if (typeof description !== "string") {
      throw new Error("missing `description` export");
    }
    if (!parameters) {
      throw new Error("missing `parameters` export");
    }
    if (typeof fn !== "function") {
      throw new Error("missing default function export");
    }

    return module as FunctionModule;
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
      this.name = "function";
      this.description = "unable to parse code";
      this.parameters = { error: "unable to parse code" };
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

  toLangChainFunction() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
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
