import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = "BHfX8lG2QQGuaE8AW9qOykb2GZaxtzONoy7k3feJBGzf-Dyrx4h2qUk4xt9FQyo8H1Cr1EuemZLucqdd0iEt7M4";

async function registerPush(notifPrefs, wakeTime = "07:00", sleepTime = "23:00") {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      subscription: sub.toJSON(),
      notif_prefs: notifPrefs,
      wake_time: wakeTime,
      sleep_time: sleepTime,
    }, { onConflict: "user_id" });
  } catch (e) { console.warn("Push registration failed", e); }
}
import Subscription from "./Subscription";
import { useTheme } from "./theme.jsx";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import kojihLogo from "./assets/logo.png";

// ── THEMES ────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F8F8F6", surface: "#FFFFFF", surfaceAlt: "#F2F2F0", border: "#E8E8E4",
  red: "#CC2936", redLight: "rgba(204,41,54,0.08)", redBorder: "rgba(204,41,54,0.18)",
  black: "#0A0A0A", text: "#1A1A1A", muted: "#6B6B6B", subtle: "#CFCFCF",
  green: "#1A7A4A", orange: "#D4580A", purple: "#6B35C8", blue: "#1E5FCC",
  navBg: "rgba(255,255,255,0.92)",
};
const DARK = {
  bg: "#0C0C0C", surface: "#161616", surfaceAlt: "#1E1E1E", border: "#2A2A2A",
  red: "#E8384A", redLight: "rgba(232,56,74,0.12)", redBorder: "rgba(232,56,74,0.25)",
  black: "#F5F5F5", text: "#E8E8E8", muted: "#8A8A8A", subtle: "#3A3A3A",
  green: "#22C55E", orange: "#F97316", purple: "#A855F7", blue: "#3B82F6",
  navBg: "rgba(12,12,12,0.95)",
};
let C = LIGHT;

const NAV_ORDER = ["today", "track", "money", "goals", "stats", "profile"];
const TRACK_ORDER = ["sleep", "sport", "nutrition", "body", "work", "todo", "mind"];

// ── FOOD DATABASE ──────────────────────────────────────────────────────────

const getMealSuggestions = (proteinNeeded, hour) => {
  if (proteinNeeded <= 0) return [];
  const suggestions = [];
  if (proteinNeeded >= 30 && hour < 21) {
    const chickenAmount = Math.round(proteinNeeded * 0.6 / 0.31);
    suggestions.push({ name: "Repas complet", items: [`${chickenAmount}g poulet (${Math.round(chickenAmount * 0.31)}g prot)`, `80g riz cru cuit x3 (6g prot)`], totalProtein: Math.round(chickenAmount * 0.31 + 6), timing: "Idéal si diner pas encore pris" });
  }
  if (proteinNeeded >= 15 && proteinNeeded < 40) {
    suggestions.push({ name: "Collation proteinee", items: ["200g fromage blanc 0% (16g prot)", "2 oeufs entiers (12g prot)"], totalProtein: 28, timing: hour >= 21 ? "Leger dernier repas avant 23h" : "Parfait pour combler" });
  }
  if (proteinNeeded >= 20) {
    suggestions.push({ name: "Shake whey", items: ["30g whey (24g prot)", "200ml lait ou eau"], totalProtein: 24, timing: hour >= 22 ? "Trop tard pour bien dormir" : "Rapide et efficace" });
  }
  return allMeals
    .filter(m => m.protein >= proteinNeeded * 0.5 && m.protein <= proteinNeeded * 1.5)
    .sort((a, b) => Math.abs(a.protein - proteinNeeded) - Math.abs(b.protein - proteinNeeded))
    .slice(0, 2)
    .map(m => ({ name: m.name, items: [`${m.protein}g prot`, `${m.calories} kcal`], totalProtein: m.protein, timing: hour >= 22 ? "Léger avant 23h" : "Idéal maintenant" }));
};
const MEAL_DB = {
  breakfast: [
    { name: "3 oeufs brouillés + 1/2 avocat (75g) + 2 tranches pain complet", protein: 24, carbs: 28, fat: 22, calories: 410, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "80g flocons avoine + 30g whey + 1 banane (120g) + 200ml lait", protein: 38, carbs: 68, fat: 7, calories: 491, vegan: false, goals: ["masse","maintenance"] },
    { name: "200g yaourt grec 0% + 1 c.à.s miel + 30g noix", protein: 22, carbs: 28, fat: 14, calories: 326, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "3 oeufs + 30g whey + 50g flocons (pancakes protéinés)", protein: 42, carbs: 40, fat: 14, calories: 458, vegan: false, goals: ["masse","maintenance"] },
    { name: "2 tranches pain complet + 30g beurre cacahuète + 1 banane (120g)", protein: 14, carbs: 55, fat: 18, calories: 434, vegan: true, goals: ["masse","maintenance"] },
    { name: "300ml lait + 1 banane + 30g whey + 60g flocons avoine (shake mass)", protein: 45, carbs: 75, fat: 8, calories: 568, vegan: false, goals: ["masse"] },
    { name: "200g fromage blanc 0% + 100g fruits rouges + 40g granola", protein: 22, carbs: 38, fat: 5, calories: 285, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "4 oeufs entiers + 2 tranches jambon blanc (60g) omelette", protein: 38, carbs: 2, fat: 24, calories: 378, vegan: false, goals: ["masse","seche"] },
    { name: "200g tofu ferme + 150g légumes poêlés + 1 c.à.s huile olive", protein: 20, carbs: 10, fat: 12, calories: 232, vegan: true, goals: ["perte","seche","maintenance"] },
    { name: "150g skyr + 100g myrtilles + 20g amandes effilées", protein: 20, carbs: 22, fat: 8, calories: 240, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "2 tranches pain seigle + 2 oeufs pochés + 50g épinards", protein: 20, carbs: 30, fat: 10, calories: 290, vegan: false, goals: ["perte","maintenance"] },
    { name: "60g muesli + 200ml lait végétal + 15g graines chia", protein: 12, carbs: 52, fat: 12, calories: 360, vegan: true, goals: ["maintenance","masse"] },
    { name: "1 bagel complet + 80g saumon fumé + 30g cream cheese", protein: 28, carbs: 42, fat: 14, calories: 410, vegan: false, goals: ["masse","maintenance"] },
    { name: "80g flocons avoine cuits + 20g beurre amande + 1 pêche (150g)", protein: 14, carbs: 62, fat: 12, calories: 412, vegan: true, goals: ["masse","maintenance"] },
    { name: "200g cottage cheese + 150g ananas + 1/2 c.à.c cannelle", protein: 24, carbs: 22, fat: 2, calories: 202, vegan: false, goals: ["perte","seche"] },
    { name: "3 oeufs durs + 2 tranches pain seigle + 1 tomate (120g)", protein: 22, carbs: 28, fat: 12, calories: 284, vegan: false, goals: ["perte","maintenance"] },
    { name: "80g avoine + 200ml lait + 15g graines lin + 1 pomme (150g)", protein: 12, carbs: 65, fat: 8, calories: 380, vegan: true, goals: ["maintenance","masse"] },
    { name: "2 tranches pain complet + 100g ricotta + 50g framboises", protein: 14, carbs: 35, fat: 10, calories: 290, vegan: false, goals: ["maintenance","perte"] },
    { name: "200g yaourt soja + 40g granola + 100g mangue", protein: 10, carbs: 55, fat: 6, calories: 314, vegan: true, goals: ["maintenance","masse"] },
    { name: "30g whey + 200ml lait + 1 banane + 20g beurre cacahuète (shake matin)", protein: 40, carbs: 42, fat: 12, calories: 436, vegan: false, goals: ["masse","seche"] },
  ],
  lunch: [
    { name: "150g poulet grillé + 80g riz cru cuit + 200g brocolis vapeur", protein: 48, carbs: 58, fat: 5, calories: 469, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "150g steak haché 5% + 200g patate douce + 150g haricots verts", protein: 38, carbs: 44, fat: 8, calories: 404, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "150g saumon + 80g quinoa cru cuit + 100g épinards sautés", protein: 42, carbs: 40, fat: 20, calories: 504, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "160g thon au naturel + 2 oeufs durs + 100g haricots verts + 10 olives (salade niçoise)", protein: 48, carbs: 8, fat: 18, calories: 386, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "150g lentilles cuites + 80g riz complet cuit + sauce curry légère", protein: 22, carbs: 68, fat: 4, calories: 396, vegan: true, goals: ["masse","maintenance","perte"] },
    { name: "150g poulet + 80g riz jasmin cuit + 100g edamame + sauce teriyaki", protein: 50, carbs: 65, fat: 8, calories: 536, vegan: false, goals: ["masse","maintenance"] },
    { name: "1 grande tortilla + 130g thon + 1/2 avocat (75g) + 80g salade", protein: 34, carbs: 38, fat: 18, calories: 450, vegan: false, goals: ["maintenance","masse"] },
    { name: "120g pâtes complètes cuites + 150g bolognaise maison (boeuf 5%)", protein: 42, carbs: 72, fat: 12, calories: 572, vegan: false, goals: ["masse","maintenance"] },
    { name: "180g tofu grillé + 120g nouilles soba + 200g légumes wok", protein: 26, carbs: 55, fat: 12, calories: 436, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "150g poulet + 1 avocat (150g) + 200g patate douce rôtie", protein: 44, carbs: 38, fat: 20, calories: 508, vegan: false, goals: ["masse","seche"] },
    { name: "200g pois chiches + 80g feta + 1 concombre (200g) + huile olive", protein: 20, carbs: 40, fat: 18, calories: 398, vegan: false, goals: ["perte","maintenance"] },
    { name: "180g cabillaud vapeur + 200g légumes vapeur + 80g riz basmati cuit", protein: 38, carbs: 48, fat: 3, calories: 371, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "150g tofu + 100g pois chiches + 200g légumes + 2 c.à.s tahini (buddha bowl)", protein: 24, carbs: 52, fat: 18, calories: 466, vegan: true, goals: ["maintenance","perte"] },
    { name: "150g escalope dinde + 200g brocolis + 200g pomme de terre vapeur", protein: 46, carbs: 38, fat: 4, calories: 372, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "180g crevettes sautées + 80g riz jasmin cuit + 200g pak choi", protein: 34, carbs: 55, fat: 6, calories: 410, vegan: false, goals: ["perte","maintenance","masse"] },
    { name: "300ml soupe lentilles corail + 2 tranches pain complet", protein: 20, carbs: 58, fat: 4, calories: 344, vegan: true, goals: ["perte","maintenance"] },
    { name: "180g thon mi-cuit + 150g salade mélangée + 1 c.à.s vinaigrette", protein: 46, carbs: 6, fat: 12, calories: 314, vegan: false, goals: ["seche","perte"] },
    { name: "1 pain complet + 150g steak haché 5% + 100g légumes + 30g sauce maison (burger)", protein: 44, carbs: 58, fat: 14, calories: 546, vegan: false, goals: ["masse","maintenance"] },
    { name: "200g tempeh + 200g patate douce + 100g chou kale sauté", protein: 28, carbs: 42, fat: 10, calories: 370, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "80g riz complet cuit + 2 oeufs pochés + 2 c.à.s sauce soja + graines sésame", protein: 20, carbs: 58, fat: 10, calories: 406, vegan: false, goals: ["maintenance","masse"] },
  ],
  snack: [
    { name: "30g whey + 200ml lait demi-écrémé (shake)", protein: 32, carbs: 12, fat: 5, calories: 221, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "200g fromage blanc 0% + 100g myrtilles", protein: 18, carbs: 16, fat: 0, calories: 136, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "30g amandes + 15g noix de cajou", protein: 8, carbs: 8, fat: 18, calories: 226, vegan: true, goals: ["maintenance","masse"] },
    { name: "200g yaourt grec 0% + 1 c.à.c miel", protein: 18, carbs: 18, fat: 0, calories: 144, vegan: false, goals: ["maintenance","masse","perte"] },
    { name: "2 tranches pain de seigle + 20g beurre de cacahuète", protein: 10, carbs: 30, fat: 10, calories: 250, vegan: true, goals: ["masse","maintenance"] },
    { name: "3 oeufs durs", protein: 18, carbs: 2, fat: 15, calories: 215, vegan: false, goals: ["seche","perte","masse"] },
    { name: "200g cottage cheese + 100g ananas frais", protein: 22, carbs: 18, fat: 2, calories: 178, vegan: false, goals: ["perte","seche"] },
    { name: "1 banane (120g) + 15g beurre amande", protein: 5, carbs: 32, fat: 8, calories: 220, vegan: true, goals: ["masse","maintenance"] },
    { name: "30g whey + 60g avoine + 1 c.à.s miel (barre maison)", protein: 28, carbs: 52, fat: 5, calories: 365, vegan: false, goals: ["masse","maintenance"] },
    { name: "150g skyr nature + 10g graines de lin", protein: 18, carbs: 8, fat: 4, calories: 140, vegan: false, goals: ["perte","seche"] },
    { name: "150g edamame salé (cuit)", protein: 14, carbs: 12, fat: 6, calories: 158, vegan: true, goals: ["perte","seche","maintenance"] },
    { name: "30g whey + 200ml lait + 1 banane + 40g flocons (shake masse)", protein: 38, carbs: 62, fat: 5, calories: 449, vegan: false, goals: ["masse"] },
    { name: "2 crackers seigle + 100g thon au naturel", protein: 22, carbs: 16, fat: 2, calories: 170, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "2 galettes riz + 150g skyr + 50g framboises", protein: 16, carbs: 38, fat: 2, calories: 234, vegan: false, goals: ["maintenance","masse"] },
    { name: "200ml smoothie (100g épinards + 1 banane + 200ml lait végétal)", protein: 5, carbs: 35, fat: 4, calories: 196, vegan: true, goals: ["maintenance","perte"] },
    { name: "40g cacahuètes nature grillées", protein: 10, carbs: 8, fat: 20, calories: 244, vegan: true, goals: ["masse","maintenance"] },
    { name: "200g compote sans sucre + 150g fromage blanc 0%", protein: 14, carbs: 22, fat: 0, calories: 144, vegan: false, goals: ["perte","maintenance"] },
    { name: "1 pomme (150g) + 20g beurre cacahuète", protein: 5, carbs: 28, fat: 10, calories: 218, vegan: true, goals: ["maintenance","perte"] },
    { name: "60g mélange fruits secs + oléagineux (abricot + amande + noix)", protein: 8, carbs: 30, fat: 14, calories: 278, vegan: true, goals: ["masse","maintenance"] },
    { name: "2 oeufs durs + 30g fromage gouda + 1 tomate (120g)", protein: 18, carbs: 6, fat: 14, calories: 222, vegan: false, goals: ["maintenance","seche"] },
  ],
  dinner: [
    { name: "150g saumon au four + 300g légumes rôtis + 80g quinoa cuit", protein: 42, carbs: 35, fat: 18, calories: 474, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "200g poulet rôti + 200g haricots verts + 150g riz complet cuit", protein: 50, carbs: 42, fat: 6, calories: 426, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "180g cabillaud + 200g épinards + 200g patate douce", protein: 38, carbs: 38, fat: 3, calories: 331, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "150g steak boeuf + 300g légumes grillés + 100g lentilles", protein: 48, carbs: 28, fat: 12, calories: 412, vegan: false, goals: ["masse","seche"] },
    { name: "200g tofu + 150g brocolis + 80g riz basmati + sauce soja", protein: 26, carbs: 55, fat: 10, calories: 418, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "120g pâtes + 150g crevettes + 150g courgettes + 1 c.à.s huile olive", protein: 36, carbs: 68, fat: 10, calories: 506, vegan: false, goals: ["masse","maintenance"] },
    { name: "3 oeufs + 100g blanc poulet + 150g légumes poêlés (omelette)", protein: 44, carbs: 8, fat: 18, calories: 366, vegan: false, goals: ["seche","perte","masse"] },
    { name: "150g thon + 200g salade + 80g pois chiches + 1 c.à.s huile", protein: 42, carbs: 22, fat: 14, calories: 382, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "200g tempeh + 200g légumes wok + 80g nouilles de riz", protein: 30, carbs: 52, fat: 12, calories: 436, vegan: true, goals: ["masse","maintenance"] },
    { name: "150g escalope veau + 200g ratatouille + 80g semoule", protein: 40, carbs: 38, fat: 8, calories: 388, vegan: false, goals: ["maintenance","masse"] },
    { name: "200g moules + 150g frites four + 100g salade", protein: 28, carbs: 38, fat: 6, calories: 318, vegan: false, goals: ["maintenance","perte"] },
    { name: "150g poulet + 200g brocolis + 150g riz chou-fleur (seche)", protein: 46, carbs: 12, fat: 5, calories: 277, vegan: false, goals: ["seche","perte"] },
    { name: "200g lentilles + 100g carottes + 50g oignons + épices (dahl)", protein: 20, carbs: 52, fat: 4, calories: 324, vegan: true, goals: ["maintenance","perte","masse"] },
    { name: "180g crevettes + 200g courgettes + 80g quinoa + citron", protein: 36, carbs: 38, fat: 5, calories: 341, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "150g filet merlu + 200g haricots verts + 80g riz complet", protein: 36, carbs: 42, fat: 3, calories: 339, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "3 oeufs + 200g épinards + 80g feta (salade chaude)", protein: 30, carbs: 6, fat: 22, calories: 342, vegan: false, goals: ["seche","maintenance"] },
    { name: "150g seitan + 200g poivrons rôtis + 80g boulgour", protein: 38, carbs: 48, fat: 6, calories: 398, vegan: true, goals: ["masse","maintenance"] },
    { name: "200g sardines + 150g salade + 2 tranches pain complet", protein: 36, carbs: 28, fat: 16, calories: 396, vegan: false, goals: ["maintenance","masse","perte"] },
    { name: "150g blanc dinde + 200g champignons + 100g riz sauvage", protein: 44, carbs: 35, fat: 3, calories: 343, vegan: false, goals: ["seche","perte","masse"] },
    { name: "200g pois chiches rôtis + 200g légumes four + 80g quinoa + harissa", protein: 22, carbs: 62, fat: 8, calories: 408, vegan: true, goals: ["maintenance","masse","perte"] },
  ],
};

function getTemporalIntelligence(today, history, goals) {
  const now = new Date(); const hour = now.getHours(); const minute = now.getMinutes();
  const timeDecimal = hour + minute / 60; const insights = [];
  const protGoal = goals.find(g => g.sourceId === "proteines");
  const protTarget = protGoal ? Number(protGoal.target) : 150;
  const protCurrent = today.nutrition.protein || 0; const protRemaining = protTarget - protCurrent;
  if (protCurrent > 0 || protTarget > 0) {
    const pct = Math.round((protCurrent / protTarget) * 100);
    if (pct >= 100) insights.push({ type: "success", msg: `Objectif proteines atteint ! ${protCurrent}g`, priority: 1 });
    else if (pct >= 75) insights.push({ type: "success", msg: `${pct}% des proteines ! Plus que ${protRemaining}g.`, priority: 2 });
    else if (pct >= 50) insights.push({ type: "advice", msg: `Mi-chemin proteines (${protCurrent}/${protTarget}g). Bon rythme !`, priority: 3 });
    else if (protCurrent > 0) {
      if (timeDecimal >= 22) insights.push({ type: "warning", msg: `22h : ${protRemaining}g restants. Max une collation legere avant 23h.`, priority: 1, suggestions: getMealSuggestions(Math.min(protRemaining, 25), hour) });
      else if (timeDecimal >= 20) insights.push({ type: "advice", msg: `${protCurrent}g/${protTarget}g : ${protRemaining}g restants. Dernier repas maintenant.`, priority: 2, suggestions: getMealSuggestions(protRemaining, hour) });
      else insights.push({ type: "advice", msg: `${protCurrent}g/${protTarget}g : ${protRemaining}g restants. Tu as le temps !`, priority: 4, suggestions: protRemaining > 40 ? getMealSuggestions(protRemaining, hour) : [] });
    }
  }
  const waterTarget = 2.5; const waterCurrent = today.nutrition.water || 0; const waterRemaining = waterTarget - waterCurrent;
  if (waterCurrent > 0 && waterRemaining > 0) {
    if (timeDecimal >= 21) insights.push({ type: "warning", msg: `${waterRemaining.toFixed(1)}L restants. Apres 21h, boire trop perturbe le sommeil.`, priority: 2 });
    else { const hoursLeft = 21 - timeDecimal; const rateNeeded = waterRemaining / hoursLeft; if (rateNeeded > 0.5) insights.push({ type: "advice", msg: `Bois ~${(rateNeeded * 0.5).toFixed(1)}L toutes les 30min pour atteindre ${waterTarget}L avant 21h.`, priority: 5 }); }
  }
  if (timeDecimal >= 21 && timeDecimal < 23) insights.push({ type: "info", msg: `Si tu dors a 23h, reveil 7h = 8h de sommeil. Ideal ! Commence ta routine soir.`, priority: 3 });
  const currentScore = today.score; const potentialExtra = [];
  if (!today.nutrition.breakfast) potentialExtra.push(4); if (!today.nutrition.lunch) potentialExtra.push(4); if (!today.nutrition.dinner) potentialExtra.push(4);
  if (today.nutrition.water < 2.5 && timeDecimal < 21) potentialExtra.push(5);
  if (!today.mind.meditation && timeDecimal < 23) potentialExtra.push(5); if (!today.mind.reading && timeDecimal < 23) potentialExtra.push(5);
  const maxPossible = currentScore + potentialExtra.reduce((a, b) => a + b, 0);
  if (timeDecimal >= 18 && maxPossible > currentScore) insights.push({ type: "info", msg: `Score actuel : ${currentScore}/100. Potentiel ce soir : ${Math.min(100, maxPossible)}/100 !`, priority: 4 });
  return insights.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

const DATA_SOURCES = [
  { id: "manual", label: "Manuel", unit: "", path: null },
  { id: "patrimoine", label: "Patrimoine total", unit: "€", path: "patrimoine_total" },
  { id: "poids", label: "Poids", unit: "kg", path: "body.weight" },
  { id: "proteines", label: "Proteines/jour", unit: "g", path: "nutrition.protein", isDaily: true },
  { id: "eau", label: "Eau/jour", unit: "L", path: "nutrition.water", isDaily: true },
  { id: "sport_duree", label: "Duree sport/seance", unit: "min", path: "sport.duration", isDaily: true },
  { id: "running_dist", label: "Distance running", unit: "km", path: "sport.running.distance", isDaily: true },
  { id: "score", label: "Score global/jour", unit: "", path: "score", isDaily: true },
  { id: "humeur", label: "Humeur/jour", unit: "/5", path: "mind.mood", isDaily: true },
  { id: "lecture", label: "Lecture/jour", unit: "p", path: "mind.reading", isDaily: true },
  { id: "screen", label: "Temps ecran/jour", unit: "h", path: "work.screenTime", isDaily: true, reverse: true },
  { id: "focus", label: "Focus/jour", unit: "/5", path: "work.focus", isDaily: true },
];

const getNestedVal = (obj, path) => path?.split(".").reduce((o, k) => o?.[k] ?? 0, obj) ?? 0;
const calcAge = (dob) => { if (!dob) return null; const today = new Date(); const birth = new Date(dob); let age = today.getFullYear() - birth.getFullYear(); if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--; return age; };
function calcDuration(bed, wake) { if (!bed || !wake) return 0; const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number); let diff = (wh * 60 + wm) - (bh * 60 + bm); if (diff < 0) diff += 24 * 60; return Math.round(diff / 6) / 10; }

function calcSleepScore(sleep, age, recentBedtimeMins = [], yesterdayHadSport = false) {
  const dur = sleep.duration || 0;
  const quality = sleep.quality || 0;
  const hasQuality = quality > 0;

  // Age-based optimal zone [optMin, optMax, highMax]
  let optMin = 7, optMax = 9, highMax = 10;
  if (age !== null && age !== undefined) {
    if (age >= 65)             { optMin = 7;   optMax = 8.5; highMax = 9.5; }
    else if (age < 14)         { optMin = 9;   optMax = 11;  highMax = 12;  }
    else if (age < 18)         { optMin = 8;   optMax = 10;  highMax = 11;  }
  }

  // Duration status
  let durationStatus, durationColor;
  if (!dur)                           { durationStatus = null;              durationColor = "#6B6B6B"; }
  else if (dur < 5)                   { durationStatus = "Très insuffisant"; durationColor = "#CC2936"; }
  else if (dur < optMin - 0.5)        { durationStatus = "Insuffisant";      durationColor = "#CC2936"; }
  else if (dur < optMin)              { durationStatus = "Légèrement bas";   durationColor = "#D4580A"; }
  else if (dur <= optMax)             { durationStatus = "Optimal";          durationColor = "#1A7A4A"; }
  else if (dur <= highMax)            { durationStatus = "Élevé";            durationColor = "#D4580A"; }
  else if (dur <= highMax + 1)        { durationStatus = "Long";             durationColor = "#D4580A"; }
  else                                { durationStatus = "Inhabituel";       durationColor = "#6B35C8"; }

  // Duration component (0–40 pts) — sport de la veille assouplit les nuits longues
  let dScore;
  if (!dur)                     dScore = 0;
  else if (dur < 5)             dScore = 3;
  else if (dur < optMin - 0.5)  dScore = 13;
  else if (dur < optMin)        dScore = 26;
  else if (dur <= optMax)       dScore = 40;
  else if (dur <= highMax)      dScore = yesterdayHadSport ? 36 : 28;
  else if (dur <= highMax + 1)  dScore = yesterdayHadSport ? 25 : 15;
  else                          dScore = yesterdayHadSport ? 16 : 6;

  // Quality component (0–20 pts)
  const qScore = hasQuality ? Math.round((quality / 5) * 20) : 0;

  // Regularity component (0–25 pts)
  let rScore = 0, isIrregular = false;
  if (recentBedtimeMins.length >= 3) {
    const variance = Math.max(...recentBedtimeMins) - Math.min(...recentBedtimeMins);
    if (variance <= 30)       rScore = 25;
    else if (variance <= 60)  rScore = 18;
    else if (variance <= 90)  rScore = 10;
    else                      { rScore = 3; isIrregular = true; }
  }

  // Context component (0–15 pts)
  const cScore = dur > 0 ? (yesterdayHadSport ? 12 : 8) : 0;

  // Weighted total — redistribuer les poids manquants
  let score = 0;
  if (dur > 0) {
    let totalW = 40, weightedSum = dScore;
    if (hasQuality)                   { totalW += 20; weightedSum += qScore; }
    if (recentBedtimeMins.length >= 3) { totalW += 25; weightedSum += rScore; }
    totalW += 15; weightedSum += cScore;
    score = Math.min(100, Math.max(0, Math.round((weightedSum / totalW) * 100)));
  }

  // Messages nuancés
  let message = "", advice = "";
  if (dur < 5) {
    message = "Votre durée de sommeil est très basse. Une récupération complète nécessite plus de repos.";
    advice = "Essayez de vous coucher 1 à 2h plus tôt ce soir.";
  } else if (durationStatus === "Insuffisant") {
    message = (hasQuality && quality >= 4)
      ? "Votre ressenti est positif, mais la durée reste basse pour une récupération complète."
      : "Votre sommeil est un peu court pour votre tranche d'âge.";
    advice = "Visez 30 minutes supplémentaires progressivement.";
  } else if (durationStatus === "Légèrement bas") {
    message = "Durée légèrement en dessous de la zone recommandée, mais correct pour la plupart des nuits.";
    advice = "Couchez-vous 15 à 30 minutes plus tôt si possible.";
  } else if (durationStatus === "Optimal") {
    if (isIrregular) {
      message = "Bonne durée de sommeil, mais vos horaires sont irréguliers. La régularité améliore la qualité de récupération.";
      advice = "Essayez de maintenir une heure de coucher similaire chaque soir.";
    } else if (hasQuality && quality >= 4) {
      message = "Votre nuit est dans une bonne zone de récupération et votre ressenti confirme cela.";
      advice = "Continuez à maintenir ces horaires réguliers.";
    } else {
      message = "Votre durée de sommeil est dans la zone optimale pour votre tranche d'âge.";
      advice = "Gardez une heure de coucher similaire ce soir.";
    }
  } else if (durationStatus === "Élevé") {
    message = yesterdayHadSport
      ? "Sommeil long, cohérent avec un besoin de récupération plus élevé après l'effort d'hier."
      : "Votre durée de sommeil est un peu élevée. Cela peut être normal ponctuellement.";
    advice = "Si cela se répète sans activité intense, vérifiez votre rythme de coucher.";
  } else if (durationStatus === "Long") {
    message = "Votre sommeil est long aujourd'hui. Cela peut arriver après une grande fatigue, mais à surveiller si cela se répète.";
    advice = "Exposez-vous à la lumière naturelle le matin pour aider à réguler votre rythme.";
  } else if (durationStatus === "Inhabituel") {
    message = "Durée très inhabituelle. Cela peut arriver après une forte dette de sommeil. Si cela se répète, il peut être utile d'en parler à un professionnel.";
    advice = "Maintenez des horaires réguliers pour retrouver un rythme stable.";
  }

  // Note sur la qualité des données
  let dataNote = null;
  if (dur > 0 && !hasQuality && recentBedtimeMins.length < 3) {
    dataNote = "Analyse basée uniquement sur la durée. Ajoutez votre ressenti pour une estimation plus précise.";
  } else if (dur > 0 && !hasQuality) {
    dataNote = "Ajoutez votre ressenti pour affiner l'analyse.";
  }

  return { score, durationStatus, durationColor, message, advice, dataNote, isIrregular, optMin, optMax };
}

function calcScore(day) {
  let s = 0; const sl = day.sleep;
  const d = sl.duration;
  if (d >= 7 && d <= 9) s += 25;
  else if ((d >= 6.5 && d < 7) || (d > 9 && d <= 10)) s += 18;
  else if ((d >= 6 && d < 6.5) || (d > 10 && d <= 11)) s += 10;
  else if (d > 11) s += 5;
  if (sl.quality >= 4) s += 5; if (sl.noScreen) s += 3;
  const sp = day.sport;
  if (sp.isRest) { s += 10; if (sp.stretching) s += 5; } else { if (sp.duration >= 45) s += 15; else if (sp.duration >= 30) s += 10; if (sp.intensity >= 3) s += 5; }
  const n = day.nutrition;
  if (n.breakfast) s += 4; if (n.lunch) s += 4; if (n.dinner) s += 4;
  if (n.water >= 2.5) s += 5; else if (n.water >= 2) s += 3;
  if (n.protein >= 150) s += 5; else if (n.protein >= 120) s += 3; if (!n.junk) s += 3;
  if (day.work.focus >= 4) s += 10; else if (day.work.focus >= 3) s += 6;
  if (day.work.tasks > 0 && day.work.tasksCompleted >= day.work.tasks) s += 5;
  if (day.work.screenTime > 0 && day.work.screenTime <= 3) s += 3; else if (day.work.screenTime > 5) s -= 5;
  const m = day.mind; if (m.mood >= 4) s += 5; if (m.reading >= 20) s += 5; if (m.meditation) s += 5;
  return Math.max(0, Math.min(100, s));
}

const calcGoalProgress = (goal, history, patrimoineTotal) => {
  if (!goal.sourceId || goal.sourceId === "manual") return goal.manualProgress || 0;
  const src = DATA_SOURCES.find(s => s.id === goal.sourceId); if (!src) return goal.manualProgress || 0;
  const target = Number(goal.target) || 1;
  const start = goal.startDate ? new Date(goal.startDate) : new Date(); const end = goal.endDate ? new Date(goal.endDate) : new Date();
  if (src.id === "patrimoine") return Math.min(100, Math.max(0, Math.round((patrimoineTotal / target) * 100)));
  const relevantDays = history.filter(d => { const dd = new Date(d.date); return dd >= start && dd <= end; });
  if (src.isDaily) {
    if (!relevantDays.length) return 0; let ok = 0;
    relevantDays.forEach(d => { const val = getNestedVal(d, src.path); if (goal.reverse) { if (val > 0 && val <= target) ok++; } else { if (val >= target) ok++; } });
    return Math.min(100, Math.round((ok / relevantDays.length) * 100));
  } else {
    const lastEntry = [...history].reverse().find(d => getNestedVal(d, src.path) > 0);
    const val = lastEntry ? getNestedVal(lastEntry, src.path) : 0;
    if (goal.reverse) { const sv = goal.startValue || val; return Math.min(100, Math.max(0, Math.round(((sv - val) / (sv - target)) * 100))); }
    return Math.min(100, Math.max(0, Math.round((val / target) * 100)));
  }
};

function getIntelligence(history, totalPatrimoine, goals) {
  const last7 = history.slice(-7); const last14 = history.slice(-14); const last3 = history.slice(-3); const prev7 = history.slice(-14, -7);
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
  if (consecutiveSport >= 3) { alerts.push({ type: "warning", msg: `${consecutiveSport} jours consecutifs : repos actif recommande.` }); todayRec = "rest"; }
  else if (avgRecovery < 2.5) alerts.push({ type: "warning", msg: "Recuperation faible ces derniers jours." });
  if (avgSleep < 6.5) alerts.push({ type: "danger", msg: "Moins de 6h30 en moyenne. Performances -20%." });
  else if (avgSleep < 7) alerts.push({ type: "warning", msg: "Sommeil insuffisant. Couche-toi 30min plus tot." });
  if (bedVariance > 90) alerts.push({ type: "warning", msg: `Heure de coucher irreguliere (+/-${Math.round(bedVariance / 60)}h).` });
  if (avgScreen > 5) alerts.push({ type: "warning", msg: `${Math.round(avgScreen)}h d'ecran/jour : sommeil degrade.` });
  if (!todayRec && lastSportType) { const ppl = ["Push", "Pull", "Legs"]; const lastIdx = ppl.findIndex(x => lastSportType.includes(x)); if (lastIdx >= 0) { todayRec = `PPL ${ppl[(lastIdx + 1) % 3]}`; } }
  // Fatigue
  const avgRecovery3 = last3.filter(d => d.sport?.recovery > 0).reduce((a, b, _, arr) => a + b.sport.recovery / arr.length, 0);
  if (!todayRec && avgRecovery3 > 0 && avgRecovery3 < 2.5) { todayRec = "rest"; alerts.push({ type: "warning", msg: `Recuperation faible (${avgRecovery3.toFixed(1)}/5) : repos ou seance legere recommande.` }); }
  else if (!todayRec && avgRecovery3 >= 2.5 && avgRecovery3 < 3.5) { todayRec = "Seance legere recommandee (intensite reduite)"; }
  // Running progressif
  const runDists = history.filter(d => d.sport?.running?.distance > 0).slice(-4).map(d => d.sport.running.distance);
  if (!todayRec && runDists.length >= 2) { const avgDist = runDists.reduce((a, b) => a + b, 0) / runDists.length; const suggestedDist = Math.round((avgDist * 1.05) * 10) / 10; todayRec = `Running : objectif ${suggestedDist}km (+5% progression)`; }
  const patterns = [];
  const sportDays = last14.filter(d => d.sport?.duration >= 30); const noSportDays = last14.filter(d => !d.sport?.duration || d.sport.duration < 30);
  const sportSleepAvg = sportDays.length > 2 ? sportDays.reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0) : 0;
  const noSportSleepAvg = noSportDays.length > 2 ? noSportDays.reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0) : 0;
  if (sportSleepAvg > 0 && noSportSleepAvg > 0 && sportSleepAvg - noSportSleepAvg > 0.4) patterns.push(`Tu dors ${(sportSleepAvg - noSportSleepAvg).toFixed(1)}h de plus les jours de sport.`);
  const avgWater = last3.filter(d => d.nutrition?.water > 0).reduce((a, b, _, arr) => a + b.nutrition.water / arr.length, 0);
  if (avgWater < 2 && avgWater > 0) advice.push("Hydratation insuffisante ces 3 jours.");
  if (avgMood < 3 && avgMood > 0) advice.push("Moral en baisse. 5min coherence cardiaque.");
  let patrimoinePrediction = null;
  const patrimoineGoal = goals?.find(g => g.sourceId === "patrimoine");
  if (patrimoineGoal && totalPatrimoine > 0) {
    const ph = history.filter(d => d.money?.invested > 0);
    const avgMonthly = ph.length > 0 ? ph.reduce((a, b, _, arr) => a + b.money.invested / arr.length, 0) * 30 : 0;
    if (avgMonthly > 0) { const target = Number(patrimoineGoal.target) || 100000; const remaining = target - totalPatrimoine; const months = Math.ceil(remaining / (avgMonthly * 1.08 / 12)); patrimoinePrediction = `A ce rythme (+${Math.round(avgMonthly)}€/mois), objectif ${target.toLocaleString("fr-FR")}€ dans ~${(months / 12).toFixed(1)} ans.`; }
  }
  let todayPrediction = null;
  if (last7.length >= 3) { const recentAvg = last7.slice(-3).filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0); if (recentAvg > 0) todayPrediction = `Score fin de semaine estime : ~${Math.round(recentAvg)}/100`; }
  const scoreAvg = Math.round(avgScore7);
  return { alerts, advice, todayRec, consecutiveSport, avgSleep, avgScreen, scoreAvg, scoreDelta, patterns, patrimoinePrediction, todayPrediction };
}

const defaultDay = () => ({
  date: new Date().toISOString().split("T")[0],
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0, noScreen: false },
  sport: { type: "", duration: 0, intensity: 0, notes: "", isRest: false, stretching: false, running: { did: false, distance: 0, time: 0 }, recovery: 0, bodyFat: 0, muscleMass: 0, photoUrl: "", sessionName: "", heartRate: 0, heartRateMax: 0, scoreFor: 0, scoreAgainst: 0, footballType: "", tennisType: "", tennisScore: "", tennisOpponent: "", tennisResult: "", boxeType: "", boxeRounds: 0, boxeRoundDuration: 0 },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, calories: 0, fat: 0, carbs: 0, junk: false },
  body: { weight: 0, weightTarget: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "", screenTime: 0 },
  money: { income: 0, expense: 0, invested: 0, note: "" },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

const defaultPatrimoine = () => ([
  { id: 1, name: "Compte courant", amount: 0, color: "#2563eb" },
  { id: 2, name: "Livret A", amount: 0, color: "#16a34a" },
]);

const PRIORITIES = [
  { id: "sport", label: "Sport & Recuperation", icon: "💪", color: "#CC2936" },
  { id: "finance", label: "Finance & Patrimoine", icon: "💰", color: "#1A7A4A" },
  { id: "mental", label: "Mental & Lecture", icon: "🧠", color: "#6B35C8" },
  { id: "nutrition", label: "Nutrition", icon: "🥗", color: "#D4580A" },
  { id: "business", label: "Business & Travail", icon: "🎯", color: "#1E5FCC" },
  { id: "running", label: "Running", icon: "🏃", color: "#0891b2" },
  { id: "body", label: "Composition corporelle", icon: "⚖️", color: "#D4580A" },
  { id: "sleep", label: "Sommeil", icon: "🌙", color: "#6B35C8" },
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

const TRANSLATIONS = {
  fr: {
    nav_today:"Accueil",nav_track:"Tracker",nav_money:"Argent",nav_goals:"Objectifs",nav_stats:"Stats",nav_profile:"Profil",
    tab_sleep:"Sommeil",tab_sport:"Sport",tab_nutrition:"Nutrition",tab_body:"Corps",tab_work:"Travail",tab_todo:"To-Do",tab_mind:"Mental",
    hello:"Bonjour",save_day:"Sauvegarder la journée",saved:"Sauvegardé !",
    today_balance:"Équilibre du jour",today_goals:"Objectifs en cours",today_intel:"Intelligence · Maintenant",today_week:"Semaine vs précédente",today_nogoals:"Aucun objectif. Créez-en un dans Objectifs.",
    sleep_schedule:"Horaires",sleep_quality:"Qualité",sleep_bedtime:"Coucher",sleep_wakeup:"Réveil",sleep_noscreen:"Pas d'écran 30min avant de dormir",sleep_optimal:"Optimal",sleep_ok:"Correct, visez 7h30+",sleep_insufficient:"Insuffisant",
    sport_type:"Type d'activité",sport_recovery:"Récupération",sport_photo:"Photo de progression",sport_import_photo:"📷 Importer une photo",
    nutr_goals_title:"Objectifs nutritionnels",nutr_meals_day:"Repas du jour",nutr_macros:"Macros du jour",nutr_suggest:"Idées repas",nutr_breakfast:"Petit-déjeuner",nutr_lunch:"Déjeuner",nutr_snack:"Collation",nutr_dinner:"Dîner",
    body_weight_sec:"Poids & objectif",body_measures:"Mensurations",body_current:"Poids actuel (kg)",body_target:"Objectif poids (kg)",body_chest:"Poitrine (cm)",body_waist:"Taille (cm)",body_hips:"Hanches (cm)",body_arms:"Bras (cm)",body_thighs:"Cuisses (cm)",
    work_focus_sec:"Focus & Productivité",work_tasks:"Tâches",work_tasks_planned:"Prévues",work_tasks_done:"Faites",work_highlight:"Highlight du jour",work_screen:"Temps d'écran",work_screen_hours:"Heures aujourd'hui",
    mind_mood_day:"Humeur du jour",mind_dev:"Développement",mind_reading:"Lecture (pages)",mind_meditation:"Méditation / Cohérence cardiaque",mind_skill:"Compétence travaillée",mind_gratitude:"Gratitude du jour",
    todo_new:"Nouvelle tâche",todo_placeholder:"Ajouter une tâche...",todo_today:"Aujourd'hui",todo_older:"Anciennes",
    money_total:"Patrimoine total",money_split:"Répartition",money_pockets:"Mes poches",
    sec_account:"Compte",sec_goals:"Objectifs",sec_devices:"Appareils connectés",sec_notif:"Notifications",sec_appearance:"Apparence",sec_privacy:"Confidentialité & Sécurité",sec_ai:"IA & Analyses",sec_subscription:"Abonnement",sec_support:"Aide & Support",sec_about:"À propos",
    row_info:"Informations personnelles",row_info_desc:"Prénom, photo, date de naissance",row_email:"Adresse email",row_password:"Mot de passe",row_password_desc:"Modifier le mot de passe",row_phone:"Numéro de téléphone",row_phone_add:"Ajouter un numéro",row_lang:"Langue",row_logout:"Déconnexion",row_logout_desc:"Retour à l'écran de connexion",
    row_darkmode_on:"Mode clair",row_darkmode_off:"Mode sombre",row_textsize:"Taille du texte",row_anim:"Animations",row_compact:"Dashboard compact",
    settings_title:"Paramètres",settings_edit:"Modifier ›",pro_member:"⭐ Membre Pro",free_member:"Membre Gratuit",
    stats_title:"Statistiques",profile_settings:"Paramètres",
  },
  en: {
    nav_today:"Home",nav_track:"Tracker",nav_money:"Money",nav_goals:"Goals",nav_stats:"Stats",nav_profile:"Profile",
    tab_sleep:"Sleep",tab_sport:"Sport",tab_nutrition:"Nutrition",tab_body:"Body",tab_work:"Work",tab_todo:"To-Do",tab_mind:"Mind",
    hello:"Hello",save_day:"Save the day",saved:"Saved!",
    today_balance:"Day Balance",today_goals:"Active Goals",today_intel:"Intelligence · Now",today_week:"Week vs previous",today_nogoals:"No goals yet. Create one in Goals.",
    sleep_schedule:"Schedule",sleep_quality:"Quality",sleep_bedtime:"Bedtime",sleep_wakeup:"Wake up",sleep_noscreen:"No screen 30min before sleep",sleep_optimal:"Optimal",sleep_ok:"Good, aim for 7h30+",sleep_insufficient:"Insufficient",
    sport_type:"Activity type",sport_recovery:"Recovery",sport_photo:"Progress photo",sport_import_photo:"📷 Import a photo",
    nutr_goals_title:"Nutritional goals",nutr_meals_day:"Today's meals",nutr_macros:"Today's macros",nutr_suggest:"Meal ideas",nutr_breakfast:"Breakfast",nutr_lunch:"Lunch",nutr_snack:"Snack",nutr_dinner:"Dinner",
    body_weight_sec:"Weight & goal",body_measures:"Measurements",body_current:"Current weight (kg)",body_target:"Target weight (kg)",body_chest:"Chest (cm)",body_waist:"Waist (cm)",body_hips:"Hips (cm)",body_arms:"Arms (cm)",body_thighs:"Thighs (cm)",
    work_focus_sec:"Focus & Productivity",work_tasks:"Tasks",work_tasks_planned:"Planned",work_tasks_done:"Done",work_highlight:"Highlight of the day",work_screen:"Screen time",work_screen_hours:"Hours today",
    mind_mood_day:"Today's mood",mind_dev:"Development",mind_reading:"Reading (pages)",mind_meditation:"Meditation / Cardiac coherence",mind_skill:"Skill worked on",mind_gratitude:"Today's gratitude",
    todo_new:"New task",todo_placeholder:"Add a task...",todo_today:"Today",todo_older:"Older",
    money_total:"Total wealth",money_split:"Breakdown",money_pockets:"My pockets",
    sec_account:"Account",sec_goals:"Goals",sec_devices:"Connected devices",sec_notif:"Notifications",sec_appearance:"Appearance",sec_privacy:"Privacy & Security",sec_ai:"AI & Analytics",sec_subscription:"Subscription",sec_support:"Help & Support",sec_about:"About",
    row_info:"Personal information",row_info_desc:"Name, photo, date of birth",row_email:"Email address",row_password:"Password",row_password_desc:"Change password",row_phone:"Phone number",row_phone_add:"Add a number",row_lang:"Language",row_logout:"Log out",row_logout_desc:"Back to login screen",
    row_darkmode_on:"Light mode",row_darkmode_off:"Dark mode",row_textsize:"Text size",row_anim:"Animations",row_compact:"Compact dashboard",
    settings_title:"Settings",settings_edit:"Edit ›",pro_member:"⭐ Pro Member",free_member:"Free Member",
    stats_title:"Statistics",profile_settings:"Settings",
  },
  es: {
    nav_today:"Inicio",nav_track:"Tracker",nav_money:"Dinero",nav_goals:"Objetivos",nav_stats:"Stats",nav_profile:"Perfil",
    tab_sleep:"Sueño",tab_sport:"Deporte",tab_nutrition:"Nutrición",tab_body:"Cuerpo",tab_work:"Trabajo",tab_todo:"Tareas",tab_mind:"Mente",
    hello:"Hola",save_day:"Guardar el día",saved:"¡Guardado!",
    today_balance:"Equilibrio del día",today_goals:"Objetivos activos",today_intel:"Inteligencia · Ahora",today_week:"Semana vs anterior",today_nogoals:"Sin objetivos. Crea uno en Objetivos.",
    sleep_schedule:"Horario",sleep_quality:"Calidad",sleep_bedtime:"Acostarse",sleep_wakeup:"Despertar",sleep_noscreen:"Sin pantallas 30min antes de dormir",sleep_optimal:"Óptimo",sleep_ok:"Bien, apunta a 7h30+",sleep_insufficient:"Insuficiente",
    sport_type:"Tipo de actividad",sport_recovery:"Recuperación",sport_photo:"Foto de progreso",sport_import_photo:"📷 Importar foto",
    nutr_goals_title:"Objetivos nutricionales",nutr_meals_day:"Comidas del día",nutr_macros:"Macros del día",nutr_suggest:"Ideas de comidas",nutr_breakfast:"Desayuno",nutr_lunch:"Almuerzo",nutr_snack:"Merienda",nutr_dinner:"Cena",
    body_weight_sec:"Peso & objetivo",body_measures:"Medidas",body_current:"Peso actual (kg)",body_target:"Peso objetivo (kg)",body_chest:"Pecho (cm)",body_waist:"Cintura (cm)",body_hips:"Caderas (cm)",body_arms:"Brazos (cm)",body_thighs:"Muslos (cm)",
    work_focus_sec:"Enfoque & Productividad",work_tasks:"Tareas",work_tasks_planned:"Previstas",work_tasks_done:"Hechas",work_highlight:"Logro del día",work_screen:"Tiempo de pantalla",work_screen_hours:"Horas hoy",
    mind_mood_day:"Humor del día",mind_dev:"Desarrollo",mind_reading:"Lectura (páginas)",mind_meditation:"Meditación / Coherencia cardíaca",mind_skill:"Habilidad trabajada",mind_gratitude:"Gratitud del día",
    todo_new:"Nueva tarea",todo_placeholder:"Añadir tarea...",todo_today:"Hoy",todo_older:"Antiguas",
    money_total:"Patrimonio total",money_split:"Distribución",money_pockets:"Mis bolsillos",
    sec_account:"Cuenta",sec_goals:"Objetivos",sec_devices:"Dispositivos conectados",sec_notif:"Notificaciones",sec_appearance:"Apariencia",sec_privacy:"Privacidad & Seguridad",sec_ai:"IA & Análisis",sec_subscription:"Suscripción",sec_support:"Ayuda & Soporte",sec_about:"Acerca de",
    row_info:"Información personal",row_info_desc:"Nombre, foto, fecha de nacimiento",row_email:"Correo electrónico",row_password:"Contraseña",row_password_desc:"Cambiar contraseña",row_phone:"Número de teléfono",row_phone_add:"Añadir número",row_lang:"Idioma",row_logout:"Cerrar sesión",row_logout_desc:"Volver al inicio de sesión",
    row_darkmode_on:"Modo claro",row_darkmode_off:"Modo oscuro",row_textsize:"Tamaño del texto",row_anim:"Animaciones",row_compact:"Panel compacto",
    settings_title:"Ajustes",settings_edit:"Editar ›",pro_member:"⭐ Miembro Pro",free_member:"Miembro Gratuito",
    stats_title:"Estadísticas",profile_settings:"Ajustes",
  },
  de: {
    nav_today:"Start",nav_track:"Tracker",nav_money:"Geld",nav_goals:"Ziele",nav_stats:"Stats",nav_profile:"Profil",
    tab_sleep:"Schlaf",tab_sport:"Sport",tab_nutrition:"Ernährung",tab_body:"Körper",tab_work:"Arbeit",tab_todo:"To-Do",tab_mind:"Mental",
    hello:"Hallo",save_day:"Tag speichern",saved:"Gespeichert!",
    today_balance:"Tagesbalance",today_goals:"Aktive Ziele",today_intel:"Intelligenz · Jetzt",today_week:"Woche vs. vorherige",today_nogoals:"Keine Ziele. Erstelle eines unter Ziele.",
    sleep_schedule:"Zeiten",sleep_quality:"Qualität",sleep_bedtime:"Schlafenszeit",sleep_wakeup:"Aufwachzeit",sleep_noscreen:"Kein Bildschirm 30min vor dem Schlafen",sleep_optimal:"Optimal",sleep_ok:"Gut, ziele auf 7h30+",sleep_insufficient:"Unzureichend",
    sport_type:"Aktivitätstyp",sport_recovery:"Erholung",sport_photo:"Fortschrittsfoto",sport_import_photo:"📷 Foto importieren",
    nutr_goals_title:"Ernährungsziele",nutr_meals_day:"Mahlzeiten heute",nutr_macros:"Heutige Makros",nutr_suggest:"Mahlzeiten-Ideen",nutr_breakfast:"Frühstück",nutr_lunch:"Mittagessen",nutr_snack:"Snack",nutr_dinner:"Abendessen",
    body_weight_sec:"Gewicht & Ziel",body_measures:"Maße",body_current:"Aktuelles Gewicht (kg)",body_target:"Zielgewicht (kg)",body_chest:"Brust (cm)",body_waist:"Taille (cm)",body_hips:"Hüften (cm)",body_arms:"Arme (cm)",body_thighs:"Oberschenkel (cm)",
    work_focus_sec:"Fokus & Produktivität",work_tasks:"Aufgaben",work_tasks_planned:"Geplant",work_tasks_done:"Erledigt",work_highlight:"Highlight des Tages",work_screen:"Bildschirmzeit",work_screen_hours:"Stunden heute",
    mind_mood_day:"Stimmung heute",mind_dev:"Entwicklung",mind_reading:"Lesen (Seiten)",mind_meditation:"Meditation / Herzkoheränz",mind_skill:"Geübte Fähigkeit",mind_gratitude:"Dankbarkeit heute",
    todo_new:"Neue Aufgabe",todo_placeholder:"Aufgabe hinzufügen...",todo_today:"Heute",todo_older:"Ältere",
    money_total:"Gesamtvermögen",money_split:"Aufteilung",money_pockets:"Meine Konten",
    sec_account:"Konto",sec_goals:"Ziele",sec_devices:"Verbundene Geräte",sec_notif:"Benachrichtigungen",sec_appearance:"Erscheinungsbild",sec_privacy:"Datenschutz & Sicherheit",sec_ai:"KI & Analysen",sec_subscription:"Abonnement",sec_support:"Hilfe & Support",sec_about:"Über uns",
    row_info:"Persönliche Daten",row_info_desc:"Name, Foto, Geburtsdatum",row_email:"E-Mail-Adresse",row_password:"Passwort",row_password_desc:"Passwort ändern",row_phone:"Telefonnummer",row_phone_add:"Nummer hinzufügen",row_lang:"Sprache",row_logout:"Abmelden",row_logout_desc:"Zurück zum Anmeldebildschirm",
    row_darkmode_on:"Hellmodus",row_darkmode_off:"Dunkelmodus",row_textsize:"Textgröße",row_anim:"Animationen",row_compact:"Kompaktes Dashboard",
    settings_title:"Einstellungen",settings_edit:"Bearbeiten ›",pro_member:"⭐ Pro-Mitglied",free_member:"Kostenloses Mitglied",
    stats_title:"Statistiken",profile_settings:"Einstellungen",
  },
};
let _lang = localStorage.getItem("lang") || "fr";
const tr = k => (TRANSLATIONS[_lang] || TRANSLATIONS.fr)[k] || k;

const NAV = [
  { id: "today", icon: "home" },
  { id: "track", icon: "track" },
  { id: "money", icon: "money" },
  { id: "goals", icon: "goals" },
  { id: "stats", icon: "stats" },
  { id: "profile", icon: "profile" },
];

const TRACK_TABS = [
  { id: "sleep", icon: "sleep" },
  { id: "sport", icon: "sport" },
  { id: "nutrition", icon: "nutrition" },
  { id: "body", icon: "body" },
  { id: "work", icon: "work" },
  { id: "todo", icon: "todo" },
  { id: "mind", icon: "mind" },
];

// ── SPLASH SCREEN ──────────────────────────────────────────────────────────
const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0C0C0C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, transition: "opacity 0.4s", opacity: phase === 2 ? 0 : 1 }}>
      <div style={{ transform: phase >= 1 ? "scale(1)" : "scale(0.7)", opacity: phase >= 1 ? 1 : 0, transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        <div style={{ width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, filter: "drop-shadow(0 20px 40px rgba(204,41,54,0.55))" }}><img src={kojihLogo} alt="Kojih" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
        <p style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, textAlign: "center", margin: "0 0 6px", letterSpacing: -0.5 }}>Mylide</p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Kojihsports</p>
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ──────────────────────────────────────────────────────────
// ── SETTINGS SUB-PAGES ─────────────────────────────────────────────────────
const settingsInp = { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${LIGHT.border}`, background: LIGHT.surfaceAlt, fontSize: 16, fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box", color: LIGHT.black };
const settingsDarkInp = { ...settingsInp, border: `1.5px solid ${DARK.border}`, background: DARK.surfaceAlt, color: DARK.black };

const SubLayout = ({ onBack, title, onSave, saving, saveOk, children }) => (
  <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 210, overflowY: "auto", maxWidth: 480, margin: "0 auto", fontFamily: "DM Sans, sans-serif" }}>
    <div style={{ padding: "18px 20px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={onBack} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, color: C.black, fontFamily: "inherit" }}>←</button>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.black, flex: 1 }}>{title}</p>
      {onSave && <button onClick={onSave} disabled={saving} style={{ background: saveOk ? C.green : C.red, color: "#fff", border: "none", borderRadius: 12, padding: "9px 18px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>{saving ? "..." : saveOk ? "Sauvegardé !" : "Enregistrer"}</button>}
    </div>
    <div style={{ padding: "20px 16px" }}>{children}</div>
  </div>
);

const FeedbackBanner = ({ msg }) => msg ? (
  <div style={{ background: msg.type === "ok" ? `${LIGHT.green}18` : `${LIGHT.red}14`, border: `1.5px solid ${msg.type === "ok" ? LIGHT.green : LIGHT.red}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: msg.type === "ok" ? LIGHT.green : LIGHT.red }}>{msg.type === "ok" ? "✓ " : "✗ "}{msg.text}</p>
  </div>
) : null;

const SubPageInfo = ({ onBack, profile, updateProfile, darkMode }) => {
  const [name, setName] = useState(profile.name || "");
  const [dob, setDob] = useState(profile.dob || "");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const pRef = useRef();
  const handlePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(f); };
  const save = () => { setSaving(true); updateProfile("name", name); updateProfile("dob", dob); setSaving(false); setSaveOk(true); setTimeout(() => { setSaveOk(false); onBack(); }, 1200); };
  const inp = darkMode ? settingsDarkInp : settingsInp;
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  return (
    <SubLayout onBack={onBack} title="Informations personnelles" onSave={save} saving={saving} saveOk={saveOk}>
      <input type="file" accept="image/*" ref={pRef} style={{ display: "none" }} onChange={handlePhoto} />
      <div onClick={() => pRef.current.click()} style={{ textAlign: "center", marginBottom: 28, cursor: "pointer" }}>
        {profile.photo ? <img src={profile.photo} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.red}`, boxShadow: "0 4px 20px rgba(204,41,54,0.25)" }} alt="" />
          : <div style={{ width: 96, height: 96, borderRadius: "50%", background: `linear-gradient(135deg, #CC2936, #8B1A22)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "K"}</div>}
        <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 600, color: C.red }}>Changer la photo 📷</p>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Prénom</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ton prénom" style={inp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Date de naissance</label><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} /></div>
      {dob && <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 16px", marginTop: 4 }}><p style={{ margin: 0, fontSize: 13, color: C.muted }}>Âge calculé : <strong style={{ color: C.black }}>{Math.floor((Date.now() - new Date(dob)) / 3.156e10)} ans</strong></p></div>}
    </SubLayout>
  );
};

const SubPageEmail = ({ onBack, currentEmail, setCurrentEmail, darkMode }) => {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const inp = darkMode ? settingsDarkInp : settingsInp;
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const save = async () => {
    if (!newEmail || newEmail === currentEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setMsg({ type: "err", text: "Adresse email invalide." }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (error) setMsg({ type: "err", text: error.message });
    else { setMsg({ type: "ok", text: `Email de confirmation envoyé à ${newEmail}. Clique sur le lien pour valider.` }); setCurrentEmail(newEmail); setNewEmail(""); }
  };
  return (
    <SubLayout onBack={onBack} title="Adresse email" onSave={save} saving={loading} saveOk={false}>
      <FeedbackBanner msg={msg} />
      <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: `1px solid ${C.border}` }}>
        <p style={{ margin: "0 0 2px", fontSize: 12, color: C.muted, fontWeight: 600 }}>EMAIL ACTUEL</p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.black }}>{currentEmail || "Chargement..."}</p>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Nouvel email</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nouveau@email.com" style={inp} /></div>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Un email de confirmation sera envoyé à la nouvelle adresse. L'ancienne reste active jusqu'à validation.</p>
    </SubLayout>
  );
};

const SubPagePassword = ({ onBack, darkMode }) => {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const inp = darkMode ? settingsDarkInp : settingsInp;
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const save = async () => {
    if (pwd.length < 6) { setMsg({ type: "err", text: "Mot de passe trop court (minimum 6 caractères)." }); return; }
    if (pwd !== confirm) { setMsg({ type: "err", text: "Les mots de passe ne correspondent pas." }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) setMsg({ type: "err", text: error.message });
    else { setSaveOk(true); setMsg({ type: "ok", text: "Mot de passe modifié avec succès !" }); setTimeout(onBack, 2000); }
  };
  return (
    <SubLayout onBack={onBack} title="Mot de passe" onSave={save} saving={loading} saveOk={saveOk}>
      <FeedbackBanner msg={msg} />
      <div style={{ marginBottom: 16 }}><label style={lbl}>Nouveau mot de passe</label><input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Minimum 6 caractères" style={inp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Confirmer le mot de passe</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répète le mot de passe" style={inp} /></div>
      {pwd.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[["6+ caractères", pwd.length >= 6], ["Majuscule", /[A-Z]/.test(pwd)], ["Chiffre", /\d/.test(pwd)]].map(([l, ok]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: ok ? `${LIGHT.green}18` : LIGHT.surfaceAlt, color: ok ? LIGHT.green : C.muted }}>{ok ? "✓ " : "○ "}{l}</span>
          ))}
        </div>
      )}
    </SubLayout>
  );
};

const SubPagePhone = ({ onBack, profile, updateProfile, darkMode }) => {
  const [phone, setPhone] = useState(profile.phone || "");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const inp = darkMode ? settingsDarkInp : settingsInp;
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const save = () => { setSaving(true); updateProfile("phone", phone); setSaving(false); setSaveOk(true); setTimeout(() => { setSaveOk(false); onBack(); }, 1200); };
  return (
    <SubLayout onBack={onBack} title="Numéro de téléphone" onSave={save} saving={saving} saveOk={saveOk}>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Numéro de téléphone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" style={inp} /></div>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Utilisé uniquement pour la récupération de compte. Non partagé avec des tiers.</p>
    </SubLayout>
  );
};

const SubPageNotif = ({ onBack, darkMode }) => {
  const [notif, setNotif] = useState(() => { try { return JSON.parse(localStorage.getItem("notif")) || { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } catch { return { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } });
  const [wakeTime, setWakeTime] = useState(() => localStorage.getItem("wakeTime") || "07:00");
  const [sleepTime, setSleepTime] = useState(() => localStorage.getItem("sleepTime") || "23:00");
  const [confirmSilent, setConfirmSilent] = useState(false);

  const upN = (k, v) => {
    const n = { ...notif, [k]: v };
    setNotif(n);
    localStorage.setItem("notif", JSON.stringify(n));
    const anyOn = Object.entries(n).some(([key, val]) => key !== "silentMode" && val);
    if (anyOn) registerPush(n, wakeTime, sleepTime);
  };
  const upTime = (type, val) => {
    if (type === "wake") { setWakeTime(val); localStorage.setItem("wakeTime", val); registerPush(notif, val, sleepTime); }
    else { setSleepTime(val); localStorage.setItem("sleepTime", val); registerPush(notif, wakeTime, val); }
  };
  const handleSilent = () => {
    if (!notif.silentMode) setConfirmSilent(true);
    else upN("silentMode", false);
  };
  const confirmSilentMode = () => {
    const n = { hydration: false, sleep: false, training: false, walk: false, motivation: false, daily: false, weekly: false, silentMode: true };
    setNotif(n);
    localStorage.setItem("notif", JSON.stringify(n));
    setConfirmSilent(false);
  };

  const Tog = ({ value, onChange }) => (
    <div onClick={onChange} style={{ width: 44, height: 26, borderRadius: 13, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.25s", cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
    </div>
  );
  const Row = ({ icon, label, desc, right, last }) => (
    <div style={{ display: "flex", alignItems: "center", padding: "13px 0", borderBottom: last ? "none" : `1px solid ${C.border}`, gap: 12 }}>
      <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.black }}>{label}</p>{desc && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{desc}</p>}</div>
      {right}
    </div>
  );

  return (
    <SubLayout onBack={onBack} title="Notifications">
      {confirmSilent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, maxWidth: 320, width: "100%" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.black, margin: "0 0 8px" }}>🔕 Mode silencieux</p>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>Toutes tes notifications vont être désactivées. Tu peux les réactiver à tout moment.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmSilent(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.muted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Annuler</button>
              <button onClick={confirmSilentMode} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 0" }}>
          {[{ k: "wake", label: "🌅 Je me lève à", val: wakeTime }, { k: "sleep_t", label: "🌙 Je dors à", val: sleepTime }].map(({ k, label, val }) => (
            <div key={k}>
              <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
              <input type="time" value={val} onChange={e => upTime(k === "wake" ? "wake" : "sleep", e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.black, fontSize: 15, fontWeight: 700, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "0 16px", marginBottom: 16 }}>
        {[
          { k: "motivation", icon: "⚡", label: "Motivation", desc: `Lever + 30min` },
          { k: "hydration", icon: "💧", label: "Rappel hydratation", desc: "Toutes les 2h30 dans la journée" },
          { k: "training", icon: "🏋️", label: "Rappel entraînement", desc: "17h00" },
          { k: "walk", icon: "👟", label: "Rappel marche", desc: "12h30" },
          { k: "daily", icon: "📊", label: "Résumé quotidien", desc: "Coucher - 2h" },
          { k: "weekly", icon: "📅", label: "Résumé hebdomadaire", desc: "Dimanche soir" },
          { k: "sleep", icon: "🌙", label: "Rappel coucher", desc: "Coucher - 30min" },
        ].map((item, i, arr) => <Row key={item.k} icon={item.icon} label={item.label} desc={item.desc} right={<Tog value={notif[item.k]} onChange={() => upN(item.k, !notif[item.k])} />} last={i === arr.length - 1} />)}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "0 16px" }}>
        <Row icon="🔕" label="Mode silencieux" desc="Désactive toutes les notifications" right={<Tog value={notif.silentMode} onChange={handleSilent} />} last />
      </div>
    </SubLayout>
  );
};

const SubPageLanguage = ({ onBack, setLang: setAppLang }) => {
  const [selected, setSelected] = useState(() => localStorage.getItem("lang") || "fr");
  const langs = [{ k: "fr", flag: "🇫🇷", label: "Français" }, { k: "en", flag: "🇬🇧", label: "English" }, { k: "es", flag: "🇪🇸", label: "Español" }, { k: "de", flag: "🇩🇪", label: "Deutsch" }];
  const select = k => { setSelected(k); localStorage.setItem("lang", k); if (setAppLang) setAppLang(k); setTimeout(onBack, 400); };
  return (
    <SubLayout onBack={onBack} title="Langue">
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
        {langs.map((l, i) => (
          <div key={l.k} onClick={() => select(l.k)} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < langs.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", background: selected === l.k ? `${C.red}0C` : "transparent" }}>
            <span style={{ fontSize: 24, marginRight: 14 }}>{l.flag}</span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.black }}>{l.label}</span>
            {selected === l.k && <span style={{ color: C.red, fontWeight: 800, fontSize: 18 }}>✓</span>}
          </div>
        ))}
      </div>
    </SubLayout>
  );
};

// ── LEGAL PAGES ────────────────────────────────────────────────────────────
const SubPageLegal = ({ onBack, title, sections }) => (
  <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 300, overflowY: "auto", maxWidth: 480, margin: "0 auto", fontFamily: "DM Sans, sans-serif" }}>
    <div style={{ padding: "18px 20px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={onBack} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, color: C.black, fontFamily: "inherit" }}>←</button>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.black, flex: 1 }}>{title}</p>
    </div>
    <div style={{ padding: "20px 20px 48px" }}>
      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>Dernière mise à jour : mai 2025 · Kojihsports</p>
      {sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.black, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.6 }}>{sec.heading}</p>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>{sec.body}</p>
        </div>
      ))}
      <div style={{ marginTop: 32, padding: "16px", background: C.surfaceAlt, borderRadius: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, textAlign: "center" }}>Questions ? <span style={{ color: C.red, fontWeight: 700 }}>support@kojihsports.com</span></p>
      </div>
    </div>
  </div>
);

const CGU_SECTIONS = [
  { heading: "1. Présentation", body: "Mylide est une application de suivi de santé et de bien-être développée par Kojihsports. Elle permet aux utilisateurs de suivre leur sommeil, leur activité physique, leur nutrition, leur état mental et leurs finances personnelles." },
  { heading: "2. Acceptation des conditions", body: "En utilisant Mylide, vous acceptez l'intégralité des présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application." },
  { heading: "3. Utilisation de l'application", body: "Mylide est destinée à un usage strictement personnel. Elle ne remplace en aucun cas un avis médical professionnel. Les analyses et recommandations fournies sont à titre informatif uniquement. En cas de doute sur votre santé, consultez un professionnel de santé qualifié." },
  { heading: "4. Compte utilisateur", body: "Vous êtes responsable de la confidentialité de vos identifiants de connexion et de l'ensemble des activités effectuées depuis votre compte. Toute utilisation frauduleuse doit être signalée immédiatement à support@kojihsports.com." },
  { heading: "5. Abonnement et paiement", body: "Mylide propose un abonnement Pro donnant accès à des fonctionnalités avancées. L'abonnement se renouvelle automatiquement chaque mois. Vous pouvez annuler à tout moment depuis les paramètres de votre compte ou via les stores (App Store / Google Play). Aucun remboursement n'est accordé pour les périodes entamées." },
  { heading: "6. Propriété intellectuelle", body: "L'ensemble des contenus de l'application (textes, graphiques, logo, algorithmes, code source) est la propriété exclusive de Kojihsports. Toute reproduction, distribution ou modification est interdite sans autorisation écrite préalable." },
  { heading: "7. Limitation de responsabilité", body: "Kojihsports ne saurait être tenu responsable des décisions prises sur la base des informations affichées dans l'application, ni des dommages directs ou indirects résultant de son utilisation. L'application est fournie « en l'état »." },
  { heading: "8. Résiliation", body: "Vous pouvez demander la suppression de votre compte à tout moment en écrivant à support@kojihsports.com. Kojihsports se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes conditions." },
  { heading: "9. Droit applicable", body: "Les présentes conditions générales d'utilisation sont régies par le droit français. Tout litige sera soumis à la compétence exclusive des tribunaux de Paris." },
];

const PRIVACY_SECTIONS = [
  { heading: "1. Responsable du traitement", body: "Kojihsports, éditeur de l'application Mylide, est responsable du traitement de vos données personnelles au sens du Règlement Général sur la Protection des Données (RGPD — UE 2016/679)." },
  { heading: "2. Données collectées", body: "Nous collectons les données que vous saisissez dans l'application : informations de profil (nom, date de naissance, photo), données de santé (sommeil, activité physique, nutrition, poids, humeur), données financières (objectifs patrimoniaux, transactions), et données techniques (adresse e-mail, identifiant d'appareil pour les notifications push)." },
  { heading: "3. Finalité du traitement", body: "Vos données sont utilisées pour personnaliser votre expérience, générer vos analyses de santé, vous envoyer des notifications pertinentes et améliorer l'application. Elles ne sont utilisées à aucune fin publicitaire." },
  { heading: "4. Stockage et sécurité", body: "Vos données sont stockées de manière sécurisée via Supabase, hébergé sur des serveurs conformes au RGPD situés en Europe. Les communications sont chiffrées (TLS). Vos données de santé ne transitent jamais en clair." },
  { heading: "5. Partage des données", body: "Kojihsports ne vend jamais vos données personnelles. Seuls nos prestataires techniques strictement nécessaires au fonctionnement du service (Supabase pour la base de données, services de notification) y ont accès, dans le cadre de contrats de sous-traitance conformes au RGPD." },
  { heading: "6. Vos droits", body: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement (« droit à l'oubli »), de limitation du traitement, de portabilité et d'opposition. L'export de vos données est disponible dans Paramètres → Confidentialité. Pour toute autre demande, écrivez à support@kojihsports.com — réponse garantie sous 30 jours." },
  { heading: "7. Durée de conservation", body: "Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, l'ensemble de vos données personnelles est supprimé dans un délai maximum de 30 jours, sauf obligation légale contraire." },
  { heading: "8. Cookies et traceurs", body: "Mylide n'utilise pas de cookies publicitaires ou de traceurs tiers. Des cookies techniques strictement nécessaires au bon fonctionnement de l'authentification et de la session sont utilisés." },
  { heading: "9. Modifications", body: "Kojihsports se réserve le droit de modifier la présente politique. Toute modification substantielle vous sera notifiée dans l'application. La version en vigueur est celle affichée dans les paramètres." },
];

// ── SETTINGS PAGE ──────────────────────────────────────────────────────────
const SettingsPage = ({ onClose, darkMode, setDarkMode, profile, updateProfile, isPro, setShowSubscription, nutritionGoals, setNutritionGoals, onSignOut, setLang }) => {
  const [sub, setSub] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [notif, setNotif] = useState(() => { try { return JSON.parse(localStorage.getItem("notif")) || { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } catch { return { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } });
  const [wakeTime, setWakeTime] = useState(() => localStorage.getItem("wakeTime") || "07:00");
  const [sleepTime, setSleepTime] = useState(() => localStorage.getItem("sleepTime") || "23:00");
  const [connApps, setConnApps] = useState(() => { try { return JSON.parse(localStorage.getItem("connApps")) || { appleWatch: false, appleHealth: false, garmin: false, fitbit: false, oura: false, strava: false }; } catch { return { appleWatch: false, appleHealth: false, garmin: false, fitbit: false, oura: false, strava: false }; } });
  const [aiPref, setAiPref] = useState(() => { try { return JSON.parse(localStorage.getItem("aiPref")) || { coach: true, autoAnalysis: true, healthSummary: true, predictive: false }; } catch { return { coach: true, autoAnalysis: true, healthSummary: true, predictive: false }; } });
  const [appPref, setAppPref] = useState(() => { try { return JSON.parse(localStorage.getItem("appPref")) || { textSize: "normal", animations: true, compact: false }; } catch { return { textSize: "normal", animations: true, compact: false }; } });

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUserEmail(user.email || ""); }); }, []);

  const upN = (k, v) => {
    const n = { ...notif, [k]: v };
    setNotif(n);
    localStorage.setItem("notif", JSON.stringify(n));
    const anyOn = Object.entries(n).some(([key, val]) => key !== "silentMode" && val);
    if (anyOn) registerPush(n, wakeTime, sleepTime);
  };
  const upTime = (type, val) => {
    if (type === "wake") { setWakeTime(val); localStorage.setItem("wakeTime", val); registerPush(notif, val, sleepTime); }
    else { setSleepTime(val); localStorage.setItem("sleepTime", val); registerPush(notif, wakeTime, val); }
  };
  const upCA = (k, v) => { const a = { ...connApps, [k]: v }; setConnApps(a); localStorage.setItem("connApps", JSON.stringify(a)); };
  const upAI = (k, v) => { const a = { ...aiPref, [k]: v }; setAiPref(a); localStorage.setItem("aiPref", JSON.stringify(a)); };
  const upApp = (k, v) => { const a = { ...appPref, [k]: v }; setAppPref(a); localStorage.setItem("appPref", JSON.stringify(a)); };
  const exportData = () => { const b = new Blob([JSON.stringify({ profile, nutritionGoals, date: new Date().toISOString() }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `mylide-${new Date().toISOString().split("T")[0]}.json`; a.click(); };

  const langName = { fr: "Français", en: "English", es: "Español", de: "Deutsch" };
  const currentLang = langName[localStorage.getItem("lang") || "fr"] || "Français";

  const Tog = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.25s", cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
    </div>
  );
  const Row = ({ icon, label, desc, right, onClick, last }) => (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", padding: "13px 0", borderBottom: last ? "none" : `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", gap: 12 }}>
      <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.black }}>{label}</p>{desc && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{desc}</p>}</div>
      {right !== undefined ? right : (onClick ? <span style={{ color: C.muted, fontSize: 20 }}>›</span> : null)}
    </div>
  );
  const Sec = ({ title, children }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px 20px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: 11, color: C.red, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 800, margin: "0 0 6px" }}>{title}</p>
      {children}
    </div>
  );

  if (sub === "info") return <SubPageInfo onBack={() => setSub(null)} profile={profile} updateProfile={updateProfile} darkMode={darkMode} />;
  if (sub === "email") return <SubPageEmail onBack={() => setSub(null)} currentEmail={userEmail} setCurrentEmail={setUserEmail} darkMode={darkMode} />;
  if (sub === "password") return <SubPagePassword onBack={() => setSub(null)} darkMode={darkMode} />;
  if (sub === "phone") return <SubPagePhone onBack={() => setSub(null)} profile={profile} updateProfile={updateProfile} darkMode={darkMode} />;
  if (sub === "language") return <SubPageLanguage onBack={() => setSub(null)} setLang={setLang} />;
  if (sub === "notif") return <SubPageNotif onBack={() => setSub(null)} darkMode={darkMode} />;
  if (sub === "cgu") return <SubPageLegal onBack={() => setSub(null)} title="Conditions d'utilisation" sections={CGU_SECTIONS} />;
  if (sub === "privacy") return <SubPageLegal onBack={() => setSub(null)} title="Politique de confidentialité" sections={PRIVACY_SECTIONS} />;

  const SubscriptionBlock = () => (
    <Sec title={tr("sec_subscription")}>
      <div onClick={() => { onClose(); setTimeout(() => setShowSubscription(true), 120); }} style={{ background: "linear-gradient(135deg, #CC2936, #8B1A22)", borderRadius: 14, padding: "16px 18px", cursor: "pointer", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 8px 24px rgba(204,41,54,0.25)" }}>
        <div><p style={{ color: "#fff", fontWeight: 900, fontSize: 16, margin: "0 0 2px" }}>{isPro ? "⭐ Membre Pro actif" : "Passer à Pro"}</p><p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: 0 }}>{isPro ? "Renouvellement dans 23 jours" : "1 mois gratuit · 3,59€/mois"}</p></div>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 22 }}>›</span>
      </div>
      <Row icon="🔄" label="Restaurer les achats" onClick={() => {}} last />
    </Sec>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 200, overflowY: "auto", maxWidth: 480, margin: "0 auto", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ padding: "18px 20px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, color: C.black, fontFamily: "inherit" }}>←</button>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.black, flex: 1 }}>{tr("settings_title")}</p>
        <span style={{ fontSize: 22 }}>⚙️</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div onClick={() => setSub("info")} style={{ background: "linear-gradient(135deg, #CC2936, #8B1A22)", borderRadius: 20, padding: "18px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 10px 32px rgba(204,41,54,0.28)" }}>
          {profile.photo ? <img src={profile.photo} style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.3)" }} alt="" /> : <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 900 }}>{profile.name?.[0] || "K"}</div>}
          <div style={{ flex: 1 }}><p style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 800, color: "#fff" }}>{profile.name}</p><p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{isPro ? tr("pro_member") : tr("free_member")}</p></div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600 }}>{tr("settings_edit")}</span>
        </div>

        {/* Abonnement EN HAUT si pas Pro — maximise la conversion */}
        {!isPro && <SubscriptionBlock />}

        <Sec title={tr("sec_account")}>
          <Row icon="👤" label={tr("row_info")} desc={tr("row_info_desc")} onClick={() => setSub("info")} />
          <Row icon="📧" label={tr("row_email")} desc={userEmail || "..."} onClick={() => setSub("email")} />
          <Row icon="🔑" label={tr("row_password")} desc={tr("row_password_desc")} onClick={() => setSub("password")} />
          <Row icon="📱" label={tr("row_phone")} desc={profile.phone || tr("row_phone_add")} onClick={() => setSub("phone")} />
          <Row icon="🌍" label={tr("row_lang")} desc={currentLang} onClick={() => setSub("language")} />
          <Row icon="🚪" label={tr("row_logout")} desc={tr("row_logout_desc")} onClick={onSignOut} last />
        </Sec>

        <Sec title={tr("sec_devices")}>
          {[
            { k: "appleWatch", icon: "⌚", label: "Apple Watch", sub: "Fréquence cardiaque, activité" },
            { k: "appleHealth", icon: "❤️", label: "Apple Health", sub: "Données santé iOS" },
            { k: "garmin", icon: "🗺️", label: "Garmin", sub: "GPS & performance sport" },
            { k: "fitbit", icon: "💪", label: "Fitbit", sub: "Bracelet fitness" },
            { k: "oura", icon: "💍", label: "Oura Ring", sub: "Sommeil & récupération" },
            { k: "strava", icon: "🚴", label: "Strava", sub: "Running & cyclisme" },
          ].map((item, i, arr) => <Row key={item.k} icon={item.icon} label={item.label} desc={connApps[item.k] ? "✅ Connecté · sync. à l'instant" : item.sub} right={<Tog value={connApps[item.k]} onChange={v => upCA(item.k, v)} />} last={i === arr.length - 1} />)}
        </Sec>

        <Sec title={tr("sec_notif")}>
          <Row icon="🔔" label="Gérer les notifications" desc={`${Object.entries(notif).filter(([k,v]) => k !== "silentMode" && v).length} active(s)`} onClick={() => setSub("notif")} last />
        </Sec>

        <Sec title={tr("sec_appearance")}>
          <Row icon={darkMode ? "☀️" : "🌙"} label={darkMode ? tr("row_darkmode_on") : tr("row_darkmode_off")} right={<Tog value={darkMode} onChange={setDarkMode} />} last />
        </Sec>

        <Sec title={tr("sec_privacy")}>
          <Row icon="📤" label="Télécharger mes données" desc="Export au format JSON" onClick={exportData} />
          <Row icon="🗑️" label="Supprimer mon compte" desc="Action irréversible" onClick={() => { if (window.confirm("Supprimer définitivement votre compte ? Cette action est irréversible.")) alert("Contactez support@kojihsports.com pour supprimer votre compte."); }} last />
        </Sec>

        <Sec title={tr("sec_support")}>
          <Row icon="❓" label="FAQ" onClick={() => {}} />
          <Row icon="💬" label="Contacter l'équipe" desc="support@kojihsports.com" onClick={() => window.open("mailto:support@kojihsports.com")} />
          <Row icon="🐛" label="Signaler un bug" onClick={() => window.open("mailto:bugs@kojihsports.com")} last />
        </Sec>

        <Sec title={tr("sec_about")}>
          <Row icon="📱" label="Version de l'app" desc="Mylide 1.0.0 · Kojihsports" />
          <Row icon="📄" label="Conditions d'utilisation" onClick={() => setSub("cgu")} />
          <Row icon="🔐" label="Politique de confidentialité" onClick={() => setSub("privacy")} />
          <Row icon="📸" label="Réseaux sociaux" desc="@kojihsports" onClick={() => {}} last />
        </Sec>

        {/* Abonnement EN BAS si Pro — réduit la visibilité de la résiliation */}
        {isPro && <SubscriptionBlock />}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

// ── SCORE RING ─────────────────────────────────────────────────────────────
const ScoreRing = ({ score, delta, streak }) => {
  const r = 36; const circ = 2 * Math.PI * r; const fill = (score / 100) * circ;
  const col = score >= 80 ? "#1A7A4A" : score >= 60 ? "#D4580A" : "#CC2936";
  return (
    <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6"/>
        <circle cx="42" cy="42" r={r} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</span>
        {streak > 0 && <span style={{ fontSize: 9, color: "#D4580A", fontWeight: 700, marginTop: 1 }}>🔥{streak}j</span>}
      </div>
    </div>
  );
};

// ── CALENDAR HEATMAP ───────────────────────────────────────────────────────
const CalendarHeatmap = ({ history }) => {
  const today = new Date(); const days = [];
  for (let i = 83; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split("T")[0]; const entry = history.find(h => h.date === dateStr); days.push({ date: dateStr, score: entry?.score || 0 }); }
  const sc = (s) => { if (s === 0) return C.surfaceAlt; if (s >= 80) return C.green; if (s >= 60) return C.orange; if (s >= 40) return "#f59e0b"; return C.red; };
  const weeks = []; for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }}>
        {weeks.map((w, wi) => (<div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>{w.map((d, di) => <div key={di} title={`${d.date}: ${d.score}/100`} style={{ width: 11, height: 11, borderRadius: 2, background: sc(d.score) }} />)}</div>))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 9, color: C.muted, alignItems: "center" }}>
        <span>Faible</span>{[0,40,60,80].map(s => <div key={s} style={{ width: 9, height: 9, borderRadius: 2, background: sc(s === 0 ? 0 : s + 10) }} />)}<span>Excellent</span>
      </div>
    </div>
  );
};

// ── ATHLETIC RADAR ─────────────────────────────────────────────────────────
const AthleticRadar = ({ data }) => {
  const COLORS = { Sommeil: "#A855F7", Sport: "#CC2936", Nutrition: "#F97316", Travail: "#3B82F6", Mental: "#22C55E", Corps: "#F59E0B" };
  return (
    <div style={{ background: "#0C0C0C", borderRadius: 16, padding: 16, position: "relative" }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="s" tick={({ x, y, payload }) => {
            const col = COLORS[payload.value] || "#888";
            return <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={10} fontWeight={700}>{payload.value}</text>;
          }} />
          <Radar dataKey="v" stroke="#E8384A" fill="#E8384A" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: "#E8384A", strokeWidth: 0 }} />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
        {data.map(item => <div key={item.s} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[item.s] }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{item.s} {Math.round(item.v)}%</span></div>)}
      </div>
    </div>
  );
};

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
const inp = { background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", color: C.text, fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", fontFamily: "inherit" };

const EvoChart = ({ data, dataKey, color, label, unit, height = 150 }) => {
  if (data.length < 2) return <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, textAlign: "center", marginBottom: 14 }}><p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Graphique disponible apres 2+ jours</p></div>;
  const getVal = d => dataKey.split(".").reduce((o, k) => o?.[k], d) ?? 0;
  const last = getVal(data[data.length - 1]); const first = getVal(data[0]); const trend = last - first;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, margin: 0, fontWeight: 600 }}>{label}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? `${C.green}15` : `${C.red}15`, borderRadius: 8, padding: "3px 8px", fontWeight: 700 }}>{trend >= 0 ? "+" : ""}{Math.round(trend * 10) / 10}{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs><linearGradient id={`g${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3"/>
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9, fontWeight: 500 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={28} domain={["auto","auto"]} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} formatter={v => [`${v}${unit}`, label]}/>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g${label.replace(/\s/g,"")})`} dot={false} activeDot={{ r: 5, fill: color, stroke: C.surface, strokeWidth: 2 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Rating = ({ value, max = 5, onChange, color }) => {
  const col = color || C.red;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} onClick={() => onChange(i + 1)} style={{ fontSize: 28, cursor: "pointer", color: i < value ? col : C.subtle, transition: "all 0.15s", transform: i < value ? "scale(1.1)" : "scale(1)" }}>★</span>
      ))}
    </div>
  );
};

const Toggle = ({ value, onChange, label }) => (
  <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: value ? C.redLight : C.surfaceAlt, border: `1.5px solid ${value ? C.red : C.border}`, borderRadius: 14, padding: "12px 16px", transition: "all 0.2s", userSelect: "none" }}>
    <div style={{ width: 42, height: 24, borderRadius: 12, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.25s", flexShrink: 0, boxShadow: value ? `0 2px 8px ${C.red}44` : "none" }}>
      <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
    </div>
    <span style={{ fontSize: 14, color: value ? C.red : C.muted, fontWeight: value ? 600 : 400 }}>{label}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

const Card = ({ children, style = {}, accent, dark }) => {
  const bg = accent ? `linear-gradient(135deg, ${C.red} 0%, #8B1A22 100%)` : dark ? "#0C0C0C" : C.surface;
  return (
    <div style={{ background: bg, border: accent || dark ? "none" : `1px solid ${C.border}`, borderRadius: 20, padding: 20, marginBottom: 12, boxShadow: accent ? "0 12px 40px rgba(204,41,54,0.22)" : "0 2px 16px rgba(0,0,0,0.05)", ...style }}>{children}</div>
  );
};

const ST = ({ children, light }) => (
  <p style={{ fontSize: 11, color: light ? "rgba(255,255,255,0.55)" : C.red, textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 14, marginTop: 0, fontWeight: 700 }}>{children}</p>
);

const MsgBox = ({ type, msg, suggestions }) => {
  const colors = { danger: C.red, warning: C.orange, advice: C.green, success: C.green, info: C.blue };
  const bgs = { danger: `${C.red}10`, warning: `${C.orange}10`, advice: `${C.green}10`, success: `${C.green}10`, info: `${C.blue}10` };
  const col = colors[type] || C.muted; const bg = bgs[type] || C.surfaceAlt;
  return (
    <div style={{ background: bg, border: `1.5px solid ${col}22`, borderRadius: 14, padding: "12px 16px", marginBottom: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}><span style={{ color: col, fontWeight: 700 }}>•</span> {msg}</p>
      {suggestions?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px", fontWeight: 600 }}>Suggestions :</p>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 6, border: `1px solid ${C.border}` }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: C.text }}>{s.name} <span style={{ color: col }}>• {s.totalProtein}g prot</span></p>
              {s.items.map((item, j) => <p key={j} style={{ margin: "0 0 2px", fontSize: 12, color: C.muted }}>• {item}</p>)}
              <p style={{ margin: "4px 0 0", fontSize: 11, color: col, fontStyle: "italic" }}>{s.timing}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditGoalModal = ({ goal, onSave, onClose }) => {
  const [edited, setEdited] = useState({ ...goal });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, background: C.surface, borderRadius: "24px 24px 0 0", padding: 24, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.black }}>Modifier l'objectif</h3>
          <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: C.muted, fontWeight: 600 }}>Fermer</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nom"><input value={edited.label} onChange={e => setEdited(p => ({ ...p, label: e.target.value }))} style={inp} /></Field>
          <Field label="Categorie"><input value={edited.category} onChange={e => setEdited(p => ({ ...p, category: e.target.value }))} style={inp} /></Field>
          <Field label="Source de donnees">
            <select value={edited.sourceId} onChange={e => setEdited(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text }}>
              {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          {edited.sourceId !== "manual" && (<>
            <Field label={`Valeur cible (${DATA_SOURCES.find(s => s.id === edited.sourceId)?.unit || ""})`}>
              <input type="number" value={edited.target} onChange={e => setEdited(p => ({ ...p, target: e.target.value }))} style={inp} />
            </Field>
            <Toggle value={edited.reverse || false} onChange={v => setEdited(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
          </>)}
          {edited.sourceId === "manual" && (
            <Field label="Progression manuelle (%)">
              <input type="number" min={0} max={100} value={edited.manualProgress || 0} onChange={e => setEdited(p => ({ ...p, manualProgress: +e.target.value }))} style={inp} />
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Debut"><input type="date" value={edited.startDate || ""} onChange={e => setEdited(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
            <Field label="Fin"><input type="date" value={edited.endDate || ""} onChange={e => setEdited(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, flexShrink: 0, fontWeight: 600 }}>Couleur</label>
            <input type="color" value={edited.color} onChange={e => setEdited(p => ({ ...p, color: e.target.value }))} style={{ width: 46, height: 46, borderRadius: 12, border: `2px solid ${C.border}`, cursor: "pointer", padding: 2 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["#CC2936","#1A7A4A","#1E5FCC","#6B35C8","#D4580A","#0891b2","#be185d","#0A0A0A"].map(col => (
                <div key={col} onClick={() => setEdited(p => ({ ...p, color: col }))} style={{ width: 28, height: 28, borderRadius: "50%", background: col, cursor: "pointer", border: edited.color === col ? `3px solid ${C.text}` : "2px solid transparent", transition: "transform 0.15s", transform: edited.color === col ? "scale(1.15)" : "scale(1)" }} />
              ))}
            </div>
          </div>
          <button onClick={() => { onSave(edited); onClose(); }} style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg, ${edited.color}, ${edited.color}bb)`, color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, cursor: "pointer", fontSize: 15, marginTop: 6, boxShadow: `0 8px 24px ${edited.color}44` }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

const useSwipe = (onLeft, onRight) => {
  const sx = useRef(null); const sy = useRef(null);
  return {
    onTouchStart: e => { sx.current = e.touches[0].clientX; sy.current = e.touches[0].clientY; },
    onTouchEnd: e => {
      if (sx.current === null) return;
      const dx = e.changedTouches[0].clientX - sx.current; const dy = Math.abs(e.changedTouches[0].clientY - sy.current);
      if (Math.abs(dx) > 160 && dy < 80) { if (dx < 0) onLeft(); else onRight(); }
      sx.current = null;
    },
  };
};

const PageTransition = ({ children, pageKey }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { setVis(false); const t = setTimeout(() => setVis(true), 40); return () => clearTimeout(t); }, [pageKey]);
  return <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.22s ease, transform 0.22s ease" }}>{children}</div>;
};

// ── ONBOARDING ─────────────────────────────────────────────────────────────
const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""); const [dob, setDob] = useState(""); const [photo, setPhoto] = useState("");
  const [priorities, setPriorities] = useState([]); const [goalTarget, setGoalTarget] = useState(""); const [goalEnd, setGoalEnd] = useState("");
  const photoRef = useRef();
  const handlePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f); };
  const togglePriority = id => setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const handleComplete = () => {
    const today = new Date().toISOString().split("T")[0];
    const templates = {
      sport: { label: "Seances sport (45min+)", sourceId: "sport_duree", target: 45, category: "Sport", color: "#CC2936" },
      finance: { label: "Objectif patrimoine", sourceId: "patrimoine", target: Number(goalTarget) || 50000, category: "Finance", color: "#1A7A4A" },
      mental: { label: "Lecture quotidienne (20p)", sourceId: "lecture", target: 20, category: "Mental", color: "#6B35C8" },
      nutrition: { label: "Proteines quotidiennes", sourceId: "proteines", target: 150, category: "Nutrition", color: "#D4580A" },
      business: { label: "Focus quotidien (4/5)", sourceId: "focus", target: 4, category: "Travail", color: "#1E5FCC" },
      running: { label: "Distance running (5km)", sourceId: "running_dist", target: 5, category: "Running", color: "#0891b2" },
      body: { label: "Objectif poids", sourceId: "poids", target: Number(goalTarget) || 75, category: "Corps", color: "#D4580A" },
      sleep: { label: "Sommeil optimal (score 70)", sourceId: "score", target: 70, category: "Sommeil", color: "#6B35C8" },
    };
    const createdGoals = priorities.map((pid, i) => ({ ...(templates[pid] || { label: pid, sourceId: "manual", target: 100, category: pid, color: "#CC2936" }), id: Date.now() + i, startDate: today, endDate: goalEnd || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0], reverse: false, manualProgress: 0, target: i === 0 && goalTarget ? Number(goalTarget) : (templates[pid]?.target || 100) }));
    onComplete({ name, dob, photo }, createdGoals);
  };

  const btnPrimary = { width: "100%", padding: "16px", background: "linear-gradient(135deg, #CC2936, #8B1A22)", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 30px rgba(204,41,54,0.35)", letterSpacing: 0.3 };
  const btnSecondary = { flex: 1, padding: "14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, fontWeight: 600, cursor: "pointer", color: C.muted, fontSize: 14 };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 96, height: 96, background: "linear-gradient(135deg, #CC2936, #8B1A22)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 16px 48px rgba(204,41,54,0.4)", fontSize: 48 }}>🎯</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: C.black, margin: "0 0 10px", lineHeight: 1.1, letterSpacing: -0.5 }}>Bienvenue sur<br /><span style={{ color: C.red }}>Mylide</span></h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: "0 0 40px" }}>Ton tracker de vie intelligent.<br />Configure en 2 minutes.</p>
            <button onClick={() => setStep(1)} style={btnPrimary}>Commencer →</button>
          </div>
        )}
        {step === 1 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= 1 ? C.red : C.surfaceAlt, transition: "background 0.3s" }} />)}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px", color: C.black }}>Qui es-tu ?</h2>
            <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handlePhoto} />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", position: "relative" }}>
                {photo ? <img src={photo} alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.red}`, boxShadow: "0 8px 24px rgba(204,41,54,0.3)" }} />
                  : <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.surfaceAlt, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>📷</div>}
                <div style={{ position: "absolute", bottom: 2, right: 2, background: C.red, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, boxShadow: "0 4px 12px rgba(204,41,54,0.4)" }}>+</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <Field label="Prenom"><input value={name} onChange={e => setName(e.target.value)} placeholder="Hadrien" style={inp} /></Field>
              <Field label="Date de naissance"><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} /></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={btnSecondary}>← Retour</button>
              <button onClick={() => name.trim() && setStep(2)} style={{ ...btnPrimary, flex: 2, opacity: name.trim() ? 1 : 0.5 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= 2 ? C.red : C.surfaceAlt }} />)}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: C.black }}>Tes priorites</h2>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 18px" }}>Selectionne tout ce que tu veux ameliorer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
              {PRIORITIES.map(p => { const selected = priorities.includes(p.id); return (
                <div key={p.id} onClick={() => togglePriority(p.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${selected ? p.color : C.border}`, background: selected ? `${p.color}10` : C.surface, cursor: "pointer", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selected ? p.color : C.text, flex: 1 }}>{p.label}</span>
                  {selected && <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexShrink: 0 }}>✓</div>}
                </div>
              ); })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Retour</button>
              <button onClick={() => priorities.length > 0 && setStep(3)} style={{ ...btnPrimary, flex: 2, opacity: priorities.length > 0 ? 1 : 0.5 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: C.red }} />)}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: C.black }}>Objectif principal</h2>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 16px" }}>{priorities.length} objectif{priorities.length > 1 ? "s" : ""} crees automatiquement.</p>
            <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 30 }}>{PRIORITIES.find(p => p.id === priorities[0])?.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{PRIORITIES.find(p => p.id === priorities[0])?.label}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
              <Field label="Valeur cible (vide = valeur par defaut)"><input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Ex: 100000 pour patrimoine..." style={inp} /></Field>
              <Field label="Date limite"><input type="date" value={goalEnd} onChange={e => setGoalEnd(e.target.value)} style={inp} /></Field>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>← Retour</button>
              <button onClick={handleComplete} style={{ ...btnPrimary, flex: 2 }}>Lancer l'app !</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [onboarded, setOnboarded] = useState(null);
  const { darkMode, setDarkMode } = useTheme();
  const C = darkMode ? DARK : LIGHT;
  useEffect(() => { Object.assign(C, darkMode ? DARK : LIGHT); document.body.style.background = C.bg; }, [darkMode]);

  const [nav, setNav] = useState("today");
  const [trackTab, setTrackTab] = useState("sleep");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [goals, setGoals] = useState([]);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [patrimoine, setPatrimoine] = useState(defaultPatrimoine());
  const [newPoche, setNewPoche] = useState({ name: "", amount: 0, color: "#2563eb" });
  const [statRange, setStatRange] = useState("30");
  const [profile, setProfile] = useState({ name: "", dob: "", photo: "" });
  const [sim, setSim] = useState({ amount: 10000, monthly: 200, rate: 10, years: 10 });
  const [newGoal, setNewGoal] = useState({ label: "", category: "", color: "#CC2936", sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  const [renamingPoche, setRenamingPoche] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "fr");
  _lang = lang;
  const [nutritionGoals, setNutritionGoals] = useState(() => { try { return JSON.parse(localStorage.getItem("nutritionGoals")) || { goalType: "maintenance", protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200 }; } catch { return { goalType: "maintenance", protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200 }; } });
  const [veganOnly, setVeganOnly] = useState(() => localStorage.getItem("veganOnly") === "true");
  const [editingNutrGoals, setEditingNutrGoals] = useState(false);
  const photoRef = useRef(); const sportPhotoRef = useRef();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOnboarded(false); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData) { setProfile({ name: profileData.name || "", dob: profileData.dob || "", photo: profileData.photo || "" }); setIsPro(profileData.is_pro || false); setOnboarded(true); }
      else { setOnboarded(false); return; }
      const { data: logs } = await supabase.from("daily_logs").select("*").eq("user_id", user.id).order("date");
      if (logs) { const hist = logs.map(l => ({ ...l.data, date: l.date, score: l.score })); setHistory(hist); const todayEntry = hist.find(d => d.date === new Date().toISOString().split("T")[0]); if (todayEntry) { if (todayEntry.sleep?.bedtime && todayEntry.sleep?.wakeup && !todayEntry.sleep?.duration) todayEntry.sleep.duration = calcDuration(todayEntry.sleep.bedtime, todayEntry.sleep.wakeup); setToday(todayEntry); } }
      const { data: goalsData } = await supabase.from("goals").select("*").eq("user_id", user.id);
      if (goalsData?.length) setGoals(goalsData.map(g => g.data));
      const { data: patrimoineData } = await supabase.from("patrimoine").select("*").eq("user_id", user.id).single();
      if (patrimoineData) setPatrimoine(patrimoineData.data);
      const { data: todosData } = await supabase.from("todos").select("*").eq("user_id", user.id);
      if (todosData?.length) setTodos(todosData.map(t => t.data));
    };
    loadData();

    // Demande permission notifs au premier lancement
    if (!localStorage.getItem("notifAsked") && "Notification" in window) {
      localStorage.setItem("notifAsked", "true");
      setTimeout(async () => {
        const notifPrefs = JSON.parse(localStorage.getItem("notif") || "{}");
        const wake = localStorage.getItem("wakeTime") || "07:00";
        const sleep = localStorage.getItem("sleepTime") || "23:00";
        await registerPush(notifPrefs, wake, sleep);
      }, 3000);
    }
  }, []);

  const saveAll = useCallback(async (h, t, g, p, pr) => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, name: pr.name, dob: pr.dob, photo: pr.photo });
    const todayStr = new Date().toISOString().split("T")[0]; const todayData = h.find(d => d.date === todayStr);
    if (todayData) await supabase.from("daily_logs").upsert({ user_id: user.id, date: todayStr, data: todayData, score: todayData.score || 0 });
    await supabase.from("goals").delete().eq("user_id", user.id);
    if (g.length) await supabase.from("goals").insert(g.map(goal => ({ user_id: user.id, data: goal })));
    await supabase.from("patrimoine").upsert({ user_id: user.id, data: p });
    await supabase.from("todos").delete().eq("user_id", user.id);
    if (t.length) await supabase.from("todos").insert(t.map(todo => ({ user_id: user.id, data: todo })));
  }, []);

  const handleOnboardingComplete = async (profileData, createdGoals) => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, name: profileData.name, dob: profileData.dob, photo: profileData.photo });
    setProfile(profileData); setGoals(createdGoals); setOnboarded(true);
    saveAll([], [], createdGoals, defaultPatrimoine(), profileData);
  };

  const update = (section, field, val) => { setToday(prev => { const updated = { ...prev, [section]: { ...prev[section], [field]: val } }; if (section === "sleep") updated.sleep.duration = calcDuration(updated.sleep.bedtime, updated.sleep.wakeup); updated.score = calcScore(updated); return updated; }); setSaved(false); };
  const updateNested = (section, sub, field, val) => { setToday(prev => { const updated = { ...prev, [section]: { ...prev[section], [sub]: { ...prev[section][sub], [field]: val } } }; updated.score = calcScore(updated); return updated; }); setSaved(false); };

  const saveDay = () => {
    const updated = { ...today, score: calcScore(today) };
    const newHistory = [...history.filter(d => d.date !== today.date), updated].sort((a, b) => a.date.localeCompare(b.date));
    setHistory(newHistory); saveAll(newHistory, todos, goals, patrimoine, profile);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const addTodo = () => { if (!newTodo.trim()) return; const t = [...todos, { id: Date.now(), text: newTodo, done: false, date: new Date().toISOString().split("T")[0] }]; setTodos(t); saveAll(history, t, goals, patrimoine, profile); setNewTodo(""); };
  const toggleTodo = id => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const deleteTodo = id => { const t = todos.filter(t => t.id !== id); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const totalPatrimoine = patrimoine.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const updateGoalField = (id, f, v) => { const g = goals.map(g => g.id === id ? { ...g, [f]: v } : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const saveEditedGoal = (edited) => { const g = goals.map(g => g.id === edited.id ? edited : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const addGoal = () => {
    if (!newGoal.label.trim()) return;
    if (!isPro && goals.length >= 3) { setShowSubscription(true); return; }
    const g = [...goals, { ...newGoal, id: Date.now(), manualProgress: 0 }];
    setGoals(g); saveAll(history, todos, g, patrimoine, profile);
    setNewGoal({ label: "", category: "", color: C.red, sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  };
  const deleteGoal = id => { const g = goals.filter(g => g.id !== id); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const moveGoal = (idx, dir) => { const g = [...goals]; const ni = idx + dir; if (ni < 0 || ni >= g.length) return; [g[idx], g[ni]] = [g[ni], g[idx]]; setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const updatePoche = (id, f, v) => { const p = patrimoine.map(p => p.id === id ? { ...p, [f]: v } : p); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const addPoche = () => { if (!newPoche.name.trim()) return; if (!isPro && patrimoine.length >= 2) { setShowSubscription(true); return; } const p = [...patrimoine, { ...newPoche, id: Date.now(), amount: Number(newPoche.amount) }]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); setNewPoche({ name: "", amount: 0, color: "#2563eb" }); };
  const deletePoche = id => { const p = patrimoine.filter(p => p.id !== id); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const movePoche = (idx, dir) => { const p = [...patrimoine]; const ni = idx + dir; if (ni < 0 || ni >= p.length) return; [p[idx], p[ni]] = [p[ni], p[idx]]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const updateProfile = (f, v) => { const pr = { ...profile, [f]: v }; setProfile(pr); saveAll(history, todos, goals, patrimoine, pr); };
  const handleProfilePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(f); };
  const handleSportPhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => update("sport", "photoUrl", ev.target.result); r.readAsDataURL(f); };
  const handleSignOut = async () => { await supabase.auth.signOut(); localStorage.removeItem("kojihlife_v9"); setOnboarded(false); };

  const intel = getIntelligence(history, totalPatrimoine, goals);
  const temporalInsights = getTemporalIntelligence(today, history, goals);
  const age = calcAge(profile.dob);
  const rangeH = history.slice(-parseInt(statRange));
  const streak = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].score > 0) c++; else break; } return c; })();
  const sleepH = history.filter(d => d.sleep?.duration > 0);
  const sportH = history.filter(d => d.sport?.duration > 0 && !d.sport?.isRest);
  const moodH = history.filter(d => d.mind?.mood > 0);
  const screenH = history.filter(d => d.work?.screenTime > 0);
  const waterH = history.filter(d => d.nutrition?.water > 0);
  const displayedGoals = isPro ? goals : goals.slice(0, 3);
  const computedGoals = displayedGoals.map(g => ({ ...g, computedProgress: calcGoalProgress(g, history, totalPatrimoine) }));
  const protGoal = goals.find(g => g.sourceId === "proteines");
  const protTarget = nutritionGoals.protTarget || (protGoal ? Number(protGoal.target) : 150);
  const calTarget = nutritionGoals.calTarget || 2000;
  const fatTarget = nutritionGoals.fatTarget || 65;
  const carbsTarget = nutritionGoals.carbsTarget || 200;
  const protCurrent = today.nutrition.protein || 0;
  const calCurrent = today.nutrition.calories || 0;
  const fatCurrent = today.nutrition.fat || 0;
  const carbsCurrent = today.nutrition.carbs || 0;

  const simResult = useMemo(() => {
    let total = Number(sim.amount) || 0; const data = [{ year: 0, value: Math.round(total) }];
    for (let y = 1; y <= sim.years; y++) { total = total * (1 + sim.rate / 100) + sim.monthly * 12; data.push({ year: y, value: Math.round(total) }); }
    return data;
  }, [sim]);

  // Sleep analysis — computed once, used in tracker UI and radar
  const recentBedtimeMins = history.slice(-7).filter(d => d.sleep?.bedtime).map(d => { const [h, m] = d.sleep.bedtime.split(":").map(Number); return h * 60 + m; });
  const todayDate = new Date().toISOString().split("T")[0];
  const yesterdayEntry = [...history].reverse().find(d => d.date !== todayDate);
  const yesterdayHadSport = !!(yesterdayEntry?.sport?.duration >= 30 || yesterdayEntry?.sport?.intensity >= 3);
  const sleepAnalysis = calcSleepScore(today.sleep, age, recentBedtimeMins, yesterdayHadSport);

  const radar = [
    { s: "Sommeil", v: today.sleep.duration > 0 ? Math.max(5, sleepAnalysis.score) : 5 },
    { s: "Sport", v: today.sport.isRest ? 60 : Math.max(5, Math.min(100, today.sport.duration * 2)) },
    { s: "Nutrition", v: Math.max(5, (today.nutrition.breakfast ? 20 : 0) + (today.nutrition.lunch ? 20 : 0) + (today.nutrition.dinner ? 20 : 0) + Math.min(40, today.nutrition.water * 16)) },
    { s: "Travail", v: Math.max(5, today.work.focus * 20) },
    { s: "Mental", v: Math.max(5, today.mind.mood * 20) },
    { s: "Corps", v: today.body?.weight > 0 ? 80 : 20 },
  ];

  const navIdx = NAV_ORDER.indexOf(nav); const trackIdx = TRACK_ORDER.indexOf(trackTab);
  const swipeNav = useSwipe(
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.min(trackIdx + 1, TRACK_ORDER.length - 1)]); else setNav(NAV_ORDER[Math.min(navIdx + 1, NAV_ORDER.length - 1)]); },
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.max(trackIdx - 1, 0)]); else setNav(NAV_ORDER[Math.max(navIdx - 1, 0)]); }
  );

  const STAT_CARDS = [
    { label: "Sommeil", value: today.sleep.duration ? `${today.sleep.duration}h` : "", icon: "sleep", color: C.purple },
    { label: "Sport", value: today.sport.isRest ? "Repos" : today.sport.duration ? `${today.sport.duration}m` : "", icon: "sport", color: C.red },
    { label: "Eau", value: today.nutrition.water ? `${today.nutrition.water}L` : "", icon: "water", color: C.blue },
    { label: "Poids", value: today.body?.weight ? `${today.body.weight}kg` : "", icon: "scale", color: C.orange },
    { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "", icon: "focus", color: C.red },
    { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "", icon: "mood", color: C.green },
  ];

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
  if (onboarded === null) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 40, height: 40, border: `3px solid ${C.red}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, maxWidth: 480, margin: "0 auto", paddingBottom: 90, position: "relative", touchAction: "pan-y" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'DM Sans', sans-serif !important; box-sizing: border-box; }
        input, select, textarea { font-family: 'DM Sans', sans-serif !important; font-size: 16px !important; }
        ::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {editingGoal && <EditGoalModal goal={editingGoal} onSave={saveEditedGoal} onClose={() => setEditingGoal(null)} />}
      {showSubscription && <Subscription onClose={() => setShowSubscription(false)} />}
      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} darkMode={darkMode} setDarkMode={setDarkMode} profile={profile} isPro={isPro} setShowSubscription={setShowSubscription} nutritionGoals={nutritionGoals} setNutritionGoals={setNutritionGoals} onSignOut={handleSignOut} updateProfile={updateProfile} setLang={setLang} />}

      {/* HEADER */}
      <div style={{ padding: "18px 20px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setNav("profile")} style={{ cursor: "pointer" }}>
              {profile.photo
                ? <img src={profile.photo} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.red}` }} />
                : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, #8B1A22)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, boxShadow: `0 4px 14px ${C.red}44` }}>{profile.name?.[0] || "K"}</div>}
            </div>
            <div>
              <p style={{ fontSize: 10, color: C.red, letterSpacing: 2, textTransform: "uppercase", margin: 0, fontWeight: 700 }}>Mylide</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.black, letterSpacing: -0.3 }}>{tr("hello")} {profile.name} 👋</p>
            </div>
          </div>
          <ScoreRing score={today.score} delta={intel.scoreDelta} streak={streak} />
        </div>
        {intel.alerts.length > 0 && <div style={{ marginTop: 12 }}><MsgBox type={intel.alerts[0].type} msg={intel.alerts[0].msg} /></div>}
        {intel.alerts.length === 0 && intel.advice.length > 0 && <div style={{ marginTop: 12 }}><MsgBox type="advice" msg={intel.advice[0]} /></div>}
      </div>

      <div style={{ padding: "14px 16px", position: "relative" }} {...swipeNav}>
        <PageTransition pageKey={nav + trackTab}>

          {/* TODAY */}
          {nav === "today" && (
            <div>
              <Card dark>
                <ST light>{tr("today_balance")}</ST>
                <AthleticRadar data={radar} />
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {STAT_CARDS.map(item => (
                  <div key={item.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 10px", textAlign: "center", borderTop: `3px solid ${item.color}` }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{Ico[item.icon](item.color, 20)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color, letterSpacing: -0.3 }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {temporalInsights.length > 0 && (
                <Card style={{ borderLeft: `3px solid ${C.orange}`, paddingLeft: 16 }}>
                  <ST>{tr("today_intel")}</ST>
                  {temporalInsights.map((insight, i) => <MsgBox key={i} type={insight.type} msg={insight.msg} suggestions={insight.suggestions} />)}
                </Card>
              )}
              {(intel.patterns.length > 0 || intel.patrimoinePrediction || intel.todayPrediction) && (
                <Card style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 16 }}>
                  <ST>Patterns & Predictions</ST>
                  {intel.patterns.map((p, i) => <MsgBox key={i} type="info" msg={p} />)}
                  {intel.patrimoinePrediction && <MsgBox type="info" msg={intel.patrimoinePrediction} />}
                  {intel.todayPrediction && <MsgBox type="info" msg={intel.todayPrediction} />}
                </Card>
              )}
              {intel.scoreDelta !== null && (
                <Card style={{ borderLeft: `3px solid ${intel.scoreDelta >= 0 ? C.green : C.red}`, paddingLeft: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{tr("today_week")}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: intel.scoreDelta >= 0 ? C.green : C.red, letterSpacing: -0.5 }}>{intel.scoreDelta >= 0 ? `+${intel.scoreDelta}` : intel.scoreDelta} pts</p>
                    </div>
                    <div style={{ fontSize: 42 }}>{intel.scoreDelta >= 10 ? "🚀" : intel.scoreDelta >= 0 ? "📈" : "📉"}</div>
                  </div>
                </Card>
              )}
              <EvoChart data={history.slice(-30)} dataKey="score" color={C.red} label="Score global (30j)" unit="" />
              <Card>
                <ST>{tr("today_goals")}</ST>
                {computedGoals.slice(0, 4).map(g => (
                  <div key={g.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{g.label}</span>
                      <span style={{ fontSize: 14, color: g.color, fontWeight: 800 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${g.color}, ${g.color}99)`, width: `${g.computedProgress}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                  </div>
                ))}
                {computedGoals.length === 0 && <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Aucun objectif. Crees-en un dans Objectifs.</p>}
              </Card>
              <Card>
                <ST>To-Do du jour</ST>
                {todos.filter(t => t.date === today.date).slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 12px", background: t.done ? C.surfaceAlt : C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 14, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                  </div>
                ))}
                {!todos.filter(t => t.date === today.date).length && <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Aucune tache. Ajoutes-en dans Tracker.</p>}
              </Card>
            </div>
          )}

          {/* TRACKER */}
          {nav === "track" && (
            <div>
              <div style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 16, paddingBottom: 2 }}>
                {TRACK_TABS.map(t => {
                  const active = trackTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTrackTab(t.id)} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 40, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#CC2936" : C.surface, color: active ? "#fff" : C.muted, display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s", boxShadow: active ? "0 4px 16px rgba(204,41,54,0.4)" : `0 1px 4px rgba(0,0,0,0.06)`, border: active ? "none" : `1px solid ${C.border}` }}>
                      {Ico[t.icon](active ? "#fff" : C.muted, 15)}{tr("tab_" + t.id)}
                    </button>
                  );
                })}
              </div>

              {(() => { const C = LIGHT; return (<div style={{ background: C.bg, borderRadius: 20, marginTop: 8, padding: "4px 0 8px" }}>

              {trackTab === "sleep" && (
                <div>
                  <EvoChart data={sleepH.slice(-30)} dataKey="sleep.duration" color={C.purple} label="Duree de sommeil" unit="h" />
                  <Card>
                    <ST>{tr("sleep_schedule")}</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                      <Field label={tr("sleep_bedtime")}><input type="time" value={today.sleep.bedtime} onChange={e => update("sleep", "bedtime", e.target.value)} style={{ ...inp, minHeight: 52 }} /></Field>
                      <Field label={tr("sleep_wakeup")}><input type="time" value={today.sleep.wakeup} onChange={e => update("sleep", "wakeup", e.target.value)} style={{ ...inp, minHeight: 52 }} /></Field>
                    </div>
                    {today.sleep.duration > 0 && (() => {
                      const sa = sleepAnalysis;
                      return (
                        <div style={{ borderRadius: 16, marginBottom: 16, overflow: "hidden", border: `1.5px solid ${sa.durationColor}30` }}>
                          {/* Header : durée + score */}
                          <div style={{ background: `${sa.durationColor}14`, padding: "16px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: 46, fontWeight: 900, color: sa.durationColor, letterSpacing: -2, lineHeight: 1 }}>{today.sleep.duration}h</div>
                              <div style={{ fontSize: 11, color: sa.durationColor, fontWeight: 700, marginTop: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>{sa.durationStatus}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 32, fontWeight: 900, color: sa.durationColor, letterSpacing: -1, lineHeight: 1 }}>{sa.score}</div>
                              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>/ 100</div>
                              <div style={{ fontSize: 10, color: C.muted, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>Score sommeil</div>
                            </div>
                          </div>
                          {/* Message + conseil */}
                          <div style={{ padding: "14px 18px 16px", background: C.surface }}>
                            <p style={{ margin: "0 0 10px", fontSize: 13, color: C.text, lineHeight: 1.55 }}>{sa.message}</p>
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
                              <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{sa.advice}</p>
                            </div>
                            {sa.dataNote && (
                              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(30,95,204,0.08)", borderRadius: 8, borderLeft: "3px solid #1E5FCC" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#1E5FCC", lineHeight: 1.45 }}>ℹ️ {sa.dataNote}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <ST>{tr("sleep_quality")}</ST>
                    <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
                    <div style={{ height: 16 }} />
                    <Toggle value={today.sleep.noScreen} onChange={v => update("sleep", "noScreen", v)} label={tr("sleep_noscreen")} />
                  </Card>
                </div>
              )}

              {trackTab === "sport" && (
                <div>
                  {intel.todayRec === "rest" ? <MsgBox type="warning" msg={`${intel.consecutiveSport} jours consecutifs : repos recommande.`} /> : intel.todayRec ? <MsgBox type="advice" msg={`Recommandation : ${intel.todayRec}`} /> : null}
                  <Card>
                    <ST>{tr("sport_type")}</ST>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                      {["Musculation", "Running", "Football", "Tennis", "Boxe", "Repos"].map(sport => {
                        const active = today.sport.type === sport;
                        const icons = { Musculation: "💪", Running: "🏃", Football: "⚽", Tennis: "🎾", Boxe: "🥊", Repos: "🛌" };
                        return (
                          <button key={sport} onClick={() => { update("sport", "type", sport); update("sport", "isRest", sport === "Repos"); }} style={{ padding: "10px 18px", borderRadius: 40, border: active ? "none" : `1px solid ${C.border}`, background: active ? C.black : C.surface, color: active ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s", boxShadow: active ? "0 4px 16px rgba(0,0,0,0.2)" : "none" }}>
                            <span style={{ color: active ? C.red : "inherit" }}>{icons[sport]}</span> {sport}
                          </button>
                        );
                      })}
                    </div>
                    {today.sport.type === "Repos" && (<div><MsgBox type="advice" msg={tr("sport_rest_msg")} /><Toggle value={today.sport.stretching} onChange={v => update("sport", "stretching", v)} label={tr("sport_stretching")} /></div>)}
                    {today.sport.type === "Musculation" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Nom de la seance"><input type="text" value={today.sport.sessionName || ""} onChange={e => update("sport", "sessionName", e.target.value)} placeholder="Ex: PPL Push, Full Body..." style={inp} /></Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Duree (min)"><input type="number" value={today.sport.duration || ""} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="Intensite"><div style={{ paddingTop: 6 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                        </div>
                        <Field label="PR / Notes"><input type="text" value={today.sport.notes || ""} placeholder="Ex: Bench 90kg x5" onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                        <ST>Recuperation</ST>
                        <Rating value={today.sport.recovery || 0} onChange={v => update("sport", "recovery", v)} color={today.sport.recovery <= 2 ? C.red : today.sport.recovery <= 3 ? C.orange : C.green} />
                        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{["","Tres douloureux","Courbatures","Correct","Bien","Parfait"][today.sport.recovery] || ""}</p>
                      </div>
                    )}
                    {today.sport.type === "Running" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Distance (km)"><input type="number" value={today.sport.running?.distance || ""} min={0} step={0.1} onChange={e => updateNested("sport", "running", "distance", +e.target.value)} style={inp} /></Field>
                          <Field label="Temps (min)"><input type="number" value={today.sport.running?.time || ""} min={0} onChange={e => updateNested("sport", "running", "time", +e.target.value)} style={inp} /></Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                          <Field label="FC max (bpm)"><input type="number" value={today.sport.heartRateMax || ""} min={0} max={220} onChange={e => update("sport", "heartRateMax", +e.target.value)} style={inp} /></Field>
                        </div>
                        {today.sport.running?.distance > 0 && today.sport.running?.time > 0 && (
                          <div style={{ textAlign: "center", background: `${C.blue}10`, border: `1.5px solid ${C.blue}22`, borderRadius: 14, padding: 16 }}>
                            <span style={{ fontSize: 30, fontWeight: 900, color: C.blue, letterSpacing: -0.5 }}>{(today.sport.running.time / today.sport.running.distance).toFixed(1)} min/km</span>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Allure moyenne</p>
                          </div>
                        )}
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Parcours, ressenti..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}
                    {today.sport.type === "Football" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Type de seance">
                          <select value={today.sport.footballType || ""} onChange={e => update("sport", "footballType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option><option>Match</option><option>Entrainement</option><option>Futsal</option>
                          </select>
                        </Field>
                        {today.sport.footballType === "Match" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <Field label="Buts pour"><input type="number" value={today.sport.scoreFor || ""} min={0} onChange={e => update("sport", "scoreFor", +e.target.value)} style={inp} /></Field>
                            <Field label="Buts contre"><input type="number" value={today.sport.scoreAgainst || ""} min={0} onChange={e => update("sport", "scoreAgainst", +e.target.value)} style={inp} /></Field>
                            <Field label="Resultat">
                              <div style={{ padding: "13px 10px", borderRadius: 12, background: today.sport.scoreFor > today.sport.scoreAgainst ? `${C.green}15` : today.sport.scoreFor < today.sport.scoreAgainst ? `${C.red}15` : C.surfaceAlt, textAlign: "center", fontWeight: 800, fontSize: 13, color: today.sport.scoreFor > today.sport.scoreAgainst ? C.green : today.sport.scoreFor < today.sport.scoreAgainst ? C.red : C.muted }}>
                                {today.sport.scoreFor > today.sport.scoreAgainst ? "Victoire" : today.sport.scoreFor < today.sport.scoreAgainst ? "Defaite" : "Nul"}
                              </div>
                            </Field>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Duree (min)"><input type="number" value={today.sport.duration || ""} min={0} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                        </div>
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Poste, ressenti..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}
                    {today.sport.type === "Tennis" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Type">
                          <select value={today.sport.tennisType || ""} onChange={e => update("sport", "tennisType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option><option>Match</option><option>Entrainement</option>
                          </select>
                        </Field>
                        {today.sport.tennisType === "Match" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <Field label="Score (ex: 6-3, 4-6, 6-4)"><input type="text" value={today.sport.tennisScore || ""} placeholder="6-3, 4-6, 6-4" onChange={e => update("sport", "tennisScore", e.target.value)} style={inp} /></Field>
                            <Field label="Adversaire"><input type="text" value={today.sport.tennisOpponent || ""} placeholder="Nom" onChange={e => update("sport", "tennisOpponent", e.target.value)} style={inp} /></Field>
                            <div style={{ display: "flex", gap: 10 }}>
                              {["Victoire", "Defaite"].map(r => (
                                <button key={r} onClick={() => update("sport", "tennisResult", r)} style={{ flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.border}`, background: today.sport.tennisResult === r ? (r === "Victoire" ? `${C.green}12` : `${C.red}12`) : C.surface, fontWeight: 700, fontSize: 14, color: today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.muted, cursor: "pointer" }}>
                                  {r === "Victoire" ? "🏆 " : "😤 "}{r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Duree (min)"><input type="number" value={today.sport.duration || ""} min={0} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                        </div>
                      </div>
                    )}
                    {today.sport.type === "Boxe" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Type de seance">
                          <select value={today.sport.boxeType || ""} onChange={e => update("sport", "boxeType", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option><option>Sparring</option><option>Sac / Pattes</option><option>Technique</option><option>Combat</option>
                          </select>
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Rounds"><input type="number" value={today.sport.boxeRounds || ""} min={0} max={20} onChange={e => update("sport", "boxeRounds", +e.target.value)} style={inp} /></Field>
                          <Field label="Duree round (min)"><input type="number" value={today.sport.boxeRoundDuration || ""} min={0} max={10} onChange={e => update("sport", "boxeRoundDuration", +e.target.value)} style={inp} /></Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="FC moyenne (bpm)"><input type="number" value={today.sport.heartRate || ""} min={0} max={220} onChange={e => update("sport", "heartRate", +e.target.value)} style={inp} /></Field>
                          <Field label="FC max (bpm)"><input type="number" value={today.sport.heartRateMax || ""} min={0} max={220} onChange={e => update("sport", "heartRateMax", +e.target.value)} style={inp} /></Field>
                        </div>
                        <Field label="Notes"><input type="text" value={today.sport.notes || ""} placeholder="Ressenti, technique..." onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}
                  </Card>
                  {today.sport.type && today.sport.type !== "Repos" && (
                    <Card>
                      <ST>{tr("sport_photo")}</ST>
                      <input type="file" accept="image/*" ref={sportPhotoRef} style={{ display: "none" }} onChange={handleSportPhoto} />
                      <button onClick={() => sportPhotoRef.current.click()} style={{ width: "100%", padding: 16, background: C.surfaceAlt, border: `2px dashed ${C.border}`, borderRadius: 14, cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}>{tr("sport_import_photo")}</button>
                      {today.sport.photoUrl && <img src={today.sport.photoUrl} alt="prog" style={{ width: "100%", borderRadius: 14, marginTop: 12, objectFit: "cover", maxHeight: 240 }} />}
                    </Card>
                  )}
                  <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color={C.red} label="Duree des seances" unit="min" />
                </div>
              )}

              {trackTab === "nutrition" && (() => {
                const goalLabels = { masse: "Prise de masse", perte: "Perte de poids", maintenance: "Maintien", seche: "Séche / Recompo" };
                const goalColors = { masse: "#CC2936", perte: C.blue, maintenance: C.green, seche: C.purple };
                const activeGoalColor = goalColors[nutritionGoals.goalType] || C.orange;
                const currentWeight = today.body?.weight || history.slice().reverse().find(d => d.body?.weight > 0)?.body?.weight || 0;
                const calcAutoMacros = (w, goalType) => {
                  if (!w) return null;
                  const maintenance = Math.round(w * 32.5);
                  const calMap = { maintenance: maintenance, masse: maintenance + 300, perte: maintenance - 400, seche: maintenance - 550 };
                  const protMap = { maintenance: 1.9, masse: 2.0, perte: 2.25, seche: 2.5 };
                  const fatMap = { maintenance: 1.0, masse: 0.9, perte: 0.7, seche: 0.65 };
                  const cal = calMap[goalType];
                  const prot = Math.round(w * protMap[goalType]);
                  const fat = Math.round(w * fatMap[goalType]);
                  const carbs = Math.round((cal - prot * 4 - fat * 9) / 4);
                  return { calTarget: cal, protTarget: prot, fatTarget: fat, carbsTarget: Math.max(0, carbs) };
                };
                const autoMacros = calcAutoMacros(currentWeight, nutritionGoals.goalType);
                const MacroBar = ({ label, current, target, color }) => (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12, color: C.muted }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 800, color: current >= target ? C.green : color }}>{current}/{target}{label === "Calories" ? " kcal" : "g"}</span>
                    </div>
                    <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: current >= target ? C.green : color, width: `${Math.min(100, target > 0 ? (current / target) * 100 : 0)}%`, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
                const filteredMeals = (cat) => MEAL_DB[cat].filter(m => m.goals.includes(nutritionGoals.goalType) && (!veganOnly || m.vegan)).slice(0, 4);
                const mealCategories = [
                  { key: "breakfast", label: "🌅 " + tr("nutr_breakfast") },
                  { key: "lunch", label: "☀️ " + tr("nutr_lunch") },
                  { key: "snack", label: "🍎 " + tr("nutr_snack") },
                  { key: "dinner", label: "🌙 " + tr("nutr_dinner") },
                ];
                return (
                  <div>
                    <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color={C.blue} label="Hydratation" unit="L" />
                    <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-30)} dataKey="nutrition.protein" color={C.purple} label="Proteines" unit="g" />
                    {temporalInsights.filter(i => i.msg.includes("prot") || i.msg.includes("repas") || i.msg.includes("eau")).map((ins, i) => <MsgBox key={i} type={ins.type} msg={ins.msg} suggestions={ins.suggestions} />)}

                    {/* Objectifs nutritionnels */}
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <ST style={{ margin: 0 }}>{tr("nutr_goals_title")}</ST>
                        <button onClick={() => setEditingNutrGoals(v => !v)} style={{ background: editingNutrGoals ? activeGoalColor : C.surfaceAlt, color: editingNutrGoals ? "#fff" : C.muted, border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{editingNutrGoals ? "Fermer" : "Modifier"}</button>
                      </div>
                      {/* Type d'objectif */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        {Object.entries(goalLabels).map(([key, label]) => (
                          <button key={key} onClick={() => { const ng = { ...nutritionGoals, goalType: key }; setNutritionGoals(ng); localStorage.setItem("nutritionGoals", JSON.stringify(ng)); }} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${nutritionGoals.goalType === key ? goalColors[key] : C.border}`, background: nutritionGoals.goalType === key ? `${goalColors[key]}18` : C.surfaceAlt, color: nutritionGoals.goalType === key ? goalColors[key] : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                        ))}
                      </div>
                      {/* Bandeau poids détecté + suggestion auto */}
                      {autoMacros ? (
                        <div style={{ background: `${activeGoalColor}12`, border: `1.5px solid ${activeGoalColor}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <p style={{ fontSize: 12, color: activeGoalColor, fontWeight: 700, margin: 0 }}>⚡ Calculé pour {currentWeight}kg · {goalLabels[nutritionGoals.goalType]}</p>
                            <button onClick={() => { const ng = { ...nutritionGoals, ...autoMacros }; setNutritionGoals(ng); localStorage.setItem("nutritionGoals", JSON.stringify(ng)); }} style={{ background: activeGoalColor, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Appliquer</button>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>{autoMacros.calTarget} kcal</span>
                            <span style={{ fontSize: 11, color: C.purple, fontWeight: 700 }}>{autoMacros.protTarget}g prot</span>
                            <span style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>{autoMacros.carbsTarget}g gluc</span>
                            <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{autoMacros.fatTarget}g lip</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>💡 Entre ton poids dans <strong>Corps</strong> pour obtenir des objectifs personnalisés.</p>
                        </div>
                      )}
                      {/* Champs modifiables */}
                      {editingNutrGoals && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                          {[
                            { key: "calTarget", label: "Calories (kcal)", max: 6000 },
                            { key: "protTarget", label: "Protéines (g)", max: 400 },
                            { key: "carbsTarget", label: "Glucides (g)", max: 600 },
                            { key: "fatTarget", label: "Lipides (g)", max: 300 },
                          ].map(({ key, label, max }) => (
                            <Field key={key} label={label}>
                              <input type="number" value={nutritionGoals[key]} min={0} max={max} onChange={e => { const ng = { ...nutritionGoals, [key]: +e.target.value }; setNutritionGoals(ng); localStorage.setItem("nutritionGoals", JSON.stringify(ng)); }} style={inp} />
                            </Field>
                          ))}
                        </div>
                      )}
                      {/* Barres de progression */}
                      <MacroBar label="Calories" current={calCurrent} target={calTarget} color={C.orange} />
                      <MacroBar label="Protéines" current={protCurrent} target={protTarget} color={C.purple} />
                      <MacroBar label="Glucides" current={carbsCurrent} target={carbsTarget} color={C.blue} />
                      <MacroBar label="Lipides" current={fatCurrent} target={fatTarget} color={C.green} />
                    </Card>

                    {/* Saisie du jour */}
                    <Card>
                      <ST>{tr("nutr_meals_day")}</ST>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                        <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label={tr("nutr_breakfast")} />
                        <Toggle value={today.nutrition.lunch} onChange={v => update("nutrition", "lunch", v)} label={tr("nutr_lunch")} />
                        <Toggle value={today.nutrition.dinner} onChange={v => update("nutrition", "dinner", v)} label={tr("nutr_dinner")} />
                        <Toggle value={today.nutrition.junk} onChange={v => update("nutrition", "junk", v)} label="Junk food" />
                      </div>
                      <ST>{tr("nutr_macros")}</ST>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Eau (L)"><input type="number" value={today.nutrition.water} min={0} max={5} step={0.25} onChange={e => update("nutrition", "water", +e.target.value)} style={inp} /></Field>
                        <Field label="Calories (kcal)"><input type="number" value={today.nutrition.calories} min={0} max={6000} onChange={e => update("nutrition", "calories", +e.target.value)} style={inp} /></Field>
                        <Field label="Protéines (g)"><input type="number" value={today.nutrition.protein} min={0} max={400} onChange={e => update("nutrition", "protein", +e.target.value)} style={inp} /></Field>
                        <Field label="Glucides (g)"><input type="number" value={today.nutrition.carbs} min={0} max={600} onChange={e => update("nutrition", "carbs", +e.target.value)} style={inp} /></Field>
                        <Field label="Lipides (g)"><input type="number" value={today.nutrition.fat} min={0} max={300} onChange={e => update("nutrition", "fat", +e.target.value)} style={inp} /></Field>
                      </div>
                    </Card>

                    {/* Suggestions de repas */}
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <ST style={{ margin: 0 }}>{tr("nutr_suggest")}</ST>
                        <button onClick={() => { const v = !veganOnly; setVeganOnly(v); localStorage.setItem("veganOnly", String(v)); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, border: `2px solid ${veganOnly ? C.green : C.border}`, background: veganOnly ? `${C.green}18` : C.surfaceAlt, color: veganOnly ? C.green : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          🌱 Vegan{veganOnly ? " ✓" : ""}
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>Suggestions pour <strong style={{ color: activeGoalColor }}>{goalLabels[nutritionGoals.goalType]}</strong>{veganOnly ? " · vegan uniquement" : ""}</p>
                      {mealCategories.map(({ key, label }) => {
                        const meals = filteredMeals(key);
                        if (!meals.length) return null;
                        return (
                          <div key={key} style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: C.black, margin: "0 0 8px" }}>{label}</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {meals.map((m, i) => (
                                <div key={i} style={{ background: C.surfaceAlt, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: C.black, margin: "0 0 4px", lineHeight: 1.4 }}>{m.name}</p>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>{m.calories} kcal</span>
                                      <span style={{ fontSize: 11, color: C.purple, fontWeight: 700 }}>{m.protein}g prot</span>
                                      <span style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>{m.carbs}g gluc</span>
                                      <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{m.fat}g lip</span>
                                    </div>
                                  </div>
                                  {m.vegan && <span style={{ fontSize: 10, background: `${C.green}22`, color: C.green, borderRadius: 6, padding: "2px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>🌱</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                );
              })()}

              {trackTab === "body" && (
                <div>
                  <EvoChart data={history.filter(d => d.body?.weight > 0).slice(-60)} dataKey="body.weight" color={C.orange} label="Evolution du poids" unit="kg" />
                  <Card>
                    <ST>{tr("body_weight_sec")}</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <Field label={tr("body_current")}><input type="number" value={today.body?.weight || ""} step={0.1} min={0} onChange={e => update("body", "weight", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("body_target")}><input type="number" value={today.body?.weightTarget || ""} step={0.1} min={0} onChange={e => update("body", "weightTarget", +e.target.value)} style={inp} /></Field>
                    </div>
                    {(() => {
                      const w = today.body?.weight || 0;
                      const wt = today.body?.weightTarget || 0;
                      if (!w || !wt) return null;
                      const diff = (wt - w).toFixed(1);
                      const isGain = wt > w;
                      return <p style={{ fontSize: 12, color: isGain ? C.green : C.orange, fontWeight: 700, margin: "0 0 4px" }}>{isGain ? `+${diff}kg à prendre` : `${Math.abs(diff)}kg à perdre`} · {Math.ceil(Math.abs(diff) / (w * 0.003))} semaines estimées</p>;
                    })()}
                    <ST>{tr("body_measures")}</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label={tr("body_chest")}><input type="number" value={today.body?.chest || ""} min={0} onChange={e => update("body", "chest", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("body_waist")}><input type="number" value={today.body?.waist || ""} min={0} onChange={e => update("body", "waist", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("body_hips")}><input type="number" value={today.body?.hips || ""} min={0} onChange={e => update("body", "hips", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("body_arms")}><input type="number" value={today.body?.arms || ""} min={0} onChange={e => update("body", "arms", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("body_thighs")}><input type="number" value={today.body?.thighs || ""} min={0} onChange={e => update("body", "thighs", +e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              {trackTab === "work" && (
                <div>
                  <EvoChart data={history.filter(d => d.work?.focus > 0).slice(-30)} dataKey="work.focus" color={C.orange} label="Niveau de focus" unit="/5" />
                  <Card>
                    <ST>{tr("work_focus_sec")}</ST>
                    <Rating value={today.work.focus} onChange={v => update("work", "focus", v)} />
                    <div style={{ height: 18 }} />
                    <ST>{tr("work_tasks")}</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <Field label={tr("work_tasks_planned")}><input type="number" value={today.work.tasks} min={0} max={20} onChange={e => update("work", "tasks", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("work_tasks_done")}><input type="number" value={today.work.tasksCompleted} min={0} max={20} onChange={e => update("work", "tasksCompleted", +e.target.value)} style={inp} /></Field>
                    </div>
                    {today.work.tasks > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12, color: C.muted }}>
                          <span style={{ fontWeight: 600 }}>Completion</span><span style={{ color: C.red, fontWeight: 800 }}>{Math.round(Math.min(1, today.work.tasksCompleted / today.work.tasks) * 100)}%</span>
                        </div>
                        <div style={{ height: 7, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: C.red, width: `${Math.min(100, (today.work.tasksCompleted / today.work.tasks) * 100)}%`, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    )}
                    <Field label={tr("work_highlight")}><input type="text" placeholder="Ma meilleure action..." value={today.work.highlight} onChange={e => update("work", "highlight", e.target.value)} style={inp} /></Field>
                  </Card>
                  <Card>
                    <ST>{tr("work_screen")}</ST>
                    <Field label={tr("work_screen_hours")}><input type="number" value={today.work.screenTime} min={0} max={24} step={0.5} onChange={e => update("work", "screenTime", +e.target.value)} style={inp} /></Field>
                    {today.work.screenTime > 0 && (
                      <div style={{ marginTop: 12, padding: 14, background: today.work.screenTime <= 3 ? `${C.green}10` : `${C.red}10`, border: `1.5px solid ${today.work.screenTime <= 3 ? C.green : C.red}22`, borderRadius: 12, fontSize: 13, color: today.work.screenTime <= 3 ? C.green : C.red, fontWeight: 600 }}>
                        {today.work.screenTime <= 3 ? "Excellent : focus preserve" : today.work.screenTime <= 5 ? "Limite" : "Trop eleve : melantonine perturbee"}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {trackTab === "todo" && (
                <div>
                  <Card>
                    <ST>{tr("todo_new")}</ST>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder={tr("todo_placeholder")} style={{ ...inp, flex: 1 }} />
                      <button onClick={addTodo} style={{ background: C.black, color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 800, cursor: "pointer", fontSize: 22 }}>+</button>
                    </div>
                  </Card>
                  {["today","older"].map(group => {
                    const todayDate = new Date().toISOString().split("T")[0];
                    const items = todos.filter(t => group === "today" ? t.date === todayDate : t.date !== todayDate);
                    if (!items.length) return null;
                    return (
                      <Card key={group}>
                        <ST>{group === "today" ? tr("todo_today") : tr("todo_older")}</ST>
                        {items.map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "12px 14px", background: t.done ? C.surfaceAlt : C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                            <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 20, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                            <span style={{ fontSize: 14, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                            <span onClick={() => deleteTodo(t.id)} style={{ fontSize: 14, color: C.subtle, cursor: "pointer", padding: 4 }}>✕</span>
                          </div>
                        ))}
                      </Card>
                    );
                  })}
                  {!todos.length && <Card><p style={{ color: C.muted, fontSize: 14, textAlign: "center", margin: 0 }}>Aucune tache !</p></Card>}
                </div>
              )}

              {trackTab === "mind" && (
                <div>
                  <EvoChart data={moodH.slice(-30)} dataKey="mind.mood" color={C.purple} label="Evolution humeur" unit="/5" />
                  <Card>
                    <ST>{tr("mind_mood_day")}</ST>
                    <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} color={today.mind.mood >= 4 ? C.green : today.mind.mood >= 3 ? C.orange : C.red} />
                    <p style={{ fontSize: 13, color: C.muted, marginTop: 8, marginBottom: 16 }}>{["","Difficile","Moyen","Correct","Bien","Excellent"][today.mind.mood] || ""}</p>
                    <ST>{tr("mind_dev")}</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Field label={tr("mind_reading")}><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                      <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label={tr("mind_meditation")} />
                      <Field label={tr("mind_skill")}><input type="text" placeholder="Ex: closing, copywriting..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                      <Field label={tr("mind_gratitude")}><input type="text" placeholder="Une chose positive..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              <button onClick={saveDay} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", background: saved ? `linear-gradient(135deg, ${C.green}, #128a3a)` : `linear-gradient(135deg, #CC2936, #8B1A22)`, color: "#fff", fontSize: 16, fontWeight: 800, transition: "all 0.35s", marginTop: 6, boxShadow: saved ? `0 8px 28px ${C.green}44` : "0 8px 28px rgba(204,41,54,0.4)", letterSpacing: 0.2 }}>
                {saved ? tr("saved") : tr("save_day")}
              </button>
              </div>); })()}
            </div>
          )}

          {/* ARGENT */}
          {nav === "money" && (
            <div>
              <Card accent>
                <ST light>{tr("money_total")}</ST>
                <p style={{ fontSize: 46, fontWeight: 900, color: "#fff", margin: "0 0 4px", lineHeight: 1, letterSpacing: -1 }}>{totalPatrimoine.toLocaleString("fr-FR")} €</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                {intel.patrimoinePrediction && <div style={{ marginTop: 14, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{intel.patrimoinePrediction}</div>}
              </Card>
              {patrimoine.some(p => p.amount > 0) && (
                <Card>
                  <ST>{tr("money_split")}</ST>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart><Pie data={patrimoine.filter(p => p.amount > 0)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={32} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} fontSize={10}>
                      {patrimoine.filter(p => p.amount > 0).map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Pie><Tooltip formatter={v => [`${v.toLocaleString("fr-FR")}€`, ""]} /></PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <Card>
                <ST>{tr("money_pockets")}</ST>
                {patrimoine.map((p, idx) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "14px 16px", background: C.surfaceAlt, borderRadius: 16, borderLeft: `4px solid ${p.color}` }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => movePoche(idx, -1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted }}>{Ico.up(C.muted, 14)}</button>
                      <button onClick={() => movePoche(idx, 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted }}>{Ico.down(C.muted, 14)}</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      {renamingPoche === p.id ? <input autoFocus value={p.name} onChange={e => updatePoche(p.id, "name", e.target.value)} onBlur={() => setRenamingPoche(null)} onKeyDown={e => e.key === "Enter" && setRenamingPoche(null)} style={{ ...inp, padding: "4px 8px", fontSize: 14, fontWeight: 700 }} /> : <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}>{p.name}</p>}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                        <input type="number" value={p.amount} onChange={e => updatePoche(p.id, "amount", +e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: 22, fontWeight: 900, color: p.color, width: 150, fontFamily: "inherit" }} />
                        <span style={{ fontSize: 13, color: C.muted }}>€</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setRenamingPoche(p.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{Ico.edit(C.muted, 14)}</button>
                      <input type="color" value={p.color} onChange={e => updatePoche(p.id, "color", e.target.value)} style={{ width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer" }} />
                      <button onClick={() => deletePoche(p.id)} style={{ background: `${C.red}12`, border: `1px solid ${C.red}22`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={newPoche.name} onChange={e => setNewPoche(p => ({ ...p, name: e.target.value }))} placeholder="Nom" style={inp} />
                    <input type="number" value={newPoche.amount} onChange={e => setNewPoche(p => ({ ...p, amount: +e.target.value }))} placeholder="Montant €" style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="color" value={newPoche.color} onChange={e => setNewPoche(p => ({ ...p, color: e.target.value }))} style={{ width: 46, height: 46, borderRadius: 12, border: "none", cursor: "pointer" }} />
                    <button onClick={addPoche} style={{ flex: 1, padding: "13px", background: C.black, color: "#fff", border: "none", borderRadius: 14, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Ajouter une poche</button>
                  </div>
                </div>
              </Card>
              <Card>
                <ST>Flux du jour</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Revenus (€)"><input type="number" value={today.money.income} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} /></Field>
                  <Field label="Depenses (€)"><input type="number" value={today.money.expense} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} /></Field>
                </div>
                <Field label="Investi (€)"><input type="number" value={today.money.invested} min={0} onChange={e => update("money", "invested", +e.target.value)} style={{ ...inp, marginBottom: 12 }} /></Field>
                <Field label="Note"><input type="text" placeholder="Ex: DCA ETF World..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
              </Card>
              <Card>
                <ST>Simulateur</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <Field label="Capital (€)"><input type="number" value={sim.amount} onChange={e => setSim(s => ({ ...s, amount: +e.target.value }))} style={inp} /></Field>
                  <Field label="Versement/mois (€)"><input type="number" value={sim.monthly} onChange={e => setSim(s => ({ ...s, monthly: +e.target.value }))} style={inp} /></Field>
                  <Field label="Rendement/an (%)"><input type="number" value={sim.rate} step={0.5} onChange={e => setSim(s => ({ ...s, rate: +e.target.value }))} style={inp} /></Field>
                  <Field label="Duree (ans)"><input type="number" value={sim.years} min={1} max={50} onChange={e => setSim(s => ({ ...s, years: +e.target.value }))} style={inp} /></Field>
                </div>
                <div style={{ textAlign: "center", padding: 20, background: `${C.green}10`, border: `1.5px solid ${C.green}22`, borderRadius: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Dans {sim.years} ans</p>
                  <p style={{ fontSize: 38, fontWeight: 900, color: C.green, margin: 0, letterSpacing: -0.5 }}>{simResult[simResult.length-1]?.value.toLocaleString("fr-FR")} €</p>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={simResult}>
                    <defs><linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3"/>
                    <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={y => `${y}a`} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={38} tickFormatter={v => `${Math.round(v/1000)}k`} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12 }} formatter={v => [`${v.toLocaleString("fr-FR")}€`, "Valeur"]}/>
                    <Area type="monotone" dataKey="value" stroke={C.green} strokeWidth={2.5} fill="url(#simGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* OBJECTIFS */}
          {nav === "goals" && (
            <div>
              <Card>
                <ST>Nouvel objectif</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Ex: 170g de proteines/jour" style={inp} />
                  <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Categorie" style={inp} />
                  <Field label="Source de donnees">
                    <select value={newGoal.sourceId} onChange={e => setNewGoal(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text }}>
                      {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Field>
                  {newGoal.sourceId !== "manual" && (<>
                    <Field label={`Valeur cible (${DATA_SOURCES.find(s => s.id === newGoal.sourceId)?.unit || ""})`}>
                      <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} placeholder="Ex: 170" style={inp} />
                    </Field>
                    <Toggle value={newGoal.reverse} onChange={v => setNewGoal(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
                  </>)}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Debut"><input type="date" value={newGoal.startDate} onChange={e => setNewGoal(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
                    <Field label="Fin"><input type="date" value={newGoal.endDate} onChange={e => setNewGoal(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, flexShrink: 0, fontWeight: 600 }}>Couleur</label>
                    <input type="color" value={newGoal.color} onChange={e => setNewGoal(p => ({ ...p, color: e.target.value }))} style={{ width: 46, height: 46, borderRadius: 12, border: `2px solid ${C.border}`, cursor: "pointer", padding: 2 }} />
                  </div>
                  <button onClick={addGoal} style={{ background: C.black, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>+ Ajouter l'objectif</button>
                </div>
              </Card>
              {computedGoals.map((g, idx) => {
                const src = DATA_SOURCES.find(s => s.id === g.sourceId);
                const daysLeft = g.endDate ? Math.max(0, Math.round((new Date(g.endDate) - new Date()) / 86400000)) : null;
                return (
                  <Card key={g.id} style={{ borderLeft: `4px solid ${g.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => moveGoal(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: "3px 6px", color: idx === 0 ? C.subtle : C.muted }}>{Ico.up(idx === 0 ? C.subtle : C.muted, 14)}</button>
                          <button onClick={() => moveGoal(idx, 1)} disabled={idx === computedGoals.length - 1} style={{ background: "none", border: "none", cursor: idx === computedGoals.length - 1 ? "default" : "pointer", padding: "3px 6px", color: idx === computedGoals.length - 1 ? C.subtle : C.muted }}>{Ico.down(idx === computedGoals.length - 1 ? C.subtle : C.muted, 14)}</button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.black }}>{g.label}</p>
                          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: g.color, fontWeight: 700, background: `${g.color}15`, borderRadius: 8, padding: "2px 8px" }}>{g.category}</span>
                            {src && src.id !== "manual" && <span style={{ fontSize: 11, color: C.muted, background: C.surfaceAlt, borderRadius: 8, padding: "2px 8px" }}>{src.label} · cible: {Number(g.target).toLocaleString()}{src.unit}</span>}
                            {daysLeft !== null && <span style={{ fontSize: 11, color: daysLeft < 30 ? C.red : C.muted, background: C.surfaceAlt, borderRadius: 8, padding: "2px 8px" }}>{daysLeft}j restants</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: g.computedProgress >= 100 ? C.green : g.color, letterSpacing: -0.5 }}>{g.computedProgress}%</span>
                        <button onClick={() => setEditingGoal(g)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{Ico.edit(C.muted, 14)}</button>
                        <button onClick={() => deleteGoal(g.id)} style={{ background: `${C.red}10`, border: `1px solid ${C.red}22`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
                      </div>
                    </div>
                    <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: g.computedProgress >= 100 ? C.green : g.color, width: `${Math.min(100, g.computedProgress)}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                    {g.sourceId === "manual" && (
                      <input type="range" min={0} max={100} value={g.computedProgress} onChange={e => updateGoalField(g.id, "manualProgress", +e.target.value)} style={{ width: "100%", accentColor: g.color, cursor: "pointer", marginTop: 10 }} />
                    )}
                  </Card>
                );
              })}
              {computedGoals.length === 0 && <Card><p style={{ color: C.muted, fontSize: 14, textAlign: "center", margin: 0 }}>Aucun objectif. Crees-en un !</p></Card>}
            </div>
          )}

          {/* STATS */}
          {nav === "stats" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["7","7j"],["30","30j"],["90","3 mois"],["365","1 an"]].map(([v, l]) => (
                  <button key={v} onClick={() => { if (!isPro && v !== "7") { setShowSubscription(true); return; } setStatRange(v); }} style={{ flex: 1, padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: statRange === v ? C.black : C.surface, color: statRange === v ? "#fff" : C.muted, opacity: !isPro && v !== "7" ? 0.5 : 1, border: statRange === v ? "none" : `1px solid ${C.border}` }}>{l}{!isPro && v !== "7" ? " 🔒" : ""}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Jours trackes", value: history.length, color: C.red },
                  { label: "Score moyen", value: `${intel.scoreAvg}/100`, color: C.orange },
                  { label: "Nuits > 7h30", value: rangeH.filter(d => d.sleep?.duration >= 7.5).length, color: C.purple },
                  { label: "Seances sport", value: rangeH.filter(d => d.sport?.duration >= 30).length, color: C.red },
                  { label: "Streak actuel", value: `${streak}j 🔥`, color: C.orange },
                  { label: "Objectifs actifs", value: goals.length, color: C.green },
                ].map(item => (
                  <div key={item.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 14px", textAlign: "center", borderTop: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: item.color, letterSpacing: -0.5 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <Card>
                <ST>Calendrier · 84 derniers jours</ST>
                <CalendarHeatmap history={history} />
              </Card>
              {intel.patterns.length > 0 && (
                <Card style={{ borderLeft: `3px solid ${C.purple}`, paddingLeft: 16 }}>
                  <ST>Patterns detectes</ST>
                  {intel.patterns.map((p, i) => <MsgBox key={i} type="info" msg={p} />)}
                </Card>
              )}
              <EvoChart data={rangeH} dataKey="score" color={C.red} label="Score global" unit="" height={170} />
              <EvoChart data={sleepH.slice(-parseInt(statRange))} dataKey="sleep.duration" color={C.purple} label="Sommeil" unit="h" />
              <EvoChart data={sportH.slice(-parseInt(statRange))} dataKey="sport.duration" color={C.red} label="Sport" unit="min" />
              <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color={C.purple} label="Humeur" unit="/5" />
              <EvoChart data={screenH.slice(-parseInt(statRange))} dataKey="work.screenTime" color={C.orange} label="Temps d'ecran" unit="h" />
              <Card>
                <ST>Progression objectifs</ST>
                {computedGoals.map(g => (
                  <div key={g.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 14, color: g.color, fontWeight: 800 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: g.color, width: `${g.computedProgress}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* PROFIL */}
          {nav === "profile" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={() => setShowSettings(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.black, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
                  <span style={{ fontSize: 16 }}>⚙️</span> Paramètres
                </button>
              </div>
              <Card accent style={{ textAlign: "center", paddingTop: 28, paddingBottom: 28 }}>
                <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handleProfilePhoto} />
                <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", display: "inline-block", position: "relative", marginBottom: 14 }}>
                  {profile.photo ? <img src={profile.photo} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.3)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }} />
                    : <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 42, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "M"}</div>}
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(255,255,255,0.9)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>📷</div>
                </div>
                <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: -0.5 }}>{profile.name}</p>
                {age !== null && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0, fontWeight: 500 }}>{age} ans · Kojihsports</p>}
              </Card>
              <Card>
                <ST>Informations</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Prenom"><input value={profile.name} onChange={e => updateProfile("name", e.target.value)} style={inp} /></Field>
                  <Field label="Date de naissance"><input type="date" value={profile.dob || ""} onChange={e => updateProfile("dob", e.target.value)} style={inp} /></Field>
                  {age !== null && (
                    <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>Age calcule automatiquement</span>
                      <span style={{ fontSize: 26, fontWeight: 900, color: C.red, letterSpacing: -0.5 }}>{age} ans</span>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <ST>Resume</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Jours trackes", value: history.length },
                    { label: "Streak", value: `${streak}j 🔥` },
                    { label: "Score moyen", value: `${intel.scoreAvg}/100` },
                    { label: "Objectifs", value: goals.length },
                    { label: "Patrimoine", value: `${(totalPatrimoine/1000).toFixed(1)}k€` },
                    { label: "Taches faites", value: todos.filter(t => t.done).length },
                  ].map(item => (
                    <div key={item.label} style={{ background: C.surfaceAlt, borderRadius: 16, padding: 16, textAlign: "center", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.red, letterSpacing: -0.5 }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card accent>
                <ST light>Vision</ST>
                <input value={profile.vision || ""} onChange={e => updateProfile("vision", e.target.value)} placeholder="Ta vision personnelle..." style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 16, width: "100%", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
              </Card>
              <Card>
                <div onClick={() => setShowSubscription(true)} style={{ background: "linear-gradient(135deg, #CC2936, #8B1A22)", borderRadius: 16, padding: "18px 20px", marginBottom: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 32px rgba(204,41,54,0.35)" }}>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 900, fontSize: 17, margin: "0 0 3px", letterSpacing: -0.2 }}>Passer a Pro ⭐</p>
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: 0 }}>1 mois gratuit · 3,59€/mois ensuite</p>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 }}>→</span>
                </div>
                <ST>Parametres</ST>
                <div onClick={() => setDarkMode(d => !d)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", background: C.surfaceAlt, borderRadius: 16, marginBottom: 12, cursor: "pointer", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{darkMode ? "☀️" : "🌙"}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{darkMode ? "Mode clair" : "Mode sombre"}</span>
                  </div>
                  <div style={{ width: 46, height: 26, borderRadius: 13, background: darkMode ? C.red : C.subtle, position: "relative", transition: "background 0.25s" }}>
                    <div style={{ position: "absolute", top: 3, left: darkMode ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
                  </div>
                </div>
                <button onClick={() => { localStorage.removeItem("kojihlife_v9"); setOnboarded(false); }} style={{ width: "100%", padding: "14px", background: `${C.red}10`, border: `1.5px solid ${C.red}22`, borderRadius: 14, cursor: "pointer", fontSize: 14, color: C.red, fontWeight: 700 }}>
                  Refaire l'onboarding
                </button>
              </Card>
            </div>
          )}

        </PageTransition>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: darkMode ? "rgba(12,12,12,0.96)" : "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(n => {
          const active = nav === n.id;
          return (
            <button key={n.id} onClick={() => setNav(n.id)} style={{ flex: 1, padding: "10px 4px 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: active ? (darkMode ? "#1E1E1E" : "#F0F0EE") : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                {Ico[n.icon](active ? C.red : C.muted, 20)}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? C.red : C.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>{tr("nav_" + n.id)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}