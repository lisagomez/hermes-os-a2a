# sup-crm — supervisor del CRM (CRM-1). INTERNO: solo hermes-net, sin edge.
# GOTCHA 2026-07-10: todo módulo nuevo del servicio DEBE añadirse al COPY.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY gates.py juez.py app.py ./

EXPOSE 4700

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4700/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4700"]
