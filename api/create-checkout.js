// api/create-checkout.js — Vercel Serverless Function
// Crée une session Stripe Checkout avec 30 jours d'essai gratuit

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  // CORS
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

  const { priceId, userId, userEmail, plan } = req.body;
  if (!priceId || !userId) {
    return res.status(400).json({ error: "priceId et userId sont requis" });
  }

  try {
    // Récupérer ou créer le customer Stripe
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30,
        metadata: { userId, plan },
      },
      success_url: `${appUrl}?payment=success&plan=${plan}`,
      cancel_url: `${appUrl}?payment=cancelled`,
      metadata: { userId, plan },
      locale: "fr",
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message });
  }
};
