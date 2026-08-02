# enriquecimiento-a2a — waterfall enrichment del departamento de adquisicion (App A)
# Escucha en :5000 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Un COPY por archivo, destino ./ SIEMPRE (gotchas 2026-07-10 y 2026-07-27);
# test_dockerfile.py vigila la paridad COPY <-> modulos del servicio.
COPY card.py rfc.py gate_grafo.py gate_69b.py denue.py patrones.py almacen.py cascada.py executor.py app.py ./

EXPOSE 5000

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
