-- supabase-fase12-contratos-sc.sql — tabla de Fase 12/PRP-013 (Fase 5): ciclo de
-- vida de cada smart contract fabricado, de la fabricacion al despliegue.
-- Aplicar una vez sobre el proyecto Supabase (igual que supabase-fase6.sql).
-- Idempotente. RLS sin politicas: SOLO service_role accede.
--
-- UN ESCRITOR POR TRANSICION (doctrina un-escritor-por-fila, extendida):
--   fabricando   ← la crea el Ejecutor (fabric_engine) al fabricar el paquete
--   en_revision  ← verificar-red-efimera.py (host-job, nodo sandbox) tras gate verde
--   aprobado     ← la duena en Mission Control (server action; allowlist + auth)
--   rechazado    ← la duena en Mission Control
--   desplegado   ← desplegar-chaincode.py (host-job) tras lifecycle completo
--   escalado     ← cualquier host-job ante anomalia (red efimera roja, hash G5 distinto)
--
-- Lineage `origen` (gobernanza-ciclo-de-vida §2): ids de chat → hash de la spec
-- → task_id → hash del paquete → tx del commit. Ante disputa, la historia se
-- reconstruye con un join, no con arqueologia.
--
-- `hash_paquete` = manifest.paquete_sha256 (hash del ARBOL de archivos que el
-- Supervisor ya gateo: relpath+sha256 concatenados en orden), NO el sha256 del
-- .tar.gz de Fabric — G5 re-verifica exactamente lo aprobado; el hash del tar.gz
-- del lifecycle queda registrado aparte en `despliegue`.
--
-- `secuencia`: el --sequence del lifecycle de Fabric SE LEE de aqui, jamas se
-- adivina (README-auditoria de escrow-v1).

create table if not exists public.contratos_sc (
  id              uuid        primary key default gen_random_uuid(),
  task_id         text        not null unique,   -- fila en `tareas` (costo via token_usage.task_id)
  solicitante     text        not null default 'desconocido',
  spec            jsonb       not null,           -- la sc_spec confirmada (cruda, como viajo)
  origen          jsonb       not null default '{}'::jsonb,  -- lineage: chat → spec_sha256 → task_id → paquete → tx
  plantilla       text        not null,
  manifest        jsonb       not null default '{}'::jsonb,  -- manifest.json integro (parametros, archivos, diff)
  banderas        jsonb       not null default '[]'::jsonb,  -- banderas G1 (fabrica-sc/banderas.py); la UI las pinta ARRIBA
  hash_paquete    text,                            -- manifest.paquete_sha256 (G5)
  canal_destino   text,
  secuencia       integer     not null default 1 check (secuencia >= 1),
  estado          text        not null default 'fabricando'
    check (estado in ('fabricando','en_revision','aprobado',
                      'desplegado','rechazado','escalado')),
  red_efimera     jsonb,                           -- resultado del gate (verificar-red-efimera.py)
  en_revision_desde timestamptz,                   -- inicio de la ventana humana (metrica G4 de fatiga)
  aprobado_por    text,
  aprobado_en     timestamptz,
  motivo_rechazo  text,
  despliegue      jsonb,                           -- firmas op/tg, txids, querycommitted, sha256 del tar.gz
  desplegado_en   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contratos_sc_estado_idx on public.contratos_sc (estado);

comment on table public.contratos_sc is
  'Ciclo de vida de cada smart contract fabricado (Fase 12/PRP-013). Un escritor por transicion: Ejecutor crea (fabricando); verificar-red-efimera.py pasa a en_revision; la duena decide en Mission Control (aprobado/rechazado); desplegar-chaincode.py despliega re-verificando el hash aprobado (G5). El agente Hermes consulta por snapshot, nunca con credenciales.';

alter table public.contratos_sc enable row level security;
