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
    matchPattern: RegExp | string;
  }) {
    this.handlerUrl = handlerUrl;
    this.method = method;
    this.matchPattern = matchPattern instanceof RegExp ? matchPattern : new RegExp(matchPattern);
  }

  isMatchingHandler(message: string) {
    return this.matchPattern.test(message);
  }

  async executeHandler(message: string): Promise<string> {
    const requestUrl = new URL(this.handlerUrl);

    const params = new URLSearchParams();
    params.append("url", message);

    requestUrl.search = params.toString();

    const response = await fetch(requestUrl, {
      method: this.method,
    });

    const content = (await response.text()).trim();

    const resultHeader = `**Web Handler**: [${this.handlerUrl}](${this.handlerUrl})?url=[${message}](${message})`;
    const text = `${resultHeader}\n\n` + content;

    return text;
  }

  static getMatchingHandler(message: string): WebHandler | null {
    return (
      this.getRegisteredHandlers().find((handler) => handler.isMatchingHandler(message)) ?? null
    );
  }

  static getRegisteredHandlers(): WebHandler[] {
    const supportedHandlers = JSON.parse(
      localStorage.getItem(webHandlersLocalStorageKey) ?? ""
    ).map((handler: WebHandler) => new WebHandler(handler));

    return supportedHandlers;
  }

  isValidHandler(): boolean {
    return !!this.handlerUrl && !!this.method && !!this.matchPattern;
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

export const defaultWebHandlers: WebHandlers = [
  new WebHandler({
    handlerUrl: "https://taras-scrape2md.web.val.run/",
    method: HttpMethod.GET,
    matchPattern: /^https:\/\/\S+$/,
  }),
];

export const webHandlersLocalStorageKey = "webHandlers";

export type WebHandlers = WebHandler[];
