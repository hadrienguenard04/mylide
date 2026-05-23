// api/delete-account.js — Vercel Serverless Function
// Suppression RGPD complète du compte utilisateur.
// Annule l'abonnement Stripe si actif, supprime toutes les données Supabase,
// révoque la session, et envoie un email de confirmation.

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { verifyAndAuthorize } = require("./_lib/auth");
const { sendEmail, emailAccountDeleted } = require("./_lib/email");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requis" });

  // Vérifier que l'utilisateur est bien celui qu'il prétend être
  const { user, error: authError } = await verifyAndAuthorize(req, userId);
  if (authError) return res.status(authError.includes("interdit") ? 403 : 401).json({ error: authError });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Récupérer le profil pour Stripe + email
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, subscription_status, name")
      .eq("id", userId)
      .single();

    // 2. Annuler l'abonnement Stripe si actif
    if (profile?.stripe_subscription_id) {
      try {
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        console.log(`✅ Stripe subscription cancelled for user ${userId}`);
      } catch (stripeErr) {
        // Ne pas bloquer la suppression si Stripe échoue
        console.error("Stripe cancellation error (non-bloquant):", stripeErr.message);
      }
    }

    // 3. Supprimer toutes les données utilisateur dans l'ordre (FK constraints)
    const tables = ["daily_logs", "goals", "todos", "patrimoine"];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) console.error(`Error deleting ${table}:`, error.message);
    }

    // 4. Supprimer le profil
    await supabase.from("profiles").delete().eq("id", userId);

    // 5. Supprimer le compte auth Supabase (invalide toutes les sessions)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("Auth delete error:", authDeleteError.message);
      // Continuer même en cas d'erreur — les données sont déjà supprimées
    }

    // 6. Envoyer l'email de confirmation RGPD
    const email = user.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Ton compte MYLIDE a été supprimé",
        html: emailAccountDeleted({ name: profile?.name }),
      });
    }

    console.log(`✅ Account deleted: user ${userId} (${email})`);
    return res.json({ success: true });

  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: err.message });
  }
};
