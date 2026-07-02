# grafo — cerebro regulatorio fiscal de BusinessOS (Fase 2)
# Escucha en :3000 dentro de hermes-net; sin puertos publicos (ver compose).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY evaluador.py schemas.py db.py app.py ./

EXPOSE 3000

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3000"]
