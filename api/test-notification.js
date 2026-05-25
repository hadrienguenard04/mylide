// api/test-notification.js — envoie une notification de test à l'utilisateur connecté
const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");
const { verifyAuth } = require("./_lib/auth");

webpush.setVapidDetails(
  "mailto:contact@mylide.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Authentification — récupérer l'userId depuis le token Supabase
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  // Récupérer la subscription push de cet utilisateur
  const { data: row, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", user.id)
    .single();

  if (error || !row?.subscription) {
    return res.status(404).json({ error: "Aucune subscription trouvée. Active les notifications d'abord." });
  }

  try {
    await webpush.sendNotification(
      row.subscription,
      JSON.stringify({
        title: "🎉 MYLIDE fonctionne !",
        body: "Tes notifications sont bien configurées. Tu les recevras même téléphone verrouillé.",
        url: "/",
      })
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("Test push failed:", e.message, e.statusCode);
    if (e.statusCode === 410 || e.statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      return res.status(410).json({ error: "Subscription expirée. Réactive les notifications dans Paramètres." });
    }
    res.status(500).json({ error: e.message });
  }
};
