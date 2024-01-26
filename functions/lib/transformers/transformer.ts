export interface Transformer {
  shouldTransform(url: URL): Promise<boolean>;
  transformUrl(url: URL): Promise<URL>;
  fetchData(url: URL): Promise<Response>;
  transformResponse(res: Response): Promise<Response>;
  process(url: URL): Promise<Response>;
}

export class DefaultTransformer implements Transformer {
  // If the URL gets altered by this transformer, we should run it.
  // However, if you need to transform something other than the URL
  // you can override this manually.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldTransform(url: URL) {
    return true;
  }

  async transformUrl(url: URL) {
    // By default, do nothing to the URL
    return url;
  }

  async fetchData(url: URL) {
    // By default, do a normal fetch
    url = await this.transformUrl(url);
    return fetch(url, { headers: { "User-Agent": "chatcraft.org" } });
  }

  async transformResponse(res: Response) {
    // By default, do nothing to the Response
    return res;
  }

  async process(url: URL) {
    const res = await this.fetchData(url);
    return this.transformResponse(res);
  }
}
