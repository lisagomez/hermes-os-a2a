"""Entry de uvicorn: construye la app desde el environment (fail-closed)."""
from app import crear_app

app = crear_app()
