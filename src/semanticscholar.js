/**
 * Minimal Semantic Scholar client.
 * Public docs: https://api.semanticscholar.org/api-docs/
 * No key needed for basic usage, but rate limits apply.
 */

export class SemanticScholarClient {
  /**
   * @param {{ baseUrl?: string }} [options]
   */
  constructor(options) {
    this.baseUrl = (options && options.baseUrl) || "https://api.semanticscholar.org/graph/v1";
  }

  buildUrl(path, params) {
    const url = new URL(path, this.baseUrl);
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        sp.set(k, String(v));
      }
    }
    url.search = sp.toString();
    return url.toString();
  }

  async fetchJson(url) {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Semantic Scholar request failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /**
   * Search papers.
   * @param {{ search?: string, perPage?: number, cursor?: string|null }} [params]
   * @returns {Promise<{ results: any[], meta: { count: number, next_cursor: string|null } }>}
   */
  async searchPapers(params = {}) {
    const { search = "", perPage = 10, cursor = "*" } = params;
    const offset = cursor === "*" || cursor == null ? 0 : Math.max(0, parseInt(String(cursor), 10) || 0);
    const fields = [
      "title",
      "year",
      "externalIds",
      "url",
      "venue",
      "publicationTypes",
      "publicationVenue",
      "isOpenAccess",
      "openAccessPdf",
      "authors.name",
      "abstract",
      "fieldsOfStudy",
      "tldr",
    ].join(",");
    const url = this.buildUrl("/paper/search", {
      query: search,
      limit: perPage,
      offset,
      fields,
    });
    const data = await this.fetchJson(url);
    const total = typeof data.total === "number" ? data.total : 0;
    const items = Array.isArray(data.data) ? data.data : [];
    const nextOffset = offset + items.length < total ? offset + items.length : null;
    return {
      results: items,
      meta: { count: total, next_cursor: nextOffset == null ? null : String(nextOffset) },
    };
  }
}

export const semanticscholar = new SemanticScholarClient();
export default SemanticScholarClient;


