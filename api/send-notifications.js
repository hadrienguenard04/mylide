// api/send-notifications.js — Vercel Serverless Function
// Appelé toutes les 15 min par GitHub Actions (ou Vercel Cron si dispo).
// Lit les abonnements push dans Supabase, calcule quelles notifs envoyer
// selon les préférences de chaque utilisateur, et les pousse via Web Push.

const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
  "mailto:contact@mylide.app",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Helpers horaires ──────────────────────────────────────────────────────

function addMins(timeStr, mins) {
  const [h, m] = (timeStr || "07:00").split(":").map(Number);
  const t = ((h * 60 + m + mins) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// Vérifie si timeStr (HH:MM) tombe dans la fenêtre de 15 min courante
// dans le fuseau de l'utilisateur
function isInWindow(timeStr, timezone, windowMins = 15) {
  if (!timeStr) return false;
  try {
    const now = new Date();
    const local = new Date(now.toLocaleString("en-US", { timeZone: timezone || "Europe/Paris" }));
    const [h, m] = timeStr.split(":").map(Number);
    const targetMins = h * 60 + m;
    const currentMins = local.getHours() * 60 + local.getMinutes();
    return currentMins >= targetMins && currentMins < targetMins + windowMins;
  } catch { return false; }
}

// Jour de la semaine local (0=Dim, 1=Lun ... 6=Sam)
function getLocalDay(timezone) {
  try {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: timezone || "Europe/Paris" })).getDay();
  } catch { return new Date().getDay(); }
}

// ── Calcul des notifications à envoyer ───────────────────────────────────

function getNotificationsToSend(cfg, timezone) {
  if (!cfg || cfg.silentMode) return [];
  const msgs = [];
  const day = getLocalDay(timezone);

  // Motivation — réveil + 30min
  if (cfg.motivation?.on) {
    if (isInWindow(addMins(cfg.wakeTime || "07:00", 30), timezone)) {
      msgs.push({
        title: "Bonjour ! 💪",
        body: "Ta journée commence. Remplis ton tracker pour rester dans le vert.",
        url: "/",
      });
    }
  }

  // Hydratation — toutes les 2h30 pendant la journée active
  if (cfg.hydration?.on) {
    const [wH, wM] = (cfg.wakeTime || "07:00").split(":").map(Number);
    const [sH, sM] = (cfg.sleepTime || "23:00").split(":").map(Number);
    const wakeTotal  = wH * 60 + wM + 60;   // +1h après le réveil
    const sleepTotal = sH * 60 + sM - 60;   // -1h avant le coucher
    for (let t = wakeTotal; t <= sleepTotal; t += 150) {
      const ts = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      if (isInWindow(ts, timezone)) {
        msgs.push({ title: "💧 Hydratation", body: "N'oublie pas de boire ! Vise 2L par jour.", url: "/" });
        break;
      }
    }
  }

  // Entraînement
  if (cfg.training?.on && cfg.training?.time) {
    const days = cfg.training?.days || [1, 2, 3, 4, 5, 6];
    if (days.includes(day) && isInWindow(cfg.training.time, timezone)) {
      msgs.push({ title: "🏋️ Entraînement", body: "C'est l'heure ! Donne tout et ajoute ta séance après.", url: "/" });
    }
  }

  // Rappel marche
  if (cfg.walk?.on && cfg.walk?.time) {
    const days = cfg.walk?.days || [1, 2, 3, 4, 5, 6, 0];
    if (days.includes(day) && isInWindow(cfg.walk.time, timezone)) {
      msgs.push({ title: "👟 Rappel marche", body: "Même 20 minutes de marche changent tout. Tu y vas ?", url: "/" });
    }
  }

  // Résumé quotidien
  if (cfg.daily?.on && cfg.daily?.time) {
    if (isInWindow(cfg.daily.time, timezone)) {
      msgs.push({ title: "📊 Bilan du jour", body: "Complète ton tracker avant de dormir · 2 min suffisent.", url: "/" });
    }
  }

  // Résumé hebdomadaire
  if (cfg.weekly?.on && cfg.weekly?.time) {
    const weekDay = cfg.weekly?.day ?? 0;
    if (day === weekDay && isInWindow(cfg.weekly.time, timezone)) {
      msgs.push({ title: "📅 Résumé de la semaine", body: "Regarde tes progrès · tu avances plus vite que tu ne crois.", url: "/" });
    }
  }

  // Rappel coucher
  if (cfg.sleep?.on) {
    if (isInWindow(addMins(cfg.sleepTime || "23:00", -30), timezone)) {
      msgs.push({ title: "🌙 Presque l'heure", body: "Dans 30 min c'est l'heure de dormir. Décompresse.", url: "/" });
    }
  }

  return msgs;
}

// ── Handler principal ─────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Sécurité — vérifier le secret cron
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[send-notifications] CRON_SECRET manquant — endpoint désactivé");
    return res.status(500).json({ error: "Server misconfigured: CRON_SECRET not set" });
  }
  if (req.headers["x-cron-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription, notif_v2, timezone");

  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  // ── Notifications demandes d'amis ─────────────────────────────────────────
  // Pour chaque user qui a une push subscription, vérifier s'il a des demandes
  // d'amis en attente non notifiées (created_at dans les 20 dernières minutes)
  const windowAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  try {
    const { data: pendingRequests } = await supabase
      .from("friendships")
      .select("addressee_id, requester:requester_id(name)")
      .eq("status", "pending")
      .gte("created_at", windowAgo);

    if (pendingRequests && pendingRequests.length > 0) {
      for (const req of pendingRequests) {
        const sub = subs?.find(s => s.user_id === req.addressee_id);
        if (!sub?.subscription) continue;
        const requesterName = req.requester?.name?.split(" ")[0] || "Quelqu'un";
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({
            title: "👥 Demande d'ami",
            body: `${requesterName} veut t'ajouter en ami sur MYLIDE`,
            url: "/",
          }));
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("user_id", req.addressee_id);
          }
        }
      }
    }
  } catch (e) { console.error("Friend request notifications error:", e.message); }

  let sent = 0, failed = 0, skipped = 0;

  for (const row of subs || []) {
    if (!row.subscription || !row.notif_v2) { skipped++; continue; }

    const messages = getNotificationsToSend(row.notif_v2, row.timezone || "Europe/Paris");

    for (const msg of messages) {
      try {
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({ title: msg.title, body: msg.body, url: msg.url })
        );
        sent++;
      } catch (e) {
        console.error(`Push failed user=${row.user_id}: ${e.statusCode} ${e.message}`);
        failed++;
        // Subscription expirée ou invalide → supprimer
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("user_id", row.user_id);
        }
      }
    }
  }

  console.log(`Notifications: sent=${sent} failed=${failed} skipped=${skipped} total=${subs?.length || 0}`);
  res.json({ sent, failed, skipped, total: subs?.length || 0 });
};
