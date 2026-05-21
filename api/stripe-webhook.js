// api/stripe-webhook.js — Vercel Serverless Function
// Gère les événements Stripe et met à jour Supabase

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

// IMPORTANT: désactiver le bodyParser pour lire le raw body (nécessaire pour la signature Stripe)
module.exports.config = {
  api: { bodyParser: false },
};

// Lire le body brut
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Map price ID → plan name
function priceIdToPlan(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_STARTER]: "starter",
    [process.env.STRIPE_PRICE_PRO]: "pro",
    [process.env.STRIPE_PRICE_PREMIUM]: "premium",
  };
  return map[priceId] || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier la signature Stripe
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // ── Checkout completé → activer l'essai ──────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, plan } = session.metadata || {};
        if (!userId) break;

        await supabase.from("profiles").update({
          plan: plan || "pro",
          subscription_status: "trialing",
          stripe_subscription_id: session.subscription,
          trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq("id", userId);

        console.log(`✅ Checkout completed: user ${userId} → ${plan}`);
        break;
      }

      // ── Abonnement mis à jour (actif, trial terminé, etc.) ───────────────
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const { userId } = sub.metadata || {};

        if (!userId) {
          // Essayer de retrouver userId via le customer
          const customer = await stripe.customers.retrieve(sub.customer);
          const uid = customer.metadata?.userId;
          if (!uid) break;

          const priceId = sub.items.data[0]?.price?.id;
          const plan = priceIdToPlan(priceId);

          await supabase.from("profiles").update({
            plan: (sub.status === "active" || sub.status === "trialing") && plan ? plan : "free",
            subscription_status: sub.status,
            subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq("id", uid);
        } else {
          const priceId = sub.items.data[0]?.price?.id;
          const plan = priceIdToPlan(priceId);

          await supabase.from("profiles").update({
            plan: (sub.status === "active" || sub.status === "trialing") && plan ? plan : "free",
            subscription_status: sub.status,
            subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq("id", userId);
        }

        console.log(`🔄 Subscription updated: ${sub.id} → ${sub.status}`);
        break;
      }

      // ── Abonnement annulé → repasser en free ─────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { userId } = sub.metadata || {};

        const uid = userId || (await stripe.customers.retrieve(sub.customer)).metadata?.userId;
        if (!uid) break;

        await supabase.from("profiles").update({
          plan: "free",
          subscription_status: "cancelled",
          stripe_subscription_id: null,
          subscription_period_end: null,
          trial_end: null,
        }).eq("id", uid);

        console.log(`❌ Subscription cancelled: user ${uid} → free`);
        break;
      }

      // ── Paiement échoué ───────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        // Mettre à jour le statut pour indiquer un problème de paiement
        // Le statut Stripe passera automatiquement à "past_due"
        console.log(`⚠️ Payment failed: ${invoice.customer_email}`);
        break;
      }

      // ── Essai terminé ─────────────────────────────────────────────────────
      case "customer.subscription.trial_will_end": {
        // Optionnel: envoyer une notification 3 jours avant la fin de l'essai
        console.log(`⏰ Trial ending soon: ${event.data.object.id}`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: err.message });
  }
};
