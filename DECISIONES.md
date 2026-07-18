# DECISIONES - hermes-os-a2a

> Bitacora append-only de decisiones cerradas (regla `checkpoint-decisiones`). Una linea por decision:
> `AAAA-MM-DD | que se decidio | por que (breve) | estado | puntero al detalle`. No editar lineas
> viejas; solo agregar. El detalle vive en el puntero.

2026-07-18 | El indicador de actividad "Enjambre Binario" se construye como prototipo standalone feature-first en `src/features/indicador-actividad/` (enjambre abstracto que se adapta por estado del agente, autoplay sin gating "SIM"; versionado por nombre `.vN`, v1=historico movido desde docs/, v2=actual), NO se sigue iterando en Claude Design | Claude Design entregaba blobs bundle no reutilizables y estaticos (motion gated por SIM); el prototipo limpio anima verificado y nace bien ubicado. La causa raiz del "estatico" era `prefers-reduced-motion` del sistema, ya neutralizada en el codigo | cerrada | `src/features/indicador-actividad/_context.md` + `enjambre-binario.v2.html`
