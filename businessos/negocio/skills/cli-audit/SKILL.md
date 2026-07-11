---
name: cli-audit
description: "Reporta el estado de los CLIs agente-nativos (Printing Press): cuáles faltan imprimir para la fase actual, cuáles convendría revisar, y el comando exacto a correr en Claude Code."
version: 1.1.0
author: Hermes OS · A2A
license: MIT
metadata:
  hermes:
    tags: [cli, printing-press, eficiencia, tokens, infraestructura]
prerequisites:
  files: [/opt/data/workspace/cli-audit.json]
---

# Auditoría de CLIs (Printing Press)

Cuando Elisa pregunte "¿qué CLIs faltan?", "¿cómo vamos de CLIs?", "estado de
Printing Press", "¿qué falta imprimir?", "auditoría de herramientas", o similar —
usa este skill.

## Cómo obtener los datos

**Usa el TERMINAL local** (único camino que funciona en este runtime):

    cat /opt/data/workspace/cli-audit.json

PROHIBIDO: `read_file`/`execute_code` (el toolset `file` está deshabilitado aquí —
depende de Docker y no hay daemon; fallan siempre y pierdes el turno), correr
`cli-audit.py` o `print-phase.sh`, y pedir credenciales. El dato ya está calculado
en ese JSON por el job auditor, que corre en la máquina de desarrollo de Elisa y lo
empuja por ssh.

Si Elisa pide "el manifest" / "cli-manifest.yaml": ese archivo vive en el REPO de
su máquina de desarrollo, NO en este volumen — no lo busques con `find`. El
snapshot de arriba ES su digest calculado; responde con él.

El JSON trae: `generado` (fecha del corte), `fase_actual` + `fase_actual_label`,
`min_grade`, `mode`, `library_path`, `faltantes` (CLIs que la fase actual pide y aún
no están impresos), `desactualizados` (impresos por debajo del grado mínimo, a
revisar), `apis_sin_entrada` (servicios del stack sin entrada en el manifiesto),
`no_due_aun` (CLIs de fases futuras, informativo), `comando_sugerido` y `nota`.

## Cómo presentarlo

1. **Encabezado:** fase actual y cuántos `faltantes` hay.
2. **Faltantes primero**, de la fase más temprana a la más reciente: por cada uno,
   `name` + `fase` + `costo_estimado`. Son lo accionable.
3. **Desactualizados** (si hay): `name` + `motivo` (grado por debajo del mínimo).
4. **apis_sin_entrada** (si hay): servicios del stack que nadie mapeó a un CLId aún.
5. **El comando exacto** que Elisa debe correr **en Claude Code** (campo
   `comando_sugerido`), y recuérdale que la impresión NO ocurre aquí: Printing Press
   solo corre en Claude Code en su máquina de desarrollo (la `nota` lo explica).
6. Tono: claro y profesional, español, breve. Menciona `generado` si se ve viejo.

## Importante: tú no imprimes ni mejoras CLIs

Este skill solo **reporta y avisa**. Imprimir un CLI (`/printing-press`), reimprimir
(`/printing-press-reprint`) o mejorarlo (`/printing-press-amend`) son acciones de
Claude Code que dispara Elisa; consumen tokens de Opus/Codex y requieren su
aprobación. Nunca afirmes que imprimiste algo.

## Si el archivo no existe, está vacío, o `generado` es viejo (>7 días)

Significa que el auditor no ha corrido (o no recientemente). Di la fecha de
`generado` tal cual y sugiere: "pídele a Claude Code en tu máquina de desarrollo
que corra `businessos/cli-audit.py` — refresca este snapshot por ssh". NO intentes
correrlo tú ni inspeccionar docker por tu cuenta (no tienes acceso, por diseño), y
NO le pidas a Elisa depurar Docker ni compartir archivos: un dato viejo sigue
siendo respondible, solo adviértelo.
