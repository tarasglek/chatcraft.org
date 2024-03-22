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
    const requestUrl = new URL(this.handlerUrl);

    const params = new URLSearchParams();
    params.append("url", url);

    requestUrl.search = params.toString();

    const response = await fetch(requestUrl, {
      method: this.method,
    });

    // const type = guessType(response.headers.get("Content-Type"));
    const content = (await response.text()).trim();

    const messageHeader = `**Web Handler**: [${this.handlerUrl}](${this.handlerUrl})?url=[${url}](${url})`;
    const text = `${messageHeader}\n\n` + content;

    return text;
  }

  static getMatchingHandler(url: string): WebHandler | null {
    return this.getRegisteredHandlers().find((handler) => handler.isMatchingHandler(url)) ?? null;
  }

  static getRegisteredHandlers(): WebHandler[] {
    // TODO: Fetch from localStorage

    const supportedHandlers = [
      new WebHandler({
        handlerUrl: "https://taras-scrape2md.web.val.run/",
        method: HttpMethod.GET,
        matchPattern: /^https:\/\/\S+$/,
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
