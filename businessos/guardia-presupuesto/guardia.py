"""guardia.py — Guardia de presupuesto IA (módulo compartido de plataforma).

Pieza 1 de la integración marca blanca (INTEGRACION-whatsapp-marca-blanca.md §3):
verifica el presupuesto del tenant ANTES de cada llamada al modelo — convierte la
medición (token_usage) en control. Vive FUERA de cualquier servicio a propósito:
si estuviera dentro del CRM, en tres meses habría tres guardias distintas. Se
consume con el patrón trio-contrato: COPY explícito en el Dockerfile del servicio
+ sys.path.insert en su conftest.

Doctrina:
· Fail-closed VISIBLE: sin fila en presupuestos_ia → BLOQUEO 'sin_presupuesto'
  (mismo criterio que el gate 69-B: sin dato no hay permiso); Supabase inaccesible
  → BLOQUEO 'guardia_no_disponible'. Nunca un best-effort silencioso.
· Estado seguro explícito: el consumidor debe llevar el caso a atención humana
  cuando la decisión es bloqueo (aquí solo se decide, no se escala).
· Un solo ledger: el gasto se registra en token_usage (task_id NO nulo — el índice
  único parcial del agregado diario choca con task_id null, gotcha 2026-07-11) y
  el costo viene del proveedor (usage.cost de OpenRouter), no de un catálogo
  propio que derive. Sin costo del proveedor → 0 declarado; el ingest nocturno
  v3 lo recalcula o lo declara como hueco.
"""
from __future__ import annotations

import datetime
import logging
import os
from dataclasses import dataclass

import httpx

log = logging.getLogger("guardia-presupuesto")

TIMEOUT_S = 10.0
MODELO_BASICO_DEFAULT = "google/gemini-2.5-flash-lite"
MODELO_AVANZADO_DEFAULT = "anthropic/claude-sonnet-4.6"

CLASES = ("basica", "avanzada")


@dataclass(frozen=True)
class Decision:
    """Resultado de la guardia. `permitido=False` exige estado seguro explícito
    en el consumidor (caso a atención humana + fallo visible)."""

    permitido: bool
    motivo: str  # ok | sin_presupuesto | tope_mensual | tope_degradar | tope_avisar | guardia_no_disponible
    modelo: str | None  # modelo a usar según routing por clase; None si bloqueado
    degradado: bool = False
    aviso: bool = False  # cruzó umbral_aviso (o está al tope en modo avisar/degradar)
    gasto_mes: float | None = None
    limite: float | None = None


def mes_rango(hoy: datetime.date) -> tuple[str, str]:
    """[primer día del mes, primer día del siguiente) — jamás 'lte <mes>-31'
    (revienta el parser de fechas en meses cortos, gotcha 2026-07-29)."""
    inicio = hoy.replace(day=1)
    if inicio.month == 12:
        fin = inicio.replace(year=inicio.year + 1, month=1)
    else:
        fin = inicio.replace(month=inicio.month + 1)
    return inicio.isoformat(), fin.isoformat()


class GuardiaPresupuesto:
    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
        modelo_basico: str | None = None,
        modelo_avanzado: str | None = None,
    ) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self._http = http_client
        self._basico = modelo_basico or os.environ.get("GUARDIA_MODELO_BASICO", MODELO_BASICO_DEFAULT)
        self._avanzado = modelo_avanzado or os.environ.get("GUARDIA_MODELO_AVANZADO", MODELO_AVANZADO_DEFAULT)

    def _headers(self) -> dict:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }

    def _modelo(self, clase: str) -> str:
        return self._avanzado if clase == "avanzada" else self._basico

    async def _get(self, client: httpx.AsyncClient, path: str) -> list:
        resp = await client.get(f"{self._url}/rest/v1/{path}", headers=self._headers())
        if resp.status_code != 200:
            raise RuntimeError(f"PostgREST HTTP {resp.status_code}: {resp.text[:200]}")
        return resp.json()

    async def evaluar(self, tenant_id: str, clase: str = "basica") -> Decision:
        """Decide ANTES de llamar al modelo. Nunca lanza: todo camino degradado
        devuelve una Decision con motivo explícito (y se loguea)."""
        if clase not in CLASES:
            clase = "basica"
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            cfg_filas = await self._get(
                client, f"presupuestos_ia?tenant_id=eq.{tenant_id}&select=*"
            )
            if not cfg_filas:
                log.error(
                    "guardia BLOQUEA (tenant=%s): sin fila en presupuestos_ia (fail-closed)",
                    tenant_id,
                )
                return Decision(False, "sin_presupuesto", None)
            cfg = cfg_filas[0]
            limite = float(cfg["limite_mensual"])
            umbral = float(cfg.get("umbral_aviso") or 0.8)
            accion = cfg.get("accion_al_tope") or "bloquear"

            gte, lt = mes_rango(datetime.date.today())
            filas = await self._get(
                client,
                f"token_usage?tenant_id=eq.{tenant_id}&fecha=gte.{gte}&fecha=lt.{lt}&select=costo_usd",
            )
            gasto = round(sum(float(f.get("costo_usd") or 0) for f in filas), 6)

            if gasto >= limite:
                if accion == "degradar":
                    log.warning(
                        "guardia DEGRADA (tenant=%s): gasto %.4f >= límite %.2f → modelo económico",
                        tenant_id, gasto, limite,
                    )
                    return Decision(True, "tope_degradar", self._basico,
                                    degradado=True, aviso=True, gasto_mes=gasto, limite=limite)
                if accion == "avisar":
                    log.warning(
                        "guardia AVISA (tenant=%s): gasto %.4f >= límite %.2f (accion=avisar, no corta)",
                        tenant_id, gasto, limite,
                    )
                    return Decision(True, "tope_avisar", self._modelo(clase),
                                    aviso=True, gasto_mes=gasto, limite=limite)
                log.error(
                    "guardia BLOQUEA (tenant=%s): gasto %.4f >= límite %.2f → atención humana",
                    tenant_id, gasto, limite,
                )
                return Decision(False, "tope_mensual", None, gasto_mes=gasto, limite=limite)

            aviso = gasto >= limite * umbral
            if aviso:
                log.warning(
                    "guardia: tenant=%s cruzó el umbral de aviso (%.4f de %.2f, umbral %.0f%%)",
                    tenant_id, gasto, limite, umbral * 100,
                )
            return Decision(True, "ok", self._modelo(clase),
                            aviso=aviso, gasto_mes=gasto, limite=limite)
        except Exception as exc:  # red, JSON, tipos — fail-closed, jamás silencioso
            log.error("guardia NO DISPONIBLE (tenant=%s): %s — BLOQUEA fail-closed", tenant_id, exc)
            return Decision(False, "guardia_no_disponible", None)
        finally:
            if self._http is None:
                await client.aclose()

    async def registrar(
        self,
        *,
        tenant_id: str,
        clase: str,
        modelo: str,
        tokens_in: int,
        tokens_out: int,
        costo_usd: float,
        task_id: str,
        vertical: str = "crm",
    ) -> bool:
        """Escribe la llamada en token_usage. Best-effort RUIDOSO (regla
        2026-07-13: todo except imprime): un fallo aquí no tumba la atención,
        pero JAMÁS pasa en silencio. task_id obligatorio no-nulo (índice único
        parcial del agregado diario)."""
        if not task_id:
            log.error("registrar SIN task_id (tenant=%s): fila descartada — sería 409 silencioso", tenant_id)
            return False
        fila = {
            "vertical": vertical,
            "tenant_id": tenant_id,
            "clase_tarea": clase if clase in CLASES else "basica",
            "task_id": task_id,
            "modelo": modelo,
            "tokens_in": int(tokens_in or 0),
            "tokens_out": int(tokens_out or 0),
            "costo_usd": round(float(costo_usd or 0), 6),
        }
        client = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            resp = await client.post(
                f"{self._url}/rest/v1/token_usage", headers=self._headers(), json=fila
            )
            if resp.status_code >= 300:
                log.error(
                    "token_usage NO registrado (tenant=%s, HTTP %s): %s",
                    tenant_id, resp.status_code, resp.text[:300],
                )
                return False
            return True
        except Exception as exc:
            log.error("token_usage NO registrado (tenant=%s): %s", tenant_id, exc)
            return False
        finally:
            if self._http is None:
                await client.aclose()
