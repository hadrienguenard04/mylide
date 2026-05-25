// api/stripe-webhook.js — Vercel Serverless Function
// Gère tous les événements Stripe → met à jour Supabase + envoie les emails.
// CRITIQUE : bodyParser désactivé pour valider la signature Stripe.

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const {
  sendEmail,
  emailWelcome,
  emailTrialEnding,
  emailPaymentConfirmed,
  emailPaymentFailed,
  emailCancelled,
} = require("./_lib/email");

module.exports.config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function priceIdToPlan(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_STARTER]: "starter",
    [process.env.STRIPE_PRICE_PRO]:     "pro",
    [process.env.STRIPE_PRICE_PREMIUM]: "premium",
  };
  return map[priceId] || null;
}

const PLAN_LABELS = { starter: "Starter", pro: "Pro", premium: "Premium" };
const PLAN_PRICES = { starter: "3,99", pro: "6,99", premium: "12,99" };

// Résoudre l'userId depuis les metadata (subscription ou customer)
async function resolveUserId(stripe, obj) {
  if (obj.metadata?.userId) return obj.metadata.userId;
  try {
    const customer = await stripe.customers.retrieve(obj.customer);
    return customer.metadata?.userId || null;
  } catch { return null; }
}

// Récupérer le profil Supabase (nom + email)
async function getProfile(supabase, userId) {
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();
  return data;
}

// Récupérer l'email Supabase Auth
async function getUserEmail(supabase, userId) {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── Vérification de la signature Stripe ──────────────────────────────────
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      // ── Checkout complété → activer l'essai + email bienvenue ─────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, plan } = session.metadata || {};
        if (!userId) break;

        // Récupérer la date de fin d'essai depuis Stripe (source de vérité)
        let trialEnd = null;
        let subStatus = "trialing";
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
            subStatus = sub.status || "trialing";
          } catch (e) {
            console.warn("Could not retrieve subscription for trial_end:", e.message);
            // Fallback : calcul local
            trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          }
        }

        await supabase.from("profiles").update({
          plan: plan || "pro",
          subscription_status: subStatus,
          stripe_subscription_id: session.subscription,
          trial_end: trialEnd,
        }).eq("id", userId);

        // Email de bienvenue
        const [profile, email] = await Promise.all([
          getProfile(supabase, userId),
          getUserEmail(supabase, userId),
        ]);

        if (email) {
          const planName = PLAN_LABELS[plan] || plan;
          await sendEmail({
            to: email,
            subject: `Bienvenue dans MYLIDE ${planName} ! 🎉`,
            html: emailWelcome({ name: profile?.name, planName, trialEnd }),
          });
        }

        console.log(`✅ Checkout completed: user ${userId} → ${plan}`);
        break;
      }

      // ── Abonnement mis à jour (actif, trial terminé, changement de plan) ──
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = await resolveUserId(stripe, sub);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);
        const isActive = sub.status === "active" || sub.status === "trialing";

        // Respecter cancel_at_period_end : ne pas écraser ce statut
        const newStatus = sub.cancel_at_period_end ? "cancel_at_period_end" : sub.status;

        const update = {
          subscription_status: newStatus,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        };
        // Ne mettre à jour le plan que si on peut le résoudre (évite de remettre "free" par erreur)
        if (plan) update.plan = isActive ? plan : "free";
        else if (!isActive) update.plan = "free";

        await supabase.from("profiles").update(update).eq("id", userId);

        console.log(`🔄 Subscription updated: ${sub.id} → ${newStatus}`);
        break;
      }

      // ── Abonnement annulé → repasser en free + email ──────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = await resolveUserId(stripe, sub);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);

        // Lire le flag avant de mettre à jour (pour savoir si email déjà envoyé)
        const { data: profileBefore } = await supabase
          .from("profiles")
          .select("name, cancellation_email_sent")
          .eq("id", userId)
          .single();

        await supabase.from("profiles").update({
          plan: "free",
          subscription_status: "cancelled",
          stripe_subscription_id: null,
          subscription_period_end: null,
          trial_end: null,
          cancellation_email_sent: false, // reset pour un éventuel ré-abonnement futur
        }).eq("id", userId);

        // Envoyer l'email seulement si cancel-subscription.js ne l'a pas déjà fait
        if (!profileBefore?.cancellation_email_sent) {
          const email = await getUserEmail(supabase, userId);
          if (email) {
            const planName = PLAN_LABELS[plan] || plan || "Premium";
            await sendEmail({
              to: email,
              subject: "Ton abonnement MYLIDE est terminé",
              html: emailCancelled({ name: profileBefore?.name, planName, accessUntil: null }),
            }).catch(() => {});
          }
        }

        console.log(`❌ Subscription deleted: user ${userId} → free`);
        break;
      }

      // ── Paiement réussi (renouvellement mensuel) → email facture ─────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        // Ne traiter que les renouvellements (billing_reason = subscription_cycle)
        if (invoice.billing_reason !== "subscription_cycle") break;

        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription)
          : null;
        if (!sub) break;

        const userId = await resolveUserId(stripe, sub);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);

        // S'assurer que le statut est bien actif dans Supabase
        await supabase.from("profiles").update({
          subscription_status: "active",
          plan: plan || undefined,
        }).eq("id", userId);

        // Email confirmation paiement avec lien facture
        const [profile, email] = await Promise.all([
          getProfile(supabase, userId),
          getUserEmail(supabase, userId),
        ]);
        if (email) {
          await sendEmail({
            to: email,
            subject: `Confirmation de paiement MYLIDE ${PLAN_LABELS[plan] || ""}`,
            html: emailPaymentConfirmed({
              name: profile?.name,
              planName: PLAN_LABELS[plan] || plan,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              invoiceDate: invoice.created,
              invoiceUrl: invoice.hosted_invoice_url,
            }),
          });
        }

        console.log(`💳 Payment succeeded: user ${userId}, ${invoice.amount_paid / 100}€`);
        break;
      }

      // ── Paiement échoué → mettre à jour le statut + email alerte ─────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription)
          : null;
        if (!sub) break;

        const userId = await resolveUserId(stripe, sub);
        if (!userId) break;

        // Mettre à jour le statut Supabase → past_due
        await supabase.from("profiles").update({
          subscription_status: "past_due",
        }).eq("id", userId);

        // Récupérer le plan pour l'email
        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);

        // Email alerte paiement échoué
        const [profile, email] = await Promise.all([
          getProfile(supabase, userId),
          getUserEmail(supabase, userId),
        ]);
        if (email) {
          await sendEmail({
            to: email,
            subject: "⚠️ Échec de paiement MYLIDE",
            html: emailPaymentFailed({
              name: profile?.name,
              planName: PLAN_LABELS[plan] || plan,
              nextAttempt: invoice.next_payment_attempt,
            }),
          });
        }

        console.log(`⚠️ Payment failed: user ${userId} → past_due`);
        break;
      }

      // ── Essai se terminant dans 3 jours → email rappel ───────────────────
      case "customer.subscription.trial_will_end": {
        const sub = event.data.object;
        const userId = await resolveUserId(stripe, sub);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);

        const [profile, email] = await Promise.all([
          getProfile(supabase, userId),
          getUserEmail(supabase, userId),
        ]);
        if (email) {
          await sendEmail({
            to: email,
            subject: "⏰ Ton essai MYLIDE se termine dans 3 jours",
            html: emailTrialEnding({
              name: profile?.name,
              planName: PLAN_LABELS[plan] || plan,
              planPrice: PLAN_PRICES[plan] || "?",
              trialEnd: sub.trial_end,
            }),
          });
        }

        console.log(`⏰ Trial ending soon for user ${userId}`);
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
