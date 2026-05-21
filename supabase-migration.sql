-- ─── MYLIDE — Migration Supabase pour le système d'abonnement ────────────────
-- Exécuter dans l'éditeur SQL de Supabase (dashboard.supabase.com)

-- Ajouter les colonnes d'abonnement à la table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Index pour les requêtes Stripe
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- Valeurs par défaut pour les utilisateurs existants
UPDATE profiles SET plan = 'free' WHERE plan IS NULL;

-- Row Level Security : chaque utilisateur ne peut voir que son propre profil
-- (à adapter selon ta config RLS existante)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
