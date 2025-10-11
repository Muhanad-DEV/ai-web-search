# OpenAlex Client + Demo

This is a lightweight, browser-friendly OpenAlex client with a simple demo page.

## Quick Start

1. Serve the folder (any static server). On macOS:

```bash
cd /Users/stan/Downloads/ai-search
python3 -m http.server 8000
```

2. Visit `http://localhost:8000/public/`.

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

`OpenAlexClient` constructor options:

- `baseUrl` (string, default `https://api.openalex.org`)
- `mailto` (string, optional; recommended by OpenAlex for polite use)

Methods:

- `searchWorks({ search, filter, sort, perPage, cursor })`
- `searchAuthors({ search, filter, sort, perPage, cursor })`
- `getWork(idOrDoi)` – accepts OpenAlex work id like `W2741809807` or a DOI like `10.1038/nature14539`
- `getAuthor(id)` – accepts OpenAlex author id like `A1969205036`

All list endpoints return `{ results, meta }` where `meta.next_cursor` can be used for pagination.

## Notes

- Consider setting a `mailto` so OpenAlex can contact you if needed.
- Use cursor-based pagination: start with `cursor: "*"` and then pass `meta.next_cursor` for the next page.


