import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import projects, tasks

app = FastAPI(title="Fokus API", version="1.0.0")

# Allow localhost for dev + configurable production origin
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if os.environ.get("FRONTEND_URL"):
    allowed_origins.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Fokus API"}
