# buzon-a2a — gestor de correo institucional operado por agentes (HERALDO-6).
# Escucha en :4900 dentro de hermes-net; expuesto SOLO a 127.0.0.1 (ver compose).
# SIN credenciales de correo: la entrada es ingerir-entrantes.py y la salida
# enviar-salientes.py (host-jobs). Este contenedor solo redacta y clasifica.
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# COPY explicito archivo por archivo: un modulo nuevo EXIGE su linea aqui
# (aprendizaje 2026-07-10: los tests de dev no cazan un COPY faltante).
COPY card.py politicas.py saneado.py correos.py redactor.py executor.py app.py ./
EXPOSE 4900
# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4900/health', timeout=4)"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4900"]
