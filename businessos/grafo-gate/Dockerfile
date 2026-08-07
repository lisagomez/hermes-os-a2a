# grafo-gate — puerta pública del grafo (token Bearer, fail-closed).
# Escucha en :5200 dentro de hermes-net; el público entra por el edge (Caddy).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py asgi.py ./

EXPOSE 5200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5200/health', timeout=4)"]

CMD ["uvicorn", "asgi:app", "--host", "0.0.0.0", "--port", "5200"]
