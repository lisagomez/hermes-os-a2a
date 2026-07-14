-- ============================================================
-- FINANZAS PERSONALES (white-label)
-- Partida doble lite: todo movimiento tiene origen y (opcional) destino.
-- Captura conversacional via tu agente (POST /api/finanzas), UI /finanzas solo lectura.
-- Sin seed: da de alta tus cuentas hablando con tu agente o con INSERTs propios.
-- ============================================================

-- ── Cuentas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  -- texto libre: quién es el dueño (tú, tu pareja, "compartida"...)
  owner text NOT NULL DEFAULT 'personal',
  kind text NOT NULL CHECK (kind IN ('banco', 'credito', 'wallet', 'efectivo', 'revenue', 'por_cobrar')),
  currency text NOT NULL CHECK (currency IN ('MXN', 'USD', 'EUR')),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Movimientos (append-only, correcciones referencian al original) ──
CREATE TABLE IF NOT EXISTS finance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('gasto', 'ingreso', 'transferencia', 'prestamo', 'pago_deuda', 'ajuste')),
  -- gasto: sale de account | ingreso: entra a account
  -- transferencia/prestamo: sale de account, entra a counter_account
  -- pago_deuda: sale de account (por_cobrar), entra a counter_account
  account_id uuid NOT NULL REFERENCES finance_accounts(id),
  counter_account_id uuid REFERENCES finance_accounts(id),
  currency text NOT NULL CHECK (currency IN ('MXN', 'USD', 'EUR')),
  amount numeric NOT NULL CHECK (amount > 0),
  -- para transferencias entre divisas distintas (ej. banco MXN -> wallet USD)
  counter_currency text CHECK (counter_currency IN ('MXN', 'USD', 'EUR')),
  counter_amount numeric CHECK (counter_amount > 0),
  category text,
  note text,
  registered_by text NOT NULL DEFAULT 'agent',
  is_correction boolean NOT NULL DEFAULT false,
  corrects_movement_id uuid REFERENCES finance_movements(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_movements_date ON finance_movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_movements_type ON finance_movements(type, date DESC);

-- ── Snapshots de cierre (conciliación: saldos dictados + FX del día) ──
CREATE TABLE IF NOT EXISTS finance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date UNIQUE NOT NULL,
  -- [{"account": "Mi banco", "currency": "MXN", "balance": 0}, ...]
  balances jsonb NOT NULL,
  -- {"usd_mxn": 17.26, "eur_mxn": 19.93, "eur_usd": 1.16}
  fx jsonb NOT NULL,
  liquid_mxn numeric,
  liquid_usd numeric,
  net_worth_mxn numeric,
  net_worth_usd numeric,
  delta_liquid_mxn numeric,
  delta_net_worth_mxn numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Recurrentes (suscripciones + cobros fijos mensuales/anuales) ──
CREATE TABLE IF NOT EXISTS finance_recurring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'suscripciones',
  periodicity text NOT NULL DEFAULT 'mensual' CHECK (periodicity IN ('mensual', 'anual')),
  charge_day integer NOT NULL CHECK (charge_day BETWEEN 1 AND 31),
  charge_month integer CHECK (charge_month BETWEEN 1 AND 12),
  currency text NOT NULL CHECK (currency IN ('MXN', 'USD', 'EUR')),
  amount numeric NOT NULL CHECK (amount > 0),
  account_id uuid REFERENCES finance_accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: solo owner/admin ven finanzas. Escritura via service role (API). ──
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_accounts' AND policyname = 'finance_accounts_select') THEN
    CREATE POLICY finance_accounts_select ON finance_accounts FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_movements' AND policyname = 'finance_movements_select') THEN
    CREATE POLICY finance_movements_select ON finance_movements FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_snapshots' AND policyname = 'finance_snapshots_select') THEN
    CREATE POLICY finance_snapshots_select ON finance_snapshots FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_recurring' AND policyname = 'finance_recurring_select') THEN
    CREATE POLICY finance_recurring_select ON finance_recurring FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin')));
  END IF;
END $$;
