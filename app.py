import os
from urllib.parse import urlencode
from flask import Flask, send_from_directory, request, jsonify
import requests


app = Flask(__name__, static_folder="public", static_url_path="/public")


def http_get_json(url: str, headers: dict | None = None):
    resp = requests.get(url, headers=headers or {"Accept": "application/json"}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def search_openalex(q: str, per_page: int, cursor: str):
    base = "https://api.openalex.org/works"
    params = {"search": q or None, "per_page": per_page, "cursor": cursor or "*"}
    url = f"{base}?{urlencode({k: v for k, v in params.items() if v})}"
    data = http_get_json(url)
    return data


def search_crossref(q: str, per_page: int, cursor: str):
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


def search_arxiv(q: str, per_page: int, cursor: str):
    start = 0 if not cursor or cursor == "*" else max(0, int(cursor))
    base = "https://export.arxiv.org/api/query"
    params = {
        "search_query": f"all:{q}" if q else "all:*",
        "start": start,
        "max_results": per_page,
        "sortBy": "relevance",
    }
    url = f"{base}?{urlencode(params)}"
    # arXiv returns Atom XML; proxy it raw to the frontend parser is cumbersome.
    # Instead, do a quick server-side parse for the minimal fields using feedparser.
    import feedparser  # lightweight
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
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/search")
def api_search():
    source = request.args.get("source", "openalex")
    entity = request.args.get("entity", "works")
    q = request.args.get("q", "")
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 200)
    cursor = request.args.get("cursor", "*")

    try:
        if entity != "works":
            return jsonify({"results": [], "meta": {"count": 0, "next_cursor": None}})
        if source == "crossref":
            data = search_crossref(q, per_page, cursor)
        elif source == "arxiv":
            data = search_arxiv(q, per_page, cursor)
        else:
            data = search_openalex(q, per_page, cursor)
        return jsonify(data)
    except requests.HTTPError as e:
        return jsonify({"error": str(e), "details": getattr(e.response, "text", "")}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)


