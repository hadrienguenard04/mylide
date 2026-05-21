-- ─── MYLIDE — Nettoyage daily_logs + contrainte unique ──────────────────────
-- Exécuter UNE SEULE FOIS dans l'éditeur SQL de Supabase
-- dashboard.supabase.com → SQL Editor → New query

-- ÉTAPE 1 : Supprimer les doublons (garder la ligne la plus récente par user+date)
-- La sous-requête conserve le MAX(id) par (user_id, date), supprime le reste.
DELETE FROM daily_logs
WHERE id NOT IN (
  SELECT MAX(id)
  FROM daily_logs
  GROUP BY user_id, date
);

-- ÉTAPE 2 : Ajouter la contrainte unique (si elle n'existe pas déjà)
-- Ça permettra à upsert(onConflict:'user_id,date') de fonctionner correctement.
ALTER TABLE daily_logs
  ADD CONSTRAINT daily_logs_user_date_unique UNIQUE (user_id, date);

-- ÉTAPE 3 : Vérification
SELECT user_id, date, COUNT(*) as nb
FROM daily_logs
GROUP BY user_id, date
HAVING COUNT(*) > 1;
-- → doit retourner 0 lignes si tout est propre
