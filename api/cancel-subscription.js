// api/cancel-subscription.js — Vercel Serverless Function
// Programme la résiliation à la fin de la période (pas immédiate).
// Exception : si encore en période d'essai → résiliation immédiate (pas de débit).
// Requiert un JWT Supabase valide dans le header Authorization.

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { verifyAndAuthorize } = require("./_lib/auth");
const { sendEmail, emailCancelled } = require("./_lib/email");

module.exports = async function handler(req, res) {
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  res.setHeader("Access-Control-Allow-Origin", appUrl);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requis" });

  // Vérifier l'identité de l'utilisateur
  const { user, error: authError } = await verifyAndAuthorize(req, userId);
  if (authError) return res.status(authError.includes("interdit") ? 403 : 401).json({ error: authError });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_status, plan, name")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: "Aucun abonnement actif" });
    }

    const isTrialing = profile.subscription_status === "trialing";
    const planLabels = { starter: "Starter", pro: "Pro", premium: "Premium" };
    const planName = planLabels[profile.plan] || profile.plan;

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

      // Email de confirmation
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Résiliation MYLIDE confirmée",
          html: emailCancelled({ name: profile.name, planName, accessUntil: null }),
        });
      }

      return res.json({ success: true, immediate: true });

    } else {
      // Abonnement payé → accès conservé jusqu'à la fin de la période
      const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      await supabase.from("profiles").update({
        subscription_status: "cancel_at_period_end",
        subscription_period_end: periodEnd,
      }).eq("id", userId);

      // Email de confirmation avec date d'accès
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Résiliation MYLIDE programmée",
          html: emailCancelled({ name: profile.name, planName, accessUntil: periodEnd }),
        });
      }

      return res.json({
        success: true,
        immediate: false,
        period_end: periodEnd,
      });
    }
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message });
  }
};
