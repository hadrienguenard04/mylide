import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const C = {
  bg: "#f2f2f2", surface: "#ffffff", surfaceAlt: "#ebebeb", border: "#e0e0e0",
  red: "#CC2936", redLight: "rgba(204,41,54,0.08)", redBorder: "rgba(204,41,54,0.2)",
  black: "#111111", text: "#1a1a1a", muted: "#888888", subtle: "#cccccc",
  green: "#16a34a", orange: "#ea580c", purple: "#7c3aed", blue: "#2563eb",
};

const NAV_ORDER = ["today", "track", "money", "goals", "stats", "profile"];
const TRACK_ORDER = ["sleep", "sport", "nutrition", "body", "work", "todo", "mind"];

// ── FOOD DATABASE ──────────────────────────────────────────────────────────
const FOODS = [
  { name: "Blanc de poulet", per100g: { protein: 31, calories: 165 }, unit: "g" },
  { name: "Riz cru", per100g: { protein: 7, calories: 350 }, cooked: 3.0, unit: "g" },
  { name: "Œufs entiers", perUnit: { protein: 6, calories: 70 }, unit: "pièce" },
  { name: "Fromage blanc 0%", per100g: { protein: 8, calories: 45 }, unit: "g" },
  { name: "Thon en boîte", per100g: { protein: 25, calories: 120 }, unit: "g" },
  { name: "Flocons d'avoine", per100g: { protein: 13, calories: 370 }, unit: "g" },
  { name: "Whey protéine", per100g: { protein: 80, calories: 400 }, unit: "g" },
  { name: "Steak haché 5%", per100g: { protein: 20, calories: 155 }, unit: "g" },
  { name: "Saumon", per100g: { protein: 20, calories: 200 }, unit: "g" },
  { name: "Lentilles cuites", per100g: { protein: 9, calories: 116 }, unit: "g" },
  { name: "Skyr", per100g: { protein: 11, calories: 65 }, unit: "g" },
  { name: "Amandes", per100g: { protein: 21, calories: 580 }, unit: "g" },
];

const getMealSuggestions = (proteinNeeded, hour) => {
  if (proteinNeeded <= 0) return [];
  const suggestions = [];
  if (proteinNeeded >= 30 && hour < 21) {
    const chickenAmount = Math.round(proteinNeeded * 0.6 / 0.31);
    const riceAmount = 80;
    suggestions.push({
      name: "Repas complet",
      items: [`${chickenAmount}g poulet (${Math.round(chickenAmount * 0.31)}g prot)`, `${riceAmount}g riz cru = ${Math.round(riceAmount * 3)}g cuit (${Math.round(riceAmount * 0.07)}g prot)`],
      totalProtein: Math.round(chickenAmount * 0.31 + riceAmount * 0.07),
      timing: "Idéal si dîner pas encore pris",
    });
  }
  if (proteinNeeded >= 15 && proteinNeeded < 40) {
    suggestions.push({
      name: "Collation protéinée",
      items: ["200g fromage blanc 0% (16g prot)", "2 œufs entiers (12g prot)"],
      totalProtein: 28,
      timing: hour >= 21 ? "⚠️ Léger  dernier repas avant 23h" : "Parfait pour combler",
    });
  }
  if (proteinNeeded >= 20) {
    const wheyAmount = 30;
    suggestions.push({
      name: "Shake whey",
      items: [`${wheyAmount}g whey (${Math.round(wheyAmount * 0.8)}g prot)`, "200ml lait ou eau"],
      totalProtein: Math.round(wheyAmount * 0.8),
      timing: hour >= 22 ? "🚫 Trop tard pour bien dormir" : "Rapide et efficace",
    });
  }
  return suggestions.slice(0, 2);
};

// ── INTELLIGENCE TEMPORELLE ────────────────────────────────────────────────
function getTemporalIntelligence(today, history, goals) {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeDecimal = hour + minute / 60;
  const insights = [];

  // Protéines
  const protGoal = goals.find(g => g.sourceId === "proteines");
  const protTarget = protGoal ? Number(protGoal.target) : 150;
  const protCurrent = today.nutrition.protein || 0;
  const protRemaining = protTarget - protCurrent;

  if (protCurrent > 0 || protTarget > 0) {
    const pct = Math.round((protCurrent / protTarget) * 100);
    if (pct >= 100) {
      insights.push({ type: "success", msg: `🏆 Objectif protéines atteint ! ${protCurrent}g  excellent travail !`, priority: 1 });
    } else if (pct >= 75) {
      insights.push({ type: "success", msg: `💪 ${pct}% de tes protéines ! Plus que ${protRemaining}g pour finir fort.`, priority: 2 });
    } else if (pct >= 50) {
      insights.push({ type: "advice", msg: `✅ À mi-chemin sur les protéines (${protCurrent}/${protTarget}g). Bon rythme !`, priority: 3 });
    } else if (protCurrent > 0) {
      if (timeDecimal >= 22) {
        insights.push({ type: "warning", msg: `⏰ 22h  il te reste ${protRemaining}g de protéines. Trop tard pour un gros repas (digestion + sommeil). Max une collation légère de 20-30g avant 23h.`, priority: 1, suggestions: getMealSuggestions(Math.min(protRemaining, 25), hour) });
      } else if (timeDecimal >= 20) {
        insights.push({ type: "advice", msg: `🍽️ ${protCurrent}g sur ${protTarget}g  il te reste ${protRemaining}g. Dernier repas maintenant pour finir avant 22h (3h avant le coucher).`, priority: 2, suggestions: getMealSuggestions(protRemaining, hour) });
      } else {
        insights.push({ type: "advice", msg: `🥗 ${protCurrent}g sur ${protTarget}g  ${protRemaining}g restants. Tu as le temps !`, priority: 4, suggestions: protRemaining > 40 ? getMealSuggestions(protRemaining, hour) : [] });
      }
    }
  }

  // Hydratation temporelle
  const waterTarget = 2.5;
  const waterCurrent = today.nutrition.water || 0;
  const waterRemaining = waterTarget - waterCurrent;
  if (waterCurrent > 0 && waterRemaining > 0) {
    if (timeDecimal >= 21) {
      insights.push({ type: "warning", msg: `💧 Il reste ${waterRemaining.toFixed(2)}L à boire. Après 21h, boire trop peut perturber ton sommeil (levers nocturnes). Hydrate-toi maintenant ou attends demain matin.`, priority: 2 });
    } else {
      const hoursLeft = 21 - timeDecimal;
      const rateNeeded = waterRemaining / hoursLeft;
      if (rateNeeded > 0.5) insights.push({ type: "advice", msg: `💧 Bois ~${(rateNeeded * 0.5).toFixed(2)}L toutes les 30min pour atteindre ${waterTarget}L avant 21h.`, priority: 5 });
    }
  }

  // Sommeil prédictif
  if (timeDecimal >= 21) {
    const targetSleep = 7.5;
    const hoursUntilIdealWakeup = 7; // 7h du matin
    const idealBedtime = 23;
    if (timeDecimal < idealBedtime) {
      const sleepIfNow = hoursUntilIdealWakeup + (idealBedtime - timeDecimal);
      insights.push({ type: "info", msg: `🌙 Si tu dors à ${idealBedtime}h → réveil 7h = ${targetSleep}h de sommeil. Idéal ! Commence ta routine soir maintenant.`, priority: 3 });
    }
  }

  // Fenêtre anabolique post-sport
  if (today.sport.duration >= 30 && !today.sport.isRest) {
    const sportTime = timeDecimal - (today.sport.duration / 60);
    const hoursSinceSport = timeDecimal - sportTime;
    if (hoursSinceSport < 2 && protCurrent < protTarget * 0.5) {
      insights.push({ type: "warning", msg: `⚡ Fenêtre anabolique ouverte ! Séance détectée. Prends tes protéines dans les 2h post-effort pour maximiser la synthèse musculaire.`, priority: 1, suggestions: getMealSuggestions(40, hour) });
    }
  }

  // Score prédictif fin de journée
  const currentScore = today.score;
  const potentialExtra = [];
  if (!today.nutrition.breakfast) potentialExtra.push(4);
  if (!today.nutrition.lunch) potentialExtra.push(4);
  if (!today.nutrition.dinner) potentialExtra.push(4);
  if (today.nutrition.water < 2.5 && timeDecimal < 21) potentialExtra.push(5);
  if (!today.mind.meditation && timeDecimal < 23) potentialExtra.push(5);
  if (!today.mind.reading && timeDecimal < 23) potentialExtra.push(5);
  const maxPossible = currentScore + potentialExtra.reduce((a, b) => a + b, 0);
  if (timeDecimal >= 18 && maxPossible > currentScore) {
    insights.push({ type: "info", msg: `🎯 Score actuel : ${currentScore}/100. En complétant tes habitudes restantes ce soir, tu peux atteindre ${Math.min(100, maxPossible)}/100 !`, priority: 4 });
  }

  // Prise de masse contextuelle
  const weightGoal = goals.find(g => g.sourceId === "poids" && !g.reverse);
  if (weightGoal && protRemaining > 0 && timeDecimal >= 19 && timeDecimal < 22) {
    insights.push({ type: "advice", msg: `💪 Objectif prise de masse actif. Assure-toi de faire ton dernier repas riche en glucides + protéines avant 22h pour optimiser la récupération nocturne.`, priority: 3, suggestions: getMealSuggestions(protRemaining, hour) });
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

const calcGoalProgress = (goal, history, patrimoineTotal) => {
  if (!goal.sourceId || goal.sourceId === "manual") return goal.manualProgress || 0;
  const src = DATA_SOURCES.find(s => s.id === goal.sourceId);
  if (!src) return goal.manualProgress || 0;
  const target = Number(goal.target) || 1;
  const start = goal.startDate ? new Date(goal.startDate) : new Date();
  const end = goal.endDate ? new Date(goal.endDate) : new Date();
  if (src.id === "patrimoine") return Math.min(100, Math.max(0, Math.round((patrimoineTotal / target) * 100)));
  const relevantDays = history.filter(d => { const dd = new Date(d.date); return dd >= start && dd <= end; });
  if (src.isDaily) {
    if (!relevantDays.length) return 0;
    let ok = 0;
    relevantDays.forEach(d => { const val = getNestedVal(d, src.path); if (goal.reverse) { if (val > 0 && val <= target) ok++; } else { if (val >= target) ok++; } });
    return Math.min(100, Math.round((ok / relevantDays.length) * 100));
  } else {
    const lastEntry = [...history].reverse().find(d => getNestedVal(d, src.path) > 0);
    const val = lastEntry ? getNestedVal(lastEntry, src.path) : 0;
    if (goal.reverse) { const sv = goal.startValue || val; return Math.min(100, Math.max(0, Math.round(((sv - val) / (sv - target)) * 100))); }
    return Math.min(100, Math.max(0, Math.round((val / target) * 100)));
  }
};

const getEncouragingMessage = (current, target, sourceId, hour) => {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  if (pct >= 100) return { type: "success", msg: `🏆 Objectif atteint ! ${current}/${target}  incroyable !` };
  if (pct >= 75) return { type: "success", msg: `🔥 ${pct}%  tu y es presque ! Plus que ${Math.round(target - current)} restants.` };
  if (pct >= 50) return { type: "advice", msg: `💪 Mi-chemin atteint ! ${current}/${target}  continue comme ça !` };
  if (pct >= 25) return { type: "warning", msg: `📈 ${pct}% du chemin  chaque effort compte. Lance-toi !` };
  if (current > 0) return { type: "warning", msg: `⚡ Démarrage en cours (${pct}%)  tu peux faire encore mieux !` };
  return { type: "info", msg: `🎯 Objectif aujourd'hui : ${target}. C'est l'heure de commencer !` };
};

const DATA_SOURCES = [
  { id: "manual", label: "Manuel", unit: "", path: null },
  { id: "patrimoine", label: "Patrimoine total", unit: "€", path: "patrimoine_total" },
  { id: "poids", label: "Poids", unit: "kg", path: "body.weight" },
  { id: "proteines", label: "Protéines/jour", unit: "g", path: "nutrition.protein", isDaily: true },
  { id: "eau", label: "Eau/jour", unit: "L", path: "nutrition.water", isDaily: true },
  { id: "sport_duree", label: "Durée sport/séance", unit: "min", path: "sport.duration", isDaily: true },
  { id: "running_dist", label: "Distance running", unit: "km", path: "sport.running.distance", isDaily: true },
  { id: "masse_musculaire", label: "Masse musculaire", unit: "kg", path: "sport.muscleMass" },
  { id: "masse_graisseuse", label: "Masse graisseuse", unit: "%", path: "sport.bodyFat" },
  { id: "score", label: "Score global/jour", unit: "", path: "score", isDaily: true },
  { id: "humeur", label: "Humeur/jour", unit: "/5", path: "mind.mood", isDaily: true },
  { id: "lecture", label: "Lecture/jour", unit: "p", path: "mind.reading", isDaily: true },
  { id: "screen", label: "Temps d'écran/jour", unit: "h", path: "work.screenTime", isDaily: true, reverse: true },
  { id: "revenus", label: "Revenus/jour", unit: "€", path: "money.income", isDaily: true },
  { id: "focus", label: "Focus/jour", unit: "/5", path: "work.focus", isDaily: true },
];

const getNestedVal = (obj, path) => path?.split(".").reduce((o, k) => o?.[k] ?? 0, obj) ?? 0;

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
};

function calcDuration(bed, wake) {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number);
  let diff = (wh * 60 + wm) - (bh * 60 + bm);
  if (diff < 0) diff += 24 * 60;
  return Math.round(diff / 6) / 10;
}

function calcScore(day) {
  let s = 0;
  const sl = day.sleep;
  if (sl.duration >= 7.5) s += 25; else if (sl.duration >= 7) s += 18; else if (sl.duration >= 6) s += 10;
  if (sl.quality >= 4) s += 5; if (sl.noScreen) s += 3;
  const sp = day.sport;
  if (sp.isRest) { s += 10; if (sp.stretching) s += 5; }
  else { if (sp.duration >= 45) s += 15; else if (sp.duration >= 30) s += 10; if (sp.intensity >= 3) s += 5; if (sp.running?.did) s += 5; }
  const n = day.nutrition;
  if (n.breakfast) s += 4; if (n.lunch) s += 4; if (n.dinner) s += 4;
  if (n.water >= 2.5) s += 5; else if (n.water >= 2) s += 3;
  if (n.protein >= 150) s += 5; else if (n.protein >= 120) s += 3;
  if (!n.junk) s += 3;
  if (day.work.focus >= 4) s += 10; else if (day.work.focus >= 3) s += 6;
  if (day.work.tasks > 0 && day.work.tasksCompleted >= day.work.tasks) s += 5;
  if (day.work.screenTime > 0 && day.work.screenTime <= 3) s += 3; else if (day.work.screenTime > 5) s -= 5;
  const m = day.mind;
  if (m.mood >= 4) s += 5; if (m.reading >= 20) s += 5; if (m.meditation) s += 5;
  return Math.max(0, Math.min(100, s));
}

function getIntelligence(history, totalPatrimoine, goals) {
  const last7 = history.slice(-7); const last14 = history.slice(-14); const last3 = history.slice(-3);
  const prev7 = history.slice(-14, -7);
  const avgScore7 = last7.filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0);
  const avgScorePrev = prev7.filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0);
  const scoreDelta = avgScorePrev > 0 ? Math.round(avgScore7 - avgScorePrev) : null;
  const avgRecovery = last3.length ? last3.reduce((a, b) => a + (b.sport?.recovery || 3), 0) / last3.length : 3;
  const avgSleep = last7.filter(d => d.sleep?.duration > 0).reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0);
  const avgScreen = last7.filter(d => d.work?.screenTime > 0).reduce((a, b, _, arr) => a + b.work.screenTime / arr.length, 0);
  const avgMood = last7.filter(d => d.mind?.mood > 0).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
  const consecutiveSport = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].sport?.duration > 0 && !history[i].sport?.isRest) c++; else break; } return c; })();
  const lastSportType = last7.filter(d => d.sport?.type).slice(-1)[0]?.sport?.type || "";
  const bedtimes = last7.filter(d => d.sleep?.bedtime).map(d => { const [h, m] = d.sleep.bedtime.split(":").map(Number); return h * 60 + m; });
  const bedVariance = bedtimes.length > 2 ? Math.max(...bedtimes) - Math.min(...bedtimes) : 0;
  const alerts = []; const advice = []; let todayRec = "";
  if (consecutiveSport >= 3) { alerts.push({ type: "warning", msg: `💤 ${consecutiveSport} jours consécutifs  repos actif recommandé.` }); todayRec = "rest"; }
  else if (avgRecovery < 2.5) alerts.push({ type: "warning", msg: "⚠️ Récupération faible ces derniers jours." });
  if (avgSleep < 6.5) alerts.push({ type: "danger", msg: "🚨 Moins de 6h30 en moyenne. Performances -20%." });
  else if (avgSleep < 7) alerts.push({ type: "warning", msg: "🌙 Sommeil insuffisant. Couche-toi 30min plus tôt." });
  if (bedVariance > 90) alerts.push({ type: "warning", msg: `⏰ Heure de coucher irrégulière (±${Math.round(bedVariance / 60)}h). Régulation circadienne perturbée.` });
  if (avgScreen > 5) alerts.push({ type: "warning", msg: `📱 ${Math.round(avgScreen)}h d'écran/jour  sommeil dégradé.` });
  if (!todayRec && lastSportType) {
    const ppl = ["Push", "Pull", "Legs"]; const lastIdx = ppl.findIndex(x => lastSportType.includes(x));
    if (lastIdx >= 0) { todayRec = `PPL ${ppl[(lastIdx + 1) % 3]}`; advice.push(`💪 Recommandation : ${todayRec}`); }
  }
  const patterns = [];
  const sportDays = last14.filter(d => d.sport?.duration >= 30);
  const noSportDays = last14.filter(d => !d.sport?.duration || d.sport.duration < 30);
  const sportSleepAvg = sportDays.length > 2 ? sportDays.reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0) : 0;
  const noSportSleepAvg = noSportDays.length > 2 ? noSportDays.reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0) : 0;
  if (sportSleepAvg > 0 && noSportSleepAvg > 0 && sportSleepAvg - noSportSleepAvg > 0.4) patterns.push(`🔍 Tu dors ${(sportSleepAvg - noSportSleepAvg).toFixed(1)}h de plus les jours de sport.`);
  const highScreenDays = last14.filter(d => d.work?.screenTime > 4);
  const lowScreenDays = last14.filter(d => d.work?.screenTime > 0 && d.work.screenTime <= 3);
  const highScreenFocus = highScreenDays.length > 1 ? highScreenDays.reduce((a, b, _, arr) => a + b.work.focus / arr.length, 0) : 0;
  const lowScreenFocus = lowScreenDays.length > 1 ? lowScreenDays.reduce((a, b, _, arr) => a + b.work.focus / arr.length, 0) : 0;
  if (highScreenFocus > 0 && lowScreenFocus > 0 && lowScreenFocus - highScreenFocus > 0.5) patterns.push(`🔍 Focus +${(lowScreenFocus - highScreenFocus).toFixed(1)}/5 quand écran < 3h/j.`);
  const sleepMoodDays = last14.filter(d => d.sleep?.duration > 0 && d.mind?.mood > 0);
  const goodSleepMood = sleepMoodDays.filter(d => d.sleep.duration >= 7.5).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
  const badSleepMood = sleepMoodDays.filter(d => d.sleep.duration < 7).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
  if (goodSleepMood > 0 && badSleepMood > 0 && goodSleepMood - badSleepMood > 0.8) patterns.push(`🔍 Ton humeur est ${(goodSleepMood - badSleepMood).toFixed(1)}/5 meilleure après 7h30+ de sommeil.`);
  const avgWater = last3.filter(d => d.nutrition?.water > 0).reduce((a, b, _, arr) => a + b.nutrition.water / arr.length, 0);
  if (avgWater < 2 && avgWater > 0) advice.push("💧 Hydratation insuffisante ces 3 jours.");
  if (avgMood < 3 && avgMood > 0) advice.push("😔 Moral en baisse. 5min cohérence cardiaque.");
  let patrimoinePrediction = null;
  const patrimoineGoal = goals?.find(g => g.sourceId === "patrimoine");
  if (patrimoineGoal && totalPatrimoine > 0) {
    const ph = history.filter(d => d.money?.invested > 0);
    const avgMonthly = ph.length > 0 ? ph.reduce((a, b, _, arr) => a + b.money.invested / arr.length, 0) * 30 : 0;
    if (avgMonthly > 0) {
      const target = Number(patrimoineGoal.target) || 100000;
      const remaining = target - totalPatrimoine;
      const months = Math.ceil(remaining / (avgMonthly * 1.08 / 12));
      patrimoinePrediction = `📈 À ce rythme (+${Math.round(avgMonthly)}€/mois), objectif ${target.toLocaleString("fr-FR")}€ dans ~${(months / 12).toFixed(1)} ans.`;
    }
  }
  let todayPrediction = null;
  if (last7.length >= 3) {
    const recentAvg = last7.slice(-3).filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0);
    if (recentAvg > 0) todayPrediction = `🎯 Score fin de semaine estimé : ~${Math.round(recentAvg)}/100`;
  }
  const scoreAvg = Math.round(avgScore7);
  return { alerts, advice, todayRec, consecutiveSport, avgSleep, avgScreen, scoreAvg, scoreDelta, patterns, patrimoinePrediction, todayPrediction };
}

const defaultDay = () => ({
  date: new Date().toISOString().split("T")[0],
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0, noScreen: false },
  sport: { type: "", duration: 0, intensity: 0, notes: "", isRest: false, stretching: false, running: { did: false, distance: 0, time: 0 }, recovery: 0, bodyFat: 0, muscleMass: 0, photoUrl: "" },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, junk: false },
  body: { weight: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "", screenTime: 0 },
  money: { income: 0, expense: 0, invested: 0, note: "" },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

const defaultPatrimoine = () => ([
  { id: 1, name: "PEA Fortuneo", amount: 0, color: "#2563eb" },
  { id: 2, name: "AV Linxea", amount: 0, color: "#7c3aed" },
  { id: 3, name: "Trade Republic", amount: 0, color: "#16a34a" },
  { id: 4, name: "Livret A", amount: 0, color: "#ea580c" },
  { id: 5, name: "Corum", amount: 0, color: "#0891b2" },
]);

const PRIORITIES = [
  { id: "sport", label: "Sport & Récup", icon: "💪", color: C.red },
  { id: "finance", label: "Finance & Patrimoine", icon: "💰", color: C.green },
  { id: "mental", label: "Mental & Lecture", icon: "🧠", color: C.purple },
  { id: "nutrition", label: "Nutrition", icon: "🥗", color: C.orange },
  { id: "business", label: "Business & Travail", icon: "🎯", color: C.blue },
  { id: "running", label: "Running", icon: "🏃", color: "#0891b2" },
  { id: "body", label: "Composition corporelle", icon: "⚖️", color: C.orange },
  { id: "sleep", label: "Sommeil", icon: "🌙", color: C.purple },
];

// ── ICONS ──────────────────────────────────────────────────────────────────
const Ico = {
  home: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  track: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  money: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  goals: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  stats: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  profile: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  sleep: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  sport: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M6.5 17.5l11-11M4 12a8 8 0 1016 0A8 8 0 004 12z"/></svg>,
  nutrition: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  body: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  work: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  todo: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  mind: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>,
  water: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  scale: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,
  focus: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  mood: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  up: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  edit: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
};

const NAV = [
  { id: "today", label: "Accueil", icon: "home" },
  { id: "track", label: "Tracker", icon: "track" },
  { id: "money", label: "Argent", icon: "money" },
  { id: "goals", label: "Objectifs", icon: "goals" },
  { id: "stats", label: "Stats", icon: "stats" },
  { id: "profile", label: "Profil", icon: "profile" },
];

const TRACK_TABS = [
  { id: "sleep", label: "Sommeil", icon: "sleep" },
  { id: "sport", label: "Sport", icon: "sport" },
  { id: "nutrition", label: "Nutrition", icon: "nutrition" },
  { id: "body", label: "Corps", icon: "body" },
  { id: "work", label: "Travail", icon: "work" },
  { id: "todo", label: "To-Do", icon: "todo" },
  { id: "mind", label: "Mental", icon: "mind" },
];

// ── SCORE RING ─────────────────────────────────────────────────────────────
const ScoreRing = ({ score, delta, streak }) => {
  const r = 38; const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const col = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke={C.surfaceAlt} strokeWidth="7"/>
        <circle cx="45" cy="45" r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} style={{ transition: "stroke-dasharray 0.8s ease" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</span>
        {delta !== null && <span style={{ fontSize: 8, color: delta >= 0 ? C.green : C.red, fontWeight: 700 }}>{delta >= 0 ? `+${delta}` : delta}</span>}
        {streak > 0 && <span style={{ fontSize: 8, color: C.orange }}>🔥{streak}j</span>}
      </div>
    </div>
  );
};

// ── CALENDAR HEATMAP ───────────────────────────────────────────────────────
const CalendarHeatmap = ({ history }) => {
  const today = new Date();
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = history.find(h => h.date === dateStr);
    days.push({ date: dateStr, score: entry?.score || 0 });
  }
  const sc = (s) => { if (s === 0) return C.surfaceAlt; if (s >= 80) return C.green; if (s >= 60) return C.orange; if (s >= 40) return "#f59e0b"; return C.red; };
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }}>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {w.map((d, di) => <div key={di} title={`${d.date}: ${d.score}/100`} style={{ width: 12, height: 12, borderRadius: 3, background: sc(d.score) }} />)}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 9, color: C.muted, alignItems: "center" }}>
        <span>Faible</span>
        {[0, 40, 60, 80].map(s => <div key={s} style={{ width: 10, height: 10, borderRadius: 2, background: sc(s === 0 ? 0 : s + 10) }} />)}
        <span>Excellent</span>
      </div>
    </div>
  );
};

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
const inp = { background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" };

const EvoChart = ({ data, dataKey, color, label, unit, height = 150 }) => {
  if (data.length < 2) return <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, textAlign: "center", marginBottom: 14 }}><p style={{ fontSize: 11, color: C.muted, margin: 0 }}>📈 Graphique disponible après 2+ jours</p></div>;
  const getVal = d => dataKey.split(".").reduce((o, k) => o?.[k], d) ?? 0;
  const last = getVal(data[data.length - 1]); const first = getVal(data[0]); const trend = last - first;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>{label}</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? "rgba(22,163,74,0.1)" : "rgba(204,41,54,0.1)", borderRadius: 6, padding: "2px 6px" }}>{trend >= 0 ? "↑" : "↓"} {Math.abs(Math.round(trend * 10) / 10)}{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs><linearGradient id={`g${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={C.border} vertical={false}/>
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 8 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={30} domain={["auto","auto"]} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${color}`, borderRadius: 10, fontSize: 11 }} formatter={v => [`${v}${unit}`, label]}/>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g${label.replace(/\s/g,"")})`} dot={false} activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Rating = ({ value, max = 5, onChange, color = C.red }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} onClick={() => onChange(i + 1)} style={{ fontSize: 26, cursor: "pointer", color: i < value ? color : C.subtle, transition: "color 0.15s" }}>★</span>
    ))}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: value ? C.redLight : C.surfaceAlt, border: `1px solid ${value ? C.red : C.border}`, borderRadius: 12, padding: "10px 14px", transition: "all 0.2s", userSelect: "none" }}>
    <div style={{ width: 38, height: 22, borderRadius: 11, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </div>
    <span style={{ fontSize: 13, color: value ? C.red : C.muted, fontWeight: value ? 600 : 400 }}>{label}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
    {children}
  </div>
);

const Card = ({ children, style = {}, accent }) => (
  <div style={{ background: accent ? `linear-gradient(135deg, ${C.red}, #a01e28)` : C.surface, border: accent ? "none" : `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 14, boxShadow: accent ? "0 8px 24px rgba(204,41,54,0.25)" : "0 2px 12px rgba(0,0,0,0.05)", ...style }}>{children}</div>
);

const ST = ({ children, light }) => (
  <p style={{ fontSize: 10, color: light ? "rgba(255,255,255,0.7)" : C.red, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, marginTop: 0, fontWeight: 700 }}>{children}</p>
);

const MsgBox = ({ type, msg, suggestions }) => {
  const colors = { danger: C.red, warning: C.orange, advice: C.green, success: C.green, info: C.blue };
  const bgs = { danger: "rgba(204,41,54,0.06)", warning: "rgba(234,88,12,0.06)", advice: "rgba(22,163,74,0.06)", success: "rgba(22,163,74,0.06)", info: "rgba(37,99,235,0.06)" };
  const col = colors[type] || C.muted; const bg = bgs[type] || C.surfaceAlt;
  return (
    <div style={{ background: bg, border: `1px solid ${col}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: col, lineHeight: 1.6 }}>{msg}</p>
      {suggestions?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Suggestions repas :</p>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", marginBottom: 6, border: `1px solid ${C.border}` }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: C.text }}>{s.name} · <span style={{ color: col }}>{s.totalProtein}g prot</span></p>
              {s.items.map((item, j) => <p key={j} style={{ margin: "0 0 2px", fontSize: 11, color: C.muted }}>• {item}</p>)}
              <p style={{ margin: "4px 0 0", fontSize: 10, color: col, fontStyle: "italic" }}>{s.timing}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── EDIT GOAL MODAL ────────────────────────────────────────────────────────
const EditGoalModal = ({ goal, onSave, onClose }) => {
  const [edited, setEdited] = useState({ ...goal });
  const src = DATA_SOURCES.find(s => s.id === edited.sourceId);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, background: C.surface, borderRadius: "20px 20px 0 0", padding: 24, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Modifier l'objectif</h3>
          <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: C.muted }}>✕ Fermer</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nom de l'objectif">
            <input value={edited.label} onChange={e => setEdited(p => ({ ...p, label: e.target.value }))} style={inp} />
          </Field>
          <Field label="Catégorie">
            <input value={edited.category} onChange={e => setEdited(p => ({ ...p, category: e.target.value }))} style={inp} />
          </Field>
          <Field label="Source de données">
            <select value={edited.sourceId} onChange={e => setEdited(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text }}>
              {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          {edited.sourceId !== "manual" && (
            <>
              <Field label={`Valeur cible (${DATA_SOURCES.find(s => s.id === edited.sourceId)?.unit || ""})`}>
                <input type="number" value={edited.target} onChange={e => setEdited(p => ({ ...p, target: e.target.value }))} style={inp} />
              </Field>
              <Toggle value={edited.reverse || false} onChange={v => setEdited(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
            </>
          )}
          {edited.sourceId === "manual" && (
            <Field label="Progression manuelle (%)">
              <input type="number" min={0} max={100} value={edited.manualProgress || 0} onChange={e => setEdited(p => ({ ...p, manualProgress: +e.target.value }))} style={inp} />
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Date de début"><input type="date" value={edited.startDate || ""} onChange={e => setEdited(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
            <Field label="Date de fin"><input type="date" value={edited.endDate || ""} onChange={e => setEdited(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, flexShrink: 0 }}>Couleur</label>
            <input type="color" value={edited.color} onChange={e => setEdited(p => ({ ...p, color: e.target.value }))} style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, cursor: "pointer", padding: 2 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["#CC2936","#16a34a","#2563eb","#7c3aed","#ea580c","#0891b2","#be185d","#111111"].map(col => (
                <div key={col} onClick={() => setEdited(p => ({ ...p, color: col }))} style={{ width: 26, height: 26, borderRadius: "50%", background: col, cursor: "pointer", border: edited.color === col ? `3px solid ${C.text}` : "2px solid transparent" }} />
              ))}
            </div>
          </div>
          <button onClick={() => { onSave(edited); onClose(); }} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${edited.color}, ${edited.color}bb)`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer", fontSize: 15, marginTop: 8, boxShadow: `0 6px 20px ${edited.color}44` }}>
            ✓ Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SWIPE ──────────────────────────────────────────────────────────────────
const useSwipe = (onLeft, onRight) => {
  const sx = useRef(null); const sy = useRef(null);
  return {
    onTouchStart: e => { sx.current = e.touches[0].clientX; sy.current = e.touches[0].clientY; },
    onTouchEnd: e => {
      if (sx.current === null) return;
      const dx = e.changedTouches[0].clientX - sx.current;
      const dy = Math.abs(e.changedTouches[0].clientY - sy.current);
      if (Math.abs(dx) > 150 && dy < 80) { if (dx < 0) onLeft(); else onRight(); }
      sx.current = null;
    },
  };
};

// ── PAGE TRANSITION ────────────────────────────────────────────────────────
const PageTransition = ({ children, pageKey }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { setVis(false); const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, [pageKey]);
  return <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.2s ease, transform 0.2s ease" }}>{children}</div>;
};

// ── BG DECORATION ─────────────────────────────────────────────────────────
const BgDecor = () => (
  <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: "100%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    <svg width="100%" height="100%" viewBox="0 0 480 900" fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CC2936" strokeWidth="0.3" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width="480" height="900" fill="url(#grid)"/>
      <circle cx="420" cy="80" r="100" stroke="#CC2936" strokeWidth="1" fill="none" opacity="0.15"/>
      <circle cx="420" cy="80" r="60" stroke="#CC2936" strokeWidth="0.5" fill="none" opacity="0.2"/>
      <circle cx="60" cy="820" r="120" stroke="#CC2936" strokeWidth="1" fill="none" opacity="0.12"/>
      <line x1="0" y1="200" x2="480" y2="160" stroke="#CC2936" strokeWidth="0.8" opacity="0.2"/>
      <line x1="0" y1="500" x2="480" y2="540" stroke="#CC2936" strokeWidth="0.6" opacity="0.15"/>
      <path d="M 380 0 L 480 100 L 480 0 Z" fill="#CC2936" opacity="0.04"/>
    </svg>
  </div>
);

// ── ONBOARDING ─────────────────────────────────────────────────────────────
const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState("");
  const [priorities, setPriorities] = useState([]);
  const [goalTarget, setGoalTarget] = useState("");
  const [goalEnd, setGoalEnd] = useState("");
  const photoRef = useRef();
  const handlePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f); };
  const togglePriority = id => setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const handleComplete = () => {
    const today = new Date().toISOString().split("T")[0];
    const templates = {
      sport: { label: "Séances sport (45min+)", sourceId: "sport_duree", target: 45, category: "Sport", color: C.red },
      finance: { label: "Objectif patrimoine", sourceId: "patrimoine", target: Number(goalTarget) || 50000, category: "Finance", color: C.green },
      mental: { label: "Lecture quotidienne (20p)", sourceId: "lecture", target: 20, category: "Mental", color: C.purple },
      nutrition: { label: "Protéines quotidiennes", sourceId: "proteines", target: 150, category: "Nutrition", color: C.orange },
      business: { label: "Focus quotidien (4/5)", sourceId: "focus", target: 4, category: "Travail", color: C.blue },
      running: { label: "Distance running (5km)", sourceId: "running_dist", target: 5, category: "Running", color: "#0891b2" },
      body: { label: "Objectif poids", sourceId: "poids", target: Number(goalTarget) || 75, category: "Corps", color: C.orange },
      sleep: { label: "Sommeil optimal (score 70)", sourceId: "score", target: 70, category: "Sommeil", color: C.purple },
    };
    const createdGoals = priorities.map((pid, i) => ({
      ...(templates[pid] || { label: pid, sourceId: "manual", target: 100, category: pid, color: C.red }),
      id: Date.now() + i,
      startDate: today,
      endDate: goalEnd || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      reverse: false, manualProgress: 0,
      target: i === 0 && goalTarget ? Number(goalTarget) : (templates[pid]?.target || 100),
    }));
    onComplete({ name, dob, photo }, createdGoals);
  };

  const btnStyle = (active) => ({ width: "100%", padding: "15px", background: active ? `linear-gradient(135deg, ${C.red}, #a01e28)` : C.subtle, color: "#fff", border: "none", borderRadius: 13, fontSize: 15, fontWeight: 800, cursor: active ? "pointer" : "default", boxShadow: active ? "0 8px 24px rgba(204,41,54,0.3)" : "none" });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
      <BgDecor />
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 80, height: 80, background: `linear-gradient(135deg, ${C.red}, #a01e28)`, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 12px 32px rgba(204,41,54,0.35)", fontSize: 36 }}>🎯</div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: C.black, margin: "0 0 12px", lineHeight: 1.2 }}>Bienvenue sur<br /><span style={{ color: C.red }}>Kojihsports</span></h1>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: "0 0 40px" }}>Ton tracker de vie intelligent. En 2 minutes, configuré pour toi.</p>
            <button onClick={() => setStep(1)} style={btnStyle(true)}>C'est parti →</button>
          </div>
        )}
        {step === 1 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= 1 ? C.red : C.surfaceAlt }} />)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Qui es-tu ?</h2>
            <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handlePhoto} />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", position: "relative" }}>
                {photo ? <img src={photo} alt="" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.red}` }} />
                  : <div style={{ width: 90, height: 90, borderRadius: "50%", background: C.surfaceAlt, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📷</div>}
                <div style={{ position: "absolute", bottom: 2, right: 2, background: C.red, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>+</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <Field label="Prénom"><input value={name} onChange={e => setName(e.target.value)} placeholder="Hadrien" style={inp} /></Field>
              <Field label="Date de naissance"><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} /></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: "14px", background: C.surfaceAlt, border: "none", borderRadius: 12, fontWeight: 600, cursor: "pointer", color: C.muted }}>← Retour</button>
              <button onClick={() => name.trim() && setStep(2)} style={{ ...btnStyle(!!name.trim()), flex: 2 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= 2 ? C.red : C.surfaceAlt }} />)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Tes priorités</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>Coche tout ce que tu veux améliorer  pas de limite !</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {PRIORITIES.map(p => {
                const selected = priorities.includes(p.id);
                return (
                  <div key={p.id} onClick={() => togglePriority(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: `2px solid ${selected ? p.color : C.border}`, background: selected ? `${p.color}12` : C.surface, cursor: "pointer", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 22 }}>{p.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selected ? p.color : C.text, flex: 1 }}>{p.label}</span>
                    {selected && <div style={{ width: 22, height: 22, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>✓</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", background: C.surfaceAlt, border: "none", borderRadius: 12, fontWeight: 600, cursor: "pointer", color: C.muted }}>← Retour</button>
              <button onClick={() => priorities.length > 0 && setStep(3)} style={{ ...btnStyle(priorities.length > 0), flex: 2 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: C.red }} />)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Objectif principal</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>{priorities.length} objectif{priorities.length > 1 ? "s" : ""} créés auto. Configure le principal :</p>
            <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{PRIORITIES.find(p => p.id === priorities[0])?.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{PRIORITIES.find(p => p.id === priorities[0])?.label}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <Field label="Valeur cible (laisser vide = valeur par défaut)">
                <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Ex: 100000 pour patrimoine..." style={inp} />
              </Field>
              <Field label="Date limite"><input type="date" value={goalEnd} onChange={e => setGoalEnd(e.target.value)} style={inp} /></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "14px", background: C.surfaceAlt, border: "none", borderRadius: 12, fontWeight: 600, cursor: "pointer", color: C.muted }}>← Retour</button>
              <button onClick={handleComplete} style={{ ...btnStyle(true), flex: 2 }}>🚀 Lancer l'app !</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [onboarded, setOnboarded] = useState(null);
  const [nav, setNav] = useState("today");
  const [trackTab, setTrackTab] = useState("sleep");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [goals, setGoals] = useState([]);
  const [editingGoal, setEditingGoal] = useState(null);
  const [patrimoine, setPatrimoine] = useState(defaultPatrimoine());
  const [newPoche, setNewPoche] = useState({ name: "", amount: 0, color: C.blue });
  const [statRange, setStatRange] = useState("30");
  const [profile, setProfile] = useState({ name: "", dob: "", photo: "" });
  const [sim, setSim] = useState({ amount: 10000, monthly: 200, rate: 10, years: 10 });
  const [newGoal, setNewGoal] = useState({ label: "", category: "", color: C.red, sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  const [renamingPoche, setRenamingPoche] = useState(null);
  const photoRef = useRef(); const sportPhotoRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOnboarded(false); return; }

      // Charger profil
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) { setProfile({ name: profile.name || "", dob: profile.dob || "", photo: profile.photo || "" }); setOnboarded(true); }
      else { setOnboarded(false); return; }

      // Charger historique
      const { data: logs } = await supabase.from("daily_logs").select("*").eq("user_id", user.id).order("date");
      if (logs) {
        const history = logs.map(l => ({ ...l.data, date: l.date, score: l.score }));
        setHistory(history);
        const todayEntry = history.find(d => d.date === new Date().toISOString().split("T")[0]);
        if (todayEntry) setToday(todayEntry);
      }

      // Charger objectifs
      const { data: goalsData } = await supabase.from("goals").select("*").eq("user_id", user.id);
      if (goalsData?.length) setGoals(goalsData.map(g => g.data));

      // Charger patrimoine
      const { data: patrimoineData } = await supabase.from("patrimoine").select("*").eq("user_id", user.id).single();
      if (patrimoineData) setPatrimoine(patrimoineData.data);

      // Charger todos
      const { data: todosData } = await supabase.from("todos").select("*").eq("user_id", user.id);
      if (todosData?.length) setTodos(todosData.map(t => t.data));
    };
    loadData();
  }, []);

  const saveAll = useCallback(async (h, t, g, p, pr) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sauvegarder profil
    await supabase.from("profiles").upsert({ id: user.id, name: pr.name, dob: pr.dob, photo: pr.photo });

    // Sauvegarder historique du jour
    const today = new Date().toISOString().split("T")[0];
    const todayData = h.find(d => d.date === today);
    if (todayData) {
      await supabase.from("daily_logs").upsert({ user_id: user.id, date: today, data: todayData, score: todayData.score || 0 });
    }

    // Sauvegarder objectifs
    await supabase.from("goals").delete().eq("user_id", user.id);
    if (g.length) await supabase.from("goals").insert(g.map(goal => ({ user_id: user.id, data: goal })));

    // Sauvegarder patrimoine
    await supabase.from("patrimoine").upsert({ user_id: user.id, data: p });

    // Sauvegarder todos
    await supabase.from("todos").delete().eq("user_id", user.id);
    if (t.length) await supabase.from("todos").insert(t.map(todo => ({ user_id: user.id, data: todo })));
  }, []);

  const handleOnboardingComplete = async (profileData, createdGoals) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, name: profileData.name, dob: profileData.dob, photo: profileData.photo });
    setProfile(profileData); setGoals(createdGoals); setOnboarded(true);
    saveAll([], [], createdGoals, defaultPatrimoine(), profileData);
  };

  const update = (section, field, val) => {
    setToday(prev => {
      const updated = { ...prev, [section]: { ...prev[section], [field]: val } };
      if (section === "sleep") updated.sleep.duration = calcDuration(updated.sleep.bedtime, updated.sleep.wakeup);
      updated.score = calcScore(updated);
      return updated;
    });
    setSaved(false);
  };

  const updateNested = (section, sub, field, val) => {
    setToday(prev => {
      const updated = { ...prev, [section]: { ...prev[section], [sub]: { ...prev[section][sub], [field]: val } } };
      updated.score = calcScore(updated);
      return updated;
    });
    setSaved(false);
  };

  const saveDay = () => {
    const updated = { ...today, score: calcScore(today) };
    const newHistory = [...history.filter(d => d.date !== today.date), updated].sort((a, b) => a.date.localeCompare(b.date));
    setHistory(newHistory); saveAll(newHistory, todos, goals, patrimoine, profile);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addTodo = () => { if (!newTodo.trim()) return; const t = [...todos, { id: Date.now(), text: newTodo, done: false, date: new Date().toISOString().split("T")[0] }]; setTodos(t); saveAll(history, t, goals, patrimoine, profile); setNewTodo(""); };
  const toggleTodo = id => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const deleteTodo = id => { const t = todos.filter(t => t.id !== id); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };

  const totalPatrimoine = patrimoine.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  const updateGoalField = (id, f, v) => { const g = goals.map(g => g.id === id ? { ...g, [f]: v } : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const saveEditedGoal = (edited) => { const g = goals.map(g => g.id === edited.id ? edited : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const addGoal = () => {
    if (!newGoal.label.trim()) return;
    const g = [...goals, { ...newGoal, id: Date.now(), manualProgress: 0 }];
    setGoals(g); saveAll(history, todos, g, patrimoine, profile);
    setNewGoal({ label: "", category: "", color: C.red, sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  };
  const deleteGoal = id => { const g = goals.filter(g => g.id !== id); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const moveGoal = (idx, dir) => {
    const g = [...goals];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= g.length) return;
    [g[idx], g[newIdx]] = [g[newIdx], g[idx]];
    setGoals(g); saveAll(history, todos, g, patrimoine, profile);
  };

  const updatePoche = (id, f, v) => { const p = patrimoine.map(p => p.id === id ? { ...p, [f]: v } : p); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const addPoche = () => { if (!newPoche.name.trim()) return; const p = [...patrimoine, { ...newPoche, id: Date.now(), amount: Number(newPoche.amount) }]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); setNewPoche({ name: "", amount: 0, color: C.blue }); };
  const deletePoche = id => { const p = patrimoine.filter(p => p.id !== id); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const movePoche = (idx, dir) => { const p = [...patrimoine]; const ni = idx + dir; if (ni < 0 || ni >= p.length) return; [p[idx], p[ni]] = [p[ni], p[idx]]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); };

  const updateProfile = (f, v) => { const pr = { ...profile, [f]: v }; setProfile(pr); saveAll(history, todos, goals, patrimoine, pr); };
  const handleProfilePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(f); };
  const handleSportPhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => update("sport", "photoUrl", ev.target.result); r.readAsDataURL(f); };

  const intel = getIntelligence(history, totalPatrimoine, goals);
  const temporalInsights = getTemporalIntelligence(today, history, goals);
  const age = calcAge(profile.dob);
  const rangeH = history.slice(-parseInt(statRange));
  const scoreColor = today.score >= 80 ? C.green : today.score >= 60 ? C.orange : C.red;
  const streak = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].score > 0) c++; else break; } return c; })();
  const sleepH = history.filter(d => d.sleep?.duration > 0);
  const sportH = history.filter(d => d.sport?.duration > 0 && !d.sport?.isRest);
  const moodH = history.filter(d => d.mind?.mood > 0);
  const screenH = history.filter(d => d.work?.screenTime > 0);
  const waterH = history.filter(d => d.nutrition?.water > 0);
  const pace = today.sport.running?.time > 0 && today.sport.running?.distance > 0 ? (today.sport.running.time / today.sport.running.distance).toFixed(1) : null;
  const computedGoals = goals.map(g => ({ ...g, computedProgress: calcGoalProgress(g, history, totalPatrimoine) }));

  const simResult = useMemo(() => {
    let total = Number(sim.amount) || 0;
    const data = [{ year: 0, value: Math.round(total) }];
    for (let y = 1; y <= sim.years; y++) { total = total * (1 + sim.rate / 100) + sim.monthly * 12; data.push({ year: y, value: Math.round(total) }); }
    return data;
  }, [sim]);

  const radar = [
    { s: "Sommeil", v: Math.min(100, (today.sleep.duration / 9) * 100) },
    { s: "Sport", v: today.sport.isRest ? 60 : Math.min(100, today.sport.duration * 2) },
    { s: "Nutrition", v: (today.nutrition.breakfast ? 20 : 0) + (today.nutrition.lunch ? 20 : 0) + (today.nutrition.dinner ? 20 : 0) + Math.min(40, today.nutrition.water * 16) },
    { s: "Travail", v: today.work.focus * 20 },
    { s: "Mental", v: today.mind.mood * 20 },
    { s: "Corps", v: today.body?.weight > 0 ? 80 : 20 },
  ];

  const navIdx = NAV_ORDER.indexOf(nav);
  const trackIdx = TRACK_ORDER.indexOf(trackTab);
  const swipeNav = useSwipe(
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.min(trackIdx + 1, TRACK_ORDER.length - 1)]); else setNav(NAV_ORDER[Math.min(navIdx + 1, NAV_ORDER.length - 1)]); },
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.max(trackIdx - 1, 0)]); else setNav(NAV_ORDER[Math.max(navIdx - 1, 0)]); }
  );

  // Nutrition message intelligent
  const protGoal = goals.find(g => g.sourceId === "proteines");
  const protTarget = protGoal ? Number(protGoal.target) : 150;
  const protCurrent = today.nutrition.protein || 0;
  const protMsg = protCurrent > 0 ? getEncouragingMessage(protCurrent, protTarget, "proteines", new Date().getHours()) : null;

  const STAT_CARDS = [
    { label: "Sommeil", value: today.sleep.duration ? `${today.sleep.duration}h` : "", icon: "sleep", color: C.purple },
    { label: "Sport", value: today.sport.isRest ? "Repos" : today.sport.duration ? `${today.sport.duration}m` : "", icon: "sport", color: C.red },
    { label: "Eau", value: today.nutrition.water ? `${today.nutrition.water}L` : "", icon: "water", color: C.blue },
    { label: "Poids", value: today.body?.weight ? `${today.body.weight}kg` : "", icon: "scale", color: C.orange },
    { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "", icon: "focus", color: C.red },
    { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "", icon: "mood", color: C.green },
  ];

  if (onboarded === null) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 44, height: 44, border: `4px solid ${C.red}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, maxWidth: 480, margin: "0 auto", paddingBottom: 80, position: "relative", overflow: "hidden", touchAction: "pan-y", touchAction: "pan-y" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{font-family:Inter,sans-serif!important;box-sizing:border-box}input,select{font-family:Inter,sans-serif!important}::-webkit-scrollbar{display:none}`}</style>
      <BgDecor />

      {editingGoal && <EditGoalModal goal={editingGoal} onSave={saveEditedGoal} onClose={() => setEditingGoal(null)} />}

      {/* HEADER */}
      <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}`, background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setNav("profile")} style={{ cursor: "pointer" }}>
              {profile.photo ? <img src={profile.photo} alt="profil" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${C.red}`, boxShadow: "0 2px 8px rgba(204,41,54,0.3)" }} />
                : <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, #a01e28)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 17, boxShadow: "0 2px 8px rgba(204,41,54,0.3)" }}>{profile.name?.[0] || "K"}</div>}
            </div>
            <div>
              <p style={{ fontSize: 9, color: C.red, letterSpacing: 2.5, textTransform: "uppercase", margin: 0, fontWeight: 800 }}>Kojihsports</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.black }}>Bonjour {profile.name} 👋</p>
            </div>
          </div>
          <ScoreRing score={today.score} delta={intel.scoreDelta} streak={streak} />
        </div>
        {intel.alerts.length > 0 && <div style={{ marginTop: 10 }}><MsgBox type={intel.alerts[0].type} msg={intel.alerts[0].msg} /></div>}
        {intel.alerts.length === 0 && intel.advice.length > 0 && <div style={{ marginTop: 10 }}><MsgBox type="advice" msg={intel.advice[0]} /></div>}
      </div>

      <div style={{ padding: 16, position: "relative", zIndex: 1 }} {...swipeNav}>
        <PageTransition pageKey={nav + trackTab}>

          {/* ── TODAY ── */}
          {nav === "today" && (
            <div>
              <Card>
                <ST>Équilibre du jour</ST>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke={C.border}/><PolarAngleAxis dataKey="s" tick={{ fill: C.muted, fontSize: 11 }}/>
                    <Radar dataKey="v" stroke={C.red} fill={C.red} fillOpacity={0.12} strokeWidth={2.5}/>
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                {STAT_CARDS.map(item => (
                  <Card key={item.label} style={{ textAlign: "center", padding: 14, marginBottom: 0, borderTop: `3px solid ${item.color}`, boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{Ico[item.icon](item.color, 22)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                  </Card>
                ))}
              </div>

              {/* Intelligence temporelle */}
              {temporalInsights.length > 0 && (
                <Card style={{ borderLeft: `4px solid ${C.orange}` }}>
                  <ST>Intelligence · Maintenant</ST>
                  {temporalInsights.map((insight, i) => <MsgBox key={i} type={insight.type} msg={insight.msg} suggestions={insight.suggestions} />)}
                </Card>
              )}

              {(intel.patterns.length > 0 || intel.patrimoinePrediction || intel.todayPrediction) && (
                <Card style={{ borderLeft: `4px solid ${C.purple}` }}>
                  <ST>Patterns & Prédictions</ST>
                  {intel.patterns.map((p, i) => <MsgBox key={i} type="info" msg={p} />)}
                  {intel.patrimoinePrediction && <MsgBox type="info" msg={intel.patrimoinePrediction} />}
                  {intel.todayPrediction && <MsgBox type="info" msg={intel.todayPrediction} />}
                </Card>
              )}

              {intel.scoreDelta !== null && (
                <Card style={{ borderLeft: `4px solid ${intel.scoreDelta >= 0 ? C.green : C.red}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Semaine vs semaine précédente</p>
                      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: intel.scoreDelta >= 0 ? C.green : C.red }}>{intel.scoreDelta >= 0 ? `+${intel.scoreDelta}` : intel.scoreDelta} pts</p>
                    </div>
                    <div style={{ fontSize: 40 }}>{intel.scoreDelta >= 10 ? "🚀" : intel.scoreDelta >= 0 ? "📈" : "📉"}</div>
                  </div>
                </Card>
              )}

              <EvoChart data={history.slice(-30)} dataKey="score" color={C.red} label="Score global (30j)" unit="" />
              <Card>
                <ST>Objectifs en cours</ST>
                {computedGoals.slice(0, 4).map(g => (
                  <div key={g.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 13, color: g.color, fontWeight: 800 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${g.color}, ${g.color}cc)`, width: `${g.computedProgress}%`, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
                {computedGoals.length === 0 && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Aucun objectif → onglet Objectifs</p>}
              </Card>
              <Card>
                <ST>To-Do du jour</ST>
                {todos.filter(t => t.date === today.date).slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 10px", background: t.done ? C.surfaceAlt : C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 16, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                  </div>
                ))}
                {!todos.filter(t => t.date === today.date).length && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Aucune tâche → onglet Tracker</p>}
              </Card>
            </div>
          )}

          {/* ── TRACKER ── */}
          {nav === "track" && (
            <div>
              <div style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 16, scrollbarWidth: "none" }}>
                {TRACK_TABS.map(t => {
                  const active = trackTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTrackTab(t.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: active ? "2px solid rgba(255,255,255,0.6)" : `1px solid ${C.border}`, cursor: "pointer", fontSize: 12, fontWeight: 600, background: active ? `linear-gradient(135deg, ${C.red}, #a01e28)` : C.surface, color: active ? "#fff" : C.muted, display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s", boxShadow: active ? "0 4px 16px rgba(204,41,54,0.3)" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {Ico[t.icon](active ? "#fff" : C.muted, 15)}{t.label}
                    </button>
                  );
                })}
              </div>

              {trackTab === "sleep" && (
                <div>
                  <EvoChart data={sleepH.slice(-30)} dataKey="sleep.duration" color={C.purple} label="Durée de sommeil" unit="h" />
                  <Card>
                    <ST>Horaires</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                      <Field label="Coucher"><input type="time" value={today.sleep.bedtime} onChange={e => update("sleep", "bedtime", e.target.value)} style={{ ...inp, minHeight: 50 }} /></Field>
                      <Field label="Réveil"><input type="time" value={today.sleep.wakeup} onChange={e => update("sleep", "wakeup", e.target.value)} style={{ ...inp, minHeight: 50 }} /></Field>
                    </div>
                    {today.sleep.duration > 0 && (
                      <div style={{ textAlign: "center", padding: 16, background: today.sleep.duration >= 7.5 ? "rgba(22,163,74,0.06)" : "rgba(204,41,54,0.06)", borderRadius: 14, marginBottom: 14, border: `1px solid ${today.sleep.duration >= 7.5 ? C.green : C.red}33` }}>
                        <span style={{ fontSize: 40, fontWeight: 900, color: today.sleep.duration >= 7.5 ? C.green : today.sleep.duration >= 6.5 ? C.orange : C.red }}>{today.sleep.duration}h</span>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{today.sleep.duration >= 7.5 ? "Optimal ✅" : today.sleep.duration >= 6.5 ? "Correct  vise 7h30+" : "Insuffisant ⚠️"}</p>
                      </div>
                    )}
                    <ST>Qualité</ST>
                    <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
                    <div style={{ height: 14 }} />
                    <Toggle value={today.sleep.noScreen} onChange={v => update("sleep", "noScreen", v)} label="Pas d'écran 30min avant de dormir 📵" />
                  </Card>
                </div>
              )}{trackTab === "sport" && (
                <div>
                  {intel.todayRec === "rest" ? <MsgBox type="warning" msg={`💤 ${intel.consecutiveSport} jours consécutifs  repos recommandé.`} /> : intel.todayRec ? <MsgBox type="advice" msg={`🎯 Recommandation : ${intel.todayRec}`} /> : null}

                  {/* Sélection du sport */}
                  <Card>
                    <ST>Type d'activité</ST>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {["Musculation", "Running", "Football", "Tennis", "Boxe", "Repos"].map(sport => {
                        const active = today.sport.type === sport;
                        const icons = { Musculation: "💪", Running: "🏃", Football: "⚽", Tennis: "🎾", Boxe: "🥊", Repos: "🛌" };
                        return (
                          <button key={sport} onClick={() => { update("sport", "type", sport); update("sport", "isRest", sport === "Repos"); }} style={{ padding: "10px 16px", borderRadius: 12, border: `2px solid ${active ? C.red : C.border}`, background: active ? C.redLight : C.surface, color: active ? C.red : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            {icons[sport]} {sport}
                          </button>
                        );
                      })}
                    </div>

                    {/* Repos */}
                    {today.sport.type === "Repos" && (
                      <div>
                        <MsgBox type="advice" msg="🛌 Jour de repos  la récupération fait partie de la progression !" />
                        <Toggle value={today.sport.stretching} onChange={v => update("sport", "stretching", v)} label="Étirements / Mobilité ✅" />
                      </div>
                    )}

                    {/* Musculation */}
                    {today.sport.type === "Musculation" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Nom de la séance (ex: Push, Pull, Legs)">
                          <input type="text" value={today.sport.sessionName || ""} onChange={e => update("sport", "sessionName", e.target.value)} placeholder="Ex: PPL Push, Full Body..." style={inp} />
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Durée (min)"><input type="number" value={today.sport.duration || ""} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="Intensité"><div style={{ paddingTop: 6 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                        </div>
                        <Field label="PR / Notes"><input type="text" value={today.sport.notes || ""} placeholder="Ex: Bench 90kg ×5 🔥" onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                        <ST>Récupération</ST>
                        <Rating value={today.sport.recovery || 0} onChange={v => update("sport", "recovery", v)} color={today.sport.recovery <= 2 ? C.red : today.sport.recovery <= 3 ? C.orange : C.green} />
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{["","Très douloureux","Courbatures","Correct","Bien","Parfait 💪"][today.sport.recovery] || ""}</p>
                      </div>
                    )}

                    {/* Running */}
                    {today.sport.type === "Running" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Distance (km)"><input type="number" value={today.sport.running?.distance || ""} min={0} step={0.1} onChange={e => updateNested("sport", "running", "distance", +e.target.value)} style={inp} /></Field>
                          <Field label="Temps (min)"><input type="number" value={today.sport.running?.time || ""} min={0} onChange={e => updateNested("sport", "running", "time", +e.target.value)} style={inp} /></Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                          <Field label="FC max (bpm)"><input type="number" value={today.sport.heartRateMax || ""} min={0} max={220} onChange={e => update("sport", "heartRateMax", +e.target.value)} style={inp} /></Field>
                        </div>
                        {today.sport.running?.distance > 0 && today.sport.running?.time > 0 && (
                          <div style={{ textAlign: "center", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 12, padding: 14 }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: C.blue }}>{(today.sport.running.time / today.sport.running.distance).toFixed(1)} min/km</span>
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>Allure moyenne</p>
                          </div>
                        )}
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Parcours, ressenti..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}

                    {/* Football */}
                    {today.sport.type === "Football" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Type de séance">
                          <select value={today.sport.footballType || ""} onChange={e => update("sport", "footballType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option>
                            <option>Match</option>
                            <option>Entraînement</option>
                            <option>Futsal</option>
                          </select>
                        </Field>
                        {today.sport.footballType === "Match" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <Field label="Buts pour"><input type="number" value={today.sport.scoreFor || ""} min={0} onChange={e => update("sport", "scoreFor", +e.target.value)} style={inp} /></Field>
                            <Field label="Buts contre"><input type="number" value={today.sport.scoreAgainst || ""} min={0} onChange={e => update("sport", "scoreAgainst", +e.target.value)} style={inp} /></Field>
                            <Field label="Résultat">
                              <div style={{ padding: "11px 14px", borderRadius: 10, background: today.sport.scoreFor > today.sport.scoreAgainst ? "rgba(22,163,74,0.1)" : today.sport.scoreFor < today.sport.scoreAgainst ? "rgba(204,41,54,0.1)" : C.surfaceAlt, textAlign: "center", fontWeight: 800, color: today.sport.scoreFor > today.sport.scoreAgainst ? C.green : today.sport.scoreFor < today.sport.scoreAgainst ? C.red : C.muted }}>
                                {today.sport.scoreFor > today.sport.scoreAgainst ? "Victoire 🏆" : today.sport.scoreFor < today.sport.scoreAgainst ? "Défaite" : "Nul"}
                              </div>
                            </Field>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Durée (min)"><input type="number" value={today.sport.duration || ""} min={0} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                        </div>
                        <Field label="Notes / performance"><input type="text" value={today.sport.notes || ""} placeholder="Poste, ressenti, buts marqués..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}

                    {/* Tennis */}
                    {today.sport.type === "Tennis" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Type">
                          <select value={today.sport.tennisType || ""} onChange={e => update("sport", "tennisType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option>
                            <option>Match</option>
                            <option>Entraînement</option>
                          </select>
                        </Field>
                        {today.sport.tennisType === "Match" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <Field label="Score (ex: 6-3, 4-6, 6-4)"><input type="text" value={today.sport.tennisScore || ""} placeholder="6-3, 4-6, 6-4" onChange={e => update("sport", "tennisScore", e.target.value)} style={inp} /></Field>
                            <Field label="Adversaire"><input type="text" value={today.sport.tennisOpponent || ""} placeholder="Nom de l'adversaire" onChange={e => update("sport", "tennisOpponent", e.target.value)} style={inp} /></Field>
                            <div style={{ display: "flex", gap: 10 }}>
                              {["Victoire", "Défaite"].map(r => (
                                <button key={r} onClick={() => update("sport", "tennisResult", r)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `2px solid ${today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.border}`, background: today.sport.tennisResult === r ? (r === "Victoire" ? "rgba(22,163,74,0.1)" : "rgba(204,41,54,0.1)") : C.surface, fontWeight: 700, color: today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.muted, cursor: "pointer" }}>
                                  {r === "Victoire" ? "🏆 " : "😤 "}{r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Durée (min)"><input type="number" value={today.sport.duration || ""} min={0} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                        </div>
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Surface, ressenti..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}

                    {/* Boxe */}
                    {today.sport.type === "Boxe" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <Field label="Type de séance">
                          <select value={today.sport.boxeType || ""} onChange={e => update("sport", "boxeType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option>
                            <option>Sparring</option>
                            <option>Sac / Pattes</option>
                            <option>Technique</option>
                            <option>Combat</option>
                          </select>
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Rounds"><input type="number" value={today.sport.boxeRounds || ""} min={0} max={20} onChange={e => update("sport", "boxeRounds", +e.target.value)} style={inp} /></Field>
                          <Field label="Durée round (min)"><input type="number" value={today.sport.boxeRoundDuration || ""} min={0} max={10} onChange={e => update("sport", "boxeRoundDuration", +e.target.value)} style={inp} /></Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                          <Field label="FC max (bpm)"><input type="number" value={today.sport.heartRateMax || ""} min={0} max={220} onChange={e => update("sport", "heartRateMax", +e.target.value)} style={inp} /></Field>
                        </div>
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Ressenti, technique travaillée..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}
                  </Card>

                  {/* Photo progression */}
                  {today.sport.type && today.sport.type !== "Repos" && (
                    <Card>
                      <ST>Photo de progression 📸</ST>
                      <input type="file" accept="image/*" ref={sportPhotoRef} style={{ display: "none" }} onChange={handleSportPhoto} />
                      <button onClick={() => sportPhotoRef.current.click()} style={{ width: "100%", padding: 14, background: C.surfaceAlt, border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: C.muted }}>📷 Importer une photo</button>
                      {today.sport.photoUrl && <img src={today.sport.photoUrl} alt="prog" style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 240 }} />}
                    </Card>
                  )}

                  {/* Graphiques */}
                  <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color={C.red} label="Durée des séances" unit="min" />
                </div>
              )}

              

              {trackTab === "nutrition" && (
                <div>
                  <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color={C.blue} label="Hydratation" unit="L" />
                  <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-30)} dataKey="nutrition.protein" color={C.purple} label="Protéines" unit="g" />
                  {/* Intelligence temporelle nutrition */}
                  {temporalInsights.filter(i => i.msg.includes("prot") || i.msg.includes("repas") || i.msg.includes("💧")).map((ins, i) => (
                    <MsgBox key={i} type={ins.type} msg={ins.msg} suggestions={ins.suggestions} />
                  ))}
                  <Card>
                    <ST>Repas</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label="Petit-déjeuner ✅" />
                      <Toggle value={today.nutrition.lunch} onChange={v => update("nutrition", "lunch", v)} label="Déjeuner ✅" />
                      <Toggle value={today.nutrition.dinner} onChange={v => update("nutrition", "dinner", v)} label="Dîner ✅" />
                      <Toggle value={today.nutrition.junk} onChange={v => update("nutrition", "junk", v)} label="Junk food ❌" />
                    </div>
                    <ST>Quantités</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Eau (L)"><input type="number" value={today.nutrition.water} min={0} max={5} step={0.25} onChange={e => update("nutrition", "water", +e.target.value)} style={inp} /></Field>
                      <Field label={`Protéines (g) / ${protTarget}g`}><input type="number" value={today.nutrition.protein} min={0} max={300} onChange={e => update("nutrition", "protein", +e.target.value)} style={inp} /></Field>
                    </div>
                    {protMsg && <div style={{ marginTop: 12 }}><MsgBox type={protMsg.type} msg={protMsg.msg} /></div>}
                    {/* Barre de progression protéines */}
                    {protCurrent > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: C.muted }}>
                          <span>Protéines</span><span style={{ fontWeight: 700, color: protCurrent >= protTarget ? C.green : C.orange }}>{protCurrent}/{protTarget}g</span>
                        </div>
                        <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: protCurrent >= protTarget ? `linear-gradient(90deg, ${C.green}, #128a3a)` : `linear-gradient(90deg, ${C.purple}, #5b21b6)`, width: `${Math.min(100, (protCurrent / protTarget) * 100)}%`, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {trackTab === "body" && (
                <div>
                  <EvoChart data={history.filter(d => d.body?.weight > 0).slice(-60)} dataKey="body.weight" color={C.orange} label="Évolution du poids" unit="kg" />
                  <Card>
                    <ST>Mensurations</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Poids (kg)"><input type="number" value={today.body?.weight || ""} step={0.1} min={0} onChange={e => update("body", "weight", +e.target.value)} style={inp} /></Field>
                      <Field label="Poitrine (cm)"><input type="number" value={today.body?.chest || ""} min={0} onChange={e => update("body", "chest", +e.target.value)} style={inp} /></Field>
                      <Field label="Taille (cm)"><input type="number" value={today.body?.waist || ""} min={0} onChange={e => update("body", "waist", +e.target.value)} style={inp} /></Field>
                      <Field label="Hanches (cm)"><input type="number" value={today.body?.hips || ""} min={0} onChange={e => update("body", "hips", +e.target.value)} style={inp} /></Field>
                      <Field label="Bras (cm)"><input type="number" value={today.body?.arms || ""} min={0} onChange={e => update("body", "arms", +e.target.value)} style={inp} /></Field>
                      <Field label="Cuisses (cm)"><input type="number" value={today.body?.thighs || ""} min={0} onChange={e => update("body", "thighs", +e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              {trackTab === "work" && (
                <div>
                  <EvoChart data={history.filter(d => d.work?.focus > 0).slice(-30)} dataKey="work.focus" color={C.orange} label="Niveau de focus" unit="/5" />
                  {intel.avgScreen > 4 && <MsgBox type="warning" msg={`📱 ${Math.round(intel.avgScreen)}h d'écran/jour  sommeil et focus dégradés.`} />}
                  <Card>
                    <ST>Focus & Productivité</ST>
                    <Rating value={today.work.focus} onChange={v => update("work", "focus", v)} />
                    <div style={{ height: 16 }} />
                    <ST>Tâches</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <Field label="Prévues"><input type="number" value={today.work.tasks} min={0} max={20} onChange={e => update("work", "tasks", +e.target.value)} style={inp} /></Field>
                      <Field label="Faites"><input type="number" value={today.work.tasksCompleted} min={0} max={20} onChange={e => update("work", "tasksCompleted", +e.target.value)} style={inp} /></Field>
                    </div>
                    {today.work.tasks > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: C.muted }}>
                          <span>Complétion</span><span style={{ color: C.red, fontWeight: 700 }}>{Math.round(Math.min(1, today.work.tasksCompleted / today.work.tasks) * 100)}%</span>
                        </div>
                        <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.red}, #a01e28)`, width: `${Math.min(100, (today.work.tasksCompleted / today.work.tasks) * 100)}%`, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    )}
                    <Field label="Highlight"><input type="text" placeholder="Ma meilleure action..." value={today.work.highlight} onChange={e => update("work", "highlight", e.target.value)} style={inp} /></Field>
                  </Card>
                  <Card>
                    <ST>Temps d'écran</ST>
                    <Field label="Heures aujourd'hui"><input type="number" value={today.work.screenTime} min={0} max={24} step={0.5} onChange={e => update("work", "screenTime", +e.target.value)} style={inp} /></Field>
                    {today.work.screenTime > 0 && (
                      <div style={{ marginTop: 10, padding: 12, background: today.work.screenTime <= 3 ? "rgba(22,163,74,0.06)" : "rgba(204,41,54,0.06)", border: `1px solid ${today.work.screenTime <= 3 ? C.green : C.red}33`, borderRadius: 10, fontSize: 12, color: today.work.screenTime <= 3 ? C.green : C.red }}>
                        {today.work.screenTime <= 3 ? "✅ Excellent  focus préservé" : today.work.screenTime <= 5 ? "⚠️ Limite" : "🚨 Trop élevé  mélatonine perturbée"}
                      </div>
                    )}
                    <EvoChart data={screenH.slice(-30)} dataKey="work.screenTime" color={C.red} label="Temps d'écran" unit="h" height={100} />
                  </Card>
                </div>
              )}

              {trackTab === "todo" && (
                <div>
                  <Card>
                    <ST>Nouvelle tâche</ST>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Ajouter une tâche..." style={{ ...inp, flex: 1 }} />
                      <button onClick={addTodo} style={{ background: `linear-gradient(135deg, ${C.red}, #a01e28)`, color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 700, cursor: "pointer", fontSize: 20, boxShadow: "0 4px 12px rgba(204,41,54,0.3)" }}>+</button>
                    </div>
                  </Card>
                  {["today","older"].map(group => {
                    const todayDate = new Date().toISOString().split("T")[0];
                    const items = todos.filter(t => group === "today" ? t.date === todayDate : t.date !== todayDate);
                    if (!items.length) return null;
                    return (
                      <Card key={group}>
                        <ST>{group === "today" ? "Aujourd'hui" : "Anciennes"}</ST>
                        {items.map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 12px", background: t.done ? C.surfaceAlt : C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                            <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                            <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                            <span onClick={() => deleteTodo(t.id)} style={{ fontSize: 12, color: C.subtle, cursor: "pointer" }}>✕</span>
                          </div>
                        ))}
                      </Card>
                    );
                  })}
                  {!todos.length && <Card><p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: 0 }}>Aucune tâche !</p></Card>}
                </div>
              )}

              {trackTab === "mind" && (
                <div>
                  <EvoChart data={moodH.slice(-30)} dataKey="mind.mood" color={C.purple} label="Évolution humeur" unit="/5" />
                  <Card>
                    <ST>Humeur du jour</ST>
                    <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} color={today.mind.mood >= 4 ? C.green : today.mind.mood >= 3 ? C.orange : C.red} />
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 6, marginBottom: 14 }}>{["","Difficile 😔","Moyen 😐","Correct 🙂","Bien 😊","Excellent 🔥"][today.mind.mood] || ""}</p>
                    {today.mind.mood > 0 && today.mind.mood <= 2 && <MsgBox type="warning" msg="Moral bas  5min cohérence cardiaque maintenant." />}
                    <ST>Développement</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Lecture (pages)"><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                      <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label="Méditation / Cohérence cardiaque 🧘" />
                      <Field label="Compétence travaillée"><input type="text" placeholder="Ex: closing, copywriting..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                      <Field label="Gratitude du jour"><input type="text" placeholder="Une chose positive..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              <button onClick={saveDay} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: "pointer", background: saved ? `linear-gradient(135deg, ${C.green}, #128a3a)` : `linear-gradient(135deg, ${C.red}, #a01e28)`, color: "#fff", fontSize: 15, fontWeight: 800, transition: "all 0.3s", marginTop: 4, boxShadow: saved ? "0 6px 20px rgba(22,163,74,0.35)" : "0 6px 20px rgba(204,41,54,0.35)" }}>
                {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la journée"}
              </button>
            </div>
          )}

          {/* ── ARGENT ── */}
          {nav === "money" && (
            <div>
              <Card accent>
                <ST light>Patrimoine total</ST>
                <p style={{ fontSize: 42, fontWeight: 900, color: "#fff", margin: "0 0 4px", lineHeight: 1 }}>{totalPatrimoine.toLocaleString("fr-FR")} €</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                {intel.patrimoinePrediction && <div style={{ marginTop: 12, background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", fontSize: 11, color: "rgba(255,255,255,0.9)" }}>{intel.patrimoinePrediction}</div>}
              </Card>
              {patrimoine.some(p => p.amount > 0) && (
                <Card>
                  <ST>Répartition</ST>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={patrimoine.filter(p => p.amount > 0)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} fontSize={10}>
                        {patrimoine.filter(p => p.amount > 0).map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                      <Tooltip formatter={v => [`${v.toLocaleString("fr-FR")}€`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {patrimoine.filter(p => p.amount > 0).map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                        <span style={{ color: C.muted }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <Card>
                <ST>Mes poches d'investissement</ST>
                {patrimoine.map((p, idx) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "12px 14px", background: C.surfaceAlt, borderRadius: 14, borderLeft: `4px solid ${p.color}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => movePoche(idx, -1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted, lineHeight: 1 }}>{Ico.up(C.muted, 14)}</button>
                      <button onClick={() => movePoche(idx, 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted, lineHeight: 1 }}>{Ico.down(C.muted, 14)}</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      {renamingPoche === p.id ? (
                        <input autoFocus value={p.name} onChange={e => updatePoche(p.id, "name", e.target.value)} onBlur={() => setRenamingPoche(null)} onKeyDown={e => e.key === "Enter" && setRenamingPoche(null)} style={{ ...inp, padding: "4px 8px", fontSize: 13, fontWeight: 600 }} />
                      ) : <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{p.name}</p>}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 3 }}>
                        <input type="number" value={p.amount} onChange={e => updatePoche(p.id, "amount", +e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: 20, fontWeight: 900, color: p.color, width: 140 }} />
                        <span style={{ fontSize: 12, color: C.muted }}>€</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setRenamingPoche(p.id)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{Ico.edit(C.muted, 14)}</button>
                      <input type="color" value={p.color} onChange={e => updatePoche(p.id, "color", e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer" }} />
                      <button onClick={() => deletePoche(p.id)} style={{ background: "rgba(204,41,54,0.08)", border: `1px solid ${C.red}33`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input value={newPoche.name} onChange={e => setNewPoche(p => ({ ...p, name: e.target.value }))} placeholder="Nom" style={inp} />
                    <input type="number" value={newPoche.amount} onChange={e => setNewPoche(p => ({ ...p, amount: +e.target.value }))} placeholder="Montant €" style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={newPoche.color} onChange={e => setNewPoche(p => ({ ...p, color: e.target.value }))} style={{ width: 42, height: 42, borderRadius: 10, border: "none", cursor: "pointer" }} />
                    <button onClick={addPoche} style={{ flex: 1, padding: "12px", background: `linear-gradient(135deg, ${C.red}, #a01e28)`, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Ajouter une poche</button>
                  </div>
                </div>
              </Card>
              <Card>
                <ST>Flux du jour</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Revenus (€)"><input type="number" value={today.money.income} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} /></Field>
                  <Field label="Dépenses (€)"><input type="number" value={today.money.expense} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} /></Field>
                </div>
                <Field label="Investi (€)"><input type="number" value={today.money.invested} min={0} onChange={e => update("money", "invested", +e.target.value)} style={{ ...inp, marginBottom: 10 }} /></Field>
                <Field label="Note"><input type="text" placeholder="Ex: DCA ETF World..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
              </Card>
              <Card>
                <ST>Simulateur 📈</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <Field label="Capital (€)"><input type="number" value={sim.amount} onChange={e => setSim(s => ({ ...s, amount: +e.target.value }))} style={inp} /></Field>
                  <Field label="Versement/mois (€)"><input type="number" value={sim.monthly} onChange={e => setSim(s => ({ ...s, monthly: +e.target.value }))} style={inp} /></Field>
                  <Field label="Rendement/an (%)"><input type="number" value={sim.rate} step={0.5} onChange={e => setSim(s => ({ ...s, rate: +e.target.value }))} style={inp} /></Field>
                  <Field label="Durée (ans)"><input type="number" value={sim.years} min={1} max={50} onChange={e => setSim(s => ({ ...s, years: +e.target.value }))} style={inp} /></Field>
                </div>
                <div style={{ textAlign: "center", padding: 18, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 14, marginBottom: 14 }}>
                  <p style={{ fontSize: 10, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Dans {sim.years} ans</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: C.green, margin: 0 }}>{simResult[simResult.length-1]?.value.toLocaleString("fr-FR")} €</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={simResult}>
                    <defs><linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid stroke={C.border} vertical={false}/>
                    <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={y => `${y}a`} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={40} tickFormatter={v => `${Math.round(v/1000)}k`} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 10, fontSize: 11 }} formatter={v => [`${v.toLocaleString("fr-FR")}€`, "Valeur"]}/>
                    <Area type="monotone" dataKey="value" stroke={C.green} strokeWidth={2.5} fill="url(#simGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── OBJECTIFS ── */}
          {nav === "goals" && (
            <div>
              <Card>
                <ST>Nouvel objectif</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Ex: 170g de protéines/jour" style={inp} />
                  <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Catégorie" style={inp} />
                  <Field label="Source de données">
                    <select value={newGoal.sourceId} onChange={e => setNewGoal(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text }}>
                      {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Field>
                  {newGoal.sourceId !== "manual" && (
                    <>
                      <Field label={`Valeur cible (${DATA_SOURCES.find(s => s.id === newGoal.sourceId)?.unit || ""})`}>
                        <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} placeholder="Ex: 170" style={inp} />
                      </Field>
                      <Toggle value={newGoal.reverse} onChange={v => setNewGoal(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
                    </>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Début"><input type="date" value={newGoal.startDate} onChange={e => setNewGoal(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
                    <Field label="Fin"><input type="date" value={newGoal.endDate} onChange={e => setNewGoal(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, flexShrink: 0 }}>Couleur</label>
                    <input type="color" value={newGoal.color} onChange={e => setNewGoal(p => ({ ...p, color: e.target.value }))} style={{ width: 42, height: 42, borderRadius: 10, border: `2px solid ${C.border}`, cursor: "pointer", padding: 2 }} />
                  </div>
                  <button onClick={addGoal} style={{ background: `linear-gradient(135deg, ${newGoal.color}, ${newGoal.color}bb)`, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>+ Ajouter l'objectif</button>
                </div>
              </Card>

              {computedGoals.map((g, idx) => {
                const src = DATA_SOURCES.find(s => s.id === g.sourceId);
                const daysLeft = g.endDate ? Math.max(0, Math.round((new Date(g.endDate) - new Date()) / 86400000)) : null;
                return (
                  <Card key={g.id} style={{ borderLeft: `4px solid ${g.color}`, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        {/* Flèches ↑↓ */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => moveGoal(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: "3px 6px", color: idx === 0 ? C.subtle : C.muted, lineHeight: 1, borderRadius: 6 }}>{Ico.up(idx === 0 ? C.subtle : C.muted, 15)}</button>
                          <button onClick={() => moveGoal(idx, 1)} disabled={idx === computedGoals.length - 1} style={{ background: "none", border: "none", cursor: idx === computedGoals.length - 1 ? "default" : "pointer", padding: "3px 6px", color: idx === computedGoals.length - 1 ? C.subtle : C.muted, lineHeight: 1, borderRadius: 6 }}>{Ico.down(idx === computedGoals.length - 1 ? C.subtle : C.muted, 15)}</button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{g.label}</p>
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: g.color, fontWeight: 700, background: `${g.color}18`, borderRadius: 6, padding: "2px 8px" }}>{g.category}</span>
                            {src && src.id !== "manual" && <span style={{ fontSize: 10, color: C.muted, background: C.surfaceAlt, borderRadius: 6, padding: "2px 8px" }}>🔗 {src.label} · cible: {Number(g.target).toLocaleString()}{src.unit}</span>}
                            {daysLeft !== null && <span style={{ fontSize: 10, color: daysLeft < 30 ? C.red : C.muted, background: C.surfaceAlt, borderRadius: 6, padding: "2px 8px" }}>⏱ {daysLeft}j</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: g.computedProgress >= 100 ? C.green : g.color }}>{g.computedProgress}%</span>
                        <button onClick={() => setEditingGoal(g)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{Ico.edit(C.muted, 14)}</button>
                        <button onClick={() => deleteGoal(g.id)} style={{ background: "rgba(204,41,54,0.08)", border: `1px solid ${C.red}33`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
                      </div>
                    </div>
                    <div style={{ height: 10, background: C.surfaceAlt, borderRadius: 5, marginBottom: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 5, background: g.computedProgress >= 100 ? `linear-gradient(90deg, ${C.green}, #128a3a)` : `linear-gradient(90deg, ${g.color}, ${g.color}bb)`, width: `${Math.min(100, g.computedProgress)}%`, transition: "width 0.6s ease" }} />
                    </div>
                    {g.sourceId === "manual" && (
                      <input type="range" min={0} max={100} value={g.computedProgress}
                        onChange={e => updateGoalField(g.id, "manualProgress", +e.target.value)}
                        style={{ width: "100%", accentColor: g.color, cursor: "pointer", marginTop: 8 }} />
                    )}
                  </Card>
                );
              })}
              {computedGoals.length === 0 && <Card><p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: 0 }}>Aucun objectif. Crée-en un !</p></Card>}
            </div>
          )}

          {/* ── STATS ── */}
          {nav === "stats" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["7","7j"],["30","30j"],["90","3 mois"],["365","1 an"]].map(([v, l]) => (
                  <button key={v} onClick={() => setStatRange(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: statRange === v ? `linear-gradient(135deg, ${C.red}, #a01e28)` : C.surfaceAlt, color: statRange === v ? "#fff" : C.muted }}>{l}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Jours trackés", value: history.length, color: C.red },
                  { label: "Score moyen", value: `${intel.scoreAvg}/100`, color: C.orange },
                  { label: "Nuits > 7h30", value: rangeH.filter(d => d.sleep?.duration >= 7.5).length, color: C.purple },
                  { label: "Séances sport", value: rangeH.filter(d => d.sport?.duration >= 30).length, color: C.red },
                  { label: "Streak actuel", value: `${streak}j 🔥`, color: C.orange },
                  { label: "Objectifs actifs", value: goals.length, color: C.green },
                ].map(item => (
                  <Card key={item.label} style={{ textAlign: "center", padding: 16, marginBottom: 0, borderTop: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                  </Card>
                ))}
              </div>
              <Card>
                <ST>Calendrier · 84 derniers jours</ST>
                <CalendarHeatmap history={history} />
              </Card>
              {intel.patterns.length > 0 && (
                <Card style={{ borderLeft: `4px solid ${C.purple}` }}>
                  <ST>Patterns détectés</ST>
                  {intel.patterns.map((p, i) => <MsgBox key={i} type="info" msg={p} />)}
                </Card>
              )}
              <EvoChart data={rangeH} dataKey="score" color={C.red} label="Score global" unit="" height={170} />
              <EvoChart data={sleepH.slice(-parseInt(statRange))} dataKey="sleep.duration" color={C.purple} label="Sommeil" unit="h" />
              <EvoChart data={sportH.slice(-parseInt(statRange))} dataKey="sport.duration" color={C.red} label="Sport" unit="min" />
              <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color={C.purple} label="Humeur" unit="/5" />
              <EvoChart data={screenH.slice(-parseInt(statRange))} dataKey="work.screenTime" color={C.orange} label="Temps d'écran" unit="h" />
              <Card>
                <ST>Progression objectifs</ST>
                {computedGoals.map(g => (
                  <div key={g.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 13, color: g.color, fontWeight: 800 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${g.color}, ${g.color}cc)`, width: `${g.computedProgress}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ── PROFIL ── */}
          {nav === "profile" && (
            <div>
              <Card accent style={{ textAlign: "center" }}>
                <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handleProfilePhoto} />
                <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", display: "inline-block", position: "relative", marginBottom: 12 }}>
                  {profile.photo ? <img src={profile.photo} alt="profil" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.4)" }} />
                    : <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "K"}</div>}
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(255,255,255,0.9)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>📷</div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 2px" }}>{profile.name}</p>
                {age !== null && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>{age} ans · Kojihsports</p>}
              </Card>
              <Card>
                <ST>Informations</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Prénom"><input value={profile.name} onChange={e => updateProfile("name", e.target.value)} style={inp} /></Field>
                  <Field label="Date de naissance"><input type="date" value={profile.dob || ""} onChange={e => updateProfile("dob", e.target.value)} style={inp} /></Field>
                  {age !== null && (
                    <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: C.muted }}>Âge calculé automatiquement</span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: C.red }}>{age} ans</span>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <ST>Résumé</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Jours trackés", value: history.length },
                    { label: "Streak", value: `${streak}j 🔥` },
                    { label: "Score moyen", value: `${intel.scoreAvg}/100` },
                    { label: "Objectifs", value: goals.length },
                    { label: "Patrimoine", value: `${(totalPatrimoine/1000).toFixed(1)}k€` },
                    { label: "Tâches faites", value: todos.filter(t => t.done).length },
                  ].map(item => (
                    <div key={item.label} style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: C.red }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card accent>
                <ST light>Vision</ST>
                <p style={{ color: "#fff", fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>100k€ net/an · {age && age < 30 ? `avant ${30 - age} ans` : "objectif 30 ans"}</p>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: 0 }}>Kojihsports · Angers · Sept. 2026</p>
              </Card>
              <button onClick={() => { localStorage.removeItem("kojihlife_v9"); setOnboarded(false); }} style={{ width: "100%", padding: "12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: C.muted, marginTop: 4 }}>
                Refaire l'onboarding
              </button>
            </div>
          )}

        </PageTransition>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        {NAV.map(n => {
          const active = nav === n.id;
          return (
            <button key={n.id} onClick={() => setNav(n.id)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: active ? C.black : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: active ? "0 4px 12px rgba(0,0,0,0.2)" : "none" }}>
                {Ico[n.icon](active ? C.red : C.black, 21)}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? C.red : C.black, textTransform: "uppercase", letterSpacing: 0.5 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
