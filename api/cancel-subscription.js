// api/cancel-subscription.js — Vercel Serverless Function
// Programme la résiliation à la fin de la période (pas immédiate)
// Exception : si encore en période d'essai → résiliation immédiate (pas de débit)

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
      .select("stripe_subscription_id, subscription_status")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: "Aucun abonnement actif" });
    }

    const isTrialing = profile.subscription_status === "trialing";

    if (isTrialing) {
      // Encore en essai gratuit → résiliation immédiate (pas de débit)
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      await supabase.from("profiles").update({
        plan: "free",
        subscription_status: "cancelled",
        stripe_subscription_id: null,
        subscription_period_end: null,
        trial_end: null,
      }).eq("id", userId);

      return res.json({ success: true, immediate: true });
    } else {
      // Abonnement payé → accès conservé jusqu'à la fin de la période
      const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Juste noter que la résiliation est programmée, pas de changement de plan
      await supabase.from("profiles").update({
        subscription_status: "cancel_at_period_end",
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq("id", userId);

      return res.json({
        success: true,
        immediate: false,
        period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message });
  }
};
