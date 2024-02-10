export interface Rewriter {
  shouldRewrite(url: URL): Promise<boolean>;
  rewriteUrl(url: URL): Promise<URL>;
  fetchData(url: URL): Promise<Response>;
  rewriteResponse(res: Response): Promise<Response>;
  process(url: URL): Promise<Response>;
}

export class DefaultRewriter implements Rewriter {
  // If the URL gets altered by this rewriter, we should run it.
  // However, if you need to rewrite something other than the URL
  // you can override this manually.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldRewrite(url: URL) {
    return true;
  }

  async rewriteUrl(url: URL) {
    // By default, do nothing to the URL
    return url;
  }

  async fetchData(url: URL) {
    // By default, do a normal fetch
    url = await this.rewriteUrl(url);
    return fetch(url, { headers: { "User-Agent": "chatcraft.org" } });
  }

  async rewriteResponse(res: Response) {
    // By default, do nothing to the Response
    return res;
  }

  async process(url: URL) {
    const res = await this.fetchData(url);
    return this.rewriteResponse(res);
  }
}
