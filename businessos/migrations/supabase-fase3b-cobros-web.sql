-- supabase-fase3b-cobros-web.sql — ajuste a `cobros` para el checkout de la
-- landing (cliente-web2) y el webhook real de Polar. Aplicar sobre el mismo
-- proyecto de supabase-fase3.sql. Idempotente (ALTER ... DROP NOT NULL es
-- no-op si la columna ya admite NULL).
--
-- Por que: el checkout de la landing es "pay what you want" (el monto final
-- lo decide el cliente en la pagina hospedada de Polar); la fila en `cobros`
-- se crea al generar el checkout, antes de saber el monto, y el webhook la
-- completa cuando el pago se confirma. El check (monto > 0) NO se toca: en
-- Postgres un CHECK ya admite NULL (solo rechaza cuando la expresion da
-- FALSE, y "NULL > 0" es NULL, no FALSE) — sigue bloqueando monto <= 0.

alter table public.cobros alter column monto drop not null;
