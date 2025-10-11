/**
 * Minimal Crossref client (no key required).
 * Docs: https://api.crossref.org/swagger-ui/index.html
 */

export class CrossrefClient {
  /**
   * @param {{ baseUrl?: string, mailto?: string }} [options]
   */
  constructor(options) {
    this.baseUrl = (options && options.baseUrl) || "https://api.crossref.org";
    this.mailto = (options && options.mailto) || undefined;
  }

  /**
   * @param {string} path
   * @param {Record<string, string|number|boolean|null|undefined>} [params]
   */
  buildUrl(path, params) {
    const url = new URL(path, this.baseUrl);
    const sp = new URLSearchParams();
    if (params) {
      for (const [k,v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        sp.set(k, String(v));
      }
    }
    if (this.mailto) sp.set("mailto", this.mailto);
    url.search = sp.toString();
    return url.toString();
  }

  async fetchJson(url) {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Crossref request failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /**
   * Search works (articles) using Crossref.
   * Pagination: offset + rows. We'll adapt to OpenAlex-like response shape.
   * @param {{ search?: string, perPage?: number, cursor?: string|null }} [params]
   * @returns {Promise<{ results: any[], meta: { count: number, next_cursor: string|null } }>}
   */
  async searchWorks(params = {}) {
    const { search = "", perPage = 25, cursor = "*" } = params;
    const offset = cursor === "*" || cursor == null ? 0 : Math.max(0, parseInt(String(cursor), 10) || 0);
    const url = this.buildUrl("/works", {
      query: search,
      rows: perPage,
      offset,
      sort: "relevance",
      order: "desc",
    });
    const data = await this.fetchJson(url);
    const message = data && data.message ? data.message : { items: [], ["total-results"]: 0 };
    const items = Array.isArray(message.items) ? message.items : [];
    const total = typeof message["total-results"] === "number" ? message["total-results"] : 0;
    const nextOffset = offset + items.length < total ? offset + items.length : null;
    return {
      results: items,
      meta: { count: total, next_cursor: nextOffset == null ? null : String(nextOffset) },
    };
  }
}

export const crossref = new CrossrefClient();
export default CrossrefClient;


