"""FastAPI application entrypoint."""

from fastapi import FastAPI

app = FastAPI(title="ProjectNotes API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
