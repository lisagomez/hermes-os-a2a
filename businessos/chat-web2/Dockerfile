# chat-web2 — daemon del chat de venta de la landing (Fase 11, Opción A).
# Escucha en :4500 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
# El edge Caddy publica /chat/stream hacia aquí; nada más de este daemon es público.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prompt.py motor.py leads.py app.py ./

EXPOSE 4500

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4500/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4500"]
