# grafo-a2a — el grafo como agente A2A independiente (Fase 5, PRP-005)
# Escucha en :4000 dentro de hermes-net; sin puertos publicos (ver compose).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY card.py executor.py app.py ./

EXPOSE 4000

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4000/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4000"]
