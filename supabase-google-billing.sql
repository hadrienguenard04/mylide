-- ─── MYLIDE — Colonnes Google Play Billing ────────────────────────────────────
-- À exécuter UNE FOIS dans l'éditeur SQL Supabase (Dashboard → SQL Editor).
-- Ajoute les colonnes nécessaires pour lier un abonnement Google Play à un profil.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS google_product_id     TEXT;

-- Index pour retrouver rapidement un profil depuis un jeton Google
-- (utilisé par les notifications de renouvellement/annulation).
CREATE INDEX IF NOT EXISTS idx_profiles_google_token ON profiles(google_purchase_token);
