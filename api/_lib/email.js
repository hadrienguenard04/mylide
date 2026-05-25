// api/_lib/email.js — Service d'emails transactionnels via Resend
// https://resend.com — gratuit jusqu'à 100 emails/jour (plan free)
//
// Setup requis :
//   1. Créer un compte sur resend.com
//   2. Vérifier ton domaine mylide.app (DNS TXT record)
//   3. Créer une API key dans le dashboard Resend
//   4. Ajouter RESEND_API_KEY dans les env vars Vercel
//
// Expéditeur : noreply@mylide.app (une fois le domaine vérifié)
// En attendant la vérification : utiliser onboarding@resend.dev (sandbox)

const FROM_EMAIL = "MYLIDE <noreply@mylide.app>";
const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Envoie un email via Resend.
 * Retourne { success, error }
 */
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY non configuré — email non envoyé:", subject, "→", to);
    return { success: false, error: "RESEND_API_KEY manquant" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return { success: false, error: err };
    }

    return { success: true };
  } catch (e) {
    console.error("Email send error:", e.message);
    return { success: false, error: e.message };
  }
}

// ── TEMPLATES HTML ────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background: #F8F8F6;
  margin: 0; padding: 0;
`;

const CARD_STYLE = `
  max-width: 560px; margin: 32px auto; background: #ffffff;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
`;

const HEADER_HTML = `
  <div style="background: linear-gradient(135deg, #CC2936, #8B1A22); padding: 32px 36px; text-align: center;">
    <div style="font-size: 32px; margin-bottom: 8px;">💪</div>
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">MYLIDE</h1>
    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px;">Ton tracker de vie intelligent</p>
  </div>
`;

const FOOTER_HTML = `
  <div style="padding: 20px 36px; background: #F8F8F6; text-align: center; border-top: 1px solid #E8E8E4;">
    <p style="margin: 0; font-size: 11px; color: #6B6B6B; line-height: 1.8;">
      MYLIDE · Application de bien-être personnel · Non médical<br>
      Pour toute question : <a href="mailto:contact@mylide.app" style="color: #CC2936; text-decoration: none;">contact@mylide.app</a><br>
      <a href="https://mylide.app/legal" style="color: #6B6B6B;">CGU</a> ·
      <a href="https://mylide.app/legal" style="color: #6B6B6B;">Confidentialité</a> ·
      <a href="https://mylide.app/legal" style="color: #6B6B6B;">RGPD</a>
    </p>
  </div>
`;

function wrapEmail(content) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${BASE_STYLE}">
<div style="${CARD_STYLE}">
  ${HEADER_HTML}
  <div style="padding: 32px 36px;">
    ${content}
  </div>
  ${FOOTER_HTML}
</div>
</body></html>`;
}

// ── EMAIL 1 : Bienvenue abonnement / début essai ──────────────────────────────
function emailWelcome({ name, planName, trialEnd }) {
  const dateStr = trialEnd
    ? new Date(trialEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 900; color: #1A1A1A;">
      Bienvenue dans MYLIDE ${planName} ! 🎉
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"},<br><br>
      Ton essai gratuit de 7 jours est maintenant actif. Toutes les fonctionnalités premium sont débloquées.
      ${dateStr ? `<br><br><strong>Ton essai se termine le ${dateStr}.</strong> Tu peux résilier à tout moment avant cette date sans être débité.` : ""}
    </p>
    <div style="background: #F8F8F6; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #1A1A1A;">Ce que tu as débloqué :</p>
      ${["Statistiques avancées & historique complet", "Insights et prédictions intelligentes", "Export PDF + Excel de toutes tes données", "Radar de vie historique illimité"].map(f =>
        `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 7px;">
          <span style="color: #10B981; font-weight: 700;">✓</span>
          <span style="font-size: 13px; color: #1A1A1A;">${f}</span>
        </div>`
      ).join("")}
    </div>
    <div style="text-align: center; margin: 0 0 8px;">
      <a href="https://mylide.app" style="display: inline-block; background: linear-gradient(135deg, #CC2936, #8B1A22); color: #fff; text-decoration: none; border-radius: 12px; padding: 14px 32px; font-weight: 800; font-size: 15px;">
        Ouvrir MYLIDE →
      </a>
    </div>
    <p style="margin: 16px 0 0; font-size: 12px; color: #6B6B6B; text-align: center; line-height: 1.7;">
      Résiliable à tout moment depuis Paramètres → Abonnement.<br>
      MYLIDE est une application de bien-être personnel. Elle ne remplace pas un professionnel de santé.
    </p>
  `);
}

// ── EMAIL 2 : Fin d'essai dans 3 jours ───────────────────────────────────────
function emailTrialEnding({ name, planName, planPrice, trialEnd }) {
  const dateStr = new Date(trialEnd * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #1A1A1A;">
      ⏰ Ton essai se termine dans 3 jours
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"},<br><br>
      Ton essai gratuit MYLIDE ${planName} se termine le <strong>${dateStr}</strong>.<br><br>
      Après cette date, ton abonnement se renouvellera automatiquement à <strong>${planPrice}€/mois</strong>.
      Si tu veux arrêter, résilie avant le ${dateStr} — aucun frais.
    </p>
    <div style="display: flex; gap: 12px; margin: 0 0 16px;">
      <a href="https://mylide.app" style="flex: 1; text-align: center; display: block; background: linear-gradient(135deg, #CC2936, #8B1A22); color: #fff; text-decoration: none; border-radius: 12px; padding: 13px; font-weight: 800; font-size: 14px;">
        Continuer →
      </a>
      <a href="https://mylide.app" style="flex: 1; text-align: center; display: block; background: #F8F8F6; color: #6B6B6B; text-decoration: none; border-radius: 12px; padding: 13px; font-weight: 600; font-size: 14px; border: 1px solid #E8E8E4;">
        Gérer
      </a>
    </div>
  `);
}

// ── EMAIL 3 : Confirmation de paiement (renouvellement) ──────────────────────
function emailPaymentConfirmed({ name, planName, amount, currency, invoiceDate, invoiceUrl }) {
  const amountStr = (amount / 100).toFixed(2).replace(".", ",");
  const currencyStr = currency?.toUpperCase() || "EUR";
  const dateStr = new Date(invoiceDate * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #1A1A1A;">
      ✅ Paiement confirmé
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"}, ton abonnement MYLIDE ${planName} a bien été renouvelé.
    </p>
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div><div style="font-size: 11px; color: #6B6B6B; font-weight: 600; text-transform: uppercase; margin-bottom: 2px;">Montant</div><div style="font-size: 18px; font-weight: 900; color: #1A1A1A;">${amountStr} ${currencyStr}</div></div>
        <div><div style="font-size: 11px; color: #6B6B6B; font-weight: 600; text-transform: uppercase; margin-bottom: 2px;">Date</div><div style="font-size: 14px; font-weight: 700; color: #1A1A1A;">${dateStr}</div></div>
        <div><div style="font-size: 11px; color: #6B6B6B; font-weight: 600; text-transform: uppercase; margin-bottom: 2px;">Plan</div><div style="font-size: 14px; font-weight: 700; color: #CC2936;">MYLIDE ${planName}</div></div>
        <div><div style="font-size: 11px; color: #6B6B6B; font-weight: 600; text-transform: uppercase; margin-bottom: 2px;">Statut</div><div style="font-size: 14px; font-weight: 700; color: #10B981;">✓ Payé</div></div>
      </div>
    </div>
    ${invoiceUrl ? `<div style="text-align: center; margin-bottom: 8px;"><a href="${invoiceUrl}" style="display: inline-block; background: #F8F8F6; color: #1A1A1A; text-decoration: none; border-radius: 10px; padding: 10px 24px; font-weight: 600; font-size: 13px; border: 1px solid #E8E8E4;">📄 Télécharger la facture</a></div>` : ""}
    <p style="margin: 16px 0 0; font-size: 11px; color: #6B6B6B; text-align: center;">
      TVA incluse · Conformité PCI DSS via Stripe · Résiliable à tout moment
    </p>
  `);
}

// ── EMAIL 4 : Échec de paiement ───────────────────────────────────────────────
function emailPaymentFailed({ name, planName, nextAttempt }) {
  const dateStr = nextAttempt
    ? new Date(nextAttempt * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #CC2936;">
      ⚠️ Échec de paiement
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"},<br><br>
      Nous n'avons pas pu prélever ton abonnement MYLIDE ${planName}. Ton accès premium reste actif pour le moment.
      ${dateStr ? `<br><br>Prochain essai de prélèvement : <strong>${dateStr}</strong>.` : ""}
    </p>
    <div style="background: #FFF1F2; border: 1px solid #FCA5A5; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #7F1D1D; line-height: 1.6;">
        Pour éviter la suspension de ton accès, mets à jour ton moyen de paiement dans le portail Stripe.
      </p>
    </div>
    <div style="text-align: center;">
      <a href="https://mylide.app" style="display: inline-block; background: linear-gradient(135deg, #CC2936, #8B1A22); color: #fff; text-decoration: none; border-radius: 12px; padding: 13px 28px; font-weight: 800; font-size: 14px;">
        Mettre à jour mon paiement →
      </a>
    </div>
  `);
}

// ── EMAIL 5 : Annulation confirmée ────────────────────────────────────────────
function emailCancelled({ name, planName, accessUntil }) {
  const dateStr = accessUntil
    ? new Date(accessUntil).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #1A1A1A;">
      Résiliation confirmée
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"},<br><br>
      Ta résiliation de l'abonnement MYLIDE ${planName} a bien été enregistrée.
      ${dateStr ? `<br><br>Tu conserves l'accès à toutes les fonctionnalités premium jusqu'au <strong>${dateStr}</strong>. Aucun prélèvement supplémentaire ne sera effectué.` : ""}
    </p>
    <div style="background: #F8F8F6; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #6B6B6B; line-height: 1.6;">
        Ton compte et tes données restent intacts. Si tu changes d'avis, tu peux te réabonner à tout moment depuis l'application. Nous serions heureux de te retrouver.
      </p>
    </div>
    <div style="text-align: center;">
      <a href="https://mylide.app" style="display: inline-block; background: #F8F8F6; color: #1A1A1A; text-decoration: none; border-radius: 12px; padding: 12px 28px; font-weight: 700; font-size: 14px; border: 1px solid #E8E8E4;">
        Revenir sur MYLIDE
      </a>
    </div>
  `);
}

// ── EMAIL 6 : Suppression de compte ──────────────────────────────────────────
function emailAccountDeleted({ name }) {
  return wrapEmail(`
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #1A1A1A;">
      Compte supprimé
    </h2>
    <p style="margin: 0 0 20px; color: #6B6B6B; font-size: 14px; line-height: 1.65;">
      Salut ${name || "là"},<br><br>
      La suppression de ton compte MYLIDE a bien été enregistrée. Toutes tes données personnelles seront définitivement supprimées dans les 30 jours.
    </p>
    <div style="background: #F8F8F6; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #6B6B6B; line-height: 1.6;">
        Conformément au RGPD (UE 2016/679) et à notre politique de confidentialité, tes données seront supprimées de nos serveurs dans un délai de 30 jours. Les données de facturation sont conservées 10 ans conformément aux obligations légales françaises.
      </p>
    </div>
    <p style="margin: 0; font-size: 12px; color: #6B6B6B; text-align: center; line-height: 1.7;">
      Pour toute question RGPD : <a href="mailto:contact@mylide.app" style="color: #CC2936;">contact@mylide.app</a><br>
      Tu peux revenir à tout moment en créant un nouveau compte.
    </p>
  `);
}

module.exports = {
  sendEmail,
  emailWelcome,
  emailTrialEnding,
  emailPaymentConfirmed,
  emailPaymentFailed,
  emailCancelled,
  emailAccountDeleted,
};
