// api/_lib/auth.js — JWT verification middleware pour les routes Vercel
// Vérifie que l'utilisateur est authentifié et qu'il accède bien à SES données.
//
// Usage dans une route :
//   const { verifyUser } = require("./_lib/auth");
//   const { user, error } = await verifyUser(req);
//   if (error) return res.status(401).json({ error });
//   if (user.id !== req.body.userId) return res.status(403).json({ error: "Accès interdit" });

const { createClient } = require("@supabase/supabase-js");

/**
 * Vérifie le JWT Supabase envoyé dans le header Authorization: Bearer <token>.
 * Retourne { user, error } — user est null si invalide.
 */
async function verifyUser(req) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Authorization header manquant ou invalide" };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { user: null, error: "Token vide" };
  }

  try {
    // On utilise la service role key pour valider le JWT (getUser vérifie la signature)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: "Token invalide ou expiré" };
    }

    return { user, error: null };
  } catch (e) {
    return { user: null, error: "Erreur de vérification du token" };
  }
}

/**
 * Helper : vérifie ET contrôle que l'userId dans le body correspond à l'utilisateur authentifié.
 * Retourne { user, error } — combine vérification token + autorisation.
 */
async function verifyAndAuthorize(req, userId) {
  const { user, error } = await verifyUser(req);
  if (error) return { user: null, error };
  if (user.id !== userId) {
    return { user: null, error: "Accès interdit : vous ne pouvez modifier que vos propres données" };
  }
  return { user, error: null };
}

module.exports = { verifyUser, verifyAndAuthorize };
