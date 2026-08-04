# crm-canales — conector de canales del CRM marca blanca (CRM-0).
# Escucha en :4600 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
# El edge Caddy publica /crm/* hacia aquí; nada más de este servicio es público.
# GOTCHA 2026-07-10: todo módulo nuevo del servicio DEBE añadirse al COPY.
# CONTEXTO DE BUILD = businessos/ (no este dir): el COPY cross-context trae el
# módulo compartido guardia-presupuesto (patrón trio-contrato). Ver compose.
FROM python:3.12-slim

WORKDIR /app

COPY crm-canales/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY crm-canales/prompt.py crm-canales/motor.py crm-canales/store.py \
     crm-canales/canales.py crm-canales/sup.py crm-canales/leads.py \
     crm-canales/calificador.py crm-canales/app.py ./
# Módulo compartido de plataforma (guardia de presupuesto IA)
COPY guardia-presupuesto/guardia.py ./

EXPOSE 4600

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4600/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4600"]
