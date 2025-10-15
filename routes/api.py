from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..controllers.search_controller import search_works


api_router = APIRouter()


@api_router.get("/search")
def api_search(
    source: str = Query("openalex", enum=["openalex", "crossref", "arxiv"]),
    entity: str = Query("works"),
    q: str = Query(""),
    per_page: int = Query(10, ge=1, le=200),
    cursor: str = Query("*"),
):
    if entity != "works":
        return JSONResponse({"results": [], "meta": {"count": 0, "next_cursor": None}})
    data = search_works(source=source, q=q, per_page=per_page, cursor=cursor)
    return JSONResponse(data)


