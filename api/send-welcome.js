// api/send-welcome.js
const { createClient } = require("@supabase/supabase-js");
const { sendEmail, emailWelcomeFree } = require("./_lib/email");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Token manquant" });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user?.email) return res.status(401).json({ error: "Token invalide" });

  const { data: profile } = await supabase.from("profiles").select("name, welcome_email_sent").eq("id", user.id).single();
  if (profile?.welcome_email_sent) return res.json({ sent: false, reason: "déjà envoyé" });

  const name = (profile?.name || "").split(" ")[0] || "là";
  const { success } = await sendEmail({
    to: user.email,
    subject: "Bienvenue sur MYLIDE ! 🎉",
    html: emailWelcomeFree({ name }),
  });

  if (success) await supabase.from("profiles").update({ welcome_email_sent: true }).eq("id", user.id);

  console.log(`[send-welcome] ${user.email} → sent=${success}`);
  res.json({ sent: success });
};
