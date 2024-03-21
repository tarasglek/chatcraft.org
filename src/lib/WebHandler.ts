import { guessType } from "./commands/ImportCommand";

export class WebHandler {
  handlerUrl: string;
  method: HttpMethod;
  matchPattern: RegExp;

  constructor({
    handlerUrl,
    method,
    matchPattern,
  }: {
    handlerUrl: string;
    method: HttpMethod;
    matchPattern: RegExp;
  }) {
    this.handlerUrl = handlerUrl;
    this.method = method;
    this.matchPattern = matchPattern;
  }

  isMatchingHandler(url: string) {
    return this.matchPattern.test(url);
  }

  async executeHandler(url: string): Promise<string> {
    url = extractFirstUrl(url) ?? ""; // When the input is not a url itself

    const params = new URLSearchParams();
    params.append("url", url);

    let requestUrl: string | URL = "";
    if (URL.canParse(this.handlerUrl)) {
      requestUrl = new URL(this.handlerUrl);

      requestUrl.search = params.toString();
    } else {
      requestUrl = `${this.handlerUrl}?${params.toString()}`;
    }

    const response = await fetch(requestUrl, {
      method: this.method,
    });

    const type = guessType(response.headers.get("Content-Type"));
    const content = (await response.text()).trim();

    const command = `**Web Handler**: [${this.handlerUrl}](${this.handlerUrl})?url=[${url}](${url})`;
    const text =
      `${command}\n\n` +
      // If it's already markdown, dump it into the message as is;
      // otherwise, wrap it in a code block with appropriate type
      (type === "markdown" ? content : `\`\`\`${type}\n${content}` + `\n\`\`\``);

    return text;
  }

  static getMatchingHandler(url: string): WebHandler | null {
    return this.getRegisteredHandlers().find((handler) => handler.isMatchingHandler(url)) ?? null;
  }

  static getRegisteredHandlers(): WebHandler[] {
    // TODO: Fetch from localStorage

    const supportedHandlers = [
      new WebHandler({
        handlerUrl: "/api/proxy",
        method: HttpMethod.GET,
        matchPattern: /^\/import https?:\/\/\S+/,
      }),
      new WebHandler({
        handlerUrl: "https://taras-scrape2md.web.val.run/",
        method: HttpMethod.GET,
        matchPattern: /^https:\/\/\S+/,
      }),
    ];

    return supportedHandlers;
  }
}

export enum HttpMethod {
  CONNECT = "CONNECT",
  DELETE = "DELETE",
  GET = "GET",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
  PATCH = "PATCH",
  POST = "POST",
  PUT = "PUT",
  TRACE = "TRACE",
}

function extractFirstUrl(text: string) {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/;

  // Match the first URL found in the text
  const match = text.match(urlRegex);

  // If a URL is found, return it, otherwise return null
  return match ? match[0] : null;
}
