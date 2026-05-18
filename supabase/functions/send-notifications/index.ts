import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:support@kojihsports.com", VAPID_PUBLIC, VAPID_PRIVATE);

// ── Messages par type ────────────────────────────────────────────────────────

const MOTIVATION_QUOTES = [
  "Nouvelle journée, nouvelle chance de devenir meilleur.",
  "Les champions s'entraînent même quand ils n'en ont pas envie.",
  "Chaque effort compte, même les petits.",
  "Tu es à un effort de te sentir fier de toi.",
  "La discipline bat la motivation chaque matin.",
  "Ton futur toi te remerciera d'avoir bougé aujourd'hui.",
  "Progresse, même lentement. L'arrêt est l'ennemi.",
];

const HYDRATION_MSGS = [
  "💧 Hydratation check ! T'as pensé à boire un verre ?",
  "💧 Un verre d'eau maintenant, ton corps te remerciera.",
  "💧 Reste hydraté ! Vise tes 2,5L aujourd'hui.",
  "💧 Petite pause hydratation, c'est important !",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Calcul heure actuelle en Europe/Paris ───────────────────────────────────

function nowInParis(): { hour: number; minute: number; dayOfWeek: number } {
  const now = new Date();
  const paris = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "numeric", minute: "numeric", weekday: "narrow",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(paris.find(p => p.type === "hour")!.value);
  const m = parseInt(paris.find(p => p.type === "minute")!.value);
  const dow = now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
  // 0=dim, 1=lun ... 6=sam
  const dowMap: Record<string, number> = { dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6 };
  return { hour: h, minute: m, dayOfWeek: dowMap[dow] ?? now.getDay() };
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ── Décide quelles notifs envoyer pour un user ───────────────────────────────

function getNotificationsToSend(
  prefs: Record<string, boolean>,
  wakeTime: string,
  sleepTime: string,
  { hour, minute, dayOfWeek }: { hour: number; minute: number; dayOfWeek: number }
): Array<{ title: string; body: string }> {
  const results: Array<{ title: string; body: string }> = [];
  const now = hour * 60 + minute;
  const wake = toMinutes(wakeTime);
  const sleep = toMinutes(sleepTime);

  const isSilent = prefs.silentMode && (now < wake || now > sleep - 60);
  if (isSilent) return [];

  const is = (targetH: number, targetM: number, toleranceMin = 14) => {
    const target = targetH * 60 + targetM;
    return Math.abs(now - target) <= toleranceMin;
  };

  // ⚡ Motivation — lever + 30min
  if (prefs.motivation && is(Math.floor((wake + 30) / 60), (wake + 30) % 60)) {
    results.push({
      title: "Mylide ⚡",
      body: pickRandom(MOTIVATION_QUOTES),
    });
  }

  // 💧 Hydratation — toutes les ~2h30 entre lever et coucher
  if (prefs.hydration) {
    const slots = [];
    for (let t = wake + 90; t < sleep - 60; t += 150) slots.push(t);
    if (slots.some(t => Math.abs(now - t) <= 14)) {
      results.push({ title: "Mylide 💧", body: pickRandom(HYDRATION_MSGS) });
    }
  }

  // 🏋️ Entraînement — 17h00
  if (prefs.training && is(17, 0)) {
    results.push({
      title: "Mylide 💪",
      body: "Ta séance t'attend. Lance-toi, dans 10 minutes tu seras content d'y être.",
    });
  }

  // 👟 Marche — 12h30
  if (prefs.walk && is(12, 30)) {
    results.push({
      title: "Mylide 👟",
      body: "10 000 pas ne se font pas tout seuls ! Profite de ta pause pour bouger.",
    });
  }

  // 📊 Résumé quotidien — coucher - 2h
  if (prefs.daily && is(Math.floor((sleep - 120) / 60), (sleep - 120) % 60)) {
    results.push({
      title: "Mylide 📊",
      body: "Bilan du jour ! Pense à sauvegarder ta journée avant de dormir.",
    });
  }

  // 📅 Résumé hebdo — dimanche, coucher - 3h
  if (prefs.weekly && dayOfWeek === 0 && is(Math.floor((sleep - 180) / 60), (sleep - 180) % 60)) {
    results.push({
      title: "Mylide 📅",
      body: "Semaine terminée ! Regarde tes stats et prépare la semaine prochaine.",
    });
  }

  // 🌙 Rappel coucher — coucher - 30min
  if (prefs.sleep && is(Math.floor((sleep - 30) / 60), (sleep - 30) % 60)) {
    results.push({
      title: "Mylide 🌙",
      body: "C'est l'heure. Coupe les écrans, ton record de demain se joue cette nuit.",
    });
  }

  return results;
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async () => {
  const timeInfo = nowInParis();

  // Récupère tous les abonnements
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  const subs = await res.json() as Array<{
    subscription: PushSubscription;
    wake_time: string;
    sleep_time: string;
    notif_prefs: Record<string, boolean>;
  }>;

  let sent = 0;
  for (const row of subs) {
    const msgs = getNotificationsToSend(
      row.notif_prefs ?? {},
      row.wake_time ?? "07:00",
      row.sleep_time ?? "23:00",
      timeInfo
    );
    for (const msg of msgs) {
      try {
        await webpush.sendNotification(row.subscription as any, JSON.stringify(msg));
        sent++;
      } catch (_) { /* subscription expirée, on ignore */ }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, time: timeInfo }), {
    headers: { "Content-Type": "application/json" },
  });
});
