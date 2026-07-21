# crm-canales — conector de canales del CRM marca blanca (CRM-0).
# Escucha en :4600 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
# El edge Caddy publica /crm/* hacia aquí; nada más de este servicio es público.
# GOTCHA 2026-07-10: todo módulo nuevo del servicio DEBE añadirse al COPY.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prompt.py motor.py store.py canales.py sup.py app.py ./

EXPOSE 4600

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4600/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4600"]
