import os
from urllib.parse import urlencode
from typing import Optional, Dict, Any

import requests
import feedparser
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles


app = FastAPI(title="AI Web Search API")

# CORS so GitHub Pages (or any static host) can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Serve /public for local use; on GitHub Pages the frontend is hosted separately
if os.path.isdir("public"):
    app.mount("/public", StaticFiles(directory="public", html=True), name="public")


def http_get_json(url: str, headers: Optional[Dict[str, str]] = None) -> Any:
    default_headers = {
        "Accept": "application/json",
        # Some APIs (e.g., Crossref) require a descriptive User-Agent
        "User-Agent": os.environ.get("HTTP_USER_AGENT", "ai-search/0.1 (+https://localhost)"),
    }
    merged_headers = {**default_headers, **(headers or {})}
    resp = requests.get(url, headers=merged_headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def is_oa_openalex_work(w: Dict[str, Any]) -> bool:
    return bool(
        (w and w.get("best_oa_location"))
        or (w and w.get("open_access") and w["open_access"].get("is_oa"))
    )


def is_oa_crossref_item(w: Dict[str, Any]) -> bool:
    # Heuristic: license array present or link array present
    return bool(
        (isinstance(w.get("license"), list) and len(w["license"]) > 0)
        or (isinstance(w.get("link"), list) and len(w["link"]) > 0)
    )


def is_oa_arxiv_item(w: Dict[str, Any]) -> bool:
    # arXiv is generally OA, but prefer pdf/link presence
    return bool(w.get("pdf") or w.get("link") or True)


def sort_oa_first(source: str, entity: str, data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if entity != "works":
            return data
        items = data.get("results")
        if not isinstance(items, list):
            return data
        if source == "openalex":
            items.sort(key=lambda w: 1 if is_oa_openalex_work(w) else 0, reverse=True)
        elif source == "crossref":
            items.sort(key=lambda w: 1 if is_oa_crossref_item(w) else 0, reverse=True)
        elif source == "arxiv":
            items.sort(key=lambda w: 1 if is_oa_arxiv_item(w) else 0, reverse=True)
        data["results"] = items
        return data
    except Exception:
        return data


def search_openalex_works(q: str, per_page: int, cursor: str) -> Dict[str, Any]:
    base = "https://api.openalex.org/works"
    params = {"search": q or None, "per_page": per_page, "cursor": cursor or "*"}
    url = f"{base}?{urlencode({k: v for k, v in params.items() if v})}"
    data = http_get_json(url)
    return data


def search_openalex_authors(q: str, per_page: int, cursor: str) -> Dict[str, Any]:
    base = "https://api.openalex.org/authors"
    params = {"search": q or None, "per_page": per_page, "cursor": cursor or "*"}
    url = f"{base}?{urlencode({k: v for k, v in params.items() if v})}"
    data = http_get_json(url)
    return data


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

@app.get("/")
def root():
    # Redirect to /public/ for local usage
    return RedirectResponse(url="/public/")


@app.get("/api/search")
def api_search(
    source: str = Query("openalex", enum=["openalex", "crossref", "arxiv"]),
    entity: str = Query("works"),
    q: str = Query(""),
    per_page: int = Query(10, ge=1, le=200),
    cursor: str = Query("*"),
):
    try:
        if entity == "authors":
            # Only OpenAlex supports authors in our API
            if source != "openalex":
                return JSONResponse({"results": [], "meta": {"count": 0, "next_cursor": None}})
            data = search_openalex_authors(q, per_page, cursor)
        else:  # works
            if source == "crossref":
                data = search_crossref(q, per_page, cursor)
            elif source == "arxiv":
                data = search_arxiv(q, per_page, cursor)
            else:
                data = search_openalex_works(q, per_page, cursor)
        # OA-first ordering for works across sources
        data = sort_oa_first(source=source, entity=entity, data=data)
        return JSONResponse(data)
    except requests.HTTPError as e:
        return JSONResponse({"error": str(e), "details": getattr(e.response, "text", "")}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    # Local dev: uvicorn app:app --reload
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)