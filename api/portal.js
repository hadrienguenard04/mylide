// api/portal.js — Vercel Serverless Function
// Crée une session Stripe Customer Portal pour gérer/résilier l'abonnement.
// Requiert un JWT Supabase valide dans le header Authorization.

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

  // Vérifier l'identité de l'utilisateur
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
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: "Aucun abonnement trouvé pour cet utilisateur" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: appUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: err.message });
  }
};
