"""Tests de drift-runtime.py: la logica que decide si algo esta desfasado.

Solo se prueba lo puro (comparacion de fechas, limpieza de bloques AUTO, forma del
snapshot). Las revisiones concretas hacen I/O real (git, docker, psql) y no se simulan
aqui: lo que puede fallar en SILENCIO es el criterio, no el subprocess.
"""
from conftest import load_script

mod = load_script("drift-runtime.py")


# ---------------------------------------------------------------- imagen vs codigo

def test_codigo_posterior_a_la_imagen_es_deriva():
    # El caso real del 2026-08-20: chat-web2 con imagen del 21-jul y el fix del 8-ago.
    assert mod.imagen_desfasada("2026-07-21T07:39:19-06:00", "2026-08-08T10:00:00-06:00")


def test_imagen_posterior_al_codigo_no_es_deriva():
    assert not mod.imagen_desfasada("2026-08-08T10:00:00-06:00", "2026-08-02T09:00:00-06:00")


def test_zonas_horarias_distintas_se_comparan_en_el_mismo_instante():
    # Mismo instante expresado en UTC y en CST: no hay deriva aunque el texto difiera.
    assert not mod.imagen_desfasada("2026-08-08T16:00:00+00:00", "2026-08-08T10:00:00-06:00")


def test_sin_dato_no_se_afirma_deriva():
    # No saber no es estar al dia, pero tampoco es una acusacion: no se reporta.
    assert not mod.imagen_desfasada(None, "2026-08-08T10:00:00-06:00")
    assert not mod.imagen_desfasada("2026-08-08T10:00:00-06:00", None)


# ------------------------------------------------------- que entra en la imagen

def test_lee_las_fuentes_reales_del_dockerfile_incluidas_las_continuaciones():
    # Forma real del supervisor-a2a: contexto `.` (businessos/) y COPY explicitos,
    # uno de ellos partido en dos lineas con barra invertida.
    df = (
        "FROM python:3.12-slim\n"
        "WORKDIR /app\n"
        "COPY supervisor-a2a/requirements.txt .\n"
        "COPY trio-contrato/contrato.py .\n"
        "COPY supervisor-a2a/card.py supervisor-a2a/executor.py \\\n"
        "     supervisor-a2a/gates.py ./\n"
    )
    assert mod.fuentes_de_dockerfile(df) == [
        "supervisor-a2a/requirements.txt",
        "trio-contrato/contrato.py",
        "supervisor-a2a/card.py",
        "supervisor-a2a/executor.py",
        "supervisor-a2a/gates.py",
    ]


def test_ignora_lo_que_viene_de_otra_etapa_del_build():
    # `COPY --from=builder` no sale del repo: fecharlo con git no significa nada.
    df = ("COPY package.json ./\n"
          "COPY --from=builder /app/.next/standalone ./\n"
          "COPY --chown=node:node src ./src\n")
    assert mod.fuentes_de_dockerfile(df) == ["package.json", "src"]


# ------------------------------------------------------------------ bloques AUTO

def test_el_bloque_inyectado_por_host_jobs_no_cuenta_como_deriva():
    repo = "# SOUL\n\nDoctrina de negocio.\n"
    volumen = (
        "# SOUL\n\nDoctrina de negocio.\n\n"
        "<!-- PRESUPUESTO:AUTO:START -->\n"
        "## Presupuesto actual (corte 2026-08-20)\nGasto: $0.55 de $30.\n"
        "<!-- PRESUPUESTO:AUTO:END -->\n"
    )
    assert mod.sin_bloques_auto(volumen) == mod.sin_bloques_auto(repo)


def test_un_cambio_real_de_doctrina_si_es_deriva():
    # El caso real: el bloque "Enfoque de ventas" vivio 26 dias en el repo sin llegar
    # al volumen. Con el bloque AUTO presente en el volumen, la diferencia debe seguir
    # viendose.
    repo = "# SOUL\n\nDoctrina.\n\n## Enfoque de ventas\nEscuchar antes que pitchear.\n"
    volumen = ("# SOUL\n\nDoctrina.\n\n"
               "<!-- PRESUPUESTO:AUTO:START -->\ngasto\n<!-- PRESUPUESTO:AUTO:END -->\n")
    assert mod.sin_bloques_auto(volumen) != mod.sin_bloques_auto(repo)


def test_varios_bloques_auto_se_quitan_todos():
    texto = ("cuerpo\n"
             "<!-- PRESUPUESTO:AUTO:START -->\na\n<!-- PRESUPUESTO:AUTO:END -->\n"
             "medio\n"
             "<!-- TAREAS:AUTO:START -->\nb\n<!-- TAREAS:AUTO:END -->\n")
    assert mod.sin_bloques_auto(texto).replace("\n", " ").split() == ["cuerpo", "medio"]


# --------------------------------------------------------------------- snapshot

def test_snapshot_limpio_cuando_no_hay_hallazgos():
    snap = mod.construir_snapshot([], {"checkout": 0}, "2026-08-20T12:00:00Z")
    assert snap["limpio"] is True and snap["total"] == 0 and snap["por_clase"] == {}


def test_snapshot_agrupa_por_clase_y_conserva_la_accion():
    hallazgos = [
        mod.hallazgo("imagen", "chat-web2", "codigo mas nuevo", "rebuild"),
        mod.hallazgo("imagen", "ejecutor-a2a", "codigo mas nuevo", "rebuild"),
        mod.hallazgo("grafo", "reglas", "66 contra 68", "aplicar seed"),
    ]
    snap = mod.construir_snapshot(hallazgos, {"imagenes": 12}, "2026-08-20T12:00:00Z")
    assert snap["limpio"] is False and snap["total"] == 3
    assert snap["por_clase"] == {"grafo": 1, "imagen": 2}
    assert snap["hallazgos"][2]["accion"] == "aplicar seed"
    assert snap["revisados"] == {"imagenes": 12}
