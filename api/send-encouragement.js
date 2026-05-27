// api/send-encouragement.js — envoie une notif push quand quelqu'un encourage un ami

const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
  "mailto:contact@mylide.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { to_user_id, from_name } = req.body || {};
  if (!to_user_id || !from_name) return res.status(400).json({ error: "Missing params" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", to_user_id)
    .single();

  if (!sub?.subscription) return res.json({ sent: false, reason: "no subscription" });

  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title: "💪 Encouragement !",
      body: `${from_name} t'a encouragé · continue comme ça !`,
      url: "/",
    }));
    res.json({ sent: true });
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("user_id", to_user_id);
    }
    res.json({ sent: false, error: e.message });
  }
};
