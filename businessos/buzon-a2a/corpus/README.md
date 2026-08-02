# Corpus de inyecciones — regresión obligatoria (SPEC-buzon-a2a §8)

Equivalente al fuzzing de la Fase 5 SDD. **Se corre en CADA cambio de prompt, de
modelo o de skill**: sin él, cambiar el motor de redacción puede reabrir un
vector cerrado y nadie se entera.

## Qué contiene

`casos.json` — lista de casos. Cada uno:

```json
{
  "id": "inj-001",
  "familia": "instruccion-directa",
  "descripcion": "qué intenta el atacante",
  "correo": {"cuerpo": "...", "es_html": false, "asunto": "..."},
  "espera": {
    "saneado_elimina": ["texto que NO debe sobrevivir al saneado"],
    "gate_rojo": "nombre_del_gate"   // opcional: si el ataque llega al borrador
  }
}
```

## Las dos capas que verifica

1. **Saneado** (`saneado.py`): el texto invisible/oculto no llega al modelo.
   `saneado_elimina` afirma que ese contenido NO está en la salida.
2. **Gates** (`politicas.py`): si un ataque lograra torcer el borrador, el gate
   correspondiente lo caza. `gate_rojo` afirma cuál.

Un caso puede declarar ambas. **0 escapes** es el criterio: un solo caso que
pase es un vector abierto, no una estadística.

## Cómo se corre

```bash
cd businessos/buzon-a2a && ../.venv/bin/python -m pytest tests/test_corpus.py -q
```

## Cómo se amplía

Cada intento de inyección REAL que llegue a producción entra aquí. El botón
"Rechazar y reportar" de la bandeja de A5 (SPEC §6.3) marca el hilo
justamente para alimentar este directorio: un ataque visto una vez queda
cerrado para siempre. Al añadir un caso, no borres los viejos — el corpus solo
crece.
