# flujos-a2a — proxy de lectura del grafo para el explorador (App C, paso 2)
# Escucha en :5100; el compose lo publica solo en 127.0.0.1 (nunca al navegador).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY schemas.py app.py ./

EXPOSE 5100

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5100/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5100"]
