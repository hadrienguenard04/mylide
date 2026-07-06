// api/verify-google-purchase.js — Vercel Serverless Function
// Vérifie un achat d'abonnement Google Play (TWA) auprès de l'API Google Play
// Developer, PUIS active le plan dans Supabase. Équivalent Android du webhook Stripe.
//
// Requiert un JWT Supabase valide (Authorization: Bearer <token>).
//
// Variables d'environnement nécessaires (voir PLAY_BILLING_SETUP.md) :
//   GOOGLE_PLAY_PACKAGE_NAME   = app.mylide.pwa
//   GOOGLE_SERVICE_ACCOUNT_JSON = contenu JSON complet de la clé du compte de service
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (déjà configurés)

const { createClient } = require("@supabase/supabase-js");
const { GoogleAuth } = require("google-auth-library");
const { verifyAndAuthorize } = require("./_lib/auth");

// Correspondance ID produit Google Play → plan interne MYLIDE.
// DOIT rester synchro avec androidSku dans src/planConfig.js.
const SKU_TO_PLAN = {
  mylide_starter: "starter",
  mylide_pro: "pro",
  mylide_premium: "premium",
};

// États Google considérés comme "abonnement actif" (accès autorisé).
const ACTIVE_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_PENDING", // paiement en cours d'acceptation
]);

let _authClient = null;
async function getGoogleAuthToken() {
  if (!_authClient) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON manquant");
    const credentials = JSON.parse(raw);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    _authClient = await auth.getClient();
  }
  const { token } = await _authClient.getAccessToken();
  return token;
}

module.exports = async function handler(req, res) {
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { purchaseToken, sku, userId } = req.body || {};
  if (!purchaseToken || !sku || !userId) {
    return res.status(400).json({ error: "purchaseToken, sku et userId sont requis" });
  }

  // Vérifier l'identité de l'utilisateur (comme create-checkout)
  const { error: authError } = await verifyAndAuthorize(req, userId);
  if (authError) return res.status(authError.includes("interdit") ? 403 : 401).json({ error: authError });

  const plan = SKU_TO_PLAN[sku];
  if (!plan) return res.status(400).json({ error: `Produit inconnu : ${sku}` });

  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) return res.status(500).json({ error: "GOOGLE_PLAY_PACKAGE_NAME manquant" });

  try {
    // ── 1) Interroger Google Play Developer API (subscriptionsv2) ──────────────
    const accessToken = await getGoogleAuthToken();
    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
      `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/` +
      `${encodeURIComponent(purchaseToken)}`;

    const gRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gRes.ok) {
      const body = await gRes.text();
      console.error("Google Play API error:", gRes.status, body);
      return res.status(502).json({ error: "Impossible de vérifier l'achat auprès de Google." });
    }

    const purchase = await gRes.json();
    const state = purchase.subscriptionState;

    if (!ACTIVE_STATES.has(state)) {
      console.warn(`Achat non actif pour user ${userId}: ${state}`);
      return res.status(402).json({ error: "Abonnement non actif.", state });
    }

    // Date d'expiration / fin de période (premier lineItem)
    const lineItem = (purchase.lineItems && purchase.lineItems[0]) || {};
    const expiryTime = lineItem.expiryTime || null;
    // Google indique si l'utilisateur est en période d'essai gratuit
    const inTrial = lineItem.offerDetails?.offerTags?.some?.(t => /trial/i.test(t?.tag || "")) || false;
    const subStatus = state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ? "past_due"
      : inTrial ? "trialing"
      : "active";

    // ── 2) Activer le plan dans Supabase ──────────────────────────────────────
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase.from("profiles").update({
      plan,
      subscription_status: subStatus,
      subscription_period_end: expiryTime,
      trial_end: inTrial ? expiryTime : null,
      // On stocke le jeton Google pour retrouver l'abonnement lors des
      // notifications de renouvellement/annulation (RTDN).
      google_purchase_token: purchaseToken,
      google_product_id: sku,
    }).eq("id", userId);

    // ── 3) (Recommandé) Acquitter l'achat auprès de Google ─────────────────────
    // Sans acquittement sous 3 jours, Google rembourse automatiquement.
    // subscriptionsv2 : l'acquittement se fait via l'ancien endpoint acknowledge.
    try {
      await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
        `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
        `${encodeURIComponent(sku)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
    } catch (e) {
      console.warn("Acknowledge non critique échoué:", e.message);
    }

    console.log(`✅ Google Play purchase verified: user ${userId} → ${plan} (${subStatus})`);
    return res.json({ success: true, plan, status: subStatus });
  } catch (err) {
    console.error("verify-google-purchase error:", err);
    return res.status(500).json({ error: err.message });
  }
};
