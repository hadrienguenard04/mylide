-- ─── MYLIDE — Migration Supabase pour le système d'abonnement ────────────────
-- Exécuter dans l'éditeur SQL de Supabase (dashboard.supabase.com → SQL Editor)
-- Toutes les instructions sont idempotentes (IF NOT EXISTS / IF EXISTS)

-- ── 1. Colonnes d'abonnement + données utilisateur ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan                    TEXT        DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT        DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_email_sent BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS nutrition_goals         JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_prefs              JSONB       DEFAULT '{}';
-- cancellation_email_sent : évite le double envoi d'email entre
--   cancel-subscription.js (API) et le webhook customer.subscription.deleted

-- ── 2. Index de performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan             ON profiles(plan);

-- ── 3. Valeurs par défaut pour les utilisateurs existants ────────────────────
UPDATE profiles SET plan = 'free'  WHERE plan IS NULL;
UPDATE profiles SET cancellation_email_sent = false WHERE cancellation_email_sent IS NULL;

-- ── 4. Row Level Security ─────────────────────────────────────────────────────
-- Les utilisateurs peuvent lire/modifier uniquement leur propre profil.
-- Le service role (API Vercel) bypasse le RLS → pas de politique nécessaire côté API.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 5. Vérification finale ────────────────────────────────────────────────────
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
