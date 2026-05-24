// api/reactivate-subscription.js — Vercel Serverless Function
// Réactive un abonnement programmé pour résiliation (annule le cancel_at_period_end).

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { verifyAndAuthorize } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requis" });

  const { error: authError } = await verifyAndAuthorize(req, userId);
  if (authError) return res.status(authError.includes("interdit") ? 403 : 401).json({ error: authError });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: "Aucun abonnement trouvé" });
    }

    // Annuler la résiliation programmée
    const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Utiliser le vrai statut Stripe (active ou trialing) — jamais hardcodé
    const realStatus = sub.status === "trialing" ? "trialing" : "active";

    await supabase.from("profiles").update({
      subscription_status: realStatus,
    }).eq("id", userId);

    return res.json({ success: true });
  } catch (err) {
    console.error("Reactivate error:", err);
    res.status(500).json({ error: err.message });
  }
};
