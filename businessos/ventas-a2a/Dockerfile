# ventas-a2a — puerta comercial A2A del departamento de adquisicion (Fase 9)
# Escucha en :4400 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY card.py oferta.py leads.py executor.py app.py ./

EXPOSE 4400

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4400/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4400"]
