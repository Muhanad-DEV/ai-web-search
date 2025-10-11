/**
 * OpenAlex Client - lightweight browser-friendly wrapper.
 * Docs: https://docs.openalex.org/
 *
 * Usage (ESM):
 * import { OpenAlexClient } from "./src/openalex.js";
 * const client = new OpenAlexClient({ mailto: "you@example.com" });
 * const { results } = await client.searchWorks({ search: "large language models" });
 */

/**
 * @typedef {Object} OAAuthorship
 * @property {{id?: string, display_name: string}} author
 * @property {string=} author_position
 */

/**
 * @typedef {Object} OAWork
 * @property {string} id
 * @property {string} display_name
 * @property {number=} publication_year
 * @property {{display_name?: string} | null=} primary_location
 * @property {string[]=} related_works
 * @property {string=} doi
 * @property {OAAuthorship[]=} authorships
 */

/**
 * @typedef {Object} OAAuthor
 * @property {string} id
 * @property {string} display_name
 * @property {number=} works_count
 * @property {number=} cited_by_count
 */

/**
 * @typedef {Object} OAListResponseMeta
 * @property {number} count
 * @property {string|null} next_cursor
 */

/**
 * @template T
 * @typedef {Object} OAListResponse
 * @property {T[]} results
 * @property {OAListResponseMeta} meta
 */

/**
 * @typedef {Object} SearchParams
 * @property {string=} search  Free-text search (e.g., "neural networks").
 * @property {string=} filter  Raw filter string per OpenAlex (e.g., "from_publication_date:2023-01-01").
 * @property {string=} sort    Sort spec (e.g., "cited_by_count:desc").
 * @property {number=} perPage Number of items per page (default 25, max 200).
 * @property {string|null=} cursor Cursor for pagination (null or "*" for first page).
 */

export class OpenAlexClient {
  /**
   * @param {{ baseUrl?: string, mailto?: string }} [options]
   */
  constructor(options) {
    this.baseUrl = (options && options.baseUrl) || "https://api.openalex.org";
    this.mailto = (options && options.mailto) || undefined;
  }

  /**
   * Build a URL with query params, adding polite mailto if provided.
   * @param {string} path
   * @param {Record<string, string|number|boolean|null|undefined>} [params]
   * @returns {string}
   */
  buildUrl(path, params) {
    const url = new URL(path, this.baseUrl);
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        searchParams.set(key, String(value));
      }
    }
    if (this.mailto) {
      searchParams.set("mailto", this.mailto);
    }
    url.search = searchParams.toString();
    return url.toString();
  }

  /**
   * Internal fetch wrapper with basic error handling.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async fetchJson(url) {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAlex request failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  /**
   * Search Works.
   * @param {SearchParams} [params]
   * @returns {Promise<OAListResponse<OAWork>>}
   */
  async searchWorks(params = {}) {
    const { search, filter, sort, perPage = 25, cursor = "*" } = params;
    const url = this.buildUrl("/works", {
      search,
      filter,
      sort,
      per_page: perPage,
      cursor,
    });
    return this.fetchJson(url);
  }

  /**
   * Search Authors.
   * @param {SearchParams} [params]
   * @returns {Promise<OAListResponse<OAAuthor>>}
   */
  async searchAuthors(params = {}) {
    const { search, filter, sort, perPage = 25, cursor = "*" } = params;
    const url = this.buildUrl("/authors", {
      search,
      filter,
      sort,
      per_page: perPage,
      cursor,
    });
    return this.fetchJson(url);
  }

  /**
   * Get a single Work by OpenAlex ID (e.g., "W2741809807") or DOI (e.g., "10.1038/nature14539").
   * @param {string} idOrDoi
   * @returns {Promise<OAWork>}
   */
  async getWork(idOrDoi) {
    const identifier = this.normalizeIdentifier(idOrDoi, "works");
    const url = this.buildUrl(`/${identifier}`);
    return this.fetchJson(url);
  }

  /**
   * Get a single Author by OpenAlex ID (e.g., "A1969205036").
   * @param {string} id
   * @returns {Promise<OAAuthor>}
   */
  async getAuthor(id) {
    const identifier = this.normalizeIdentifier(id, "authors");
    const url = this.buildUrl(`/${identifier}`);
    return this.fetchJson(url);
  }

  /**
   * Convert a short id or DOI to the full path (e.g., "works/W..." or "works/doi:...").
   * @param {string} value
   * @param {"works"|"authors"} entity
   * @returns {string}
   */
  normalizeIdentifier(value, entity) {
    if (!value) throw new Error("Missing identifier");
    const trimmed = value.trim();
    if (trimmed.startsWith(entity + "/")) return trimmed;
    if (entity === "works" && (trimmed.startsWith("10.") || trimmed.includes("/"))) {
      return `${entity}/doi:${trimmed}`;
    }
    return `${entity}/${trimmed}`;
  }
}

/**
 * Convenience factory using a module-level singleton when desired.
 */
export const openAlex = new OpenAlexClient();

export default OpenAlexClient;


