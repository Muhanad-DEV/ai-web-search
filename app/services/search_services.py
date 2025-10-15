from typing import Optional, Dict, Any
from urllib.parse import urlencode
import requests
import feedparser


def http_get_json(url: str, headers: Optional[Dict[str, str]] = None) -> Any:
    resp = requests.get(url, headers=headers or {"Accept": "application/json"}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def search_openalex(q: str, per_page: int, cursor: str) -> Dict[str, Any]:
    base = "https://api.openalex.org/works"
    params = {"search": q or None, "per_page": per_page, "cursor": cursor or "*"}
    url = f"{base}?{urlencode({k: v for k, v in params.items() if v})}"
    return http_get_json(url)


def search_crossref(q: str, per_page: int, cursor: str) -> Dict[str, Any]:
    base = "https://api.crossref.org/works"
    offset = 0 if not cursor or cursor == "*" else max(0, int(cursor))
    params = {"query": q or "", "rows": per_page, "offset": offset, "sort": "relevance", "order": "desc"}
    url = f"{base}?{urlencode(params)}"
    data = http_get_json(url)
    message = data.get("message", {})
    items = message.get("items", [])
    total = message.get("total-results", 0)
    next_cursor = str(offset + len(items)) if offset + len(items) < total else None
    return {"results": items, "meta": {"count": total, "next_cursor": next_cursor}}


def search_arxiv(q: str, per_page: int, cursor: str) -> Dict[str, Any]:
    start = 0 if not cursor or cursor == "*" else max(0, int(cursor))
    base = "https://export.arxiv.org/api/query"
    params = {
        "search_query": f"all:{q}" if q else "all:*",
        "start": start,
        "max_results": per_page,
        "sortBy": "relevance",
    }
    url = f"{base}?{urlencode(params)}"
    feed = feedparser.parse(url)
    total = getattr(feed, "opensearch_totalresults", None)
    try:
        total_i = int(total) if total is not None else start + len(feed.entries)
    except Exception:
        total_i = start + len(feed.entries)
    results = []
    for e in feed.entries:
        title = getattr(e, "title", "")
        link = getattr(e, "link", "")
        pdf = ""
        for l in getattr(e, "links", []) or []:
            if l.get("type") == "application/pdf" or l.get("title") == "pdf":
                pdf = l.get("href")
                break
        year = None
        if getattr(e, "published", ""):
            try:
                year = int(e.published[:4])
            except Exception:
                year = None
        doi = getattr(e, "arxiv_doi", None) or ""
        authors = [a.get("name") for a in getattr(e, "authors", []) or []]
        categories = [t.get("term") for t in getattr(e, "tags", []) or []]
        results.append({
            "title": title,
            "link": link,
            "pdf": pdf,
            "year": year,
            "doi": doi,
            "authors": authors,
            "categories": categories,
        })
    next_cursor = str(start + len(results)) if start + len(results) < total_i else None
    return {"results": results, "meta": {"count": total_i, "next_cursor": next_cursor}}


