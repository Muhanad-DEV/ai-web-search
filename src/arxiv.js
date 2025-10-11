/**
 * Minimal arXiv client (no API key, Atom feed + JSON via export).
 * Docs: https://info.arxiv.org/help/api/index.html
 */

export class ArxivClient {
  /**
   * @param {{ baseUrl?: string }} [options]
   */
  constructor(options) {
    this.baseUrl = (options && options.baseUrl) || "https://export.arxiv.org/api/query";
  }

  buildUrl(params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      sp.set(k, String(v));
    }
    return `${this.baseUrl}?${sp.toString()}`;
  }

  async searchWorks(params = {}) {
    const { search = "", perPage = 10, cursor = "*" } = params;
    const start = cursor === "*" || cursor == null ? 0 : Math.max(0, parseInt(String(cursor), 10) || 0);
    // Build arXiv query: simple all: term
    const url = this.buildUrl({
      search_query: `all:${search}`,
      start,
      max_results: perPage,
      sortBy: "relevance",
    });
    const res = await fetch(url, { headers: { "Accept": "application/atom+xml" } });
    if (!res.ok) throw new Error(`arXiv request failed ${res.status}`);
    const xml = await res.text();
    const parsed = await parseAtom(xml);
    const items = parsed.entries;
    const total = parsed.totalResults || (start + items.length);
    const next = start + items.length < total ? String(start + items.length) : null;
    return { results: items, meta: { count: total, next_cursor: next } };
  }
}

async function parseAtom(xml) {
  // Lightweight XML parsing using DOMParser available in browsers. In Node, use a tiny fallback.
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const getText = (el, sel) => (el.querySelector(sel)?.textContent || "").trim();
    const totalResults = parseInt(doc.querySelector("totalResults")?.textContent || "0", 10) || 0;
    const entries = Array.from(doc.querySelectorAll("entry")).map(entry => {
      const title = getText(entry, "title");
      const summary = getText(entry, "summary");
      const year = (getText(entry, "published").slice(0,4)) || "";
      const id = getText(entry, "id");
      const doi = getText(entry, "arxiv\\:doi");
      const pdf = Array.from(entry.querySelectorAll('link[title="pdf"]')).map(a=>a.getAttribute("href")).find(Boolean) || "";
      const authors = Array.from(entry.querySelectorAll("author > name")).map(n => n.textContent || "");
      const primaryCategory = entry.querySelector("arxiv\\:primary_category")?.getAttribute("term") || "";
      const categories = Array.from(entry.querySelectorAll("category")).map(c => c.getAttribute("term") || "").filter(Boolean);
      return { id, title, year: year ? Number(year) : undefined, link: id, doi, pdf, summary, authors, categories, venue: "arXiv" };
    });
    return { totalResults, entries };
  }
  // Node fallback: naive extraction
  const entries = Array.from(xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)).map(block => {
    const text = block[0];
    const pick = (re) => (text.match(re)?.[1] || "").trim();
    const title = pick(/<title>([\s\S]*?)<\/title>/);
    const id = pick(/<id>([\s\S]*?)<\/id>/);
    const published = pick(/<published>(\d{4})/);
    const doi = pick(/<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/);
    const pdf = pick(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    const authors = Array.from(text.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)).map(m => m[1]);
    const categories = Array.from(text.matchAll(/<category[^>]*term="([^"]+)"/g)).map(m => m[1]);
    return { id, title, year: published ? Number(published) : undefined, link: id, doi, pdf, authors, categories, venue: "arXiv" };
  });
  const totalResults = parseInt((xml.match(/<totalResults>(\d+)<\/totalResults>/)?.[1] || "0"), 10) || 0;
  return { totalResults, entries };
}

export const arxiv = new ArxivClient();
export default ArxivClient;



