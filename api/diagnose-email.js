// api/diagnose-email.js — Vérifie la config email en envoyant un test réel
// Accès restreint : seulement ton adresse admin
// Usage : POST /api/diagnose-email  (depuis Postman ou curl)
// curl -X POST https://mylide.app/api/diagnose-email

const { Resend } = require("resend");

const ADMIN_EMAILS = ["kojihsports@gmail.com"];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: "RESEND_API_KEY manquant dans les env vars Vercel" });

  const resend = new Resend(apiKey);

  // Test 1 : domaine custom (noreply@mylide.app)
  const { data: d1, error: e1 } = await resend.emails.send({
    from: "MYLIDE <noreply@mylide.app>",
    to: ADMIN_EMAILS,
    subject: "✅ Diagnostic MYLIDE — domaine custom",
    html: "<p><strong>DNS propagé.</strong> Les emails partent depuis noreply@mylide.app ✅</p><p>Heure : " + new Date().toISOString() + "</p>",
  });

  if (e1) {
    // Domaine pas encore vérifié → on teste le fallback sandbox
    const { data: d2, error: e2 } = await resend.emails.send({
      from: "MYLIDE <onboarding@resend.dev>",
      to: ADMIN_EMAILS,
      subject: "⚠️ Diagnostic MYLIDE — fallback sandbox",
      html: "<p>Le domaine <strong>mylide.app</strong> n'est pas encore vérifié dans Resend.</p><p>Erreur : " + e1.message + "</p><p>Les emails partent via sandbox en attendant.</p>",
    });
    return res.json({
      domainVerified: false,
      customDomainError: e1.message,
      fallbackSent: !e2,
      fallbackError: e2?.message || null,
      action: "Vérifie le statut DNS dans Resend Dashboard → Domains → mylide.app",
    });
  }

  return res.json({
    domainVerified: true,
    emailId: d1?.id,
    message: "Email envoyé depuis noreply@mylide.app. Vérifie ta boîte kojihsports@gmail.com.",
  });
};
