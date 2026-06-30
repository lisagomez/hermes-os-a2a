---
name: cli-audit
description: "Reporta el estado de los CLIs agente-nativos (Printing Press): cuáles faltan imprimir para la fase actual, cuáles convendría revisar, y el comando exacto a correr en Claude Code."
version: 1.0.0
author: BusinessOS
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

**Lee el archivo** `/opt/data/workspace/cli-audit.json` con tu herramienta de lectura
de archivos. NO ejecutes código, NO corras `cli-audit.py` ni `print-phase.sh`, NO
pidas credenciales: el dato ya está calculado ahí por el job auditor del host (que es
quien tiene acceso a docker y al volumen; tú no manejas secretos ni imprimes).

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

## Si el archivo no existe o está vacío

Significa que el auditor no ha corrido aún. Dilo claramente y sugiere correr
`businessos/cli-audit.py` (hoy on-demand; en el Droplet irá por cron de SO
escalonado tras la ingesta de tokens). NO intentes correrlo tú ni inspeccionar
docker por tu cuenta (no tienes acceso, por diseño).
