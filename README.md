# OpenAlex Client + Demo

This is a lightweight, browser-friendly OpenAlex client with a simple demo page.

## Quick Start

1. Start the FastAPI backend (installs deps and runs the server):

```bash
cd /Users/stan/Downloads/ai-search
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Dev (auto-reload):
uvicorn app:app --reload --port 8000
# Prod (Render, etc.):
gunicorn -k uvicorn.workers.UvicornWorker app:app
```

2. Open `http://localhost:8000/public/` in your browser.

## Use in your site

```html
<script type="module">
  import { OpenAlexClient } from "/src/openalex.js";
  const client = new OpenAlexClient({ mailto: "you@example.com" });
  const { results } = await client.searchWorks({ search: "large language models", perPage: 5 });
  console.log(results);
<\/script>
```

## API

Backend API (FastAPI):

- `GET /api/search?source={openalex|crossref|arxiv}&entity=works&q=QUERY&per_page=10&cursor=*`
  - Returns `{ results, meta: { count, next_cursor } }`
  - arXiv results are normalized and always open access

## Notes

- Consider setting a `mailto` so OpenAlex can contact you if needed.
- Use cursor-based pagination: start with `cursor: "*"` and then pass `meta.next_cursor` for the next page.


