// api/cancel-subscription.js — Vercel Serverless Function
// Résilie immédiatement l'abonnement Stripe

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requis" });

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: "Aucun abonnement actif" });
    }

    // Résiliation immédiate
    await stripe.subscriptions.cancel(profile.stripe_subscription_id);

    // Mettre à jour Supabase
    await supabase.from("profiles").update({
      plan: "free",
      subscription_status: "cancelled",
      stripe_subscription_id: null,
      subscription_period_end: null,
      trial_end: null,
    }).eq("id", userId);

    res.json({ success: true });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message });
  }
};
