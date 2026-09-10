from fastapi import FastAPI

from app.api.routes import router
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title="Local Telugu TTS",
    version="2.0.0",
    description="Local IndicF5 Telugu Text-to-Speech service.",
)

app.include_router(router)