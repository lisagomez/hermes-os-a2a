---
name: auditoria-seguridad-houston
description: Auditoria de seguridad de codigo del competidor Houston (gethouston.ai); veredicto SOSPECHOSO, 2 fallas ALTAS (traversal de rutas Tauri, tablas Supabase sin RLS); leer antes de inspirarnos en su arquitectura.
metadata:
  type: reference
---

# Auditoría de seguridad, Houston (gethouston/houston)

Repo clonado y auditado por OPS (Johann) el 2026-07-25 con 6 agentes de solo lectura en
paralelo (protocolo `repositorios-terceros` de OPS). Veredicto: **SOSPECHOSO** (no malicioso).
Sin backdoors ni exfiltración, pero con 2 fallas reales de severidad ALTA:

1. **Tablas de Supabase con tokens OAuth/API keys de usuarios sin RLS ni REVOKE**
   (`workspace_credentials`, `integration_credentials`), a diferencia de tablas hermanas del
   mismo repo que sí lo hacen. Mismo principio que [[revocar-execute-funciones-postgres]]
   (funciones), aplicado a tablas de credenciales: todo lo que guarda secretos de terceros
   necesita RLS **y** `revoke` explícito de `anon`/`authenticated`.
2. **Traversal de rutas en comandos Tauri** (`open_file`/`reveal_file`): unen rutas sin
   verificar que el resultado siga dentro de la carpeta del agente; una ruta absoluta/UNC
   generada por el LLM y clicada en el chat puede ejecutar un binario. Si nosotros exponemos
   algún comando que una un `base_path` con texto que puede venir del modelo, verificar
   SIEMPRE `starts_with(root)` sobre la ruta canonicalizada.

Documento completo con los 7 hallazgos, evidencia archivo+línea, y la superficie que sí salió
limpia (vale la pena imitar: su sandbox de ejecución, su escaneo de secretos al publicar al
store): `docs/competencia-houston/Auditoria de seguridad - Houston (gethouston.ai).md`.

Complementa el análisis de mercado en `[[competencia-houston]]` (misma carpeta `docs/`, distinto
eje: ese es negocio/producto, este es código).
