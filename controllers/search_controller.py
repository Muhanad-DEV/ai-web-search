from ..services.search_services import search_openalex, search_crossref, search_arxiv


def search_works(source: str, q: str, per_page: int, cursor: str):
    if source == "crossref":
        return search_crossref(q, per_page, cursor)
    if source == "arxiv":
        return search_arxiv(q, per_page, cursor)
    return search_openalex(q, per_page, cursor)


