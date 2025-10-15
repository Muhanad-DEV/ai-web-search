import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

from .routes.api import api_router


def create_app() -> FastAPI:
    app = FastAPI(title="AI Web Search API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
    )

    if os.path.isdir("public"):
        app.mount("/public", StaticFiles(directory="public", html=True), name="public")

    @app.get("/")
    def root():
        return RedirectResponse(url="/public/")

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()


