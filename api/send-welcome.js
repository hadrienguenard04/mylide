// api/send-welcome.js — Email de bienvenue pour les nouveaux inscrits (plan free)
// Appelé depuis le frontend au moment de la fin de l'onboarding.

const { createClient } = require("@supabase/supabase-js");
const { verifyAndAuthorize } = require("./_lib/auth");
const { sendEmail } = require("./_lib/email");

const FROM_EMAIL = "MYLIDE <noreply@mylide.app>";

function emailWelcomeFree({ name }) {
  const BASE_STYLE = `font-family: 'Helvetica Neue', Arial, sans-serif; background: #F8F8F6; margin: 0; padding: 0;`;
  const CARD_STYLE = `max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="${BASE_STYLE}">
<div style="${CARD_STYLE}">
  <div style="background: linear-gradient(135deg, #CC2936, #8B1A22); padding: 32px 36px; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 8px;">💪</div>
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">MYLIDE</h1>
    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px;">Ton tracker de vie intelligent</p>
  </div>
  <div style="padding: 32px 36px;">
    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #1A1A1A;">
      Bienvenue sur MYLIDE, ${name ? name.split(" ")[0] : "là"} ! 🎉
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.7;">
      Ton compte est prêt. Commence à tracker ta nutrition, tes entraînements, ton sommeil et bien plus — tout au même endroit.
    </p>
    <div style="background: #F8F8F6; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #1A1A1A;">Ce qui t'attend :</p>
      ${[
        "Tracker nutrition, sport, sommeil & mental",
        "Score de vie quotidien personnalisé",
        "Objectifs avec suivi de progression",
        "Gestion de patrimoine & finances",
        "Amis & encouragements mutuels",
      ].map(f => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="color:#CC2936;font-weight:700;">→</span>
        <span style="font-size:13px;color:#1A1A1A;">${f}</span>
      </div>`).join("")}
    </div>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="https://mylide.app" style="display:inline-block;background:linear-gradient(135deg,#CC2936,#8B1A22);color:#fff;text-decoration:none;border-radius:12px;padding:14px 32px;font-weight:800;font-size:15px;">
        Ouvrir MYLIDE →
      </a>
    </div>
    <p style="margin: 0; font-size: 12px; color: #6B6B6B; text-align: center; line-height: 1.7;">
      MYLIDE est une application de bien-être personnel · Non médical<br>
      Des questions ? <a href="mailto:contact@mylide.app" style="color:#CC2936;text-decoration:none;">contact@mylide.app</a>
    </p>
  </div>
  <div style="padding: 20px 36px; background: #F8F8F6; text-align: center; border-top: 1px solid #E8E8E4;">
    <p style="margin: 0; font-size: 11px; color: #6B6B6B; line-height: 1.8;">
      <a href="https://mylide.app/legal" style="color:#6B6B6B;">CGU</a> ·
      <a href="https://mylide.app/legal" style="color:#6B6B6B;">Confidentialité</a> ·
      <a href="https://mylide.app/legal" style="color:#6B6B6B;">RGPD</a>
    </p>
  </div>
</div>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId requis" });

  // Vérifier que c'est bien l'utilisateur lui-même
  const { user, error: authError } = await verifyAndAuthorize(req, userId);
  if (authError) return res.status(401).json({ error: authError });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Éviter d'envoyer deux fois (flag welcome_email_sent)
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, welcome_email_sent")
    .eq("id", userId)
    .single();

  if (profile?.welcome_email_sent) return res.json({ sent: false, reason: "already sent" });

  const email = user?.email;
  if (!email) return res.json({ sent: false, reason: "no email" });

  const { success, error } = await sendEmail({
    to: email,
    subject: "Bienvenue sur MYLIDE ! 🎉",
    html: emailWelcomeFree({ name: profile?.name }),
  });

  if (success) {
    // Marquer comme envoyé pour éviter les doublons
    await supabase.from("profiles").update({ welcome_email_sent: true }).eq("id", userId);
  }

  res.json({ sent: success, error });
};
