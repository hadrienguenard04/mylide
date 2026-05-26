import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MEAL_DB as NEW_MEAL_DB, getMeals, getMealEmoji, CAT_LABELS, CAT_ICONS } from './mealEngine.js';
import { supabase } from "./supabase";
import { Icon } from "./icons.jsx";
import FAQPage from "./FAQ.jsx";
import LegalPage from "./Legal.jsx";
import { isAtLeast } from "./planConfig.js";
import {
  GOAL_CONFIG, ACTIVITY_LEVELS,
  calcBMR, calcTDEE, calcSportBurn, calcMacros,
  estimateProgress, detectContradictions, formatProgress, validateDateTarget,
  inferActivityLevel, getWeeklySportFreq, getGoalMessage,
} from "./nutritionScience.js";

const VAPID_PUBLIC_KEY = "BD1163GBvUcRa73jWQncoH1awx662axyd7RCZ7FQlyha-mmYsEdCu--kB9yl__7cJ6VpZb0MzzD9qTuGWp1djxo";

async function registerPush(notifPrefs, wakeTime = "07:00", sleepTime = "23:00", notifV2 = null) {
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
    // Détection automatique du fuseau horaire de l'appareil
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
    // Lire le notifV2 depuis localStorage si non fourni
    const v2 = notifV2 || (() => { try { return JSON.parse(localStorage.getItem("notifV2")); } catch { return null; } })();
    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      subscription: sub.toJSON(),
      notif_prefs: notifPrefs,
      notif_v2: v2,
      wake_time: wakeTime,
      sleep_time: sleepTime,
      timezone,
    }, { onConflict: "user_id" });
  } catch (e) { console.warn("Push registration failed", e); }
}
import Subscription from "./Subscription";
import { useTheme, useC } from "./theme.jsx";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
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
// _themeC : copie mutable pour les getters d'objets de style définis hors composants (inp, settingsInp)
// Les composants React utilisent useC() ou const C = darkMode ? DARK : LIGHT (immutable)
let _themeC = { ...LIGHT };

const NAV_ORDER = ["today", "track", "money", "goals", "stats", "profile"];
const TRACK_ORDER = ["sleep", "sport", "nutrition", "body", "work", "todo", "mind"];

// ── FOOD DATABASE ──────────────────────────────────────────────────────────
// allMeals : liste plate pour les suggestions intelligentes de protéines
const allMeals = Object.values(NEW_MEAL_DB).flat();

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
    .filter(m => m.macros.prot >= proteinNeeded * 0.5 && m.macros.prot <= proteinNeeded * 1.5)
    .sort((a, b) => Math.abs(a.macros.prot - proteinNeeded) - Math.abs(b.macros.prot - proteinNeeded))
    .slice(0, 2)
    .map(m => ({ name: m.name, items: [`${m.macros.prot}g prot`, `${m.macros.cal} kcal`], totalProtein: m.macros.prot, timing: hour >= 22 ? "Léger avant 23h" : "Idéal maintenant" }));
};
const _OLD_MEAL_DB_REMOVED = null; // suprimé — utilise mealEngine.js
if (false) { const _MEAL_DB_STUB = {
  breakfast: [
    { name: "stub", ingredients: [], protein: 0, carbs: 0, fat: 0, calories: 0, vegan: false, goals: [] },
    { name: "Porridge whey banane", ingredients: ["80g flocons d'avoine", "30g whey protéine", "1 banane (120g)", "200ml lait"], protein: 38, carbs: 68, fat: 7, calories: 491, vegan: false, goals: ["masse","maintenance"] },
    { name: "Yaourt grec miel noix", ingredients: ["200g yaourt grec 0%", "1 c.à.s miel", "30g noix"], protein: 22, carbs: 28, fat: 14, calories: 326, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "Pancakes protéinés", ingredients: ["3 œufs entiers", "30g whey protéine", "50g flocons d'avoine"], protein: 42, carbs: 40, fat: 14, calories: 458, vegan: false, goals: ["masse","maintenance"] },
    { name: "Toast beurre de cacahuète banane", ingredients: ["2 tranches pain complet", "30g beurre de cacahuète", "1 banane (120g)"], protein: 14, carbs: 55, fat: 18, calories: 434, vegan: true, goals: ["masse","maintenance"] },
    { name: "Shake de masse matin", ingredients: ["300ml lait entier", "1 banane", "30g whey protéine", "60g flocons d'avoine"], protein: 45, carbs: 75, fat: 8, calories: 568, vegan: false, goals: ["masse"] },
    { name: "Fromage blanc fruits rouges granola", ingredients: ["200g fromage blanc 0%", "100g fruits rouges", "40g granola"], protein: 22, carbs: 38, fat: 5, calories: 285, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "Omelette jambon blanc", ingredients: ["4 œufs entiers", "60g jambon blanc (2 tranches)"], protein: 38, carbs: 2, fat: 24, calories: 378, vegan: false, goals: ["masse","seche"] },
    { name: "Tofu poêlé aux légumes", ingredients: ["200g tofu ferme", "150g légumes poêlés variés", "1 c.à.s huile d'olive"], protein: 20, carbs: 10, fat: 12, calories: 232, vegan: true, goals: ["perte","seche","maintenance"] },
    { name: "Skyr myrtilles amandes", ingredients: ["150g skyr nature", "100g myrtilles", "20g amandes effilées"], protein: 20, carbs: 22, fat: 8, calories: 240, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "Toast seigle œufs pochés épinards", ingredients: ["2 tranches pain de seigle", "2 œufs pochés", "50g épinards frais"], protein: 20, carbs: 30, fat: 10, calories: 290, vegan: false, goals: ["perte","maintenance"] },
    { name: "Muesli lait végétal chia", ingredients: ["60g muesli", "200ml lait végétal", "15g graines de chia"], protein: 12, carbs: 52, fat: 12, calories: 360, vegan: true, goals: ["maintenance","masse"] },
    { name: "Bagel saumon fumé cream cheese", ingredients: ["1 bagel complet", "80g saumon fumé", "30g cream cheese"], protein: 28, carbs: 42, fat: 14, calories: 410, vegan: false, goals: ["masse","maintenance"] },
    { name: "Porridge beurre d'amande pêche", ingredients: ["80g flocons d'avoine cuits", "20g beurre d'amande", "1 pêche (150g)"], protein: 14, carbs: 62, fat: 12, calories: 412, vegan: true, goals: ["masse","maintenance"] },
    { name: "Cottage cheese ananas cannelle", ingredients: ["200g cottage cheese", "150g ananas frais", "½ c.à.c cannelle"], protein: 24, carbs: 22, fat: 2, calories: 202, vegan: false, goals: ["perte","seche"] },
    { name: "Toast seigle œufs durs tomate", ingredients: ["3 œufs durs", "2 tranches pain de seigle", "1 tomate (120g)"], protein: 22, carbs: 28, fat: 12, calories: 284, vegan: false, goals: ["perte","maintenance"] },
    { name: "Porridge avoine lin pomme", ingredients: ["80g flocons d'avoine", "200ml lait", "15g graines de lin", "1 pomme (150g)"], protein: 12, carbs: 65, fat: 8, calories: 380, vegan: true, goals: ["maintenance","masse"] },
    { name: "Toast ricotta framboises", ingredients: ["2 tranches pain complet", "100g ricotta", "50g framboises"], protein: 14, carbs: 35, fat: 10, calories: 290, vegan: false, goals: ["maintenance","perte"] },
    { name: "Yaourt soja granola mangue", ingredients: ["200g yaourt soja", "40g granola", "100g mangue"], protein: 10, carbs: 55, fat: 6, calories: 314, vegan: true, goals: ["maintenance","masse"] },
    { name: "Shake protéiné matin", ingredients: ["30g whey protéine", "200ml lait", "1 banane", "20g beurre de cacahuète"], protein: 40, carbs: 42, fat: 12, calories: 436, vegan: false, goals: ["masse","seche"] },
    { name: "Wrap protéiné œufs poulet", ingredients: ["2 œufs entiers", "100g blancs de poulet", "50g épinards sautés"], protein: 36, carbs: 32, fat: 10, calories: 362, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "Granola maison yaourt nature", ingredients: ["70g granola maison (flocons, miel, amandes)", "200g yaourt nature"], protein: 16, carbs: 60, fat: 14, calories: 434, vegan: false, goals: ["masse","maintenance"] },
    { name: "Fromage blanc spiruline kiwi", ingredients: ["150g fromage blanc 0%", "2 c.à.s spiruline", "1 kiwi (80g)"], protein: 24, carbs: 18, fat: 2, calories: 186, vegan: false, goals: ["perte","seche"] },
    { name: "Galettes riz saumon avocat", ingredients: ["2 galettes de riz", "40g saumon fumé", "50g avocat", "jus de citron"], protein: 16, carbs: 28, fat: 12, calories: 280, vegan: false, goals: ["perte","maintenance"] },
    { name: "Kéfir avoine banane chia", ingredients: ["200ml kéfir", "50g flocons d'avoine", "1 banane (120g)", "10g graines de chia"], protein: 14, carbs: 62, fat: 6, calories: 354, vegan: false, goals: ["maintenance","masse"] },
    { name: "Omelette blancs d'œufs champignons parmesan", ingredients: ["4 blancs d'œufs", "100g champignons", "30g parmesan râpé"], protein: 30, carbs: 4, fat: 10, calories: 222, vegan: false, goals: ["seche","perte"] },
    { name: "Toast épautre houmous œuf dur", ingredients: ["80g pain d'épautre", "50g houmous", "1 œuf dur", "100g tomates cerises"], protein: 20, carbs: 50, fat: 12, calories: 390, vegan: false, goals: ["maintenance","masse","perte"] },
    { name: "Compote de pomme skyr noix", ingredients: ["200g compote de pomme nature", "100g skyr", "20g noix concassées"], protein: 16, carbs: 36, fat: 10, calories: 300, vegan: false, goals: ["perte","maintenance"] },
    { name: "Crêpes légères au lait végétal", ingredients: ["3 crêpes complètes maison", "1 œuf entier", "100ml lait végétal"], protein: 16, carbs: 48, fat: 8, calories: 328, vegan: false, goals: ["maintenance","masse"] },
    { name: "Bol açaï fruits rouges granola", ingredients: ["100g purée d'açaï", "1 banane", "30g granola", "100g fruits rouges"], protein: 8, carbs: 58, fat: 8, calories: 338, vegan: true, goals: ["maintenance","perte"] },
  ],
  lunch: [
    { name: "Poulet riz brocolis", ingredients: ["150g poulet grillé", "80g riz (poids cru) cuit", "200g brocolis vapeur"], protein: 48, carbs: 58, fat: 5, calories: 469, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "Steak haché patate douce haricots verts", ingredients: ["150g steak haché 5% MG", "200g patate douce rôtie", "150g haricots verts"], protein: 38, carbs: 44, fat: 8, calories: 404, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "Saumon quinoa épinards", ingredients: ["150g saumon grillé", "80g quinoa (poids cru) cuit", "100g épinards sautés"], protein: 42, carbs: 40, fat: 20, calories: 504, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "Salade niçoise", ingredients: ["160g thon au naturel", "2 œufs durs", "100g haricots verts", "10 olives noires"], protein: 48, carbs: 8, fat: 18, calories: 386, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Lentilles riz curry", ingredients: ["150g lentilles cuites", "80g riz complet cuit", "sauce curry légère"], protein: 22, carbs: 68, fat: 4, calories: 396, vegan: true, goals: ["masse","maintenance","perte"] },
    { name: "Poulet teriyaki riz edamame", ingredients: ["150g poulet grillé", "80g riz jasmin cuit", "100g edamame", "sauce teriyaki"], protein: 50, carbs: 65, fat: 8, calories: 536, vegan: false, goals: ["masse","maintenance"] },
    { name: "Wrap thon avocat", ingredients: ["1 grande tortilla", "130g thon au naturel", "75g avocat (½)", "80g salade verte"], protein: 34, carbs: 38, fat: 18, calories: 450, vegan: false, goals: ["maintenance","masse"] },
    { name: "Pâtes bolognaise maison", ingredients: ["120g pâtes complètes cuites", "150g bolognaise bœuf 5% MG"], protein: 42, carbs: 72, fat: 12, calories: 572, vegan: false, goals: ["masse","maintenance"] },
    { name: "Tofu grillé soba légumes wok", ingredients: ["180g tofu grillé", "120g nouilles soba cuites", "200g légumes wok"], protein: 26, carbs: 55, fat: 12, calories: 436, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "Poulet avocat patate douce rôtie", ingredients: ["150g poulet grillé", "150g avocat (1 entier)", "200g patate douce rôtie"], protein: 44, carbs: 38, fat: 20, calories: 508, vegan: false, goals: ["masse","seche"] },
    { name: "Salade pois chiches feta concombre", ingredients: ["200g pois chiches cuits", "80g feta", "1 concombre (200g)", "1 c.à.s huile d'olive"], protein: 20, carbs: 40, fat: 18, calories: 398, vegan: false, goals: ["perte","maintenance"] },
    { name: "Cabillaud vapeur riz légumes", ingredients: ["180g cabillaud vapeur", "200g légumes vapeur variés", "80g riz basmati cuit"], protein: 38, carbs: 48, fat: 3, calories: 371, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Buddha bowl tofu pois chiches tahini", ingredients: ["150g tofu", "100g pois chiches cuits", "200g légumes variés", "2 c.à.s tahini"], protein: 24, carbs: 52, fat: 18, calories: 466, vegan: true, goals: ["maintenance","perte"] },
    { name: "Escalope de dinde brocolis pomme de terre", ingredients: ["150g escalope de dinde", "200g brocolis", "200g pomme de terre vapeur"], protein: 46, carbs: 38, fat: 4, calories: 372, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "Crevettes sautées riz pak choi", ingredients: ["180g crevettes sautées", "80g riz jasmin cuit", "200g pak choi"], protein: 34, carbs: 55, fat: 6, calories: 410, vegan: false, goals: ["perte","maintenance","masse"] },
    { name: "Soupe de lentilles corail toast complet", ingredients: ["300ml soupe lentilles corail", "2 tranches pain complet"], protein: 20, carbs: 58, fat: 4, calories: 344, vegan: true, goals: ["perte","maintenance"] },
    { name: "Thon mi-cuit salade mélangée", ingredients: ["180g thon mi-cuit", "150g salade mélangée", "1 c.à.s vinaigrette"], protein: 46, carbs: 6, fat: 12, calories: 314, vegan: false, goals: ["seche","perte"] },
    { name: "Burger maison bœuf légumes", ingredients: ["1 pain complet", "150g steak haché 5% MG", "100g légumes crus", "30g sauce maison"], protein: 44, carbs: 58, fat: 14, calories: 546, vegan: false, goals: ["masse","maintenance"] },
    { name: "Tempeh patate douce kale sauté", ingredients: ["200g tempeh", "200g patate douce", "100g chou kale sauté"], protein: 28, carbs: 42, fat: 10, calories: 370, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "Riz complet œufs pochés sauce soja", ingredients: ["80g riz complet cuit", "2 œufs pochés", "2 c.à.s sauce soja", "graines de sésame"], protein: 20, carbs: 58, fat: 10, calories: 406, vegan: false, goals: ["maintenance","masse"] },
    { name: "Dorade asperges boulgour", ingredients: ["180g filet de dorade", "200g asperges vapeur", "80g boulgour cuit"], protein: 40, carbs: 42, fat: 5, calories: 377, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Poulet effiloché salade avocat", ingredients: ["200g poulet effiloché", "150g mesclun", "150g avocat (1 entier)", "jus de citron"], protein: 48, carbs: 8, fat: 22, calories: 420, vegan: false, goals: ["seche","perte","masse"] },
    { name: "Pâtes pesto maison parmesan", ingredients: ["150g pâtes complètes cuites", "100g pesto maison (basilic, pignons)", "30g parmesan râpé"], protein: 24, carbs: 78, fat: 18, calories: 578, vegan: false, goals: ["masse","maintenance"] },
    { name: "Soupe miso edamame riz vapeur", ingredients: ["250ml bouillon miso", "150g edamame", "80g riz vapeur"], protein: 24, carbs: 48, fat: 8, calories: 360, vegan: true, goals: ["perte","maintenance"] },
    { name: "Bœuf haché champignons quinoa", ingredients: ["180g bœuf haché 5% MG", "150g champignons sautés", "80g quinoa cuit"], protein: 46, carbs: 38, fat: 10, calories: 430, vegan: false, goals: ["masse","seche"] },
    { name: "Purée de pois cassés toast complet", ingredients: ["200g pois cassés cuits", "1 tranche pain complet", "1 c.à.c curcuma"], protein: 22, carbs: 62, fat: 2, calories: 354, vegan: true, goals: ["maintenance","perte","masse"] },
    { name: "Saumon teriyaki riz brocolis", ingredients: ["150g saumon teriyaki", "80g riz basmati cuit", "150g brocolis", "graines de sésame"], protein: 44, carbs: 58, fat: 18, calories: 578, vegan: false, goals: ["masse","maintenance"] },
    { name: "Wraps dinde guacamole", ingredients: ["2 wraps complets", "120g blanc de dinde", "50g guacamole", "100g salade iceberg"], protein: 38, carbs: 52, fat: 16, calories: 502, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "Gaspacho mozzarella tomates", ingredients: ["300g gaspacho maison", "100g mozzarella", "150g tomates", "basilic frais"], protein: 20, carbs: 18, fat: 16, calories: 296, vegan: false, goals: ["perte","maintenance"] },
    { name: "Seitan mariné haricots rouges riz brun", ingredients: ["180g seitan mariné", "100g haricots rouges cuits", "150g riz brun cuit", "salsa maison"], protein: 46, carbs: 68, fat: 6, calories: 514, vegan: true, goals: ["masse","maintenance"] },
  ],
  snack: [
    { name: "Shake protéiné classique", ingredients: ["30g whey protéine", "200ml lait demi-écrémé"], protein: 32, carbs: 12, fat: 5, calories: 221, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "Fromage blanc myrtilles", ingredients: ["200g fromage blanc 0%", "100g myrtilles"], protein: 18, carbs: 16, fat: 0, calories: 136, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "Mélange amandes cajou", ingredients: ["30g amandes", "15g noix de cajou"], protein: 8, carbs: 8, fat: 18, calories: 226, vegan: true, goals: ["maintenance","masse"] },
    { name: "Yaourt grec miel", ingredients: ["200g yaourt grec 0%", "1 c.à.c miel"], protein: 18, carbs: 18, fat: 0, calories: 144, vegan: false, goals: ["maintenance","masse","perte"] },
    { name: "Toast seigle beurre de cacahuète", ingredients: ["2 tranches pain de seigle", "20g beurre de cacahuète"], protein: 10, carbs: 30, fat: 10, calories: 250, vegan: true, goals: ["masse","maintenance"] },
    { name: "Œufs durs", ingredients: ["3 œufs durs"], protein: 18, carbs: 2, fat: 15, calories: 215, vegan: false, goals: ["seche","perte","masse"] },
    { name: "Cottage cheese ananas", ingredients: ["200g cottage cheese", "100g ananas frais"], protein: 22, carbs: 18, fat: 2, calories: 178, vegan: false, goals: ["perte","seche"] },
    { name: "Banane beurre d'amande", ingredients: ["1 banane (120g)", "15g beurre d'amande"], protein: 5, carbs: 32, fat: 8, calories: 220, vegan: true, goals: ["masse","maintenance"] },
    { name: "Barre protéinée maison", ingredients: ["30g whey protéine", "60g flocons d'avoine", "1 c.à.s miel"], protein: 28, carbs: 52, fat: 5, calories: 365, vegan: false, goals: ["masse","maintenance"] },
    { name: "Skyr graines de lin", ingredients: ["150g skyr nature", "10g graines de lin"], protein: 18, carbs: 8, fat: 4, calories: 140, vegan: false, goals: ["perte","seche"] },
    { name: "Edamame salé", ingredients: ["150g edamame cuit et salé"], protein: 14, carbs: 12, fat: 6, calories: 158, vegan: true, goals: ["perte","seche","maintenance"] },
    { name: "Shake de masse", ingredients: ["30g whey protéine", "200ml lait", "1 banane", "40g flocons d'avoine"], protein: 38, carbs: 62, fat: 5, calories: 449, vegan: false, goals: ["masse"] },
    { name: "Crackers seigle thon", ingredients: ["2 crackers de seigle", "100g thon au naturel"], protein: 22, carbs: 16, fat: 2, calories: 170, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "Galettes riz skyr framboises", ingredients: ["2 galettes de riz", "150g skyr", "50g framboises"], protein: 16, carbs: 38, fat: 2, calories: 234, vegan: false, goals: ["maintenance","masse"] },
    { name: "Smoothie épinards banane", ingredients: ["100g épinards frais", "1 banane", "200ml lait végétal"], protein: 5, carbs: 35, fat: 4, calories: 196, vegan: true, goals: ["maintenance","perte"] },
    { name: "Cacahuètes grillées", ingredients: ["40g cacahuètes nature grillées"], protein: 10, carbs: 8, fat: 20, calories: 244, vegan: true, goals: ["masse","maintenance"] },
    { name: "Compote fromage blanc", ingredients: ["200g compote de pomme sans sucre ajouté", "150g fromage blanc 0%"], protein: 14, carbs: 22, fat: 0, calories: 144, vegan: false, goals: ["perte","maintenance"] },
    { name: "Pomme beurre de cacahuète", ingredients: ["1 pomme (150g)", "20g beurre de cacahuète"], protein: 5, carbs: 28, fat: 10, calories: 218, vegan: true, goals: ["maintenance","perte"] },
    { name: "Mix fruits secs oléagineux", ingredients: ["60g mélange abricots secs, amandes et noix"], protein: 8, carbs: 30, fat: 14, calories: 278, vegan: true, goals: ["masse","maintenance"] },
    { name: "Œufs durs gouda tomate", ingredients: ["2 œufs durs", "30g fromage gouda", "1 tomate (120g)"], protein: 18, carbs: 6, fat: 14, calories: 222, vegan: false, goals: ["maintenance","seche"] },
    { name: "Shake chocolat beurre d'amande", ingredients: ["30g whey protéine", "250ml lait d'avoine", "1 c.à.s beurre d'amande", "1 c.à.c cacao"], protein: 30, carbs: 26, fat: 10, calories: 314, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "Kéfir muesli poire", ingredients: ["150g kéfir", "50g muesli sans sucre", "1 poire (150g)"], protein: 10, carbs: 52, fat: 4, calories: 286, vegan: false, goals: ["maintenance","perte"] },
    { name: "Galettes riz houmous concombre", ingredients: ["2 galettes de riz", "80g houmous", "100g concombre", "paprika"], protein: 12, carbs: 38, fat: 10, calories: 290, vegan: true, goals: ["maintenance","perte"] },
    { name: "Crème protéinée framboises", ingredients: ["100g fromage blanc 0%", "10g whey vanille", "50g framboises"], protein: 26, carbs: 12, fat: 1, calories: 161, vegan: false, goals: ["perte","seche"] },
    { name: "Wrap dinde avocat moutarde", ingredients: ["1 tortilla complète", "120g blanc de dinde", "50g avocat", "moutarde"], protein: 32, carbs: 30, fat: 10, calories: 338, vegan: false, goals: ["masse","maintenance","seche"] },
    { name: "Cajou chocolat noir clémentine", ingredients: ["30g noix de cajou", "20g chocolat noir 85%", "1 clémentine (100g)"], protein: 8, carbs: 22, fat: 20, calories: 296, vegan: true, goals: ["maintenance","masse"] },
    { name: "Smoothie protéiné banane avoine", ingredients: ["1 banane", "30g whey protéine", "200ml lait", "30g flocons d'avoine"], protein: 36, carbs: 60, fat: 6, calories: 442, vegan: false, goals: ["masse"] },
    { name: "Crackers seigle skyr canneberges", ingredients: ["3 crackers de seigle", "100g skyr", "30g canneberges séchées"], protein: 16, carbs: 40, fat: 2, calories: 242, vegan: false, goals: ["maintenance","perte"] },
    { name: "Gelée protéinée fruits rouges amandes", ingredients: ["150g gelée (gélatine, whey, fruits rouges)", "20g amandes"], protein: 24, carbs: 14, fat: 12, calories: 258, vegan: false, goals: ["perte","seche"] },
    { name: "Mini bowl riz soufflé miel cannelle", ingredients: ["100g riz soufflé", "150ml lait", "1 c.à.s miel", "cannelle"], protein: 8, carbs: 54, fat: 4, calories: 288, vegan: false, goals: ["maintenance","masse"] },
  ],
  dinner: [
    { name: "Saumon rôti légumes quinoa", ingredients: ["150g saumon au four", "300g légumes rôtis variés", "80g quinoa cuit"], protein: 42, carbs: 35, fat: 18, calories: 474, vegan: false, goals: ["masse","maintenance","perte"] },
    { name: "Poulet rôti haricots verts riz complet", ingredients: ["200g poulet rôti", "200g haricots verts", "150g riz complet cuit"], protein: 50, carbs: 42, fat: 6, calories: 426, vegan: false, goals: ["masse","seche","maintenance"] },
    { name: "Cabillaud épinards patate douce", ingredients: ["180g cabillaud", "200g épinards", "200g patate douce"], protein: 38, carbs: 38, fat: 3, calories: 331, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Steak de bœuf lentilles légumes grillés", ingredients: ["150g steak de bœuf", "100g lentilles cuites", "300g légumes grillés"], protein: 48, carbs: 28, fat: 12, calories: 412, vegan: false, goals: ["masse","seche"] },
    { name: "Tofu riz basmati brocolis", ingredients: ["200g tofu", "150g brocolis", "80g riz basmati cuit", "sauce soja"], protein: 26, carbs: 55, fat: 10, calories: 418, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "Pâtes crevettes courgettes", ingredients: ["120g pâtes cuites", "150g crevettes", "150g courgettes", "1 c.à.s huile d'olive"], protein: 36, carbs: 68, fat: 10, calories: 506, vegan: false, goals: ["masse","maintenance"] },
    { name: "Omelette poulet légumes poêlés", ingredients: ["3 œufs entiers", "100g blanc de poulet", "150g légumes poêlés variés"], protein: 44, carbs: 8, fat: 18, calories: 366, vegan: false, goals: ["seche","perte","masse"] },
    { name: "Salade thon pois chiches", ingredients: ["150g thon", "200g salade verte", "80g pois chiches cuits", "1 c.à.s huile d'olive"], protein: 42, carbs: 22, fat: 14, calories: 382, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Tempeh wok nouilles de riz", ingredients: ["200g tempeh", "200g légumes wok variés", "80g nouilles de riz cuites"], protein: 30, carbs: 52, fat: 12, calories: 436, vegan: true, goals: ["masse","maintenance"] },
    { name: "Escalope de veau ratatouille semoule", ingredients: ["150g escalope de veau", "200g ratatouille", "80g semoule cuite"], protein: 40, carbs: 38, fat: 8, calories: 388, vegan: false, goals: ["maintenance","masse"] },
    { name: "Moules frites au four salade", ingredients: ["200g moules", "150g frites au four", "100g salade verte"], protein: 28, carbs: 38, fat: 6, calories: 318, vegan: false, goals: ["maintenance","perte"] },
    { name: "Poulet brocolis riz de chou-fleur", ingredients: ["150g poulet grillé", "200g brocolis", "150g riz de chou-fleur"], protein: 46, carbs: 12, fat: 5, calories: 277, vegan: false, goals: ["seche","perte"] },
    { name: "Dahl de lentilles carottes", ingredients: ["200g lentilles cuites", "100g carottes", "50g oignons", "épices (cumin, curcuma, coriandre)"], protein: 20, carbs: 52, fat: 4, calories: 324, vegan: true, goals: ["maintenance","perte","masse"] },
    { name: "Crevettes courgettes quinoa citron", ingredients: ["180g crevettes", "200g courgettes", "80g quinoa cuit", "jus de citron"], protein: 36, carbs: 38, fat: 5, calories: 341, vegan: false, goals: ["seche","perte","maintenance"] },
    { name: "Merlu haricots verts riz complet", ingredients: ["150g filet de merlu", "200g haricots verts", "80g riz complet cuit"], protein: 36, carbs: 42, fat: 3, calories: 339, vegan: false, goals: ["perte","seche","maintenance"] },
    { name: "Salade chaude œufs épinards feta", ingredients: ["3 œufs entiers", "200g épinards", "80g feta"], protein: 30, carbs: 6, fat: 22, calories: 342, vegan: false, goals: ["seche","maintenance"] },
    { name: "Seitan poivrons rôtis boulgour", ingredients: ["150g seitan", "200g poivrons rôtis", "80g boulgour cuit"], protein: 38, carbs: 48, fat: 6, calories: 398, vegan: true, goals: ["masse","maintenance"] },
    { name: "Sardines salade toast complet", ingredients: ["200g sardines", "150g salade verte", "2 tranches pain complet"], protein: 36, carbs: 28, fat: 16, calories: 396, vegan: false, goals: ["maintenance","masse","perte"] },
    { name: "Blanc de dinde champignons riz sauvage", ingredients: ["150g blanc de dinde", "200g champignons", "100g riz sauvage cuit"], protein: 44, carbs: 35, fat: 3, calories: 343, vegan: false, goals: ["seche","perte","masse"] },
    { name: "Pois chiches rôtis légumes quinoa harissa", ingredients: ["200g pois chiches rôtis", "200g légumes au four", "80g quinoa cuit", "harissa"], protein: 22, carbs: 62, fat: 8, calories: 408, vegan: true, goals: ["maintenance","masse","perte"] },
    { name: "Poêlée thon courgettes œuf", ingredients: ["150g thon en boîte", "200g courgettes poêlées", "1 œuf entier", "épices variées"], protein: 44, carbs: 10, fat: 10, calories: 306, vegan: false, goals: ["seche","perte"] },
    { name: "Gratin léger poulet épinards", ingredients: ["180g poulet", "200g épinards", "100g fromage frais léger", "muscade"], protein: 46, carbs: 10, fat: 12, calories: 332, vegan: false, goals: ["seche","maintenance","masse"] },
    { name: "Œufs fenouil rôti farro citron confit", ingredients: ["3 œufs entiers", "150g fenouil rôti", "80g farro cuit", "citron confit"], protein: 26, carbs: 48, fat: 16, calories: 440, vegan: false, goals: ["maintenance","perte"] },
    { name: "Cabillaud en papillote julienne de légumes", ingredients: ["200g cabillaud en papillote", "200g julienne de légumes", "1 c.à.s huile de colza"], protein: 40, carbs: 12, fat: 8, calories: 280, vegan: false, goals: ["seche","perte"] },
    { name: "Faux-filet haricots blancs tomates cerises", ingredients: ["200g faux-filet 5% MG", "150g haricots blancs cuits", "100g tomates cerises rôties"], protein: 50, carbs: 28, fat: 8, calories: 386, vegan: false, goals: ["masse","seche"] },
    { name: "Soupe pois cassés toast seigle", ingredients: ["250g soupe de pois cassés", "2 tranches pain de seigle", "1 c.à.s crème végétale"], protein: 20, carbs: 64, fat: 6, calories: 390, vegan: true, goals: ["perte","maintenance"] },
    { name: "Lieu noir purée de céleri-rave salade", ingredients: ["150g lieu noir", "200g purée de céleri-rave (sans beurre)", "100g salade verte"], protein: 36, carbs: 22, fat: 3, calories: 259, vegan: false, goals: ["seche","perte"] },
    { name: "Poitrine de veau ratatouille polenta", ingredients: ["200g poitrine de veau", "200g ratatouille provençale", "60g polenta cuite"], protein: 44, carbs: 32, fat: 8, calories: 378, vegan: false, goals: ["masse","maintenance"] },
    { name: "Shakshuka aux œufs feta", ingredients: ["3 œufs entiers", "100g tomates concassées", "60g feta", "thym frais"], protein: 26, carbs: 10, fat: 20, calories: 318, vegan: false, goals: ["maintenance","seche","perte"] },
    { name: "Curry de pois chiches lait de coco", ingredients: [], protein: 0, carbs: 0, fat: 0, calories: 0, vegan: true, goals: [] },
  ],
}; } // end if(false) — ancien MEAL_DB supprimé

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

// ── NUTRITION TIPS (100+ Q&A per goal) ────────────────────────────────────
const NUTRITION_TIPS = {
  all: [
    { q: "C'est quoi le TDEE ?", a: "Total Daily Energy Expenditure : la quantité de calories que tu brûles en une journée complète (métabolisme de base + activité physique + digestion). C'est ta référence pour savoir si tu es en surplus ou en déficit calorique." },
    { q: "Pourquoi les protéines sont si importantes ?", a: "Les protéines sont les briques de construction des muscles. Sans apport suffisant, ton corps peut puiser dans le tissu musculaire pour récupérer. Objectif général : 1,8 à 2,5g par kg de poids corporel." },
    { q: "Combien de repas par jour ?", a: "3 repas principaux bien structurés suffisent pour la plupart. L'important est d'atteindre tes objectifs caloriques et macro sur la journée, pas le nombre exact de repas." },
    { q: "Pourquoi noter ce que je mange ?", a: "Tracker ta nutrition révèle des habitudes invisibles : déficits en protéines, excès de graisses, repas sautés. La prise de conscience est la première étape du changement." },
    { q: "Les glucides font-ils grossir ?", a: "Non, pas en eux-mêmes. C'est le surplus calorique global qui fait stocker des graisses. Les glucides sont la principale source d'énergie pour le cerveau et les muscles." },
    { q: "À quelle heure manger pour optimiser sa forme ?", a: "Petit-déjeuner dans les 1-2h après le réveil, déjeuner principale source d'énergie, dîner léger et idéalement 2-3h avant le coucher pour ne pas perturber le sommeil." },
    { q: "Faut-il éviter les lipides ?", a: "Absolument pas. Les bonnes graisses (avocat, oléagineux, huile d'olive, poisson gras) sont essentielles pour les hormones, le cerveau et l'absorption des vitamines A, D, E, K." },
    { q: "Comment calculer mes macros ?", a: "MYLIDE le fait automatiquement selon ton poids et ton objectif. La formule de base : calories = protéines×4 + glucides×4 + lipides×9. Applique les suggestions dans l'onglet 'Objectifs nutritionnels'." },
    { q: "Le jeûne intermittent est-il efficace ?", a: "Pour certaines personnes oui, surtout pour contrôler l'apport calorique naturellement. Il n'a pas de magie propre : ce qui compte reste le bilan calorique quotidien." },
    { q: "Manger après 20h fait-il grossir ?", a: "Non, c'est le total de calories sur 24h qui compte. Cependant, manger tard peut perturber ton sommeil si les repas sont copieux, ce qui affecte indirectement ta composition corporelle." },
  ],
  perte: [
    { q: "Pourquoi boire beaucoup d'eau quand on veut perdre du poids ?", a: "Les glucides stockés retiennent l'eau (environ 3g d'eau par gramme de glycogène). En réduisant les glucides, tu perds beaucoup d'eau rapidement. Il faut compenser pour maintenir ton hydratation cellulaire." },
    { q: "Combien de calories en moins pour perdre du poids ?", a: "Un déficit de 400 à 500 kcal/jour est idéal : assez pour perdre 0,5 à 1% de ton poids corporel par semaine, sans trop sacrifier les performances ni la masse musculaire." },
    { q: "Pourquoi les protéines sont cruciales en perte de poids ?", a: "Les protéines ont un fort effet satiétant et un coût énergétique élevé à digérer (effet thermique ~25%). Surtout, elles protègent ta masse musculaire quand tu es en déficit calorique." },
    { q: "Faut-il supprimer les glucides ?", a: "Pas forcément. Réduire les glucides raffinés (sucre, pain blanc) est utile, mais les glucides complexes (riz, avoine, patate douce) restent d'excellentes sources d'énergie et de fibres." },
    { q: "Pourquoi je pèse plus après une séance ?", a: "Inflammation musculaire post-effort, eau retenue pour réparer les fibres, glycogène reconstitué. Le poids peut augmenter de 0,5 à 2kg après une séance intense avant de redescendre." },
    { q: "La balance ne bouge plus, que faire ?", a: "Plateau normal après 3 à 4 semaines. Options : réduire légèrement les calories (50 à 100 kcal), augmenter l'activité, faire une semaine de maintenance puis reprendre, ou vérifier si tu retiens de l'eau (stress, sel)." },
    { q: "Puis-je manger du sport food en perte de poids ?", a: "Les barres et whey sont des outils, pas des obligations. Si tu atteins tes besoins en protéines via la nourriture réelle, pas besoin de compléments." },
    { q: "Pourquoi noter la junk food ?", a: "Une pizza ou un burger peut représenter 1000 à 1500 kcal, soit 50 à 75% de l'objectif journalier. L'identifier te donne un contrôle conscient sans te priver : une fois par semaine, c'est tout à fait viable." },
    { q: "Est-ce que le cardio aide à perdre du poids ?", a: "Oui, il augmente ta dépense calorique. MYLIDE calcule automatiquement les calories brûlées selon le type et la durée de ton sport pour ajuster tes objectifs en conséquence." },
    { q: "Quelle est la différence entre poids perdu et graisse perdue ?", a: "Les premières semaines, tu perds surtout de l'eau et du glycogène (poids rapide). La vraie perte de graisse est plus lente (0,5 à 1kg par semaine en régime conservateur)." },
    { q: "Dois-je manger avant ou après le sport en perte de poids ?", a: "Un repas riche en protéines dans les 2h après la séance est important pour la récupération musculaire. Le reste dépend de tes préférences, sauf si la séance est à jeun (possible mais déconseillé si intensité élevée)." },
    { q: "Pourquoi mon sommeil influence ma perte de poids ?", a: "Le manque de sommeil augmente la ghréline (hormone de la faim) et diminue la leptine (hormone de satiété). Résultat : tu manges plus et ton corps stocke davantage en graisses." },
  ],
  masse: [
    { q: "Combien de calories en plus pour prendre de la masse ?", a: "Un surplus de 200 à 350 kcal/jour est idéal : suffisant pour construire du muscle sans prendre trop de gras. MYLIDE ajoute 300 kcal à ton TDEE de base." },
    { q: "Quelle quantité de protéines pour la prise de masse ?", a: "2,0 à 2,2g par kg de poids corporel. Au-delà de 2,5g/kg, le surplus ne se transforme pas en muscle supplémentaire et est simplement brûlé comme énergie." },
    { q: "Faut-il manger même si on n'a pas faim ?", a: "En prise de masse, oui. Atteindre ton surplus calorique est la priorité. Des repas fréquents (toutes les 3-4h) peuvent aider à répartir l'apport sans se sentir surchargé." },
    { q: "Quand manger ses glucides ?", a: "Priorité avant et après la séance de sport pour maximiser l'énergie et la récupération. Les glucides pré-séance alimentent la performance, les glucides post-séance rechargent le glycogène musculaire." },
    { q: "Le gainer est-il nécessaire ?", a: "Seulement si tu as du mal à atteindre ton apport calorique via la nourriture solide. Préfère des aliments caloriques denses : flocons d'avoine, noix, banane, beurre de cacahuète." },
    { q: "Combien de temps pour voir des résultats ?", a: "Les premières adaptations neuromusculaires (force) arrivent en 2 à 3 semaines. La masse musculaire visible prend 8 à 12 semaines minimum avec une nutrition et un entraînement constants." },
    { q: "Prendre de la masse sans trop de gras, c'est possible ?", a: "Oui avec une prise de masse propre (lean bulk) : surplus modéré (200 à 300 kcal), protéines élevées, entraînement progressif. C'est plus lent mais préserve une composition corporelle favorable." },
    { q: "La créatine aide-t-elle ?", a: "Oui, c'est le complément le mieux étudié. 3 à 5g/jour améliorent la force et favorisent la rétention d'eau dans les muscles (apparence plus volumineuse). Efficace dans 70 à 80% des cas." },
    { q: "Faut-il manger la nuit pour prendre de la masse ?", a: "La caséine (protéine à digestion lente) avant de dormir peut soutenir la synthèse protéique nocturne. 200g de fromage blanc ou 30g de caséine sont suffisants." },
    { q: "Comment éviter de prendre trop de gras ?", a: "Surveille la vitesse de prise de poids : idéalement 0,25 à 0,5% de ton poids/semaine. Si tu prends plus vite, réduis le surplus calorique de 100 à 150 kcal." },
    { q: "L'alcool bloque-t-il la prise de masse ?", a: "Oui sur plusieurs niveaux : il réduit la synthèse protéique, perturbe le sommeil (crucial pour la récupération), apporte des calories vides et diminue la testostérone. À éviter en période de prise sérieuse." },
    { q: "Peut-on prendre de la masse sans viande ?", a: "Absolument. Sources végétales complètes : soja/tofu, seitan, lentilles, pois chiches, quinoa. Complète avec de la whey végane si besoin. Surveille simplement l'apport en lysine et leucine." },
  ],
  seche: [
    { q: "Pourquoi boire encore plus d'eau pendant une sèche ?", a: "En réduisant drastiquement les glucides, ton corps stocke moins d'eau (chaque gramme de glycogène retient ~3g d'eau). Résultat : tu te déshydrates plus rapidement. Vise 3L/jour minimum pour maintenir les fonctions cellulaires, la lipolyse et les performances cognitives." },
    { q: "C'est quoi la différence sèche vs perte de poids ?", a: "La perte de poids = perdre du poids global (graisse + eau + muscle). La sèche = réduire au maximum la masse grasse tout en préservant absolument le muscle. C'est plus exigeant en protéines et en entraînement." },
    { q: "Pourquoi les glucides sont réduits en sèche ?", a: "Les glucides bas maintiennent l'insuline basse, ce qui facilite la lipolyse (utilisation des graisses comme carburant). Mais attention : pas zéro glucides - les légumes, légumineuses et un peu de riz restent importants." },
    { q: "Pourquoi les protéines sont si élevées en sèche (2.5g/kg) ?", a: "Le déficit calorique important peut forcer ton corps à puiser dans les muscles. Un apport protéique très élevé crée un environnement anticatabolique : il protège le tissu musculaire que tu as mis des mois à construire." },
    { q: "Qu'est-ce que la recomposition corporelle ?", a: "Perdre de la graisse et gagner du muscle simultanément. Possible principalement chez les débutants ou après une pause longue. Elle nécessite un léger déficit calorique, beaucoup de protéines et un entraînement de résistance sérieux." },
    { q: "Comment gérer la faim intense pendant une sèche ?", a: "Priorise les aliments à volume élevé et calories basses : légumes verts, blanc d'œuf, fromage blanc 0%, bouillon. Les fibres (psyllium, légumineuses) ralentissent la digestion et maintiennent la satiété." },
    { q: "Faut-il faire beaucoup de cardio pendant une sèche ?", a: "Le cardio modéré (LISS 2-3x/semaine) aide à augmenter la dépense sans catabolisme. Évite l'excès : trop de cardio + déficit calorique = récupération compromise et risque de perte musculaire." },
    { q: "Les refeed days sont-ils utiles ?", a: "Oui. Une journée par semaine à maintenance calorique (avec plus de glucides) relance la leptine, améliore les performances à l'entraînement et réduit l'adaptation métabolique au régime prolongé." },
    { q: "Peut-on faire une sèche longtemps ?", a: "Maximum 12 à 16 semaines d'affilée. Au-delà, les adaptations métaboliques (baisse du métabolisme, hormones perturbées) deviennent contre-productives. Fais une pause maintenance avant une autre phase de sèche." },
    { q: "Comment éviter la fatigue extrême pendant une sèche ?", a: "Mange suffisamment de protéines, maintiens un apport minimal en glucides avant tes séances, dors 7-9h, et réduis le stress. La fatigue intense est souvent le signe d'un déficit trop agressif." },
  ],
  maintenance: [
    { q: "C'est quoi exactement la maintenance ?", a: "Manger exactement autant de calories que tu en brûles. Ton poids reste stable, mais tu peux continuer à améliorer ta composition corporelle (recomposition lente) avec un entraînement sérieux." },
    { q: "Comment savoir si je suis vraiment en maintenance ?", a: "Pèse-toi tous les matins à jeun pendant 2 semaines. Si le poids moyen reste stable (±0.5kg), tu es en maintenance. Si ça varie plus, ajuste tes calories en conséquence." },
    { q: "Faut-il compter les calories en maintenance ?", a: "Sur le long terme, non. La maintenance est souvent atteinte intuitivement une fois que tu connais bien les densités caloriques des aliments. Mais traquer pendant 2 à 3 semaines permet de calibrer ton intuition." },
    { q: "Quelle quantité de protéines en maintenance ?", a: "1,8 à 2g par kg de poids corporel. Cela permet de maintenir la masse musculaire et de soutenir la récupération si tu t'entraînes régulièrement." },
    { q: "Peut-on profiter de la maintenance pour améliorer sa forme physique ?", a: "Oui. En maintenance avec de l'entraînement progressif, la recomposition corporelle permet de gagner du muscle et de perdre de la graisse lentement. Idéal pour la durabilité à long terme." },
    { q: "La maintenance est-elle une étape nécessaire après une sèche ?", a: "Fortement recommandée. Après une phase restrictive, 4 à 8 semaines de maintenance permettent de restaurer les hormones (leptine, testostérone), le métabolisme et les niveaux d'énergie avant une nouvelle phase." },
  ],
};

const DATA_SOURCES = [
  { id: "manual",       label: "Manuel",              unit: "",    path: null,                            labelEx: "Ex: Mediter 10 min/jour",       example: "Ex: 100" },
  { id: "patrimoine",   label: "Patrimoine total",    unit: "€",   path: "patrimoine_total",              labelEx: "Ex: Atteindre 50 000€",         example: "Ex: 50000" },
  { id: "poids",        label: "Poids",               unit: "kg",  path: "body.weight",                   labelEx: "Ex: Atteindre 75kg",            example: "Ex: 75" },
  { id: "proteines",    label: "Proteines/jour",      unit: "g",   path: "nutrition.protein",  isDaily: true, labelEx: "Ex: 150g de proteines/jour", example: "Ex: 150" },
  { id: "eau",          label: "Eau/jour",            unit: "L",   path: "nutrition.water",    isDaily: true, labelEx: "Ex: Boire 2.5L/jour",        example: "Ex: 2.5" },
  { id: "sport_duree",  label: "Duree sport/seance",  unit: "min", path: "sport.duration",     isDaily: true, labelEx: "Ex: 45 min de sport/seance", example: "Ex: 45" },
  { id: "running_dist", label: "Distance running",    unit: "km",  path: "sport.running.distance", isDaily: true, labelEx: "Ex: Courir 5km/seance",  example: "Ex: 5" },
  { id: "score",        label: "Score global/jour",   unit: "",    path: "score",              isDaily: true, labelEx: "Ex: Score de vie > 80",      example: "Ex: 80" },
  { id: "humeur",       label: "Humeur/jour",         unit: "/5",  path: "mind.mood",          isDaily: true, labelEx: "Ex: Humeur positive (4/5)",  example: "Ex: 4" },
  { id: "lecture",      label: "Lecture/jour",        unit: "p",   path: "mind.reading",       isDaily: true, labelEx: "Ex: Lire 20 pages/jour",     example: "Ex: 20" },
  { id: "screen",       label: "Temps ecran/jour",    unit: "h",   path: "work.screenTime",    isDaily: true, reverse: true, labelEx: "Ex: Moins de 2h d'ecran", example: "Ex: 2" },
  { id: "focus",        label: "Focus/jour",          unit: "/5",  path: "work.focus",         isDaily: true, labelEx: "Ex: Focus a 4/5 chaque jour", example: "Ex: 4" },
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

  // Duration component (0–40 pts) - sport de la veille assouplit les nuits longues
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

  // Weighted total - redistribuer les poids manquants
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
  // Sleep → sport recovery pattern
  const sleepSportPattern = last14.filter(d => d.sleep?.duration > 0 && d.sport?.recovery > 0);
  if (sleepSportPattern.length >= 4) {
    const goodSleepRecov = sleepSportPattern.filter(d => d.sleep.duration >= 7.5).reduce((a, b, _, arr) => a + b.sport.recovery / arr.length, 0);
    const poorSleepRecov = sleepSportPattern.filter(d => d.sleep.duration < 7).reduce((a, b, _, arr) => a + b.sport.recovery / arr.length, 0);
    if (goodSleepRecov > 0 && poorSleepRecov > 0 && goodSleepRecov - poorSleepRecov > 0.7)
      patterns.push(`Avec ≥7h30 de sommeil, ta récupération sportive est +${(goodSleepRecov - poorSleepRecov).toFixed(1)} pts meilleure.`);
  }
  // Sleep → mood pattern
  const sleepMoodPattern = last14.filter(d => d.sleep?.duration > 0 && d.mind?.mood > 0);
  if (sleepMoodPattern.length >= 4) {
    const goodMood = sleepMoodPattern.filter(d => d.sleep.duration >= 7.5).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
    const poorMood = sleepMoodPattern.filter(d => d.sleep.duration < 6.5).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
    if (goodMood > 0 && poorMood > 0 && goodMood - poorMood > 0.6)
      patterns.push(`Avec ≥7h30 de sommeil, ton humeur est +${(goodMood - poorMood).toFixed(1)}/5 meilleure.`);
  }
  const avgWater = last3.filter(d => d.nutrition?.water > 0).reduce((a, b, _, arr) => a + b.nutrition.water / arr.length, 0);
  if (avgWater < 2 && avgWater > 0) advice.push("Hydratation insuffisante ces 3 jours.");
  if (avgMood < 3 && avgMood > 0) advice.push("Moral en baisse. 5min coherence cardiaque.");
  // Nutrition advice from protein tracking
  const avgProt = last7.filter(d => d.nutrition?.protein > 0).reduce((a, b, _, arr) => a + b.nutrition.protein / arr.length, 0);
  if (avgProt > 0 && avgProt < 120) advice.push(`Apport protéique moyen trop bas : ${Math.round(avgProt)}g. Vise 150g+ pour préserver le muscle.`);
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
  body: { weight: 0, weightTarget: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0, restingHR: 0, maxHR: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "", screenTime: 0 },
  money: { income: 0, expense: 0, invested: 0, note: "" },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

const defaultPatrimoine = () => ([
  { id: 1, name: "Compte courant", amount: 0, color: "#2563eb" },
  { id: 2, name: "Livret A", amount: 0, color: "#16a34a" },
]);

const POCHE_COLORS = ["#2563eb","#16a34a","#CC2936","#D4580A","#6B35C8","#0891b2","#f59e0b","#e11d48","#0d9488","#4f46e5","#9333ea","#64748b"];
const randomPocheColor = () => POCHE_COLORS[Math.floor(Math.random() * POCHE_COLORS.length)];

const PRIORITIES = [
  { id: "sport",    label: "Sport & Recuperation",   icon: "zap",     color: "#CC2936" },
  { id: "finance",  label: "Finance & Patrimoine",    icon: "diamond", color: "#1A7A4A" },
  { id: "mental",   label: "Mental & Lecture",        icon: "star",    color: "#6B35C8" },
  { id: "nutrition",label: "Nutrition",               icon: "heart",   color: "#D4580A" },
  { id: "business", label: "Business & Travail",      icon: "chart",   color: "#1E5FCC" },
  { id: "running",  label: "Running",                 icon: "refresh", color: "#0891b2" },
  { id: "body",     label: "Composition corporelle",  icon: "user",    color: "#D4580A" },
  { id: "sleep",    label: "Sommeil",                 icon: "bell",    color: "#6B35C8" },
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
  sport: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="12" x2="16" y2="12"/><rect x="4.5" y="9" width="3.5" height="6" rx="1"/><rect x="16" y="9" width="3.5" height="6" rx="1"/><rect x="1" y="10" width="3.5" height="4" rx="0.75"/><rect x="19.5" y="10" width="3.5" height="4" rx="0.75"/></svg>,
  nutrition: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  body: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  work: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  todo: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  mind: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5c0 .8.27 1.54.72 2.13A3.5 3.5 0 0 0 3 11c0 1.35.76 2.52 1.88 3.1A3.5 3.5 0 0 0 7 19.5V21h10v-1.5a3.5 3.5 0 0 0 2.12-5.4A3.5 3.5 0 0 0 21 11a3.5 3.5 0 0 0-3.22-3.37A3.5 3.5 0 0 0 14.5 2a3.5 3.5 0 0 0-2.5 1.05A3.5 3.5 0 0 0 9.5 2z"/><line x1="12" y1="7" x2="12" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
  water: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  scale: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,
  focus: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  mood: (col,sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  up: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  edit: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (col,sz=16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  friends: (col,sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

const TRANSLATIONS = {
  fr: {
    nav_today:"Accueil",nav_track:"Tracker",nav_money:"Argent",nav_goals:"Objectifs",nav_stats:"Stats",nav_profile:"Profil",
    tab_sleep:"Sommeil",tab_sport:"Sport",tab_nutrition:"Nutrition",tab_body:"Corps",tab_work:"Travail",tab_todo:"To-Do",tab_mind:"Mental",
    hello:"Bonjour",save_day:"Sauvegarder la journée",saved:"Sauvegardé !",
    today_balance:"Équilibre du jour",today_goals:"Objectifs en cours",today_intel:"Intelligence · Maintenant",today_week:"Semaine vs précédente",today_nogoals:"Aucun objectif. Créez-en un dans Objectifs.",
    sleep_schedule:"Horaires",sleep_quality:"Qualité",sleep_bedtime:"Coucher",sleep_wakeup:"Réveil",sleep_noscreen:"Pas d'écran 30min avant de dormir",sleep_optimal:"Optimal",sleep_ok:"Correct, visez 7h30+",sleep_insufficient:"Insuffisant",
    sport_type:"Type d'activité",sport_recovery:"Récupération",sport_photo:"Photo de progression",sport_import_photo:"Importer une photo",
    nutr_goals_title:"Objectifs nutritionnels",nutr_meals_day:"Repas du jour",nutr_macros:"Macros du jour",nutr_suggest:"Idées repas",nutr_breakfast:"Petit-déjeuner",nutr_lunch:"Déjeuner",nutr_snack:"Collation",nutr_dinner:"Dîner",
    body_weight_sec:"Poids & objectif",body_measures:"Mensurations",body_current:"Poids actuel (kg)",body_target:"Objectif poids (kg)",body_chest:"Poitrine (cm)",body_waist:"Tour de taille (cm)",body_hips:"Hanches (cm)",body_arms:"Bras (cm)",body_thighs:"Cuisses (cm)",
    work_focus_sec:"Focus & Productivité",work_tasks:"Tâches",work_tasks_planned:"Prévues",work_tasks_done:"Faites",work_highlight:"Highlight du jour",work_screen:"Temps d'écran",work_screen_hours:"Heures aujourd'hui",
    mind_mood_day:"Humeur du jour",mind_dev:"Développement",mind_reading:"Lecture (pages)",mind_meditation:"Méditation / Cohérence cardiaque",mind_skill:"Compétence travaillée",mind_gratitude:"Gratitude du jour",
    todo_new:"Nouvelle tâche",todo_placeholder:"Ajouter une tâche...",todo_today:"Aujourd'hui",todo_older:"Anciennes",
    money_total:"Patrimoine total",money_split:"Répartition",money_pockets:"Mes poches",
    sec_account:"Compte",sec_goals:"Objectifs",sec_devices:"Appareils connectés",sec_notif:"Notifications",sec_appearance:"Apparence",sec_privacy:"Confidentialité & Sécurité",sec_ai:"IA & Analyses",sec_subscription:"Abonnement",sec_support:"Aide & Support",sec_about:"À propos",
    row_info:"Informations personnelles",row_info_desc:"Prénom, photo, date de naissance",row_email:"Adresse email",row_password:"Mot de passe",row_password_desc:"Modifier le mot de passe",row_phone:"Numéro de téléphone",row_phone_add:"Ajouter un numéro",row_lang:"Langue",row_logout:"Déconnexion",row_logout_desc:"Retour à l'écran de connexion",
    row_darkmode_on:"Mode clair",row_darkmode_off:"Mode sombre",row_textsize:"Taille du texte",row_anim:"Animations",row_compact:"Dashboard compact",
    settings_title:"Paramètres",settings_edit:"Modifier ›",pro_member:"Membre Pro",free_member:"Membre Gratuit",
    stats_title:"Statistiques",profile_settings:"Paramètres",
  },
  en: {
    nav_today:"Home",nav_track:"Tracker",nav_money:"Money",nav_goals:"Goals",nav_stats:"Stats",nav_profile:"Profile",
    tab_sleep:"Sleep",tab_sport:"Sport",tab_nutrition:"Nutrition",tab_body:"Body",tab_work:"Work",tab_todo:"To-Do",tab_mind:"Mind",
    hello:"Hello",save_day:"Save the day",saved:"Saved!",
    today_balance:"Day Balance",today_goals:"Active Goals",today_intel:"Intelligence · Now",today_week:"Week vs previous",today_nogoals:"No goals yet. Create one in Goals.",
    sleep_schedule:"Schedule",sleep_quality:"Quality",sleep_bedtime:"Bedtime",sleep_wakeup:"Wake up",sleep_noscreen:"No screen 30min before sleep",sleep_optimal:"Optimal",sleep_ok:"Good, aim for 7h30+",sleep_insufficient:"Insufficient",
    sport_type:"Activity type",sport_recovery:"Recovery",sport_photo:"Progress photo",sport_import_photo:"Import a photo",
    nutr_goals_title:"Nutritional goals",nutr_meals_day:"Today's meals",nutr_macros:"Today's macros",nutr_suggest:"Meal ideas",nutr_breakfast:"Breakfast",nutr_lunch:"Lunch",nutr_snack:"Snack",nutr_dinner:"Dinner",
    body_weight_sec:"Weight & goal",body_measures:"Measurements",body_current:"Current weight (kg)",body_target:"Target weight (kg)",body_chest:"Chest (cm)",body_waist:"Waist (cm)",body_hips:"Hips (cm)",body_arms:"Arms (cm)",body_thighs:"Thighs (cm)",
    work_focus_sec:"Focus & Productivity",work_tasks:"Tasks",work_tasks_planned:"Planned",work_tasks_done:"Done",work_highlight:"Highlight of the day",work_screen:"Screen time",work_screen_hours:"Hours today",
    mind_mood_day:"Today's mood",mind_dev:"Development",mind_reading:"Reading (pages)",mind_meditation:"Meditation / Cardiac coherence",mind_skill:"Skill worked on",mind_gratitude:"Today's gratitude",
    todo_new:"New task",todo_placeholder:"Add a task...",todo_today:"Today",todo_older:"Older",
    money_total:"Total wealth",money_split:"Breakdown",money_pockets:"My pockets",
    sec_account:"Account",sec_goals:"Goals",sec_devices:"Connected devices",sec_notif:"Notifications",sec_appearance:"Appearance",sec_privacy:"Privacy & Security",sec_ai:"AI & Analytics",sec_subscription:"Subscription",sec_support:"Help & Support",sec_about:"About",
    row_info:"Personal information",row_info_desc:"Name, photo, date of birth",row_email:"Email address",row_password:"Password",row_password_desc:"Change password",row_phone:"Phone number",row_phone_add:"Add a number",row_lang:"Language",row_logout:"Log out",row_logout_desc:"Back to login screen",
    row_darkmode_on:"Light mode",row_darkmode_off:"Dark mode",row_textsize:"Text size",row_anim:"Animations",row_compact:"Compact dashboard",
    settings_title:"Settings",settings_edit:"Edit ›",pro_member:"Pro Member",free_member:"Free Member",
    stats_title:"Statistics",profile_settings:"Settings",
  },
  es: {
    nav_today:"Inicio",nav_track:"Tracker",nav_money:"Dinero",nav_goals:"Objetivos",nav_stats:"Stats",nav_profile:"Perfil",
    tab_sleep:"Sueño",tab_sport:"Deporte",tab_nutrition:"Nutrición",tab_body:"Cuerpo",tab_work:"Trabajo",tab_todo:"Tareas",tab_mind:"Mente",
    hello:"Hola",save_day:"Guardar el día",saved:"¡Guardado!",
    today_balance:"Equilibrio del día",today_goals:"Objetivos activos",today_intel:"Inteligencia · Ahora",today_week:"Semana vs anterior",today_nogoals:"Sin objetivos. Crea uno en Objetivos.",
    sleep_schedule:"Horario",sleep_quality:"Calidad",sleep_bedtime:"Acostarse",sleep_wakeup:"Despertar",sleep_noscreen:"Sin pantallas 30min antes de dormir",sleep_optimal:"Óptimo",sleep_ok:"Bien, apunta a 7h30+",sleep_insufficient:"Insuficiente",
    sport_type:"Tipo de actividad",sport_recovery:"Recuperación",sport_photo:"Foto de progreso",sport_import_photo:"Importar foto",
    nutr_goals_title:"Objetivos nutricionales",nutr_meals_day:"Comidas del día",nutr_macros:"Macros del día",nutr_suggest:"Ideas de comidas",nutr_breakfast:"Desayuno",nutr_lunch:"Almuerzo",nutr_snack:"Merienda",nutr_dinner:"Cena",
    body_weight_sec:"Peso & objetivo",body_measures:"Medidas",body_current:"Peso actual (kg)",body_target:"Peso objetivo (kg)",body_chest:"Pecho (cm)",body_waist:"Cintura (cm)",body_hips:"Caderas (cm)",body_arms:"Brazos (cm)",body_thighs:"Muslos (cm)",
    work_focus_sec:"Enfoque & Productividad",work_tasks:"Tareas",work_tasks_planned:"Previstas",work_tasks_done:"Hechas",work_highlight:"Logro del día",work_screen:"Tiempo de pantalla",work_screen_hours:"Horas hoy",
    mind_mood_day:"Humor del día",mind_dev:"Desarrollo",mind_reading:"Lectura (páginas)",mind_meditation:"Meditación / Coherencia cardíaca",mind_skill:"Habilidad trabajada",mind_gratitude:"Gratitud del día",
    todo_new:"Nueva tarea",todo_placeholder:"Añadir tarea...",todo_today:"Hoy",todo_older:"Antiguas",
    money_total:"Patrimonio total",money_split:"Distribución",money_pockets:"Mis bolsillos",
    sec_account:"Cuenta",sec_goals:"Objetivos",sec_devices:"Dispositivos conectados",sec_notif:"Notificaciones",sec_appearance:"Apariencia",sec_privacy:"Privacidad & Seguridad",sec_ai:"IA & Análisis",sec_subscription:"Suscripción",sec_support:"Ayuda & Soporte",sec_about:"Acerca de",
    row_info:"Información personal",row_info_desc:"Nombre, foto, fecha de nacimiento",row_email:"Correo electrónico",row_password:"Contraseña",row_password_desc:"Cambiar contraseña",row_phone:"Número de teléfono",row_phone_add:"Añadir número",row_lang:"Idioma",row_logout:"Cerrar sesión",row_logout_desc:"Volver al inicio de sesión",
    row_darkmode_on:"Modo claro",row_darkmode_off:"Modo oscuro",row_textsize:"Tamaño del texto",row_anim:"Animaciones",row_compact:"Panel compacto",
    settings_title:"Ajustes",settings_edit:"Editar ›",pro_member:"Miembro Pro",free_member:"Miembro Gratuito",
    stats_title:"Estadísticas",profile_settings:"Ajustes",
  },
  de: {
    nav_today:"Start",nav_track:"Tracker",nav_money:"Geld",nav_goals:"Ziele",nav_stats:"Stats",nav_profile:"Profil",
    tab_sleep:"Schlaf",tab_sport:"Sport",tab_nutrition:"Ernährung",tab_body:"Körper",tab_work:"Arbeit",tab_todo:"To-Do",tab_mind:"Mental",
    hello:"Hallo",save_day:"Tag speichern",saved:"Gespeichert!",
    today_balance:"Tagesbalance",today_goals:"Aktive Ziele",today_intel:"Intelligenz · Jetzt",today_week:"Woche vs. vorherige",today_nogoals:"Keine Ziele. Erstelle eines unter Ziele.",
    sleep_schedule:"Zeiten",sleep_quality:"Qualität",sleep_bedtime:"Schlafenszeit",sleep_wakeup:"Aufwachzeit",sleep_noscreen:"Kein Bildschirm 30min vor dem Schlafen",sleep_optimal:"Optimal",sleep_ok:"Gut, ziele auf 7h30+",sleep_insufficient:"Unzureichend",
    sport_type:"Aktivitätstyp",sport_recovery:"Erholung",sport_photo:"Fortschrittsfoto",sport_import_photo:"Foto importieren",
    nutr_goals_title:"Ernährungsziele",nutr_meals_day:"Mahlzeiten heute",nutr_macros:"Heutige Makros",nutr_suggest:"Mahlzeiten-Ideen",nutr_breakfast:"Frühstück",nutr_lunch:"Mittagessen",nutr_snack:"Snack",nutr_dinner:"Abendessen",
    body_weight_sec:"Gewicht & Ziel",body_measures:"Maße",body_current:"Aktuelles Gewicht (kg)",body_target:"Zielgewicht (kg)",body_chest:"Brust (cm)",body_waist:"Taille (cm)",body_hips:"Hüften (cm)",body_arms:"Arme (cm)",body_thighs:"Oberschenkel (cm)",
    work_focus_sec:"Fokus & Produktivität",work_tasks:"Aufgaben",work_tasks_planned:"Geplant",work_tasks_done:"Erledigt",work_highlight:"Highlight des Tages",work_screen:"Bildschirmzeit",work_screen_hours:"Stunden heute",
    mind_mood_day:"Stimmung heute",mind_dev:"Entwicklung",mind_reading:"Lesen (Seiten)",mind_meditation:"Meditation / Herzkoheränz",mind_skill:"Geübte Fähigkeit",mind_gratitude:"Dankbarkeit heute",
    todo_new:"Neue Aufgabe",todo_placeholder:"Aufgabe hinzufügen...",todo_today:"Heute",todo_older:"Ältere",
    money_total:"Gesamtvermögen",money_split:"Aufteilung",money_pockets:"Meine Konten",
    sec_account:"Konto",sec_goals:"Ziele",sec_devices:"Verbundene Geräte",sec_notif:"Benachrichtigungen",sec_appearance:"Erscheinungsbild",sec_privacy:"Datenschutz & Sicherheit",sec_ai:"KI & Analysen",sec_subscription:"Abonnement",sec_support:"Hilfe & Support",sec_about:"Über uns",
    row_info:"Persönliche Daten",row_info_desc:"Name, Foto, Geburtsdatum",row_email:"E-Mail-Adresse",row_password:"Passwort",row_password_desc:"Passwort ändern",row_phone:"Telefonnummer",row_phone_add:"Nummer hinzufügen",row_lang:"Sprache",row_logout:"Abmelden",row_logout_desc:"Zurück zum Anmeldebildschirm",
    row_darkmode_on:"Hellmodus",row_darkmode_off:"Dunkelmodus",row_textsize:"Textgröße",row_anim:"Animationen",row_compact:"Kompaktes Dashboard",
    settings_title:"Einstellungen",settings_edit:"Bearbeiten ›",pro_member:"Pro-Mitglied",free_member:"Kostenloses Mitglied",
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
      <div style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <div style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", background: "rgba(204,41,54,0.55)", filter: "blur(28px)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
            <img src={kojihLogo} alt="Mylide" style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", zIndex: 1 }} />
          </div>
        <p style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, textAlign: "center", margin: "0 0 6px", letterSpacing: -0.5 }}>Mylide</p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", margin: 0, letterSpacing: 2, textTransform: "uppercase" }}>Kojihsports</p>
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ──────────────────────────────────────────────────────────
// ── SETTINGS SUB-PAGES ─────────────────────────────────────────────────────
// settingsInp utilise des getters pour lire C au moment du rendu (jamais figé au chargement)
const settingsInp = {
  get background() { return _themeC.surfaceAlt; },
  get border() { return `1.5px solid ${_themeC.border}`; },
  get color() { return _themeC.black; },
  width: "100%", padding: "14px 16px", borderRadius: 14, minHeight: 52,
  fontSize: 16, fontFamily: "DM Sans, sans-serif",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};

const SubLayout = ({ onBack, title, onSave, saving, saveOk, children }) => {
  const C = useC();
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 210, overflowY: "auto", maxWidth: 480, margin: "0 auto", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ padding: "calc(var(--sat) + 14px) 18px 14px", background: C.navBg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: C.surfaceAlt, border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer", fontSize: 20, color: C.black, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.black, flex: 1 }}>{title}</p>
        {onSave && <button onClick={onSave} disabled={saving} style={{ background: saveOk ? C.green : C.red, color: "#fff", border: "none", borderRadius: 12, padding: "9px 20px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", opacity: saving ? 0.7 : 1, transition: "background 0.2s ease" }}>{saving ? "…" : saveOk ? "✓ Sauvegardé" : "Enregistrer"}</button>}
      </div>
      <div style={{ padding: "20px 18px 40px" }}>{children}</div>
    </div>
  );
};

const FeedbackBanner = ({ msg }) => {
  const C = useC();
  if (!msg) return null;
  const col = msg.type === "ok" ? C.green : C.red;
  const bg = msg.type === "ok" ? C.green12 : C.red10;
  const border = msg.type === "ok" ? C.green22 : C.red22;
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: col }}>{msg.type === "ok" ? "✓ " : "✗ "}{msg.text}</p>
    </div>
  );
};

const SubPageInfo = ({ onBack, profile, updateProfile }) => {
  const C = useC();
  const [name, setName] = useState(profile.name || "");
  const [dob, setDob] = useState(profile.dob || "");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const pRef = useRef();
  const handlePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(f); };
  const save = () => { setSaving(true); updateProfile("name", name); updateProfile("dob", dob); setSaving(false); setSaveOk(true); setTimeout(() => { setSaveOk(false); onBack(); }, 1200); };
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  return (
    <SubLayout onBack={onBack} title="Informations personnelles" onSave={save} saving={saving} saveOk={saveOk}>
      <input type="file" accept="image/*" ref={pRef} style={{ display: "none" }} onChange={handlePhoto} />
      <div onClick={() => pRef.current.click()} style={{ textAlign: "center", marginBottom: 28, cursor: "pointer" }}>
        {profile.photo ? <img src={profile.photo} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.red}`, boxShadow: "0 4px 20px rgba(204,41,54,0.25)" }} alt="" />
          : <div style={{ width: 96, height: 96, borderRadius: "50%", background: `linear-gradient(135deg, #CC2936, #8B1A22)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "K"}</div>}
        <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 600, color: C.red, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Icon name="camera" size={13} color={C.red} /> Changer la photo
        </p>
      </div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Prénom</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ton prénom" style={settingsInp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Date de naissance</label><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={settingsInp} /></div>
      {dob && <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 16px", marginTop: 4 }}><p style={{ margin: 0, fontSize: 13, color: C.muted }}>Âge calculé : <strong style={{ color: C.black }}>{Math.floor((Date.now() - new Date(dob)) / 3.156e10)} ans</strong></p></div>}
    </SubLayout>
  );
};

const SubPageEmail = ({ onBack, currentEmail, setCurrentEmail }) => {
  const C = useC();
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
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
      <div style={{ marginBottom: 16 }}><label style={lbl}>Nouvel email</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nouveau@email.com" style={settingsInp} /></div>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Un email de confirmation sera envoyé à la nouvelle adresse. L'ancienne reste active jusqu'à validation.</p>
    </SubLayout>
  );
};

const SubPagePassword = ({ onBack }) => {
  const C = useC();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
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
      <div style={{ marginBottom: 16 }}><label style={lbl}>Nouveau mot de passe</label><input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Minimum 6 caractères" style={settingsInp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Confirmer le mot de passe</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répète le mot de passe" style={settingsInp} /></div>
      {pwd.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[["6+ caractères", pwd.length >= 6], ["Majuscule", /[A-Z]/.test(pwd)], ["Chiffre", /\d/.test(pwd)]].map(([l, ok]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: ok ? C.green18 : C.surfaceAlt, color: ok ? C.green : C.muted }}>{ok ? "✓ " : "○ "}{l}</span>
          ))}
        </div>
      )}
    </SubLayout>
  );
};

const SubPageBody = ({ onBack, nutritionGoals, setNutritionGoals }) => {
  const C = useC();
  const [sex, setSex] = useState(nutritionGoals.sex || "");
  const [height, setHeight] = useState(nutritionGoals.height || "");
  const [activityLevel, setActivityLevel] = useState(nutritionGoals.activityLevel || "");
  const [goalType, setGoalType] = useState(nutritionGoals.goalType || "maintenance");
  const [dietaryPref, setDietaryPref] = useState(nutritionGoals.dietaryPref || "omnivore");
  const [targetWeeks, setTargetWeeks] = useState(nutritionGoals.targetWeeks || "");
  const [saveOk, setSaveOk] = useState(false);
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };

  const save = () => {
    const ng = {
      ...nutritionGoals,
      sex: sex || null,
      height: Number(height) || null,
      activityLevel: activityLevel || null,
      goalType,
      dietaryPref,
      targetWeeks: Number(targetWeeks) || null,
    };
    setNutritionGoals(ng);
    localStorage.setItem("nutritionGoals", JSON.stringify(ng));
    setSaveOk(true);
    setTimeout(() => { setSaveOk(false); onBack(); }, 1200);
  };

  return (
    <SubLayout onBack={onBack} title="Profil physique" onSave={save} saveOk={saveOk}>
      {/* Sexe biologique */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Sexe biologique</label>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
          Utilisé pour calibrer le BMR (Mifflin-St Jeor) et les besoins en lipides.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[{ val: "male", label: "Homme", icon: "user" }, { val: "female", label: "Femme", icon: "heart" }].map(({ val, label, icon }) => (
            <button key={val} onClick={() => setSex(val)} style={{ padding: "16px 12px", borderRadius: 14, border: `2px solid ${sex === val ? "#CC2936" : C.border}`, background: sex === val ? "rgba(204,41,54,0.08)" : C.surfaceAlt, color: sex === val ? "#CC2936" : C.muted, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}>
              <Icon name={icon} size={20} color={sex === val ? "#CC2936" : C.muted} /> {label}
            </button>
          ))}
        </div>
        {!sex && <p style={{ fontSize: 11, color: C.orange, margin: "8px 0 0", fontWeight: 600 }}>Non renseigné - les calculs utilisent les valeurs homme par défaut</p>}
      </div>

      {/* Taille */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Taille (cm)</label>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
          La taille influence directement le BMR et les objectifs de composition corporelle.
        </p>
        <input type="number" value={height} min={100} max={250} onChange={e => setHeight(e.target.value)} placeholder="Ex : 175" style={settingsInp} />
        {height > 0 && (
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "10px 14px", marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Taille enregistrée : <strong style={{ color: C.black }}>{height} cm</strong>
            </p>
          </div>
        )}
      </div>

      {/* Objectif nutritionnel */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Objectif principal</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(GOAL_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setGoalType(key)} style={{ padding: "14px 16px", borderRadius: 14, border: `2px solid ${goalType === key ? cfg.color : C.border}`, background: goalType === key ? `${cfg.color}10` : C.surfaceAlt, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: goalType === key ? `${cfg.color}20` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={cfg.icon} size={18} color={goalType === key ? cfg.color : C.muted} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: goalType === key ? cfg.color : C.text }}>{cfg.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{cfg.tagline}</div>
              </div>
              {goalType === key && <div style={{ width: 22, height: 22, borderRadius: "50%", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>✓</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Niveau d'activité */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Niveau d'activite</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(ACTIVITY_LEVELS).map(([key, cfg]) => (
            <button key={key} onClick={() => setActivityLevel(key)} style={{ padding: "12px 16px", borderRadius: 14, border: `2px solid ${activityLevel === key ? "#CC2936" : C.border}`, background: activityLevel === key ? "rgba(204,41,54,0.08)" : C.surfaceAlt, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: activityLevel === key ? "#CC2936" : C.text }}>{cfg.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{cfg.desc}</div>
              </div>
              {activityLevel === key && <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#CC2936", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>✓</div>}
            </button>
          ))}
          {!activityLevel && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Non renseigné · niveau auto-détecté depuis tes séances récentes</p>
            </div>
          )}
        </div>
      </div>

      {/* Préférence alimentaire */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Préférence alimentaire</label>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
          Utilisé pour filtrer et adapter les repas proposés.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { val: "omnivore",    label: "Omnivore",    icon: "heart" },
            { val: "vegetarian",  label: "Végétarien",  icon: "star"  },
            { val: "vegan",       label: "Vegan",       icon: "zap"   },
          ].map(({ val, label, icon }) => {
            const active = dietaryPref === val;
            return (
              <button key={val} onClick={() => setDietaryPref(val)} style={{ padding: "12px 8px", borderRadius: 12, border: `2px solid ${active ? "#CC2936" : C.border}`, background: active ? "rgba(204,41,54,0.08)" : C.surfaceAlt, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                <Icon name={icon} size={18} color={active ? "#CC2936" : C.muted} />
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#CC2936" : C.muted }}>{label}</span>
              </button>
            );
          })}
        </div>
        {dietaryPref === "vegan" && (
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "#7C3AED10", border: "1px solid #7C3AED30" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#7C3AED", lineHeight: 1.6, fontWeight: 500 }}>
              Mode vegan activé · les repas seront adaptés. Assure un apport suffisant en B12, fer, calcium, vitamine D, zinc et oméga-3.
            </p>
          </div>
        )}
      </div>

      {/* Semaines cibles */}
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Horizon de progression (semaines)</label>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
          Optionnel. L'app valide si ta date cible est réaliste selon ton objectif.
        </p>
        <input
          type="number" value={targetWeeks} min={4} max={104}
          onChange={e => setTargetWeeks(e.target.value)}
          placeholder="Ex : 16 semaines"
          style={settingsInp}
        />
        {targetWeeks > 0 && goalType !== "maintenance" && (
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "10px 14px", marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              Horizon enregistré : <strong style={{ color: C.black }}>{targetWeeks} semaines</strong>
              {" "}· La validation s'affiche dans le suivi nutrition.
            </p>
          </div>
        )}
      </div>
    </SubLayout>
  );
};

const SubPagePhone = ({ onBack, profile, updateProfile }) => {
  const C = useC();
  const [phone, setPhone] = useState(profile.phone || "");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const lbl = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const save = () => { setSaving(true); updateProfile("phone", phone); setSaving(false); setSaveOk(true); setTimeout(() => { setSaveOk(false); onBack(); }, 1200); };
  return (
    <SubLayout onBack={onBack} title="Numéro de téléphone" onSave={save} saving={saving} saveOk={saveOk}>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Numéro de téléphone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" style={settingsInp} /></div>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Utilisé uniquement pour la récupération de compte. Non partagé avec des tiers.</p>
    </SubLayout>
  );
};

const defaultNotifCfg = (v1 = {}) => ({
  version: 2,
  wakeTime:  localStorage.getItem("wakeTime")  || "07:00",
  sleepTime: localStorage.getItem("sleepTime") || "23:00",
  silentMode: v1.silentMode || false,
  motivation: { on: v1.motivation !== false },
  hydration:  { on: v1.hydration  !== false },
  training:   { on: v1.training   !== false, time: "17:00", days: [1,2,3,4,5,6] },
  walk:       { on: v1.walk       === true,  time: "12:30", days: [1,2,3,4,5,6,7] },
  daily:      { on: v1.daily      !== false, time: "21:00" },
  weekly:     { on: v1.weekly     !== false, time: "19:00", day: 0 },
  sleep:      { on: v1.sleep      !== false },
});

const SubPageNotif = ({ onBack }) => {
  const C = useC();
  const [cfg, setCfg] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notifV2"));
      if (saved?.version === 2) return saved;
      const v1 = JSON.parse(localStorage.getItem("notif") || "{}");
      return defaultNotifCfg(v1);
    } catch { return defaultNotifCfg(); }
  });
  const [expanded, setExpanded] = useState(null);
  const [confirmSilent, setConfirmSilent] = useState(false);

  const persist = (newCfg) => {
    setCfg(newCfg);
    localStorage.setItem("notifV2", JSON.stringify(newCfg));
    const legacy = { hydration: newCfg.hydration.on, sleep: newCfg.sleep.on, training: newCfg.training.on, walk: newCfg.walk.on, motivation: newCfg.motivation.on, daily: newCfg.daily.on, weekly: newCfg.weekly.on, silentMode: newCfg.silentMode };
    localStorage.setItem("notif", JSON.stringify(legacy));
    localStorage.setItem("wakeTime", newCfg.wakeTime);
    localStorage.setItem("sleepTime", newCfg.sleepTime);
    registerPush(legacy, newCfg.wakeTime, newCfg.sleepTime, newCfg);
  };
  const toggleType = (key) => persist({ ...cfg, [key]: { ...cfg[key], on: !cfg[key].on } });
  const updateType = (key, field, val) => persist({ ...cfg, [key]: { ...cfg[key], [field]: val } });
  const toggleDay = (key, day) => {
    const days = cfg[key].days || [];
    const nd = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b);
    if (nd.length === 0) return; // keep at least 1 day
    updateType(key, "days", nd);
  };
  const upGlobal = (field, val) => persist({ ...cfg, [field]: val });
  const confirmSilentMode = () => {
    persist({ ...cfg, motivation: { on: false }, hydration: { on: false }, training: { ...cfg.training, on: false }, walk: { ...cfg.walk, on: false }, daily: { ...cfg.daily, on: false }, weekly: { ...cfg.weekly, on: false }, sleep: { on: false }, silentMode: true });
    setConfirmSilent(false);
  };

  const addMins = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const t = ((h * 60 + m + mins) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };

  const Tog = ({ value, onChange }) => (
    <div onClick={e => { e.stopPropagation(); onChange(); }} style={{ width: 44, height: 26, borderRadius: 13, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.25s", cursor: "pointer", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
    </div>
  );

  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
  const DAY_LABELS_FULL = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

  const TYPES = [
    { key: "motivation", icon: "⚡", label: "Motivation",         desc: `Envoyée à ${addMins(cfg.wakeTime, 30)} (réveil + 30min)`,        expandable: false },
    { key: "hydration",  icon: "💧", label: "Hydratation",        desc: "Toutes les 2h30 pendant ta journée",                              expandable: false },
    { key: "training",   icon: "🏋️", label: "Entraînement",       desc: `${cfg.training.time} · ${cfg.training.days?.length ?? 6}j/sem.`, expandable: true,  hasTime: true, hasDays: true },
    { key: "walk",       icon: "👟", label: "Rappel marche",      desc: `${cfg.walk.time} · ${cfg.walk.days?.length ?? 7}j/sem.`,         expandable: true,  hasTime: true, hasDays: true },
    { key: "daily",      icon: "📊", label: "Résumé quotidien",   desc: `${cfg.daily.time} · bilan du jour`,                              expandable: true,  hasTime: true },
    { key: "weekly",     icon: "📅", label: "Résumé hebdo",       desc: `${DAY_LABELS_FULL[cfg.weekly.day ?? 0]} ${cfg.weekly.time}`,     expandable: true,  hasTime: true, hasWeekDay: true },
    { key: "sleep",      icon: "🌙", label: "Rappel coucher",     desc: `Envoyé à ${addMins(cfg.sleepTime, -30)} (coucher − 30min)`,      expandable: false },
  ];

  return (
    <SubLayout onBack={onBack} title="Notifications">
      {confirmSilent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, maxWidth: 320, width: "100%" }}>
            <p style={{ fontSize: 17, fontWeight: 800, color: C.black, margin: "0 0 8px" }}>🔕 Mode silencieux</p>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>Toutes tes notifications vont être désactivées. Tu peux les réactiver à tout moment.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmSilent(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.muted, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={confirmSilentMode} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Horaires globaux */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "14px 16px", marginBottom: 14 }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Tes horaires</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[{ k: "wakeTime", label: "🌅 Réveil", val: cfg.wakeTime }, { k: "sleepTime", label: "🌙 Coucher", val: cfg.sleepTime }].map(({ k, label, val }) => (
            <div key={k}>
              <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>{label}</p>
              <input type="time" value={val} onChange={e => upGlobal(k, e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.black, fontSize: 15, fontWeight: 700, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Types de notification */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 14 }}>
        {TYPES.map((t, i) => {
          const isLast = i === TYPES.length - 1;
          const isOpen = expanded === t.key && t.expandable;
          const typeCfg = cfg[t.key];
          return (
            <div key={t.key} style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
              {/* Header row */}
              <div onClick={() => t.expandable && typeCfg.on && setExpanded(isOpen ? null : t.key)} style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 12, cursor: t.expandable && typeCfg.on ? "pointer" : "default", opacity: typeCfg.on ? 1 : 0.45 }}>
                <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.black }}>{t.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</p>
                </div>
                {t.expandable && typeCfg.on && (
                  <span style={{ fontSize: 12, color: C.muted, marginRight: 4, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                )}
                <Tog value={typeCfg.on} onChange={() => { toggleType(t.key); if (isOpen) setExpanded(null); }} />
              </div>
              {/* Expanded settings */}
              {isOpen && (
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {t.hasTime && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: 0.7 }}>Heure</p>
                      <input type="time" value={typeCfg.time || "08:00"} onChange={e => updateType(t.key, "time", e.target.value)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.black, fontSize: 16, fontWeight: 800, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                    </div>
                  )}
                  {t.hasWeekDay && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: 0.7 }}>Jour de la semaine</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {DAY_ORDER.map(day => {
                          const active = (cfg.weekly.day ?? 0) === day;
                          return (
                            <button key={day} onClick={() => updateType("weekly", "day", day)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${active ? C.red : C.border}`, background: active ? C.red : C.surfaceAlt, color: active ? "#fff" : C.muted, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{DAY_LABELS[day]}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {t.hasDays && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: 0.7 }}>Jours actifs</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {DAY_ORDER.map(day => {
                          const active = (typeCfg.days || []).includes(day);
                          return (
                            <button key={day} onClick={() => toggleDay(t.key, day)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${active ? C.red : C.border}`, background: active ? C.red : C.surfaceAlt, color: active ? "#fff" : C.muted, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{DAY_LABELS[day]}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton de test */}
      {(() => {
        const [testState, setTestState] = useState("idle"); // idle | sending | ok | error
        const [testError, setTestError] = useState("");
        const sendTest = async () => {
          setTestState("sending");
          setTestError("");
          try {
            // 1. Vérifier que les notifications sont supportées
            if (!("Notification" in window)) {
              setTestError("Notifications non supportées sur ce navigateur."); setTestState("error"); return;
            }
            // 2. Demander/vérifier la permission
            const perm = Notification.permission === "granted"
              ? "granted"
              : await Notification.requestPermission();
            if (perm !== "granted") {
              setTestError("Permission refusée. Autorise les notifications dans les réglages du navigateur."); setTestState("error"); return;
            }
            // 3. S'assurer qu'une subscription existe
            const sw = await navigator.serviceWorker.ready;
            const existingSub = await sw.pushManager.getSubscription();
            if (!existingSub) {
              // Tenter de s'abonner
              try {
                await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY });
                // Re-enregistrer dans Supabase
                const v2 = (() => { try { return JSON.parse(localStorage.getItem("notifV2")); } catch { return null; } })();
                const legacy = (() => { try { return JSON.parse(localStorage.getItem("notif")); } catch { return {}; } })();
                await registerPush(legacy, localStorage.getItem("wakeTime") || "07:00", localStorage.getItem("sleepTime") || "23:00", v2);
              } catch (e) {
                setTestError(`Abonnement impossible : ${e.message}`); setTestState("error"); return;
              }
            }
            // 4. Appeler l'API
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              setTestError("Non connecté. Reconnecte-toi."); setTestState("error"); return;
            }
            const r = await fetch("/api/test-notification", {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (r.ok) {
              setTestState("ok");
              setTimeout(() => setTestState("idle"), 4000);
            } else {
              const body = await r.json().catch(() => ({}));
              setTestError(body.error || `Erreur ${r.status}`);
              setTestState("error");
            }
          } catch (e) { setTestError(e.message || "Erreur inconnue"); setTestState("error"); }
        };
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={testState === "error" ? () => { setTestState("idle"); setTestError(""); } : testState === "idle" ? sendTest : undefined}
              disabled={testState === "sending"}
              style={{ width: "100%", padding: "14px", background: testState === "ok" ? "#1A7A4A" : testState === "error" ? C.red : C.surfaceAlt, border: `1.5px solid ${testState === "idle" ? C.border : "transparent"}`, borderRadius: 16, fontWeight: 700, fontSize: 14, color: testState === "idle" ? C.text : "#fff", cursor: testState === "idle" ? "pointer" : testState === "error" ? "pointer" : "default", transition: "all 0.3s", fontFamily: "inherit" }}
            >
              {testState === "idle" ? "Envoyer une notification test" : testState === "sending" ? "Envoi en cours…" : testState === "ok" ? "✓ Notification envoyée !" : "✕ Appuie pour voir l'erreur"}
            </button>
            {testState === "error" && testError && (
              <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 12, color: C.red, fontWeight: 600, lineHeight: 1.5 }}>{testError}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Mode silencieux */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "13px 0", gap: 12 }}>
          <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>🔕</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.black }}>Mode silencieux</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>Désactive toutes les notifications</p>
          </div>
          <Tog value={cfg.silentMode} onChange={() => { if (!cfg.silentMode) setConfirmSilent(true); else persist({ ...cfg, silentMode: false }); }} />
        </div>
      </div>
    </SubLayout>
  );
};

const SubPageLanguage = ({ onBack, setLang: setAppLang }) => {
  const C = useC();
  const [selected, setSelected] = useState(() => localStorage.getItem("lang") || "fr");
  const langs = [{ k: "fr", flag: "🇫🇷", label: "Français" }, { k: "en", flag: "🇬🇧", label: "English" }, { k: "es", flag: "🇪🇸", label: "Español" }, { k: "de", flag: "🇩🇪", label: "Deutsch" }];
  const select = k => { setSelected(k); localStorage.setItem("lang", k); if (setAppLang) setAppLang(k); setTimeout(onBack, 400); };
  return (
    <SubLayout onBack={onBack} title="Langue">
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
        {langs.map((l, i) => (
          <div key={l.k} onClick={() => select(l.k)} style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: i < langs.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", background: selected === l.k ? `${C.red0c}` : "transparent" }}>
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
const SubPageLegal = ({ onBack, title, sections }) => {
  const C = useC();
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 300, overflowY: "auto", maxWidth: 480, margin: "0 auto", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ padding: "18px 20px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, color: C.black, fontFamily: "inherit" }}>←</button>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.black, flex: 1 }}>{title}</p>
      </div>
      <div style={{ padding: "20px 20px 48px" }}>
        <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>Dernière mise à jour : mai 2026 · MYLIDE</p>
        {sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.black, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.6 }}>{sec.heading}</p>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>{sec.body}</p>
          </div>
        ))}
        <div style={{ marginTop: 32, padding: "16px", background: C.surfaceAlt, borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, textAlign: "center" }}>Questions ? <span style={{ color: C.red, fontWeight: 700 }}>contact@mylide.app</span></p>
        </div>
      </div>
    </div>
  );
};

const CGU_SECTIONS = [
  { heading: "1. Présentation", body: "MYLIDE est une application de bien-être et de suivi de vie développée en France. Elle permet aux utilisateurs de suivre leur sommeil, leur activité physique, leur nutrition, leur état mental et leurs finances personnelles." },
  { heading: "2. Acceptation des conditions", body: "En utilisant Mylide, vous acceptez l'intégralité des présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application." },
  { heading: "3. Utilisation de l'application", body: "Mylide est destinée à un usage strictement personnel. Elle ne remplace en aucun cas un avis médical professionnel. Les analyses et recommandations fournies sont à titre informatif uniquement. En cas de doute sur votre santé, consultez un professionnel de santé qualifié." },
  { heading: "4. Compte utilisateur", body: "Vous êtes responsable de la confidentialité de vos identifiants de connexion et de l'ensemble des activités effectuées depuis votre compte. Toute utilisation frauduleuse doit être signalée immédiatement à contact@mylide.app." },
  { heading: "5. Abonnement et paiement", body: "Mylide propose un abonnement Pro donnant accès à des fonctionnalités avancées. L'abonnement se renouvelle automatiquement chaque mois. Vous pouvez annuler à tout moment depuis les paramètres de votre compte ou via les stores (App Store / Google Play). Aucun remboursement n'est accordé pour les périodes entamées." },
  { heading: "6. Propriété intellectuelle", body: "L'ensemble des contenus de l'application (textes, graphiques, logo, algorithmes, code source) est la propriété exclusive de MYLIDE. Toute reproduction, distribution ou modification est interdite sans autorisation écrite préalable." },
  { heading: "7. Limitation de responsabilité", body: "MYLIDE ne saurait être tenu responsable des décisions prises sur la base des informations affichées dans l'application, ni des dommages directs ou indirects résultant de son utilisation. L'application est fournie « en l'état »." },
  { heading: "8. Résiliation", body: "Vous pouvez supprimer votre compte à tout moment depuis Paramètres → Supprimer mon compte. MYLIDE se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes conditions." },
  { heading: "9. Droit applicable", body: "Les présentes conditions générales d'utilisation sont régies par le droit français. Tout litige sera soumis à la compétence exclusive des tribunaux de Paris." },
];

const PRIVACY_SECTIONS = [
  { heading: "1. Responsable du traitement", body: "MYLIDE est responsable du traitement de vos données personnelles au sens du Règlement Général sur la Protection des Données (RGPD, UE 2016/679)." },
  { heading: "2. Données collectées", body: "Nous collectons les données que vous saisissez dans l'application : informations de profil (nom, date de naissance, photo), données de santé (sommeil, activité physique, nutrition, poids, humeur), données financières (objectifs patrimoniaux, transactions), et données techniques (adresse e-mail, identifiant d'appareil pour les notifications push)." },
  { heading: "3. Finalité du traitement", body: "Vos données sont utilisées pour personnaliser votre expérience, générer vos analyses de santé, vous envoyer des notifications pertinentes et améliorer l'application. Elles ne sont utilisées à aucune fin publicitaire." },
  { heading: "4. Stockage et sécurité", body: "Vos données sont stockées de manière sécurisée via Supabase, hébergé sur des serveurs conformes au RGPD situés en Europe. Les communications sont chiffrées (TLS). Vos données de santé ne transitent jamais en clair." },
  { heading: "5. Partage des données", body: "MYLIDE ne vend jamais vos données personnelles. Seuls nos prestataires techniques strictement nécessaires au fonctionnement du service (Supabase pour la base de données, Stripe pour les paiements, Vercel pour l'hébergement) y ont accès, dans le cadre de contrats de sous-traitance conformes au RGPD." },
  { heading: "6. Vos droits", body: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement (« droit à l'oubli »), de limitation du traitement, de portabilité et d'opposition. L'export de vos données est disponible dans Paramètres → Confidentialité. Pour toute autre demande, écrivez à contact@mylide.app. Réponse garantie sous 30 jours." },
  { heading: "7. Durée de conservation", body: "Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, l'ensemble de vos données personnelles est supprimé dans un délai maximum de 30 jours, sauf obligation légale contraire." },
  { heading: "8. Cookies et traceurs", body: "Mylide n'utilise pas de cookies publicitaires ou de traceurs tiers. Des cookies techniques strictement nécessaires au bon fonctionnement de l'authentification et de la session sont utilisés." },
  { heading: "9. Modifications", body: "MYLIDE se réserve le droit de modifier la présente politique. Toute modification substantielle vous sera notifiée dans l'application. La version en vigueur est celle affichée dans les paramètres." },
];

// ── NUTRITION TIPS BLOCK ───────────────────────────────────────────────────
const NutritionTipsBlock = ({ tips, goalType }) => {
  const C = useC();
  const [openIdx, setOpenIdx] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? tips : tips.slice(0, 8);
  const goalLabels = { masse: "Prise de masse", perte: "Perte de poids", maintenance: "Maintien", seche: "Séche / Recompo" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ padding: "0 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.black }}>💡 Plus d'infos</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{tips.length} questions · {goalLabels[goalType] || goalType}</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {displayed.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} onClick={() => setOpenIdx(isOpen ? null : i)} style={{ background: C.surface, border: `1px solid ${isOpen ? C.red22 : C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "border-color 0.2s", boxShadow: isOpen ? `0 2px 12px ${C.red10}` : "none" }}>
              <div style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isOpen ? C.red : C.black, flex: 1, lineHeight: 1.4 }}>{item.q}</p>
                <span style={{ fontSize: 16, color: isOpen ? C.red : C.muted, transition: "transform 0.2s, color 0.2s", transform: isOpen ? "rotate(180deg)" : "none", flexShrink: 0 }}>⌄</span>
              </div>
              {isOpen && (
                <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: C.text, lineHeight: 1.65 }}>{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {tips.length > 8 && (
        <button onClick={() => setShowAll(v => !v)} style={{ width: "100%", marginTop: 10, padding: "12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {showAll ? "Voir moins ↑" : `Voir ${tips.length - 8} questions de plus ↓`}
        </button>
      )}
    </div>
  );
};

// ── DATA EXPORT MODAL ──────────────────────────────────────────────────────
const DataExportModal = ({ history, profile, nutritionGoals, goals, patrimoine, onClose }) => {
  const C = useC();
  const [exporting, setExporting] = useState(false);

  const exportCSV = () => {
    setExporting(true);
    const rows = [["Date","Score","Sommeil (h)","Qualité sommeil","Sport type","Durée sport (min)","Intensité","Récupération","Eau (L)","Calories","Protéines (g)","Glucides (g)","Lipides (g)","Poids (kg)","Objectif poids (kg)","Focus /5","Tâches prévues","Tâches faites","Temps écran (h)","Humeur /5","Lecture (min)","Méditation","Revenus €","Dépenses €","Investissements €"]];
    history.forEach(d => {
      rows.push([d.date, d.score||0, d.sleep?.duration||"", d.sleep?.quality||"", d.sport?.type||"", d.sport?.duration||"", d.sport?.intensity||"", d.sport?.recovery||"", d.nutrition?.water||"", d.nutrition?.calories||"", d.nutrition?.protein||"", d.nutrition?.carbs||"", d.nutrition?.fat||"", d.body?.weight||"", d.body?.weightTarget||"", d.work?.focus||"", d.work?.tasks||"", d.work?.tasksCompleted||"", d.work?.screenTime||"", d.mind?.mood||"", d.mind?.reading||"", d.mind?.meditation?"Oui":"Non", d.money?.income||"", d.money?.expense||"", d.money?.invested||""]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `mylide-data-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    setTimeout(() => setExporting(false), 500);
  };

  const exportPDF = () => {
    setExporting(true);
    const totalPatrimoine = patrimoine.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const sleepDays = history.filter(d => d.sleep?.duration > 0);
    const sportDays = history.filter(d => d.sport?.duration > 0 && !d.sport?.isRest);
    const weightDays = history.filter(d => d.body?.weight > 0);
    const avgSleep = sleepDays.length ? (sleepDays.reduce((a,b)=>a+b.sleep.duration,0)/sleepDays.length).toFixed(1) : "-";
    const avgScore = history.filter(d=>d.score>0).length ? Math.round(history.filter(d=>d.score>0).reduce((a,b)=>a+b.score,0)/history.filter(d=>d.score>0).length) : "-";
    const firstWeight = weightDays[0]?.body?.weight; const lastWeight = weightDays[weightDays.length-1]?.body?.weight;
    const weightEvol = firstWeight && lastWeight ? `${firstWeight} → ${lastWeight} kg (${(lastWeight-firstWeight>0?"+":"")}${(lastWeight-firstWeight).toFixed(1)} kg)` : "-";
    const age = profile.dob ? Math.floor((Date.now()-new Date(profile.dob))/3.156e10) : null;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport MYLIDE - ${profile.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;background:#fff;padding:40px;}
.header{background:linear-gradient(135deg,#CC2936,#8B1A22);color:#fff;padding:32px 36px;border-radius:16px;margin-bottom:32px;}
.header h1{font-size:28px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;}
.header p{font-size:14px;opacity:0.7;}
h2{font-size:18px;font-weight:800;color:#CC2936;margin:28px 0 14px;border-bottom:2px solid #f0f0f0;padding-bottom:8px;}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;}
.stat{background:#F8F8F6;border-radius:12px;padding:16px;text-align:center;}
.stat .val{font-size:24px;font-weight:900;color:#CC2936;letter-spacing:-0.5px;}
.stat .lbl{font-size:11px;color:#6B6B6B;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;}
table{width:100%;border-collapse:collapse;margin-bottom:20px;}
th{background:#F8F8F6;padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.5px;}
td{padding:9px 12px;font-size:13px;border-bottom:1px solid #F0F0EE;}
tr:last-child td{border-bottom:none;}
.goal-bar{height:6px;background:#F0F0EE;border-radius:3px;overflow:hidden;margin-top:6px;}
.goal-fill{height:100%;border-radius:3px;background:#CC2936;}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #F0F0EE;font-size:11px;color:#CFCFCF;text-align:center;}
@media print{body{padding:20px;}.header{margin-bottom:20px;}}
</style></head><body>
<div class="header"><h1>Rapport de santé MYLIDE</h1><p>Généré le ${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})} · ${profile.name}${age?`, ${age} ans`:""}</p></div>
<div class="grid">
<div class="stat"><div class="val">${history.length}</div><div class="lbl">Jours trackés</div></div>
<div class="stat"><div class="val">${avgScore}/100</div><div class="lbl">Score moyen</div></div>
<div class="stat"><div class="val">${avgSleep}h</div><div class="lbl">Sommeil moyen</div></div>
<div class="stat"><div class="val">${sportDays.length}</div><div class="lbl">Séances sport</div></div>
<div class="stat"><div class="val">${weightEvol.split("→")[1]?.trim()||"-"}</div><div class="lbl">Poids actuel</div></div>
<div class="stat"><div class="val">${totalPatrimoine.toLocaleString("fr-FR")} €</div><div class="lbl">Patrimoine</div></div>
</div>
${sleepDays.length>0?`<h2>🌙 Sommeil</h2><table><tr><th>Date</th><th>Durée</th><th>Qualité</th><th>Coucher</th><th>Réveil</th></tr>${sleepDays.slice(-30).map(d=>`<tr><td>${d.date}</td><td>${d.sleep.duration}h</td><td>${d.sleep.quality?d.sleep.quality+"/5":"-"}</td><td>${d.sleep.bedtime||"-"}</td><td>${d.sleep.wakeup||"-"}</td></tr>`).join("")}</table>`:""}
${sportDays.length>0?`<h2>🏋️ Sport</h2><table><tr><th>Date</th><th>Type</th><th>Durée</th><th>Intensité</th><th>FC moy.</th></tr>${sportDays.slice(-30).map(d=>`<tr><td>${d.date}</td><td>${d.sport.type}</td><td>${d.sport.duration} min</td><td>${d.sport.intensity?d.sport.intensity+"/5":"-"}</td><td>${d.sport.heartRate||"-"}</td></tr>`).join("")}</table>`:""}
${weightDays.length>0?`<h2>⚖️ Évolution du poids</h2><p style="margin-bottom:12px;font-size:14px;">Progression : <strong>${weightEvol}</strong></p><table><tr><th>Date</th><th>Poids (kg)</th><th>Objectif</th><th>Tour de taille</th></tr>${weightDays.slice(-30).map(d=>`<tr><td>${d.date}</td><td>${d.body.weight}</td><td>${d.body.weightTarget||"-"}</td><td>${d.body.waist?d.body.waist+" cm":"-"}</td></tr>`).join("")}</table>`:""}
${goals.length>0?`<h2>🎯 Objectifs</h2><table><tr><th>Objectif</th><th>Catégorie</th><th>Progression</th></tr>${goals.map(g=>`<tr><td>${g.label}</td><td>${g.category||"-"}</td><td><div style="display:flex;align-items:center;gap:8px"><span>${g.manualProgress||0}%</span><div class="goal-bar" style="flex:1"><div class="goal-fill" style="width:${g.manualProgress||0}%;background:${g.color||"#CC2936"}"></div></div></div></td></tr>`).join("")}</table>`:""}
<div class="footer">Rapport généré par MYLIDE · ${new Date().toLocaleDateString("fr-FR")} · Données personnelles confidentielles</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); setExporting(false); }, 500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end", backdropFilter: "blur(6px)" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: C.surface, borderRadius: "24px 24px 0 0", padding: "28px 24px 40px" }}>
        <div style={{ width: 36, height: 4, background: C.subtle, borderRadius: 2, margin: "0 auto 24px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: C.black, margin: "0 0 6px", letterSpacing: -0.3 }}>📤 Télécharger mes données</p>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.55 }}>Exporte toutes tes données MYLIDE. Parfait pour ton médecin, coach ou nutritionniste. Seules les sections avec données sont incluses.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={exportPDF} disabled={exporting} style={{ padding: "16px 20px", borderRadius: 16, border: "none", background: `linear-gradient(135deg, #CC2936, #8B1A22)`, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 6px 20px rgba(204,41,54,0.3)" }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ textAlign: "left" }}>
              <div>Rapport PDF complet</div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>Mise en page soignée · impression / envoi médecin</div>
            </div>
          </button>
          <button onClick={exportCSV} disabled={exporting} style={{ padding: "16px 20px", borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.black, fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <div style={{ textAlign: "left" }}>
              <div>Export Excel / CSV</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Toutes les données brutes · compatible Excel & Google Sheets</div>
            </div>
          </button>
          <button onClick={onClose} style={{ padding: "14px", borderRadius: 14, border: "none", background: "transparent", color: C.muted, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Annuler</button>
        </div>
      </div>
    </div>
  );
};

// ── DELETE ACCOUNT MODAL ────────────────────────────────────────────────────
const DeleteAccountModal = ({ profile, onClose, onConfirmDelete }) => {
  const C = useC();
  const [step, setStep] = useState(0); // 0=message, 1=confirm, 2=done
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onConfirmDelete(); } catch {}
    setStep(2); setDeleting(false);
  };

  if (step === 2) return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
      <p style={{ fontSize: 22, fontWeight: 900, color: C.black, textAlign: "center", marginBottom: 10 }}>Compte supprimé</p>
      <p style={{ fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>Toutes tes données ont été supprimées. Tu recevras un email de confirmation. N'abandonne jamais tes objectifs - tu peux revenir quand tu veux. 💪</p>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end", backdropFilter: "blur(6px)" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: C.surface, borderRadius: "24px 24px 0 0", padding: "28px 24px 48px" }}>
        <div style={{ width: 36, height: 4, background: C.subtle, borderRadius: 2, margin: "0 auto 24px" }} />
        {step === 0 ? (<>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💙</div>
            <p style={{ fontSize: 18, fontWeight: 900, color: C.black, marginBottom: 10 }}>Désolé de ne pas t'avoir satisfait</p>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 8 }}>Courage à toi dans tout ce que tu entreprends. N'abandonne en aucun cas tes envies et tes ambitions.</p>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Ne t'inquiète pas, la suppression est rapide. Tu peux récupérer ton compte dans les 30 jours en nous contactant à <strong>contact@mylide.app</strong>.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.black, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>← Retour</button>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1.5px solid ${C.red22}`, background: C.red10, color: C.red, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Supprimer</button>
          </div>
        </>) : (<>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.black, marginBottom: 10 }}>Tu es sûr(e) ?</p>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>C'est au cas où ce serait une mauvaise manipulation. En confirmant, toutes tes données seront définitivement supprimées.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.black, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>← Retour</button>
            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}>{deleting ? "Suppression..." : "Confirmer"}</button>
          </div>
        </>)}
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ──────────────────────────────────────────────────────────
const SettingsPage = ({ onClose, darkMode, themeMode, setThemeMode, profile, updateProfile, isPro, userPlan, setShowSubscription, nutritionGoals, setNutritionGoals, onSignOut, setLang, setShowDataExport, setShowDeleteAccount, setShowFAQ, setShowLegal }) => {
  const C = useC();
  const [sub, setSub] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [notif, setNotif] = useState(() => { try { return JSON.parse(localStorage.getItem("notif")) || { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } catch { return { hydration: true, sleep: true, training: true, walk: false, motivation: true, daily: true, weekly: true, silentMode: false }; } });
  const [wakeTime, setWakeTime] = useState(() => localStorage.getItem("wakeTime") || "07:00");
  const [sleepTime, setSleepTime] = useState(() => localStorage.getItem("sleepTime") || "23:00");
  const [connApps, setConnApps] = useState(() => { try { return JSON.parse(localStorage.getItem("connApps")) || { garmin: false, fitbit: false, oura: false, strava: false }; } catch { return { garmin: false, fitbit: false, oura: false, strava: false }; } });
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
      <div style={{ width: 32, height: 32, borderRadius: 9, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {typeof icon === "string" ? <span style={{ fontSize: 16 }}>{icon}</span> : icon}
      </div>
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

  if (sub === "info") return <SubPageInfo onBack={() => setSub(null)} profile={profile} updateProfile={updateProfile} />;
  if (sub === "body") return <SubPageBody onBack={() => setSub(null)} nutritionGoals={nutritionGoals} setNutritionGoals={setNutritionGoals} />;
  if (sub === "email") return <SubPageEmail onBack={() => setSub(null)} currentEmail={userEmail} setCurrentEmail={setUserEmail} />;
  if (sub === "password") return <SubPagePassword onBack={() => setSub(null)} />;
  if (sub === "phone") return <SubPagePhone onBack={() => setSub(null)} profile={profile} updateProfile={updateProfile} />;
  if (sub === "language") return <SubPageLanguage onBack={() => setSub(null)} setLang={setLang} />;
  if (sub === "notif") return <SubPageNotif onBack={() => setSub(null)} />;
  if (sub === "cgu") return <SubPageLegal onBack={() => setSub(null)} title="Conditions d'utilisation" sections={CGU_SECTIONS} />;
  if (sub === "privacy") return <SubPageLegal onBack={() => setSub(null)} title="Politique de confidentialité" sections={PRIVACY_SECTIONS} />;

  const planLabels = { free: "Gratuit", starter: "Starter", pro: "Pro", premium: "Premium" };
  // Subtitle shown in the subscription banner — plan-aware
  const planBannerTitle = isAtLeast(userPlan, "pro")
    ? `Membre ${planLabels[userPlan] || "Pro"} actif`
    : userPlan === "starter" ? "Passer Pro ou Premium"
    : "Passer Premium";
  const planBannerSub = isAtLeast(userPlan, "pro")
    ? { pro: "Plan Pro actif · 6,99€/mois", premium: "Plan Premium actif · 12,99€/mois" }[userPlan] || "Gérer mon abonnement"
    : userPlan === "starter" ? "Déjà Starter · upgrade dès 6,99€/mois"
    : "7 jours gratuits · à partir de 3,99€/mois";

  const SubscriptionBlock = () => (
    <Sec title={tr("sec_subscription")}>
      <div onClick={() => { onClose(); setTimeout(() => setShowSubscription(true), 120); }} style={{ background: isAtLeast(userPlan, "pro") ? "linear-gradient(135deg, #1a1a2e, #16213e)" : "linear-gradient(135deg, #CC2936, #8B1A22)", borderRadius: 14, padding: "16px 18px", cursor: "pointer", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: isAtLeast(userPlan, "pro") ? "0 8px 24px rgba(0,0,0,0.25)" : "0 8px 24px rgba(204,41,54,0.25)" }}>
        <div>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: 16, margin: "0 0 2px" }}>{planBannerTitle}</p>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: 0 }}>{planBannerSub}</p>
        </div>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 22 }}>›</span>
      </div>
      {isPro && <Row icon={<Icon name="crown" size={17} color={C.muted} strokeWidth={1.8}/>} label="Gérer mon abonnement" desc="Modifier · Résilier" onClick={() => { onClose(); setTimeout(() => setShowSubscription(true), 120); }} last />}
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

        {/* Abonnement EN HAUT si pas Pro - maximise la conversion */}
        {!isPro && <SubscriptionBlock />}

        <Sec title={tr("sec_account")}>
          <Row icon={<Icon name="user" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_info")} desc={tr("row_info_desc")} onClick={() => setSub("info")} />
          <Row icon={<Icon name="message" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_email")} desc={userEmail || "..."} onClick={() => setSub("email")} />
          <Row icon={<Icon name="lock" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_password")} desc={tr("row_password_desc")} onClick={() => setSub("password")} />
          <Row icon={<Icon name="bell" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_phone")} desc={profile.phone || tr("row_phone_add")} onClick={() => setSub("phone")} />
          <Row icon={<Icon name="settings" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_lang")} desc={currentLang} onClick={() => setSub("language")} />
          <Row icon={<Icon name="refresh" size={17} color={C.muted} strokeWidth={1.8}/>} label={tr("row_logout")} desc={tr("row_logout_desc")} onClick={onSignOut} last />
        </Sec>

        <Sec title="Profil physique">
          <Row
            icon={<Icon name="user" size={17} color={C.muted} strokeWidth={1.8}/>}
            label="Sexe biologique"
            desc={nutritionGoals.sex === "male" ? "Homme" : nutritionGoals.sex === "female" ? "Femme" : "Non renseigné"}
            onClick={() => setSub("body")}
          />
          <Row
            icon={<Icon name="chart" size={17} color={C.muted} strokeWidth={1.8}/>}
            label="Taille"
            desc={nutritionGoals.height ? `${nutritionGoals.height} cm` : "Non renseignée"}
            onClick={() => setSub("body")}
          />
          <Row
            icon={<Icon name="diamond" size={17} color={C.muted} strokeWidth={1.8}/>}
            label="Objectif nutritionnel"
            desc={GOAL_CONFIG[nutritionGoals.goalType]?.label || "Maintien"}
            onClick={() => setSub("body")}
          />
          <Row
            icon={<Icon name="zap" size={17} color={C.muted} strokeWidth={1.8}/>}
            label="Niveau d'activite"
            desc={ACTIVITY_LEVELS[nutritionGoals.activityLevel]?.label || "Auto-détecté"}
            onClick={() => setSub("body")}
            last
          />
        </Sec>

        <Sec title={tr("sec_devices")}>
          {[
            { k: "garmin", icon: <Icon name="zap" size={17} color={C.muted} strokeWidth={1.8}/>, label: "Garmin", sub: "GPS & performance sport" },
            { k: "fitbit", icon: <Icon name="chart" size={17} color={C.muted} strokeWidth={1.8}/>, label: "Fitbit", sub: "Bracelet fitness" },
            { k: "oura", icon: <Icon name="star" size={17} color={C.muted} strokeWidth={1.8}/>, label: "Oura Ring", sub: "Sommeil & récupération" },
            { k: "strava", icon: <Icon name="refresh" size={17} color={C.muted} strokeWidth={1.8}/>, label: "Strava", sub: "Running & cyclisme" },
          ].map((item, i, arr) => <Row key={item.k} icon={item.icon} label={item.label} desc={connApps[item.k] ? "✅ Connecté · sync. à l'instant" : item.sub} right={<Tog value={connApps[item.k]} onChange={v => upCA(item.k, v)} />} last={i === arr.length - 1} />)}
        </Sec>

        <Sec title={tr("sec_notif")}>
          <Row icon={<Icon name="bell" size={17} color={C.muted} strokeWidth={1.8}/>} label="Gérer les notifications" desc={`${Object.entries(notif).filter(([k,v]) => k !== "silentMode" && v).length} active(s)`} onClick={() => setSub("notif")} last />
        </Sec>

        <Sec title={tr("sec_appearance")}>
          <div style={{ display: "flex", gap: 10, padding: "4px 0 8px" }}>
            {[
              { value: "light", icon: "zap", label: "Clair" },
              { value: "dark",  icon: "bell", label: "Sombre" },
            ].map(opt => {
              const active = themeMode === opt.value;
              return (
                <button key={opt.value} onClick={() => setThemeMode(opt.value)} style={{
                  flex: 1, padding: "14px 8px", borderRadius: 14, cursor: "pointer",
                  border: active ? `2px solid ${C.red}` : `1.5px solid ${C.border}`,
                  background: active ? C.redLight : C.surfaceAlt,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                  transition: "all 0.18s", fontFamily: "inherit",
                }}>
                  <Icon name={opt.icon} size={26} color={active ? C.red : C.muted} strokeWidth={1.6} />
                  <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? C.red : C.muted }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Sec>

        <Sec title={tr("sec_privacy")}>
          <Row icon={<Icon name="upload" size={17} color={C.muted} strokeWidth={1.8}/>} label="Télécharger mes données" desc={isAtLeast(userPlan, "premium") ? "PDF ou Excel · médecin, coach..." : "Premium · PDF ou Excel"} onClick={() => { if (!isAtLeast(userPlan, "premium")) { onClose(); setTimeout(() => setShowSubscription(true), 120); return; } onClose(); setTimeout(() => setShowDataExport(true), 120); }} />
          <Row icon={<Icon name="trash" size={17} color={C.muted} strokeWidth={1.8}/>} label="Supprimer mon compte" desc="Récupérable sous 30 jours" onClick={() => { onClose(); setTimeout(() => setShowDeleteAccount(true), 120); }} last />
        </Sec>

        <Sec title={tr("sec_support")}>
          <Row icon={<Icon name="quote" size={17} color={C.muted} strokeWidth={1.8}/>} label="FAQ" desc="100+ réponses sur MYLIDE" onClick={() => { onClose(); setTimeout(() => setShowFAQ(true), 120); }} />
          <Row icon={<Icon name="shield" size={17} color={C.muted} strokeWidth={1.8}/>} label="Mentions légales & CGU" desc="RGPD · Confidentialité · Santé" onClick={() => { onClose(); setTimeout(() => setShowLegal && setShowLegal(true), 120); }} />
          <Row icon={<Icon name="message" size={17} color={C.muted} strokeWidth={1.8}/>} label="Contacter l'équipe" desc="contact@mylide.app" onClick={() => window.open("mailto:contact@mylide.app")} />
          <Row icon={<Icon name="warning" size={17} color={C.muted} strokeWidth={1.8}/>} label="Signaler un bug" onClick={() => window.open("mailto:bugs@mylide.app")} last />
        </Sec>

        <Sec title={tr("sec_about")}>
          <Row icon={<Icon name="zap" size={17} color={C.muted} strokeWidth={1.8}/>} label="Version de l'app" desc="Mylide 1.0.0" />
          <Row icon={<Icon name="heart" size={17} color={C.muted} strokeWidth={1.8}/>} label="Avertissement santé" desc="MYLIDE n'est pas une app médicale" onClick={() => { onClose(); setTimeout(() => setShowLegal && setShowLegal(true), 120); }} last />
        </Sec>

        {/* Abonnement EN BAS si Pro - réduit la visibilité de la résiliation */}
        {isPro && <SubscriptionBlock />}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

// ── SCORE RING ─────────────────────────────────────────────────────────────
const ScoreRing = ({ score, delta, streak }) => {
  const C = useC();
  const r = 36; const circ = 2 * Math.PI * r; const fill = (score / 100) * circ;
  // Utilise les CSS vars du thème (fonctionnent dans SVG sur tous les browsers modernes)
  const col = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  return (
    <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke={C.border} strokeWidth="6"/>
        <circle cx="42" cy="42" r={r} fill="none" stroke={col} strokeWidth="6.5" strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</span>
        {streak > 0 && <span style={{ fontSize: 9, color: C.orange, fontWeight: 700, marginTop: 1 }}>{streak}j</span>}
      </div>
    </div>
  );
};

// ── CALENDAR HEATMAP ───────────────────────────────────────────────────────
const CalendarHeatmap = ({ history }) => {
  const C = useC();
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
  const C = useC();
  const COLORS = { Sommeil: C.purple, Sport: C.red, Nutrition: C.orange, Travail: C.blue, Mental: C.green, Corps: "#F59E0B" };
  return (
    <div style={{ background: C.surfaceAlt, borderRadius: 16, padding: 16, position: "relative" }}>
      <ResponsiveContainer width="100%" height={195}>
        <RadarChart data={data} margin={{ top: 8, right: 26, bottom: 8, left: 26 }}>
          <PolarGrid stroke={C.border} />
          <PolarAngleAxis dataKey="s" tick={({ x, y, payload }) => {
            const col = COLORS[payload.value] || C.muted;
            return <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={10} fontWeight={700}>{payload.value}</text>;
          }} />
          <Radar dataKey="v" stroke={C.red} fill={C.red} fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: C.red, strokeWidth: 0 }} />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
        {data.map(item => <div key={item.s} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[item.s] }} /><span style={{ fontSize: 10, color: C.muted }}>{item.s} {Math.round(item.v)}%</span></div>)}
      </div>
    </div>
  );
};

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
// inp uses getters so C.xxx is evaluated at render time (not at module init)
const inp = {
  get background() { return _themeC.surfaceAlt; },
  get border() { return `1.5px solid ${_themeC.border}`; },
  borderRadius: 14,
  padding: "14px 16px",
  minHeight: 52,
  get color() { return _themeC.text; },
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s ease",
};

const EvoChart = ({ data, dataKey, color, label, unit, height = 150 }) => {
  const C = useC();
  const { darkMode } = useTheme();
  if (data.length < 2) return <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, textAlign: "center", marginBottom: 14 }}><p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Graphique disponible apres 2+ jours</p></div>;
  const getVal = d => dataKey.split(".").reduce((o, k) => o?.[k], d) ?? 0;
  const last = getVal(data[data.length - 1]); const first = getVal(data[0]); const trend = last - first;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, margin: 0, fontWeight: 600 }}>{label}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? `${C.green15}` : `${C.red15}`, borderRadius: 8, padding: "3px 8px", fontWeight: 700 }}>{trend >= 0 ? "+" : ""}{Math.round(trend * 10) / 10}{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs><linearGradient id={`g${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3"/>
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9, fontWeight: 500 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={28} domain={["auto","auto"]} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text, boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)" }} formatter={v => [`${v}${unit}`, label]}/>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g${label.replace(/\s/g,"")})`} dot={false} activeDot={{ r: 5, fill: color, stroke: C.surface, strokeWidth: 2 }}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Rating = ({ value, max = 5, onChange, color }) => {
  const C = useC();
  const col = color || C.red;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} onClick={() => onChange(i + 1)} style={{ fontSize: 28, cursor: "pointer", color: i < value ? col : C.subtle, transition: "all 0.15s", transform: i < value ? "scale(1.1)" : "scale(1)" }}>★</span>
      ))}
    </div>
  );
};

const Toggle = ({ value, onChange, label }) => {
  const C = useC();
  return (
    <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: value ? C.redLight : C.surfaceAlt, border: `1.5px solid ${value ? C.red : C.border}`, borderRadius: 14, padding: "12px 16px", transition: "all 0.2s", userSelect: "none" }}>
      <div style={{ width: 42, height: 24, borderRadius: 12, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.25s", flexShrink: 0, boxShadow: value ? `0 2px 8px ${C.red44}` : "none" }}>
        <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }} />
      </div>
      <span style={{ fontSize: 14, color: value ? C.red : C.muted, fontWeight: value ? 600 : 400 }}>{label}</span>
    </div>
  );
};

const Field = ({ label, children }) => {
  const C = useC();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
};

const Card = ({ children, style = {}, accent, dark }) => {
  const C = useC();
  const { darkMode } = useTheme();
  const bg = accent ? `linear-gradient(135deg, ${C.red} 0%, #8B1A22 100%)` : dark ? C.bg : C.surface;
  const shadow = accent
    ? "0 12px 40px rgba(204,41,54,0.22)"
    : darkMode
      ? "0 2px 20px rgba(0,0,0,0.38)"
      : "0 2px 16px rgba(0,0,0,0.05)";
  return (
    <div style={{ background: bg, border: accent || dark ? "none" : `1px solid ${C.border}`, borderRadius: 22, padding: "20px 20px", marginBottom: 14, boxShadow: shadow, ...style }}>{children}</div>
  );
};

const ST = ({ children, light }) => {
  const C = useC();
  return <p style={{ fontSize: 11, color: light ? "rgba(255,255,255,0.55)" : C.red, textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 14, marginTop: 0, fontWeight: 700 }}>{children}</p>;
};

const MsgBox = ({ type, msg, suggestions }) => {
  const C = useC();
  const colors = { danger: C.red, warning: C.orange, advice: C.green, success: C.green, info: C.blue };
  const bgs = { danger: `${C.red10}`, warning: `${C.orange10}`, advice: `${C.green10}`, success: `${C.green10}`, info: `${C.blue10}` };
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
  const C = useC();
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
            <select value={edited.sourceId} onChange={e => setEdited(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text, background: C.surfaceAlt }}>
              {DATA_SOURCES.map(s => <option key={s.id} value={s.id} style={{ background: C.surfaceAlt, color: C.text }}>{s.label}</option>)}
            </select>
          </Field>
          {edited.sourceId !== "manual" && (<>
            {(() => { const src = DATA_SOURCES.find(s => s.id === edited.sourceId); return (
              <Field label={`Valeur cible${src?.unit ? ` (${src.unit})` : ""}`}>
                <input type="number" value={edited.target} onChange={e => setEdited(p => ({ ...p, target: e.target.value }))} placeholder={src?.example || "Ex: 100"} style={inp} />
              </Field>
            ); })()}
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
// ── MEAL CAROUSEL — version premium avec onglets par catégorie ─────────────
const MEAL_TABS = [
  { key: "breakfast", icon: CAT_ICONS.breakfast, label: CAT_LABELS.breakfast },
  { key: "lunch",     icon: CAT_ICONS.lunch,     label: CAT_LABELS.lunch },
  { key: "snack",     icon: CAT_ICONS.snack,     label: CAT_LABELS.snack },
  { key: "dinner",    icon: CAT_ICONS.dinner,    label: CAT_LABELS.dinner },
];

const MEAL_BATCH = 6;

const MealCarousel = ({ mealsByCategory, activeGoalColor, onAdd }) => {
  const C = useC();
  const [activeTab, setActiveTab] = useState("breakfast");
  const [pageByTab, setPageByTab] = useState({ breakfast: 0, lunch: 0, snack: 0, dinner: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [addedId, setAddedId] = useState(null);

  const meals = mealsByCategory[activeTab] || [];
  const page = pageByTab[activeTab] || 0;
  const totalPages = Math.max(1, Math.ceil(meals.length / MEAL_BATCH));
  const batch = meals.slice(page * MEAL_BATCH, (page + 1) * MEAL_BATCH);

  const nextBatch = () => {
    setPageByTab(prev => ({ ...prev, [activeTab]: ((prev[activeTab] || 0) + 1) % totalPages }));
    setExpandedId(null);
  };

  const handleAdd = meal => {
    onAdd(meal);
    setAddedId(meal.id);
    setTimeout(() => setAddedId(null), 2200);
  };

  return (
    <div>
      {/* ── Onglets catégories ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {MEAL_TABS.map(tab => {
          const tabMeals = mealsByCategory[tab.key] || [];
          if (!tabMeals.length) return null;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 22,
                border: `1.5px solid ${isActive ? activeGoalColor : C.border}`,
                background: isActive ? `${activeGoalColor}14` : C.surfaceAlt,
                color: isActive ? activeGoalColor : C.muted,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                transition: "all 180ms ease", fontFamily: "inherit",
              }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? activeGoalColor : C.border,
                color: isActive ? "#fff" : C.muted,
                borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 6px", marginLeft: 2,
              }}>{tabMeals.length}</span>
            </button>
          );
        })}
      </div>

      {/* ── Header lot ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, fontWeight: 600 }}>
          {batch.length} idées · lot <strong style={{ color: C.text }}>{page + 1}/{totalPages}</strong>
        </p>
        {totalPages > 1 && (
          <button onClick={nextBatch} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 13px", borderRadius: 20,
            border: `1.5px solid ${activeGoalColor}40`,
            background: `${activeGoalColor}10`,
            color: activeGoalColor, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 180ms ease",
          }}>
            <Icon name="refresh" size={13} color={activeGoalColor} />
            Voir d'autres repas
          </button>
        )}
      </div>

      {/* ── Liste de 6 cartes compactes ── */}
      {batch.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {batch.map(m => {
            const emoji = getMealEmoji(m.name);
            const isExpanded = expandedId === m.id;
            const isAdded = addedId === m.id;
            return (
              <div key={m.id} style={{
                background: C.surface, borderRadius: 16,
                border: `1.5px solid ${isExpanded ? activeGoalColor + "50" : C.border}`,
                overflow: "hidden",
                transition: "border-color 200ms ease",
                boxShadow: isExpanded ? `0 4px 20px ${activeGoalColor}18` : "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                {/* Ligne principale — toujours visible */}
                <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 14px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}>
                  {/* Emoji pill */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: `${activeGoalColor}14`, border: `1px solid ${activeGoalColor}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>{emoji}</div>

                  {/* Nom + macros clés */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 800, color: C.black, letterSpacing: -0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.orange }}>{m.macros.cal} kcal</span>
                      <span style={{ fontSize: 11, color: C.muted }}>·</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>{m.macros.prot}g prot</span>
                      {m.vegan && (
                        <span style={{ fontSize: 9, background: "rgba(34,197,94,0.12)", color: "#16a34a", borderRadius: 20, padding: "1px 7px", fontWeight: 700, border: "1px solid rgba(34,197,94,0.2)" }}>vegan</span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke={C.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transition: "transform 220ms ease", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Détail expandé */}
                {isExpanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
                    {/* Macros 4 pills */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, margin: "12px 0" }}>
                      {[
                        { label: "Kcal",  value: m.macros.cal,   color: C.orange },
                        { label: "Prot",  value: `${m.macros.prot}g`, color: C.purple },
                        { label: "Gluc",  value: `${m.macros.carbs}g`, color: C.blue },
                        { label: "Lip",   value: `${m.macros.fat}g`, color: C.green },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: `${color}10`, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                          <div style={{ fontSize: 9, color: C.muted, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Ingrédients */}
                    {m.ingredients?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {m.ingredients.map((ing, j) => {
                          const qDisplay = ing.u === "x" ? `${ing.q}×` :
                            ing.u === "tranche" ? `${ing.q} tranche${ing.q > 1 ? "s" : ""}` :
                            `${ing.q}${ing.u}`;
                          return (
                            <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: j < m.ingredients.length - 1 ? `1px solid ${C.border}` : "none" }}>
                              <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{ing.n}</span>
                              <span style={{ fontSize: 12, color: activeGoalColor, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{qDisplay}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bouton ajouter */}
                    <button onClick={() => handleAdd(m)} style={{
                      width: "100%", padding: "12px",
                      background: isAdded
                        ? `linear-gradient(135deg, ${C.green}, #16a34a)`
                        : `linear-gradient(135deg, ${activeGoalColor}, ${activeGoalColor}CC)`,
                      color: "#fff", border: "none", borderRadius: 12,
                      fontSize: 13, fontWeight: 800, cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background 300ms ease",
                    }}>
                      {isAdded ? "✓ Ajouté !" : "+ Ajouter à ma journée"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>
          Aucun repas disponible pour ce filtre
        </div>
      )}

      {/* ── Bouton suivant en bas aussi ── */}
      {totalPages > 1 && (
        <button onClick={nextBatch} style={{
          width: "100%", marginTop: 12, padding: "12px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          border: `1.5px solid ${C.border}`, background: C.surfaceAlt,
          borderRadius: 14, color: C.muted, fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          <Icon name="refresh" size={14} color={C.muted} />
          Lot suivant — {page + 1}/{totalPages}
        </button>
      )}
    </div>
  );
};

const TARGET_META = {
  sport:     { label: "minutes par seance", placeholder: "Ex: 45" },
  finance:   { label: "euros d'epargne cible", placeholder: "Ex: 100000" },
  mental:    { label: "pages par jour", placeholder: "Ex: 20" },
  nutrition: { label: "grammes de proteines", placeholder: "Ex: 150" },
  business:  { label: "score focus /5", placeholder: "Ex: 4" },
  running:   { label: "km par seance", placeholder: "Ex: 5" },
  body:      { label: "kg cible", placeholder: "Ex: 70" },
  sleep:     { label: "score sommeil /100", placeholder: "Ex: 70" },
};

const Onboarding = ({ onComplete }) => {
  const C = useC();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""); const [dob, setDob] = useState(""); const [photo, setPhoto] = useState("");
  // Profil physique
  const [sex, setSex] = useState("");
  const [bodyHeight, setBodyHeight] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyWeightTarget, setBodyWeightTarget] = useState("");
  const [bodyActivityLevel, setBodyActivityLevel] = useState("moderate");
  const [nutritionGoalType, setNutritionGoalType] = useState("maintenance");
  // Priorites
  const [priorities, setPriorities] = useState([]); const [mainPriority, setMainPriority] = useState(null); const [goalTarget, setGoalTarget] = useState(""); const [goalEnd, setGoalEnd] = useState("");
  const photoRef = useRef();
  const handlePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f); };
  const togglePriority = id => setPriorities(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const selectAll = () => setPriorities(priorities.length === PRIORITIES.length ? [] : PRIORITIES.map(p => p.id));
  const handleComplete = (wantsSubscription = false) => {
    const today = new Date().toISOString().split("T")[0];
    const templates = {
      sport:     { label: "Seances sport (45min+)", sourceId: "sport_duree", target: 45, category: "Sport", color: "#CC2936" },
      finance:   { label: "Objectif patrimoine", sourceId: "patrimoine", target: 50000, category: "Finance", color: "#1A7A4A" },
      mental:    { label: "Lecture quotidienne (20p)", sourceId: "lecture", target: 20, category: "Mental", color: "#6B35C8" },
      nutrition: { label: "Proteines quotidiennes", sourceId: "proteines", target: 150, category: "Nutrition", color: "#D4580A" },
      business:  { label: "Focus quotidien (4/5)", sourceId: "focus", target: 4, category: "Travail", color: "#1E5FCC" },
      running:   { label: "Distance running (5km)", sourceId: "running_dist", target: 5, category: "Running", color: "#0891b2" },
      body:      { label: "Objectif poids", sourceId: "poids", target: Number(bodyWeightTarget) || 75, category: "Corps", color: "#D4580A" },
      sleep:     { label: "Sommeil optimal (score 70)", sourceId: "score", target: 70, category: "Sommeil", color: "#6B35C8" },
    };
    const main = mainPriority || priorities[0];
    const ordered = [main, ...priorities.filter(p => p !== main)];
    const createdGoals = ordered.map((pid, i) => ({ ...(templates[pid] || { label: pid, sourceId: "manual", target: 100, category: pid, color: "#CC2936" }), id: Date.now() + i, startDate: today, endDate: goalEnd || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0], reverse: false, manualProgress: 0, target: i === 0 && goalTarget ? Number(goalTarget) : (templates[pid]?.target || 100) }));
    const bodyProfileData = {
      sex: sex || null,
      height: Number(bodyHeight) || null,
      weight: Number(bodyWeight) || null,
      weightTarget: Number(bodyWeightTarget) || null,
      activityLevel: bodyActivityLevel || "moderate",
      goalType: nutritionGoalType || "maintenance",
    };
    onComplete({ name, dob, photo }, createdGoals, bodyProfileData, wantsSubscription);
  };

  const btnPrimary = { width: "100%", padding: "16px", background: "linear-gradient(135deg, #CC2936, #8B1A22)", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 30px rgba(204,41,54,0.35)", letterSpacing: 0.3 };
  const btnSecondary = { flex: 1, padding: "14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, fontWeight: 600, cursor: "pointer", color: C.muted, fontSize: 14 };
  const STEPS = 5;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`* { font-family: 'DM Sans', sans-serif !important; } input, select, textarea { font-family: 'DM Sans', sans-serif !important; font-size: 16px !important; }`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <img src={kojihLogo} alt="Mylide" style={{ width: 100, height: 100, objectFit: "contain", display: "block", margin: "0 auto 28px", filter: "drop-shadow(0 16px 40px rgba(204,41,54,0.45))" }} />
            <h1 style={{ fontSize: 32, fontWeight: 900, color: C.black, margin: "0 0 10px", lineHeight: 1.1, letterSpacing: -0.5 }}>Bienvenue sur<br /><span style={{ color: C.red }}>Mylide</span></h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: "0 0 40px" }}>Ton tracker de vie intelligent.<br />Configure en 3 minutes.</p>
            <button onClick={() => setStep(1)} style={btnPrimary}>Commencer →</button>
          </div>
        )}
        {step === 1 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{Array.from({length: STEPS}, (_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < 1 ? C.red : C.surfaceAlt, transition: "background 0.3s" }} />)}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px", color: C.black }}>Qui es-tu ?</h2>
            <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handlePhoto} />
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", position: "relative" }}>
                {photo ? <img src={photo} alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.red}`, boxShadow: "0 8px 24px rgba(204,41,54,0.3)" }} />
                  : <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.surfaceAlt, border: `2px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Icon name="camera" size={28} color={C.muted} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 0.3, textTransform: "uppercase" }}>Photo</span>
                    </div>}
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
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{Array.from({length: STEPS}, (_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < 2 ? C.red : C.surfaceAlt, transition: "background 0.3s" }} />)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: C.black }}>Ton profil physique</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>Pour des recommandations adaptées à ta physiologie.</p>

            {/* Sexe */}
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Sexe biologique</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {[{ val: "male", label: "Homme", icon: "👨" }, { val: "female", label: "Femme", icon: "👩" }].map(({ val, label, icon }) => (
                <button key={val} onClick={() => setSex(val)} style={{ padding: "14px 10px", borderRadius: 14, border: `2px solid ${sex === val ? "#CC2936" : C.border}`, background: sex === val ? "rgba(204,41,54,0.08)" : C.surfaceAlt, color: sex === val ? "#CC2936" : C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span> {label}
                </button>
              ))}
            </div>

            {/* Morphologie */}
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Morphologie</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <Field label="Taille (cm)"><input type="number" value={bodyHeight} min={100} max={250} onChange={e => setBodyHeight(e.target.value)} placeholder="175" style={inp} /></Field>
              <Field label="Poids actuel"><input type="number" value={bodyWeight} min={30} max={300} step={0.1} onChange={e => setBodyWeight(e.target.value)} placeholder="75" style={inp} /></Field>
              <Field label="Poids cible"><input type="number" value={bodyWeightTarget} min={30} max={300} step={0.1} onChange={e => setBodyWeightTarget(e.target.value)} placeholder="70" style={inp} /></Field>
            </div>

            {/* Objectif nutritionnel */}
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Objectif principal</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {Object.entries(GOAL_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setNutritionGoalType(key)} style={{ padding: "12px 10px", borderRadius: 14, border: `2px solid ${nutritionGoalType === key ? cfg.color : C.border}`, background: nutritionGoalType === key ? `${cfg.color}12` : C.surfaceAlt, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{cfg.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: nutritionGoalType === key ? cfg.color : C.text, lineHeight: 1.2 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{cfg.tagline}</div>
                </button>
              ))}
            </div>

            {/* Niveau d'activité */}
            <Field label="Niveau d'activite habituel">
              <select value={bodyActivityLevel} onChange={e => setBodyActivityLevel(e.target.value)} style={{ ...inp, appearance: "auto" }}>
                {Object.entries(ACTIVITY_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} - {v.desc}</option>
                ))}
              </select>
            </Field>

            <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 18px", lineHeight: 1.5 }}>
              Ces données servent uniquement à calibrer tes recommandations. Tu peux les modifier à tout moment dans Nutrition.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Retour</button>
              <button onClick={() => setStep(3)} style={{ ...btnPrimary, flex: 2 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{Array.from({length: STEPS}, (_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < 3 ? C.red : C.surfaceAlt }} />)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: C.black }}>Tes priorites</h2>
              <button onClick={selectAll} style={{ background: priorities.length === PRIORITIES.length ? C.redLight : C.surfaceAlt, border: `1px solid ${priorities.length === PRIORITIES.length ? C.redBorder : C.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: priorities.length === PRIORITIES.length ? C.red : C.muted, cursor: "pointer" }}>
                {priorities.length === PRIORITIES.length ? "Tout deselectionner" : "Tout selectionner"}
              </button>
            </div>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 18px" }}>Selectionne tout ce que tu veux ameliorer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
              {PRIORITIES.map(p => { const selected = priorities.includes(p.id); return (
                <div key={p.id} onClick={() => togglePriority(p.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${selected ? p.color : C.border}`, background: selected ? `${p.color}10` : C.surface, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: selected ? `${p.color}20` : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                    <Icon name={p.icon} size={18} color={selected ? p.color : C.muted} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selected ? p.color : C.text, flex: 1 }}>{p.label}</span>
                  {selected && <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexShrink: 0 }}>✓</div>}
                </div>
              ); })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>← Retour</button>
              <button onClick={() => { if (priorities.length > 0) { setMainPriority(priorities[0]); setStep(4); } }} style={{ ...btnPrimary, flex: 2, opacity: priorities.length > 0 ? 1 : 0.5 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{Array.from({length: STEPS}, (_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: C.red }} />)}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: C.black }}>Objectif principal</h2>
            <p style={{ fontSize: 14, color: C.muted, margin: "0 0 14px" }}>Choisis ton objectif prioritaire et affine la valeur cible.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {priorities.map(pid => {
                const pr = PRIORITIES.find(p => p.id === pid);
                const isMain = (mainPriority || priorities[0]) === pid;
                return (
                  <div key={pid} onClick={() => { setMainPriority(pid); setGoalTarget(""); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: `2px solid ${isMain ? pr.color : C.border}`, background: isMain ? `${pr.color}12` : C.surfaceAlt, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: isMain ? `${pr.color}20` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                      <Icon name={pr.icon} size={17} color={isMain ? pr.color : C.muted} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isMain ? pr.color : C.text, flex: 1 }}>{pr.label}</span>
                    {isMain && <div style={{ width: 22, height: 22, borderRadius: "50%", background: pr.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0, fontWeight: 800 }}>★</div>}
                  </div>
                );
              })}
            </div>
            {(() => { const mid = mainPriority || priorities[0]; const meta = TARGET_META[mid]; return (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 22 }}>
                <Field label={`Valeur cible${meta ? ` (${meta.label})` : ""}`}>
                  <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder={meta?.placeholder || "Ex: 100"} style={inp} />
                </Field>
                <Field label="Date limite"><input type="date" value={goalEnd} onChange={e => setGoalEnd(e.target.value)} style={inp} /></Field>
              </div>
            ); })()}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={btnSecondary}>← Retour</button>
              <button onClick={() => setStep(5)} style={{ ...btnPrimary, flex: 2 }}>Continuer →</button>
            </div>
          </div>
        )}
        {step === 5 && (
          <div style={{ background: C.surface, borderRadius: 24, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.1)", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>{Array.from({length: STEPS}, (_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: C.red }} />)}</div>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #CC2936, #8B1A22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 24px rgba(204,41,54,0.3)" }}>
                <Icon name="crown" size={26} color="#fff" strokeWidth={1.8} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px", color: C.black, letterSpacing: -0.3 }}>Va plus loin avec MYLIDE</h2>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.55 }}>7 jours gratuits · Sans engagement · Résiliable à tout moment</p>
            </div>

            {/* Plans */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {[
                { id: "starter", name: "Starter", price: "3,99", color: "#3B82F6", features: ["Statistiques 30j", "Export données", "Insights hebdo"] },
                { id: "pro", name: "Pro", price: "6,99", color: "#CC2936", features: ["Stats illimitées", "Prédictions IA", "Radar historique"], rec: true },
                { id: "premium", name: "Premium", price: "12,99", color: "#F59E0B", features: ["Tout Pro inclus", "Export PDF/Excel", "Support prioritaire"] },
              ].map(plan => (
                <div key={plan.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, border: `1.5px solid ${plan.rec ? plan.color : C.border}`, background: plan.rec ? `${plan.color}08` : C.surfaceAlt, position: "relative" }}>
                  {plan.rec && <div style={{ position: "absolute", top: -8, right: 14, background: plan.color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 9, fontWeight: 900, letterSpacing: 0.5 }}>POPULAIRE</div>}
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `${plan.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color: plan.color }}>{plan.price}€</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.black }}>{plan.name} <span style={{ fontWeight: 400, fontSize: 12, color: C.muted }}>/mois après</span></p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{plan.features.join(" · ")}</p>
                  </div>
                  <button onClick={() => handleComplete(true)} style={{ padding: "8px 14px", borderRadius: 10, background: plan.rec ? plan.color : C.surface, border: `1.5px solid ${plan.color}`, color: plan.rec ? "#fff" : plan.color, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Essayer
                  </button>
                </div>
              ))}
            </div>

            {/* CTA gratuit */}
            <button onClick={() => handleComplete(false)} style={{ width: "100%", padding: "14px", background: "none", border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Continuer en version gratuite →
            </button>
            <p style={{ margin: "12px 0 0", fontSize: 10, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              Carte requise · Aucun prélèvement pendant 7 jours · Annulable à tout moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── FRIENDS PAGE ───────────────────────────────────────────────────────────
const DEFAULT_VISIBILITY = { training: false, steps: false, regularity: false, daily_check: false, sleep: false };

const FriendsPage = ({ onClose, currentUser, profile, onUpdateProfile, onPendingCount }) => {
  const C = useC();
  const [tab, setTab] = useState("feed");
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [feed, setFeed] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [encouraged, setEncouraged] = useState({});
  const [loading, setLoading] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [username, setUsername] = useState(profile.username || "");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState("");
  const [visibility, setVisibility] = useState(() => { try { return JSON.parse(localStorage.getItem("friendVisibility")) || DEFAULT_VISIBILITY; } catch { return DEFAULT_VISIBILITY; } });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const inviteLink = `https://mylide.app?invite=${profile.username || currentUser?.id?.slice(0, 8) || "ami"}`;

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: fships } = await supabase
        .from("friendships")
        .select("id, status, requester_id, addressee_id, requester:requester_id(id, name, photo, username), addressee:addressee_id(id, name, photo, username)")
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

      if (fships) {
        const accepted = fships.filter(f => f.status === "accepted").map(f =>
          f.requester_id === currentUser.id ? { ...f.addressee, friendship_id: f.id } : { ...f.requester, friendship_id: f.id }
        );
        const incomingPending = fships.filter(f => f.status === "pending" && f.addressee_id === currentUser.id).map(f => ({ ...f.requester, friendship_id: f.id }));
        setFriends(accepted);
        setPending(incomingPending);
        onPendingCount?.(incomingPending.length);

        if (accepted.length > 0) {
          const ids = accepted.map(f => f.id);
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
          const { data: signals } = await supabase.from("daily_signals").select("*").in("user_id", ids).gte("date", weekAgo).order("date", { ascending: false });
          if (signals) buildFeed(signals, accepted);
        }
        const { data: encs } = await supabase.from("encouragements").select("to_user_id").eq("from_user_id", currentUser.id).eq("date", todayStr);
        if (encs) { const enc = {}; encs.forEach(e => { enc[e.to_user_id] = true; }); setEncouraged(enc); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const buildFeed = (signals, acceptedFriends) => {
    const items = [];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    signals.forEach(s => {
      const friend = acceptedFriends.find(f => f.id === s.user_id);
      if (!friend) return;
      const vis = s.friend_visibility || {};
      const name = (friend.name || "Ton ami").split(" ")[0];
      const dateLabel = s.date === todayStr ? "aujourd'hui" : s.date === yesterday ? "hier" : null;
      if (!dateLabel) return;
      if (vis.training && s.training_done) items.push({ id: `${s.id}_t`, userId: s.user_id, friend, name, msg: "a validé son entraînement", date: dateLabel, icon: "🏋️" });
      if (vis.daily_check && s.daily_filled) items.push({ id: `${s.id}_d`, userId: s.user_id, friend, name, msg: "a rempli son tracker", date: dateLabel, icon: "✓" });
      if (vis.steps && s.steps >= 7500) items.push({ id: `${s.id}_s`, userId: s.user_id, friend, name, msg: "a atteint son objectif de pas", date: dateLabel, icon: "👟" });
      if (vis.sleep && s.sleep_ok) items.push({ id: `${s.id}_sl`, userId: s.user_id, friend, name, msg: "a bien dormi", date: dateLabel, icon: "🌙" });
      if (vis.regularity && s.active_days_week >= 5) items.push({ id: `${s.id}_r`, userId: s.user_id, friend, name, msg: `actif ${s.active_days_week}j cette semaine`, date: dateLabel, icon: "📈" });
    });
    setFeed(items.slice(0, 15));
  };

  const sendEncouragement = async (friendId) => {
    if (encouraged[friendId]) return;
    setEncouraged(e => ({ ...e, [friendId]: true }));
    try { await supabase.from("encouragements").upsert({ from_user_id: currentUser.id, to_user_id: friendId, date: todayStr }, { onConflict: "from_user_id,to_user_id,date" }); } catch {}
  };

  const searchUser = async () => {
    if (!search.trim()) return;
    setSearching(true); setSearchResults(null);
    try {
      const q = search.trim();
      const { data } = await supabase.from("profiles").select("id, name, photo, username").or(`username.ilike.%${q}%,name.ilike.%${q}%`).neq("id", currentUser.id).limit(5);
      setSearchResults(data && data.length > 0 ? data : []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const sendRequest = async (userId) => {
    try {
      await supabase.from("friendships").upsert({ requester_id: currentUser.id, addressee_id: userId, status: "pending" }, { onConflict: "requester_id,addressee_id" });
      setSearchResults(prev => prev?.map(u => u.id === userId ? { ...u, requested: true } : u));
    } catch {}
  };

  const acceptFriend = async (fship_id) => { await supabase.from("friendships").update({ status: "accepted" }).eq("id", fship_id); loadAll(); };
  const declineFriend = async (fship_id) => { await supabase.from("friendships").delete().eq("id", fship_id); loadAll(); };
  const removeFriend = async (fship_id) => { await supabase.from("friendships").delete().eq("id", fship_id); setFriends(f => f.filter(fr => fr.friendship_id !== fship_id)); };

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
  };

  const saveUsername = async () => {
    if (!username.trim()) return;
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) { setUsernameMsg("Minimum 3 caractères"); return; }
    setSavingUsername(true);
    try {
      // Vérifier les restrictions avant de sauvegarder
      const { data: current } = await supabase.from("profiles").select("username, username_updated_at").eq("id", currentUser.id).single();
      if (current?.username) {
        // Déjà un pseudo — vérifier le délai de 30 jours
        const lastChange = current.username_updated_at ? new Date(current.username_updated_at) : null;
        const daysSince = lastChange ? (Date.now() - lastChange.getTime()) / 86400000 : 999;
        if (daysSince < 30) {
          const daysLeft = Math.ceil(30 - daysSince);
          setUsernameMsg(`Changement possible dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`);
          setSavingUsername(false); return;
        }
      }
      const { error } = await supabase.from("profiles").update({ username: clean, username_updated_at: new Date().toISOString() }).eq("id", currentUser.id);
      if (error) {
        console.error("Username save error:", error.message, error.code);
        if (error.code === "23505" || error.message?.includes("unique")) setUsernameMsg("Ce pseudo est déjà pris");
        else if (error.message?.includes("username_updated_at")) setUsernameMsg("Exécute le SQL de migration dans Supabase (username_updated_at)");
        else setUsernameMsg("Erreur : " + error.message);
      } else { setUsernameMsg("✓ Pseudo enregistré"); onUpdateProfile?.("username", clean); setTimeout(() => setUsernameMsg(""), 2500); }
    } catch { setUsernameMsg("Erreur"); }
    setSavingUsername(false);
  };

  const saveVisibility = async (newVis) => {
    setVisibility(newVis);
    localStorage.setItem("friendVisibility", JSON.stringify(newVis));
    try { await supabase.from("profiles").update({ friend_visibility: newVis }).eq("id", currentUser.id); } catch {}
  };

  const FriendAvatar = ({ p, size = 42 }) => p?.photo
    ? <img src={p.photo} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.border}`, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, #8B1A22)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: size * 0.38, flexShrink: 0 }}>{(p?.name?.[0] || "?").toUpperCase()}</div>;

  const tabs = [
    { id: "feed", label: "Activité" },
    { id: "amis", label: "Amis" + (friends.length > 0 ? ` · ${friends.length}` : "") },
    { id: "ajouter", label: "Ajouter" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 100, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "calc(var(--sat) + 14px) 20px 0", background: C.navBg, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer", fontSize: 20, color: C.black, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.black, letterSpacing: -0.3 }}>Amis</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Avancez ensemble</p>
          </div>
          <button onClick={() => setShowPrivacy(v => !v)} style={{ background: showPrivacy ? `${C.red}18` : C.surfaceAlt, border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="settings" size={16} color={showPrivacy ? C.red : C.muted} />
          </button>
        </div>
        <div style={{ display: "flex" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 4px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? C.red : C.muted, borderBottom: `2px solid ${tab === t.id ? C.red : "transparent"}`, transition: "all 0.2s", fontFamily: "inherit", position: "relative" }}>
              {t.label}
              {t.id === "amis" && pending.length > 0 && <span style={{ marginLeft: 5, background: C.red, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{pending.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>

        {/* Privacy panel */}
        {showPrivacy && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.black }}>Confidentialité</p>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: C.muted }}>Ce que tes amis peuvent voir · tout est privé par défaut</p>
            {[
              { key: "training", label: "Entraînements validés" },
              { key: "steps", label: "Objectif de pas atteint" },
              { key: "daily_check", label: "Tracker rempli" },
              { key: "sleep", label: "Sommeil" },
              { key: "regularity", label: "Régularité hebdo" },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, color: C.black }}>{label}</span>
                <Toggle value={visibility[key]} onChange={() => saveVisibility({ ...visibility, [key]: !visibility[key] })} />
              </div>
            ))}
          </div>
        )}

        {/* FEED */}
        {tab === "feed" && (
          loading ? <p style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: 14 }}>Chargement…</p>
          : friends.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{Ico.friends(C.muted, 28)}</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.black, margin: "0 0 8px" }}>Aucun ami pour l'instant</p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 20px" }}>Invite tes proches et avancez ensemble vers vos objectifs.</p>
              <button onClick={() => setTab("ajouter")} style={{ padding: "12px 28px", borderRadius: 14, background: C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Ajouter un ami</button>
            </div>
          ) : feed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.black, margin: "0 0 8px" }}>Tout est calme ici</p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>L'activité de tes amis apparaîtra ici quand ils partagent leurs progrès.</p>
            </div>
          ) : feed.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "13px 14px", marginBottom: 10 }}>
              <FriendAvatar p={item.friend} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}><span style={{ color: C.red }}>{item.name}</span> {item.msg}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>{item.date}</p>
              </div>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
            </div>
          ))
        )}

        {/* AMIS */}
        {tab === "amis" && (
          <div>
            {pending.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>Demandes reçues</p>
                {pending.map(p => (
                  <div key={p.friendship_id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 14px", marginBottom: 8 }}>
                    <FriendAvatar p={p} size={44} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}>{p.name}</p>
                      {p.username && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>@{p.username}</p>}
                    </div>
                    <button onClick={() => acceptFriend(p.friendship_id)} style={{ padding: "8px 12px", borderRadius: 10, background: C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Accepter</button>
                    <button onClick={() => declineFriend(p.friendship_id)} style={{ padding: "8px 12px", borderRadius: 10, background: C.surfaceAlt, color: C.muted, border: `1px solid ${C.border}`, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {loading ? <p style={{ textAlign: "center", color: C.muted, padding: "40px 0" }}>Chargement…</p>
            : friends.length === 0 && pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.black, margin: "0 0 12px" }}>Aucun ami encore</p>
                <button onClick={() => setTab("ajouter")} style={{ padding: "12px 28px", borderRadius: 14, background: C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Ajouter un ami</button>
              </div>
            ) : (
              <>
                {friends.length > 0 && <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>Mes amis · {friends.length}</p>}
                {friends.map(f => (
                  <div key={f.friendship_id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "13px 14px", marginBottom: 8 }}>
                    <FriendAvatar p={f} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}>{f.name}</p>
                      {f.username && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>@{f.username}</p>}
                    </div>
                    <button onClick={() => sendEncouragement(f.id)} style={{ padding: "8px 12px", borderRadius: 10, background: encouraged[f.id] ? `${C.green}18` : C.surfaceAlt, color: encouraged[f.id] ? C.green : C.muted, border: `1px solid ${encouraged[f.id] ? C.green : C.border}`, fontWeight: 700, fontSize: 12, cursor: encouraged[f.id] ? "default" : "pointer", fontFamily: "inherit", transition: "all 0.25s", whiteSpace: "nowrap" }}>
                      {encouraged[f.id] ? "✓ Encouragé" : "👋 Encourager"}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* AJOUTER */}
        {tab === "ajouter" && (
          <div>
            {/* Username */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.black }}>{profile.username ? "Ton pseudo" : "Choisis ton pseudo"}</p>
                {profile.username && <span style={{ fontSize: 16, fontWeight: 900, color: C.red }}>@{profile.username}</span>}
              </div>
              {!profile.username && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted }}>Indispensable pour que tes amis te retrouvent</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder={profile.username ? "Nouveau pseudo…" : "ex : hadrien_fit"} onKeyDown={e => e.key === "Enter" && saveUsername()} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.black, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                <button onClick={saveUsername} disabled={savingUsername} style={{ padding: "10px 16px", borderRadius: 10, background: C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{savingUsername ? "…" : profile.username ? "Modifier" : "OK"}</button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted }}>Lettres, chiffres, _ · modifiable 1x/mois</p>
              {usernameMsg && <p style={{ margin: "4px 0 0", fontSize: 12, color: usernameMsg.startsWith("✓") ? C.green : C.red }}>{usernameMsg}</p>}
            </div>

            {/* Search */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px", marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C.black }}>Rechercher par pseudo</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="@pseudo ou prénom…" onKeyDown={e => e.key === "Enter" && searchUser()} style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.black, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                <button onClick={searchUser} disabled={searching} style={{ padding: "11px 18px", borderRadius: 12, background: C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{searching ? "…" : "→"}</button>
              </div>
              {searchResults !== null && (
                <div style={{ marginTop: 10 }}>
                  {searchResults.length === 0
                    ? <p style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "8px 0" }}>Aucun utilisateur trouvé</p>
                    : searchResults.map(u => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                        <FriendAvatar p={u} size={40} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}>{u.name}</p>
                          {u.username && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>@{u.username}</p>}
                        </div>
                        <button onClick={() => sendRequest(u.id)} disabled={u.requested} style={{ padding: "8px 14px", borderRadius: 10, background: u.requested ? C.surfaceAlt : C.red, color: u.requested ? C.muted : "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: u.requested ? "default" : "pointer", fontFamily: "inherit" }}>
                          {u.requested ? "Envoyé ✓" : "Ajouter"}
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Invite link */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: C.black }}>Inviter un ami sur MYLIDE</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muted }}>Partage ce lien · gratuit pour démarrer</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inviteLink}</span>
                <button onClick={copyInvite} style={{ padding: "6px 12px", borderRadius: 8, background: inviteCopied ? C.green : C.red, color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "background 0.2s" }}>
                  {inviteCopied ? "✓ Copié" : "Copier"}
                </button>
              </div>
              {typeof navigator !== "undefined" && navigator.share && (
                <button onClick={() => navigator.share({ title: "MYLIDE", text: "Rejoins-moi sur MYLIDE · on avance ensemble !", url: inviteLink }).catch(() => {})} style={{ width: "100%", padding: "12px", borderRadius: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.black, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Partager l'app →
                </button>
              )}
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
  const { darkMode, themeMode, setThemeMode, C } = useTheme();
  // C = CV (variables CSS) - on synchronise _themeC pour inp/settingsInp
  Object.assign(_themeC, C);

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
  const [userPlan, setUserPlan] = useState("free");
  const [subscriptionData, setSubscriptionData] = useState({});
  const [showLegal, setShowLegal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [patrimoine, setPatrimoine] = useState(defaultPatrimoine());
  const [newPoche, setNewPoche] = useState({ name: "", amount: 0, color: "#2563eb" });
  const [flowPocket, setFlowPocket] = useState({ income: "", expense: "", invested: "" });
  const [statRange, setStatRange] = useState(() => localStorage.getItem("statRange") || "7");
  const [profile, setProfile] = useState({ name: "", dob: "", photo: "" });
  const [sim, setSim] = useState(() => { try { const s = JSON.parse(localStorage.getItem("simData")); return s && s.years ? s : { amount: 10000, monthly: 200, rate: 10, years: 10 }; } catch { return { amount: 10000, monthly: 200, rate: 10, years: 10 }; } });
  const [newGoal, setNewGoal] = useState({ label: "", category: "", color: "#CC2936", sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  const [renamingPoche, setRenamingPoche] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friendsPendingCount, setFriendsPendingCount] = useState(0);

  // Realtime + visibilité : met à jour le badge dès qu'une demande arrive
  useEffect(() => {
    if (!currentUser) return;
    const checkPending = async () => {
      try {
        const { count } = await supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", currentUser.id).eq("status", "pending");
        setFriendsPendingCount(count || 0);
      } catch {}
    };
    // Realtime — déclenche dès qu'une ligne est insérée dans friendships
    const channel = supabase.channel("friend-requests-" + currentUser.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${currentUser.id}` },
        () => { checkPending(); }
      ).subscribe();
    // Fallback — vérifie aussi quand l'utilisateur revient sur l'app
    const handleVisibility = () => { if (!document.hidden) checkPending(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUser]);
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [healthConsentGiven, setHealthConsentGiven] = useState(() => localStorage.getItem("healthConsentGiven") === "true");
  const [showHealthConsent, setShowHealthConsent] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "fr");
  _lang = lang;
  const [nutritionGoals, setNutritionGoals] = useState(() => { try { return { goalType: "maintenance", protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200, sex: null, height: null, activityLevel: null, ...JSON.parse(localStorage.getItem("nutritionGoals") || "{}") }; } catch { return { goalType: "maintenance", protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200, sex: null, height: null, activityLevel: null }; } });
  const [veganOnly, setVeganOnly] = useState(() => localStorage.getItem("veganOnly") === "true");
  const [radarDate, setRadarDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [radarWeekOffset, setRadarWeekOffset] = useState(0);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showProPopup, setShowProPopup] = useState(false);
  const photoRef = useRef(); const sportPhotoRef = useRef();
  const autoSaveRef = useRef(null);
  const loadDoneRef = useRef(false);
  const todayRef = useRef(null);
  const historyRef = useRef(null);
  const todosRef = useRef([]);
  const goalsRef = useRef([]);
  const patrimoineRef = useRef([]);
  const profileRef = useRef({});
  const patrimoineAutoSaveRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    const loadData = async (user) => {
      if (!user) { setOnboarded(false); currentUserIdRef.current = null; return; }
      currentUserIdRef.current = user.id;
      setCurrentUser(user);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData) {
        setProfile({ name: profileData.name || "", dob: profileData.dob || "", photo: profileData.photo || "", username: profileData.username || "" });
        const plan = profileData.plan || "free";
        setUserPlan(plan);
        setIsPro(isAtLeast(plan, "pro"));
        setSubscriptionData({
          subscription_status: profileData.subscription_status,
          subscription_period_end: profileData.subscription_period_end,
          trial_end: profileData.trial_end,
          stripe_subscription_id: profileData.stripe_subscription_id,
        });
        // Charger nutritionGoals depuis Supabase (priorité sur localStorage)
        if (profileData.nutrition_goals) {
          const merged = { goalType: "maintenance", protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200, sex: null, height: null, activityLevel: null, ...profileData.nutrition_goals };
          setNutritionGoals(merged);
          localStorage.setItem("nutritionGoals", JSON.stringify(merged));
        }
        // Charger les préférences depuis Supabase (priorité sur localStorage)
        if (profileData.user_prefs) {
          const p = profileData.user_prefs;
          if (p.notif)     localStorage.setItem("notif",     JSON.stringify(p.notif));
          if (p.connApps)  localStorage.setItem("connApps",  JSON.stringify(p.connApps));
          if (p.aiPref)    localStorage.setItem("aiPref",    JSON.stringify(p.aiPref));
          if (p.appPref)   localStorage.setItem("appPref",   JSON.stringify(p.appPref));
          if (p.wakeTime)  localStorage.setItem("wakeTime",  p.wakeTime);
          if (p.sleepTime) localStorage.setItem("sleepTime", p.sleepTime);
          if (p.lang)      { localStorage.setItem("lang", p.lang); _lang = p.lang; }
        }
        setOnboarded(true);
        // Charger le nombre de demandes d'amis en attente
        try {
          const { count } = await supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending");
          if (count > 0) setFriendsPendingCount(count);
        } catch {}
        // Détecter retour Stripe
        const params = new URLSearchParams(window.location.search);
        if (params.get("payment") === "success") setShowSubscription(true);
      }
      else { setOnboarded(false); return; }
      // Tri : date ASC, puis updated_at DESC (si la colonne existe) pour que
      // la ligne la plus récente par date soit la dernière → écrase les doublons dans le Map.
      // Le tri secondaire par id desc garantit le même comportement si updated_at absent.
      const { data: logs } = await supabase.from("daily_logs").select("*").eq("user_id", user.id).order("date").order("id", { ascending: false });
      if (logs) {
        // Dédupliquer : pour chaque date, la PREMIÈRE occurrence est la plus récente
        // (grâce au tri id DESC). On prend donc uniquement la première par date.
        const seen = new Set();
        const uniqueLogs = logs.filter(l => { if (seen.has(l.date)) return false; seen.add(l.date); return true; });
        const hist = uniqueLogs.map(l => ({ ...l.data, date: l.date, score: l.score })).sort((a, b) => a.date.localeCompare(b.date));

        setHistory(hist);
        const todayStr = new Date().toISOString().split("T")[0];
        const todayEntry = hist.find(d => d.date === todayStr);
        if (todayEntry) {
          if (todayEntry.sleep?.bedtime && todayEntry.sleep?.wakeup && !todayEntry.sleep?.duration)
            todayEntry.sleep.duration = calcDuration(todayEntry.sleep.bedtime, todayEntry.sleep.wakeup);
          setToday(todayEntry);
          console.log("[loadData] ✓ today from DB:", todayStr, "sport:", todayEntry.sport?.type || "-", "weight:", todayEntry.body?.weight || "-");
        } else {
          console.log("[loadData] no entry for today in DB →", todayStr);
        }

        // Popup 7 jours : montrer une seule fois après 7 jours d'utilisation aux utilisateurs free
        if (hist.length >= 7 && !localStorage.getItem("proPopupSeen")) {
          const plan = profileData?.plan || "free";
          if (plan === "free") { setTimeout(() => setShowProPopup(true), 2000); }
        }
      }
      const { data: goalsData } = await supabase.from("goals").select("*").eq("user_id", user.id);
      if (goalsData?.length) setGoals(goalsData.map(g => g.data));
      const { data: patrimoineRows } = await supabase.from("patrimoine").select("*").eq("user_id", user.id).order("id", { ascending: false }).limit(1);
      const patrimoineData = patrimoineRows?.[0];
      if (patrimoineData?.data) { setPatrimoine(patrimoineData.data); patrimoineRef.current = patrimoineData.data; }
      const { data: todosData } = await supabase.from("todos").select("*").eq("user_id", user.id);
      if (todosData?.length) setTodos(todosData.map(t => t.data));
      // Marquer le chargement terminé pour l'auto-save
      loadDoneRef.current = true;
    };

    // onAuthStateChange gère tout : INITIAL_SESSION (charge depuis localStorage,
    // sans réseau), SIGNED_IN (retour OAuth), SIGNED_OUT.
    // TOKEN_REFRESHED est ignoré : c'est un renouvellement silencieux du JWT,
    // aucune donnée utilisateur ne change → on ne recharge PAS et on ne remet
    // PAS loadDoneRef à false (ce qui bloquerait l'auto-save et écraserait today).
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        // Premier check au démarrage - session null ou restaurée depuis localStorage
        loadDoneRef.current = false;
        loadData(session?.user ?? null);
      } else if (event === "SIGNED_IN") {
        // Retour OAuth uniquement. Si c'est le même utilisateur déjà chargé
        // (ex : focus de l'onglet Chrome), on ne recharge PAS pour ne pas
        // écraser les données non encore sauvegardées.
        if (currentUserIdRef.current && currentUserIdRef.current === session.user?.id) return;
        loadDoneRef.current = false;
        loadData(session.user);
      } else if (event === "SIGNED_OUT") {
        loadDoneRef.current = false;
        setOnboarded(false);
      }
      // TOKEN_REFRESHED → no-op intentionnel
    });

    // Force-save avant fermeture / rechargement de page
    // Annule le debounce de 2 s et sauvegarde immédiatement les données en cours
    const handleBeforeUnload = () => {
      if (!loadDoneRef.current) return;
      clearTimeout(autoSaveRef.current);
      const t = todayRef.current;
      const h = historyRef.current;
      if (!t || !h) return;
      const updated = { ...t, score: calcScore(t) };
      const newH = [...h.filter(d => d.date !== t.date), updated].sort((a, b) => a.date.localeCompare(b.date));
      historyRef.current = newH;
      // saveAll est async mais on l'appelle quand même - le navigateur laisse
      // quelques ms aux promesses fetch() en cours avant de fermer la page.
      saveAll(newH, todosRef.current ?? [], goalsRef.current ?? [], patrimoineRef.current ?? {}, profileRef.current ?? {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

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

    return () => { authSub?.unsubscribe(); window.removeEventListener("beforeunload", handleBeforeUnload); };
  }, []);

  // Sync nutritionGoals → Supabase (debounced 2s) pour ne pas perdre les macros
  // si l'utilisateur vide son cache ou change d'appareil
  useEffect(() => {
    if (!currentUser?.id || !loadDoneRef.current) return;
    const t = setTimeout(async () => {
      await supabase.from("profiles").update({ nutrition_goals: nutritionGoals }).eq("id", currentUser.id);
    }, 2000);
    return () => clearTimeout(t);
  }, [nutritionGoals]);

  // Afficher le popup de consentement santé au premier accès aux onglets santé
  useEffect(() => {
    if (["sleep", "body", "nutrition"].includes(trackTab) && !healthConsentGiven) {
      const t = setTimeout(() => setShowHealthConsent(true), 400);
      return () => clearTimeout(t);
    }
  }, [trackTab, healthConsentGiven]);

  // Pré-remplir les mesures corpo depuis le dernier enregistrement connu.
  // SÉCURITÉ : on ne préremplit QUE si today n'est pas encore dans l'historique
  // (= première visite du jour). Si today est déjà dans history (données sauvegardées),
  // on ne touche PAS - évite d'écraser le poids changé par l'utilisateur lors d'un
  // setHistory déclenché par l'auto-save.
  useEffect(() => {
    if (!history.length) return;
    const todayStr = new Date().toISOString().split("T")[0];
    // Si aujourd'hui est déjà dans history avec des données corpo → on ne préremplit pas
    const todayInHistory = history.find(d => d.date === todayStr);
    const bodyFields = ["weight", "weightTarget", "chest", "waist", "hips", "arms", "thighs", "restingHR", "maxHR"];
    if (todayInHistory && bodyFields.some(f => (todayInHistory.body?.[f] || 0) > 0)) return;
    const lastBody = [...history].reverse().find(d => d.date !== todayStr && d.body && bodyFields.some(f => d.body[f] > 0));
    if (!lastBody?.body) return;
    setToday(prev => {
      const mergedBody = { ...prev.body };
      let changed = false;
      bodyFields.forEach(f => {
        if ((!mergedBody[f] || mergedBody[f] === 0) && lastBody.body[f] > 0) {
          mergedBody[f] = lastBody.body[f];
          changed = true;
        }
      });
      if (!changed) return prev;
      return { ...prev, body: mergedBody };
    });
  }, [history]);

  // ── Auto-save refs (toujours à jour sans déclencher l'effet auto-save) ────
  useEffect(() => { todayRef.current = today; }, [today]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { todosRef.current = todos; }, [todos]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { patrimoineRef.current = patrimoine; }, [patrimoine]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // ── Auto-save : 2 secondes après la dernière modification de today ────────
  useEffect(() => {
    if (!loadDoneRef.current) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const t = todayRef.current;
      const h = historyRef.current;
      if (!t || !h) return;
      const updated = { ...t, score: calcScore(t) };
      const newH = [...h.filter(d => d.date !== t.date), updated].sort((a, b) => a.date.localeCompare(b.date));
      historyRef.current = newH;
      setHistory(newH);
      // Utiliser les refs pour avoir les valeurs les plus récentes
      saveAll(newH, todosRef.current, goalsRef.current, patrimoineRef.current, profileRef.current);
    }, 2000);
    return () => clearTimeout(autoSaveRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);


  const saveAll = useCallback(async (h, t, g, p, pr) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { console.warn("[saveAll] No session - skipping save"); return; }
    setSyncStatus("saving");

    // Profil
    await supabase.from("profiles").upsert({ id: user.id, name: pr.name, dob: pr.dob, photo: pr.photo });

    // Journal du jour : SELECT l'ID existant → upsert par PK (comme profiles).
    // Ne nécessite aucune contrainte UNIQUE, fonctionne avec n'importe quel schéma.
    const todayStr = new Date().toISOString().split("T")[0];
    const todayData = h.find(d => d.date === todayStr);
    if (todayData) {
      // 1) Chercher la ligne la plus récente pour (user_id, date)
      const { data: existing } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .order("id", { ascending: false })
        .limit(1);
      const rowId = existing?.[0]?.id;
      const payload = { user_id: user.id, date: todayStr, data: todayData, score: todayData.score || 0 };

      // 2a) Ligne existante → upsert avec l'id réel (garanti de mettre à jour)
      // 2b) Pas de ligne → insert (premier save du jour)
      const { error: saveErr } = rowId
        ? await supabase.from("daily_logs").upsert({ ...payload, id: rowId })
        : await supabase.from("daily_logs").insert(payload);

      if (saveErr) {
        console.error("[saveAll] ERREUR save daily_logs:", saveErr);
        setSyncStatus("error");
        setTimeout(() => setSyncStatus("idle"), 4000);
        return;
      } else {
        console.log("[saveAll] ✓", rowId ? "UPDATE" : "INSERT", todayStr, "poids:", todayData.body?.weight, "sport:", todayData.sport?.type || "-");
      }
    }

    // Objectifs
    await supabase.from("goals").delete().eq("user_id", user.id);
    if (g.length) await supabase.from("goals").insert(g.map(goal => ({ user_id: user.id, data: goal })));

    // Patrimoine - delete+insert pour éviter les doublons
    await supabase.from("patrimoine").delete().eq("user_id", user.id);
    if (p && p.length) await supabase.from("patrimoine").insert({ user_id: user.id, data: p });

    // Todos
    await supabase.from("todos").delete().eq("user_id", user.id);
    if (t.length) await supabase.from("todos").insert(t.map(todo => ({ user_id: user.id, data: todo })));

    setSyncStatus("saved");
    setTimeout(() => setSyncStatus("idle"), 2500);
  }, []);

  const handleOnboardingComplete = async (profileData, createdGoals, bodyProfileData, wantsSubscription = false) => {
    // Afficher l'app immédiatement, sans attendre les saves réseau
    setProfile(profileData); setGoals(createdGoals); setOnboarded(true);
    if (wantsSubscription) setTimeout(() => setShowSubscription(true), 600);
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user; if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, name: profileData.name, dob: profileData.dob, photo: profileData.photo });

    // Sauvegarder le profil physique dans nutritionGoals
    if (bodyProfileData) {
      const ng = {
        goalType: bodyProfileData.goalType || "maintenance",
        sex: bodyProfileData.sex || null,
        height: bodyProfileData.height || null,
        activityLevel: bodyProfileData.activityLevel || null,
        protTarget: 150, calTarget: 2000, fatTarget: 65, carbsTarget: 200,
      };
      setNutritionGoals(ng);
      localStorage.setItem("nutritionGoals", JSON.stringify(ng));

      // Si le poids initial est renseigné, l'enregistrer dans la journée
      if (bodyProfileData.weight) {
        const todayStr = new Date().toISOString().split("T")[0];
        const initialDay = {
          ...defaultDay(),
          date: todayStr,
          body: {
            weight: bodyProfileData.weight,
            weightTarget: bodyProfileData.weightTarget || 0,
            chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0, restingHR: 0, maxHR: 0,
          },
        };
        initialDay.score = calcScore(initialDay);
        historyRef.current = [initialDay];
        setHistory([initialDay]);
        setToday(initialDay);
        saveAll([initialDay], [], createdGoals, defaultPatrimoine(), profileData);
        return;
      }
    }
    saveAll([], [], createdGoals, defaultPatrimoine(), profileData);
  };

  const update = (section, field, val) => { setToday(prev => { const updated = { ...prev, [section]: { ...prev[section], [field]: val } }; if (section === "sleep") updated.sleep.duration = calcDuration(updated.sleep.bedtime, updated.sleep.wakeup); updated.score = calcScore(updated); return updated; }); setSaved(false); };
  const updateNested = (section, sub, field, val) => { setToday(prev => { const updated = { ...prev, [section]: { ...prev[section], [sub]: { ...prev[section][sub], [field]: val } } }; updated.score = calcScore(updated); return updated; }); setSaved(false); };

  const syncDailySignal = async () => {
    if (!currentUser) return;
    try {
      const vis = (() => { try { return JSON.parse(localStorage.getItem("friendVisibility")) || DEFAULT_VISIBILITY; } catch { return DEFAULT_VISIBILITY; } })();
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      const activeDays = history.filter(d => new Date(d.date) >= weekStart && (d.score || 0) > 15).length + (today.score > 15 ? 1 : 0);
      await supabase.from("daily_signals").upsert({
        user_id: currentUser.id,
        date: todayDate,
        training_done: (today.sport?.sessions?.length > 0) || false,
        steps: today.sport?.steps || 0,
        sleep_ok: (today.sleep?.duration >= 7) || false,
        daily_filled: today.score > 10,
        active_days_week: Math.min(activeDays, 7),
        friend_visibility: vis,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,date" });
    } catch {}
  };

  const saveDay = () => {
    // Annuler l'auto-save en cours pour éviter une double écriture concurrente
    clearTimeout(autoSaveRef.current);
    const updated = { ...today, score: calcScore(today) };
    const newHistory = [...history.filter(d => d.date !== today.date), updated].sort((a, b) => a.date.localeCompare(b.date));
    historyRef.current = newHistory;
    setHistory(newHistory);
    saveAll(newHistory, todosRef.current, goalsRef.current, patrimoineRef.current, profileRef.current);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    syncDailySignal();
  };

  const addTodo = () => { if (!newTodo.trim()) return; const t = [...todos, { id: Date.now(), text: newTodo, done: false, date: new Date().toISOString().split("T")[0] }]; setTodos(t); saveAll(history, t, goals, patrimoine, profile); setNewTodo(""); };
  const toggleTodo = id => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const deleteTodo = id => { const t = todos.filter(t => t.id !== id); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const totalPatrimoine = patrimoine.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const updateGoalField = (id, f, v) => { const g = goals.map(g => g.id === id ? { ...g, [f]: v } : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const saveEditedGoal = (edited) => { const g = goals.map(g => g.id === edited.id ? edited : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const GOAL_COLORS = ["#CC2936","#1A7A4A","#1E5FCC","#6B35C8","#D4580A","#0891b2","#be185d","#0A0A0A"];
  const randomGoalColor = () => GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)];
  const addGoal = () => {
    if (!newGoal.label.trim()) return;
    if (!isAtLeast(userPlan, "starter") && goals.length >= 3) { setShowSubscription(true); return; }
    const g = [...goals, { ...newGoal, id: Date.now(), manualProgress: 0, color: randomGoalColor() }];
    setGoals(g); saveAll(history, todos, g, patrimoine, profile);
    setNewGoal({ label: "", category: "", color: "#CC2936", sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  };
  const deleteGoal = id => { const g = goals.filter(g => g.id !== id); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const moveGoal = (idx, dir) => { const g = [...goals]; const ni = idx + dir; if (ni < 0 || ni >= g.length) return; [g[idx], g[ni]] = [g[ni], g[idx]]; setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const updatePoche = (id, f, v) => {
    const p = patrimoine.map(x => x.id === id ? { ...x, [f]: v } : x);
    setPatrimoine(p);
    patrimoineRef.current = p;
    if (!loadDoneRef.current) return;
    clearTimeout(patrimoineAutoSaveRef.current);
    patrimoineAutoSaveRef.current = setTimeout(() => {
      saveAll(historyRef.current, todosRef.current, goalsRef.current, p, profileRef.current);
    }, 800);
  };
  const addPoche = () => { if (!newPoche.name.trim()) return; const pocheLimit = isAtLeast(userPlan, "pro") ? 999 : isAtLeast(userPlan, "starter") ? 5 : 2; if (patrimoine.length >= pocheLimit) { setShowSubscription(true); return; } const p = [...patrimoine, { ...newPoche, id: Date.now(), amount: Number(newPoche.amount) }]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); setNewPoche({ name: "", amount: 0, color: "#2563eb" }); };
  const deletePoche = id => { const p = patrimoine.filter(p => p.id !== id); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const applyFlowToPocket = (type, amount, pocheIdStr) => {
    if (!pocheIdStr || !amount) return;
    const pocheId = Number(pocheIdStr);
    const poche = patrimoine.find(p => p.id === pocheId);
    if (!poche) return;
    const delta = type === "expense" ? -amount : amount;
    updatePoche(pocheId, "amount", Math.max(0, (poche.amount || 0) + delta));
    setFlowPocket(fp => ({ ...fp, [type]: "" }));
  };
  const movePoche = (idx, dir) => { const p = [...patrimoine]; const ni = idx + dir; if (ni < 0 || ni >= p.length) return; [p[idx], p[ni]] = [p[ni], p[idx]]; setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const updateProfile = (f, v) => { const pr = { ...profile, [f]: v }; setProfile(pr); saveAll(history, todos, goals, patrimoine, pr); };
  const handleProfilePhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(f); };
  const handleSportPhoto = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => update("sport", "photoUrl", ev.target.result); r.readAsDataURL(f); };
  const handleSignOut = async () => { await supabase.auth.signOut(); localStorage.removeItem("kojihlife_v9"); setOnboarded(false); };

  const intel = getIntelligence(history, totalPatrimoine, goals);
  const temporalInsights = getTemporalIntelligence(today, history, goals);
  const age = calcAge(profile.dob);
  const rangeH = statRange === "all" ? history : history.slice(-parseInt(statRange));
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

  // ── SCIENCE ENGINE - TDEE + macros + contradictions ───────────────────────
  const currentWeight = today.body?.weight || history.slice().reverse().find(d => d.body?.weight > 0)?.body?.weight || 0;
  const inferredActivity = useMemo(() => inferActivityLevel(history), [history]);
  const activeActivity   = nutritionGoals.activityLevel || inferredActivity;
  const tdee = useMemo(() => calcTDEE(
    currentWeight,
    nutritionGoals.height || 175,
    age || 30,
    nutritionGoals.sex || "male",
    activeActivity,
  ), [currentWeight, nutritionGoals.height, age, nutritionGoals.sex, activeActivity]);

  const sportCalBurnScience = useMemo(() => calcSportBurn(
    currentWeight, today.sport?.type, today.sport?.duration
  ), [currentWeight, today.sport?.type, today.sport?.duration]);

  const scienceMacros = useMemo(() => calcMacros(
    currentWeight, tdee, nutritionGoals.goalType, sportCalBurnScience, nutritionGoals.sex || "male"
  ), [currentWeight, tdee, nutritionGoals.goalType, sportCalBurnScience, nutritionGoals.sex]);

  const weeklyFreq = useMemo(() => getWeeklySportFreq(history), [history]);

  const contradictions = useMemo(() => detectContradictions({
    goalType:       nutritionGoals.goalType,
    currentWeight,
    targetWeight:   today.body?.weightTarget || 0,
    calCurrent,
    calTarget,
    protCurrent,
    protTarget,
    tdee,
    sleepDuration:  today.sleep?.duration || 0,
    sportFreqWeek:  weeklyFreq,
    sex:            nutritionGoals.sex || "male",
  }), [nutritionGoals.goalType, currentWeight, today.body?.weightTarget, calCurrent, calTarget, protCurrent, protTarget, tdee, today.sleep?.duration, weeklyFreq, nutritionGoals.sex]);

  const progressEst = useMemo(() => estimateProgress(
    currentWeight, today.body?.weightTarget, nutritionGoals.goalType, nutritionGoals.sex || "male"
  ), [currentWeight, today.body?.weightTarget, nutritionGoals.goalType, nutritionGoals.sex]);

  // Legacy compat (used by radar score + a few display checks)
  const nutritionGoalConflict = contradictions.find(a => a.suggestGoal) || null;

  useEffect(() => { localStorage.setItem("simData", JSON.stringify(sim)); }, [sim]);

  const simResult = useMemo(() => {
    const initAmount = Number(sim.amount) || 0;
    const monthly = Number(sim.monthly) || 0;
    const rate = Number(sim.rate) || 0;
    const years = Number(sim.years) || 1;
    let total = initAmount;
    const data = [{ year: 0, invested: initAmount, interests: 0 }];
    for (let y = 1; y <= years; y++) {
      total = total * (1 + rate / 100) + monthly * 12;
      const invested = Math.round(initAmount + monthly * 12 * y);
      const rounded = Math.round(total);
      data.push({ year: y, invested: Math.min(invested, rounded), interests: Math.max(0, rounded - Math.min(invested, rounded)) });
    }
    return data;
  }, [sim]);

  // Sleep analysis - computed once, used in tracker UI and radar
  const recentBedtimeMins = history.slice(-7).filter(d => d.sleep?.bedtime).map(d => { const [h, m] = d.sleep.bedtime.split(":").map(Number); return h * 60 + m; });
  const todayDate = new Date().toISOString().split("T")[0];
  const yesterdayEntry = [...history].reverse().find(d => d.date !== todayDate);
  const yesterdayHadSport = !!(yesterdayEntry?.sport?.duration >= 30 || yesterdayEntry?.sport?.intensity >= 3);
  const sleepAnalysis = calcSleepScore(today.sleep, age, recentBedtimeMins, yesterdayHadSport);

  // ── RADAR SCORES - multi-factor 0-100 per category ───────────────────────
  const radarSportScore = (() => {
    if (!today.sport.type) return 5;
    if (today.sport.isRest) return today.sport.stretching ? 65 : 50;
    const dur = today.sport.duration || 0;
    const intensity = today.sport.intensity || 0;
    const recovery = today.sport.recovery || 0;
    const base = Math.min(55, dur * 1.1); // 50min → 55pts
    const iBonus = intensity >= 1 ? (intensity - 1) * 8 : 0; // up to +32
    const rBonus = recovery >= 4 ? 10 : recovery >= 3 ? 5 : 0;
    const steps = today.sport.steps || 0;
    const stepsBonus = steps >= 10000 ? 8 : steps >= 7000 ? 5 : steps >= 5000 ? 3 : steps >= 3000 ? 1 : 0;
    return Math.max(5, Math.min(100, Math.round(base + iBonus + rBonus + stepsBonus)));
  })();
  const radarNutrScore = (() => {
    const meals = (today.nutrition.breakfast ? 15 : 0) + (today.nutrition.lunch ? 15 : 0) + (today.nutrition.dinner ? 15 : 0);
    const water = Math.min(20, Math.round(today.nutrition.water * 8)); // 2.5L → 20pts
    const calAdh = calTarget > 0 && calCurrent > 0 ? Math.max(0, 1 - Math.abs(calCurrent - calTarget) / calTarget) : 0;
    const protAdh = protTarget > 0 && protCurrent > 0 ? Math.min(1, protCurrent / protTarget) : 0;
    const macros = Math.round(calAdh * 12 + protAdh * 18);
    const junk = today.nutrition.junk ? -15 : 0;
    return Math.max(5, Math.min(100, meals + water + macros + junk));
  })();
  const radarWorkScore = (() => {
    const focus = (today.work.focus || 0) * 14; // 5/5 → 70pts
    const taskComp = today.work.tasks > 0 ? Math.min(1, (today.work.tasksCompleted || 0) / today.work.tasks) : 0;
    const tasks = today.work.tasks > 0 ? Math.round(taskComp * 18) : 0;
    const screen = today.work.screenTime > 0
      ? (today.work.screenTime <= 3 ? 12 : today.work.screenTime <= 5 ? 0 : -20)
      : 0;
    return Math.max(5, Math.min(100, focus + tasks + screen));
  })();
  const radarMindScore = (() => {
    const mood = (today.mind.mood || 0) * 14;
    const read = Math.min(15, Math.round((today.mind.reading || 0) / 4));
    const med = today.mind.meditation ? 12 : 0;
    return Math.max(5, Math.min(100, mood + read + med));
  })();
  const radarBodyScore = (() => {
    if (!today.body?.weight) return 10;
    const w = today.body.weight;
    const wt = today.body?.weightTarget || 0;
    const diff = wt > 0 ? Math.abs(wt - w) / w : 0; // relative gap
    const progressScore = wt > 0 ? Math.max(20, 100 - Math.round(diff * 250)) : 60;
    const measures = [today.body.chest, today.body.waist, today.body.hips, today.body.arms, today.body.thighs].filter(v => v > 0).length;
    return Math.max(10, Math.min(100, progressScore + measures * 4));
  })();

  const radar = [
    { s: "Sommeil", v: today.sleep.duration > 0 ? Math.max(5, sleepAnalysis.score) : 5 },
    { s: "Sport",   v: radarSportScore },
    { s: "Nutrition", v: radarNutrScore },
    { s: "Travail", v: radarWorkScore },
    { s: "Mental",  v: radarMindScore },
    { s: "Corps",   v: radarBodyScore },
  ];

  // ── DAY SELECTOR (home radar) ──────────────────────────────────────────────
  const radarWeekDays = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=sun
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset + radarWeekOffset * 7);
    const dayLetters = ["L", "M", "M", "J", "V", "S", "D"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { dateStr: d.toISOString().split("T")[0], dayLetter: dayLetters[i], dayNum: d.getDate() };
    });
  }, [radarWeekOffset]);

  const radarDayData = radarDate === todayDate ? today : (history.find(d => d.date === radarDate) || null);
  const radarForDay = useMemo(() => {
    const d = radarDayData;
    if (!d) return [{ s:"Sommeil",v:5 },{ s:"Sport",v:5 },{ s:"Nutrition",v:5 },{ s:"Travail",v:5 },{ s:"Mental",v:5 },{ s:"Corps",v:5 }];
    if (d === today) return radar; // use already-computed scores for today
    const sl = d.sleep || {}, sp = d.sport || {}, n = d.nutrition || {}, w = d.work || {}, m = d.mind || {}, b = d.body || {};
    // Sleep
    const dur = sl.duration || 0;
    let slS = dur >= 7 && dur <= 9 ? 65 : dur >= 6.5 ? 50 : dur >= 6 ? 35 : dur > 0 ? 18 : 5;
    if (sl.quality >= 4) slS += 15; if (sl.noScreen) slS += 5;
    // Sport
    const spS = !sp.type ? 5 : sp.isRest ? (sp.stretching ? 65 : 50) : Math.max(5, Math.min(100, Math.round(
      Math.min(55, (sp.duration||0)*1.1) + ((sp.intensity||0)>=1 ? ((sp.intensity||0)-1)*8 : 0) + ((sp.recovery||0)>=4?10:(sp.recovery||0)>=3?5:0))));
    // Nutrition
    const nutrS = Math.max(5, Math.min(100, (n.breakfast?15:0)+(n.lunch?15:0)+(n.dinner?15:0)+Math.min(20,Math.round((n.water||0)*8))+(n.junk?-15:0)));
    // Work
    const wS = Math.max(5, Math.min(100, (w.focus||0)*14 + (w.tasks>0?Math.round(Math.min(1,(w.tasksCompleted||0)/w.tasks)*18):0) + (w.screenTime>5?-20:w.screenTime>3?0:w.screenTime>0?12:0)));
    // Mind
    const mS = Math.max(5, Math.min(100, (m.mood||0)*14 + Math.min(15,Math.round((m.reading||0)/4)) + (m.meditation?12:0)));
    // Body
    const bS = b.weight > 0 ? 60 : 10;
    return [{ s:"Sommeil",v:Math.min(100,slS) },{ s:"Sport",v:spS },{ s:"Nutrition",v:nutrS },{ s:"Travail",v:wS },{ s:"Mental",v:mS },{ s:"Corps",v:bS }];
  }, [radarDayData, radar, today]);

  const navIdx = NAV_ORDER.indexOf(nav); const trackIdx = TRACK_ORDER.indexOf(trackTab);
  const swipeNav = useSwipe(
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.min(trackIdx + 1, TRACK_ORDER.length - 1)]); else setNav(NAV_ORDER[Math.min(navIdx + 1, NAV_ORDER.length - 1)]); },
    () => { if (nav === "track") setTrackTab(TRACK_ORDER[Math.max(trackIdx - 1, 0)]); else setNav(NAV_ORDER[Math.max(navIdx - 1, 0)]); }
  );

  const _sd = radarDayData || today;
  const STAT_CARDS = [
    { label: "Sommeil", value: _sd.sleep?.duration ? `${_sd.sleep.duration}h` : "-", icon: "sleep", color: C.purple, tab: "sleep" },
    { label: "Sport", value: _sd.sport?.isRest ? "Repos" : _sd.sport?.duration ? `${_sd.sport.duration}m` : "-", icon: "sport", color: C.red, tab: "sport" },
    { label: "Eau", value: _sd.nutrition?.water ? `${_sd.nutrition.water}L` : "-", icon: "water", color: C.blue, tab: "nutrition" },
    { label: "Poids", value: _sd.body?.weight ? `${_sd.body.weight}kg` : "-", icon: "scale", color: C.orange, tab: "body" },
    { label: "Focus", value: _sd.work?.focus ? `${_sd.work.focus}/5` : "-", icon: "focus", color: C.red, tab: "work" },
    { label: "Humeur", value: _sd.mind?.mood ? `${_sd.mind.mood}/5` : "-", icon: "mood", color: C.green, tab: "mind" },
  ];

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;
  if (onboarded === null) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <img src={kojihLogo} alt="MYLIDE" style={{ width: 72, height: 72, filter: "drop-shadow(0 8px 24px rgba(204,41,54,0.35))" }} />
      <p style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: -0.5 }}>MYLIDE</p>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.red}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!onboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, maxWidth: 480, margin: "0 auto", paddingBottom: "calc(76px + max(var(--sab), 8px))", position: "relative", touchAction: "pan-y" }}>
      <style>{`
        * { font-family: 'DM Sans', sans-serif !important; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, select, textarea { font-family: 'DM Sans', sans-serif !important; font-size: 16px !important; }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
        img { display: block; max-width: 100%; }
        button { -webkit-appearance: none; outline: none; }
        :root {
          --sat: env(safe-area-inset-top, 0px);
          --sab: env(safe-area-inset-bottom, 0px);
          --sal: env(safe-area-inset-left, 0px);
          --sar: env(safe-area-inset-right, 0px);
        }
        /* Retour haptique visuel : léger scale sur tap */
        button:active { transform: scale(0.97); }
        /* Focus visible accessible */
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid var(--c-red);
          outline-offset: 2px;
        }
        /* Transition globale sur les éléments interactifs */
        button, a { transition: transform 0.1s ease, opacity 0.15s ease; }
        /* Inputs focus */
        input:focus, select:focus, textarea:focus {
          border-color: var(--c-red) !important;
          box-shadow: 0 0 0 3px var(--c-redLight);
        }
        ${darkMode ? `
          input, select, textarea {
            background: var(--c-surfaceAlt) !important;
            color: var(--c-text) !important;
            border-color: var(--c-border) !important;
            color-scheme: dark;
          }
          input::placeholder { color: var(--c-muted) !important; opacity: 1; }
          option { background: var(--c-surfaceAlt) !important; color: var(--c-text) !important; }
        ` : `
          input::placeholder { color: var(--c-muted); }
          color-scheme: light;
        `}
      `}</style>

      {/* Indicateur de synchronisation cloud */}
      {syncStatus !== "idle" && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, pointerEvents: "none",
          background: syncStatus === "error" ? "#CC2936" : syncStatus === "saving" ? C.surface : "#10B981",
          border: `1.5px solid ${syncStatus === "error" ? "#CC293650" : syncStatus === "saving" ? C.border : "#10B98150"}`,
          borderRadius: 30, padding: "8px 18px",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          transition: "all 0.3s ease",
        }}>
          {syncStatus === "saving" && (
            <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${C.muted}`, borderTopColor: C.red, animation: "spin 0.7s linear infinite" }} />
          )}
          {syncStatus === "saved" && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}
          {syncStatus === "error" && <span style={{ color: "#fff", fontSize: 13 }}>✗</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color: syncStatus === "saving" ? C.muted : "#fff", whiteSpace: "nowrap" }}>
            {syncStatus === "saving" ? "Synchronisation..." : syncStatus === "saved" ? "Sauvegardé" : "Erreur de sauvegarde"}
          </span>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {editingGoal && <EditGoalModal goal={editingGoal} onSave={saveEditedGoal} onClose={() => setEditingGoal(null)} />}
      {showSubscription && <Subscription onClose={() => setShowSubscription(false)} userPlan={userPlan} userId={currentUser?.id} userEmail={currentUser?.email} subscriptionData={subscriptionData} />}
      {showFriends && <FriendsPage onClose={() => setShowFriends(false)} currentUser={currentUser} profile={profile} onUpdateProfile={updateProfile} onPendingCount={setFriendsPendingCount} />}
      {showSettings && <SettingsPage onClose={async () => {
          setShowSettings(false);
          // Sync préférences localStorage → Supabase au moment de la fermeture
          if (currentUser?.id) {
            try {
              const prefs = {
                notif: JSON.parse(localStorage.getItem("notif") || "{}"),
                connApps: JSON.parse(localStorage.getItem("connApps") || "{}"),
                aiPref: JSON.parse(localStorage.getItem("aiPref") || "{}"),
                appPref: JSON.parse(localStorage.getItem("appPref") || "{}"),
                wakeTime: localStorage.getItem("wakeTime") || "07:00",
                sleepTime: localStorage.getItem("sleepTime") || "23:00",
                lang: localStorage.getItem("lang") || "fr",
              };
              await supabase.from("profiles").update({ user_prefs: prefs }).eq("id", currentUser.id);
            } catch {}
          }
        }} darkMode={darkMode} themeMode={themeMode} setThemeMode={setThemeMode} profile={profile} isPro={isPro} userPlan={userPlan} setShowSubscription={setShowSubscription} nutritionGoals={nutritionGoals} setNutritionGoals={setNutritionGoals} onSignOut={handleSignOut} updateProfile={updateProfile} setLang={setLang} setShowDataExport={setShowDataExport} setShowDeleteAccount={setShowDeleteAccount} setShowFAQ={setShowFAQ} setShowLegal={setShowLegal} />}
      {showLegal && <LegalPage onBack={() => setShowLegal(false)} />}
      {showDataExport && <DataExportModal history={history} profile={profile} nutritionGoals={nutritionGoals} goals={goals} patrimoine={patrimoine} onClose={() => setShowDataExport(false)} />}
      {showDeleteAccount && <DeleteAccountModal profile={profile} onClose={() => setShowDeleteAccount(false)} onConfirmDelete={async () => {
        // Utiliser l'API serveur sécurisée pour la suppression RGPD complète
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const token = session?.access_token;
        if (!userId) return;
        try {
          await fetch("/api/delete-account", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ userId }),
          });
        } catch {}
        // Déconnecter côté client dans tous les cas
        await supabase.auth.signOut();
        localStorage.removeItem("kojihlife_v9");
        setOnboarded(false);
        setShowDeleteAccount(false);
      }} />}
      {showFAQ && <FAQPage onBack={() => setShowFAQ(false)} />}

      {/* ── Consentement données de santé (RGPD Art. 9) ─────────────────────── */}
      {showHealthConsent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 24px" }}>
          <div style={{ background: C.surface, borderRadius: 28, padding: "28px 24px 24px", maxWidth: 420, width: "100%", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="shield" size={22} color={C.purple} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: -0.3 }}>Données de santé</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Consentement RGPD – Article 9</p>
              </div>
            </div>

            {/* Body */}
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.text, lineHeight: 1.65 }}>
              MYLIDE collecte des <strong>données de santé</strong> (sommeil, poids, nutrition) uniquement pour ton suivi personnel.
            </p>
            <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
              {[
                "Stockées dans ton compte sécurisé Supabase",
                "Jamais revendues ni partagées avec des tiers",
                "Supprimables à tout moment via Paramètres",
                "Utilisées uniquement pour tes statistiques perso",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: i < 3 ? 8 : 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${C.green}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: C.green, lineHeight: 1 }}>✓</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 11, color: C.muted, lineHeight: 1.55, textAlign: "center" }}>
              MYLIDE ne remplace pas un professionnel de santé.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setShowHealthConsent(false);
                  // Refus : l'utilisateur peut quand même utiliser l'app, on redemande la prochaine fois
                }}
                style={{ flex: 1, padding: "13px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, fontWeight: 700, fontSize: 14, color: C.muted, cursor: "pointer" }}
              >
                Plus tard
              </button>
              <button
                onClick={async () => {
                  setHealthConsentGiven(true);
                  setShowHealthConsent(false);
                  localStorage.setItem("healthConsentGiven", "true");
                  // Enregistrer dans Supabase user_prefs
                  if (currentUser?.id) {
                    try {
                      const existingPrefs = JSON.parse(localStorage.getItem("userPrefs") || "{}");
                      const updatedPrefs = { ...existingPrefs, healthConsentGiven: true, healthConsentDate: new Date().toISOString() };
                      localStorage.setItem("userPrefs", JSON.stringify(updatedPrefs));
                      await supabase.from("profiles").update({
                        user_prefs: { ...updatedPrefs },
                      }).eq("id", currentUser.id);
                    } catch {}
                  }
                }}
                style={{ flex: 2, padding: "13px", background: `linear-gradient(135deg, ${C.purple}, #5a28a8)`, border: "none", borderRadius: 14, fontWeight: 800, fontSize: 14, color: "#fff", cursor: "pointer", boxShadow: `0 6px 20px ${C.purple}40` }}
              >
                J'accepte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 7 JOURS - argument 0€ premier mois */}
      {showProPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 20px" }} onClick={() => { setShowProPopup(false); localStorage.setItem("proPopupSeen", "1"); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 28, padding: "28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg, #CC2936, #8B1A22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(204,41,54,0.35)" }}>
                <Icon name="chart" size={28} color="#fff" strokeWidth={1.8} />
              </div>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: C.text, textAlign: "center", letterSpacing: -0.5 }}>
              Tu utilises MYLIDE depuis 7 jours !
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              Débloque les statistiques avancées, l'historique complet et bien plus — <strong style={{ color: C.text }}>gratuitement pendant 7 jours</strong>.
            </p>
            <div style={{ background: "linear-gradient(135deg, #10B981, #059669)", borderRadius: 16, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="gift" size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 15 }}>7 jours gratuits · 0€ aujourd'hui</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Puis à partir de 3,99€/mois · sans engagement</p>
              </div>
            </div>
            <button onClick={() => { setShowProPopup(false); localStorage.setItem("proPopupSeen", "1"); setShowSubscription(true); }} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #CC2936, #8B1A22)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 6px 20px rgba(204,41,54,0.3)", marginBottom: 10 }}>
              Voir les offres →
            </button>
            <button onClick={() => { setShowProPopup(false); localStorage.setItem("proPopupSeen", "1"); }} style={{ width: "100%", padding: "12px", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: "calc(var(--sat) + 14px) 20px 14px", background: C.navBg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", boxShadow: darkMode ? "0 2px 16px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setNav("profile")} style={{ cursor: "pointer", flexShrink: 0 }}>
              {profile.photo
                ? <img src={profile.photo} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.red}`, display: "block" }} />
                : <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, #8B1A22)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, boxShadow: `0 4px 14px ${C.red44}`, flexShrink: 0 }}>{profile.name?.[0] || "K"}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
              <p style={{ fontSize: 10, color: C.red, letterSpacing: 2, textTransform: "uppercase", margin: 0, fontWeight: 700, lineHeight: 1 }}>Mylide</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.black, letterSpacing: -0.3, lineHeight: 1.2 }}>{tr("hello")} {profile.name}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowFriends(true)} style={{ position: "relative", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {Ico.friends(C.muted, 19)}
              {friendsPendingCount > 0 && <span style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: C.red, border: `2px solid ${C.navBg}` }} />}
            </button>
            <ScoreRing score={today.score} delta={intel.scoreDelta} streak={streak} />
          </div>
        </div>
        {intel.alerts.length > 0 && <div style={{ marginTop: 10 }}><MsgBox type={intel.alerts[0].type} msg={intel.alerts[0].msg} /></div>}
        {intel.alerts.length === 0 && intel.advice.length > 0 && <div style={{ marginTop: 10 }}><MsgBox type="advice" msg={intel.advice[0]} /></div>}
      </div>

      <div style={{ padding: "16px 16px 8px", position: "relative" }} {...swipeNav}>
        <PageTransition pageKey={nav + trackTab}>

          {/* TODAY */}
          {nav === "today" && (
            <div>
              <Card dark style={{ paddingBottom: 8 }}>
                {/* Day-of-week selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <button onClick={() => {
                    if (radarWeekOffset < 0 && !isAtLeast(userPlan, "starter")) { setShowSubscription(true); return; }
                    if (radarWeekOffset <= -3 && !isAtLeast(userPlan, "pro")) { setShowSubscription(true); return; }
                    setRadarWeekOffset(o => o - 1);
                    const firstDayOfPrevWeek = (() => {
                      const now = new Date(); const dow = (now.getDay()+6)%7;
                      const mon = new Date(now); mon.setDate(now.getDate()-dow+(radarWeekOffset-1)*7);
                      return mon.toISOString().split("T")[0];
                    })();
                    setRadarDate(firstDayOfPrevWeek);
                  }} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>‹</button>
                  <div style={{ flex: 1, display: "flex", gap: 3 }}>
                    {radarWeekDays.map(({ dateStr, dayLetter, dayNum }) => {
                      const isSelected = radarDate === dateStr;
                      const isFuture = dateStr > todayDate;
                      const hasData = dateStr === todayDate ? today.score > 0 : history.some(d => d.date === dateStr && (d.score > 0 || d.sleep?.duration > 0));
                      const isPastWeek = radarWeekOffset < 0;
                      const isLocked = (radarWeekOffset < 0 && !isAtLeast(userPlan, "starter")) || (radarWeekOffset < -3 && !isAtLeast(userPlan, "pro"));
                      return (
                        <button key={dateStr} onClick={() => { if (isLocked) { setShowSubscription(true); return; } if (!isFuture) setRadarDate(dateStr); }} style={{ flex: 1, padding: "5px 2px", borderRadius: 10, border: isSelected ? `2px solid ${C.red}` : `1.5px solid ${C.border}`, background: isSelected ? C.red + "18" : C.surfaceAlt, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: isFuture || isLocked ? "default" : "pointer", opacity: isFuture ? 0.3 : isLocked ? 0.4 : 1, transition: "all 0.15s" }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: isSelected ? C.red : C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>{isLocked ? "🔒" : dayLetter}</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: isSelected ? C.red : C.text, lineHeight: 1 }}>{dayNum}</span>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: hasData ? (isSelected ? C.red : C.muted) : "transparent", marginTop: 1 }} />
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => { if (radarWeekOffset < 0) { setRadarWeekOffset(o => o + 1); const now = new Date(); now.setDate(now.getDate() + (radarWeekOffset+1)*7); setRadarDate(todayDate); } }} style={{ background: radarWeekOffset === 0 ? C.surfaceAlt : C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: radarWeekOffset === 0 ? "default" : "pointer", flexShrink: 0, color: radarWeekOffset === 0 ? C.border : C.text, fontSize: 16, fontWeight: 700 }}>›</button>
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textAlign: "center", marginBottom: 2, letterSpacing: 0.3 }}>
                  {radarDate === todayDate ? "Aujourd'hui" : new Date(radarDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {!radarDayData && radarDate !== todayDate ? " · Aucune donnée" : ""}
                </div>
                <AthleticRadar data={radarForDay} />
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {STAT_CARDS.map(item => (
                  <div key={item.label} onClick={() => { setNav("track"); setTrackTab(item.tab); }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 10px", textAlign: "center", borderTop: `3px solid ${item.color}`, cursor: "pointer", transition: "transform 0.15s", WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{Ico[item.icon](item.color, 20)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.value === "-" ? C.muted : item.color, letterSpacing: -0.3 }}>{item.value}</div>
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
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: intel.scoreDelta >= 10 ? `linear-gradient(135deg, ${C.green}, #059669)` : intel.scoreDelta >= 0 ? `${C.green}22` : `${C.red}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: intel.scoreDelta >= 10 ? `0 4px 16px ${C.green}40` : "none",
                      flexShrink: 0,
                    }}>
                      <Icon
                        name={intel.scoreDelta >= 10 ? "zap" : intel.scoreDelta >= 0 ? "chart" : "warning"}
                        size={26}
                        color={intel.scoreDelta >= 10 ? "#fff" : intel.scoreDelta >= 0 ? C.green : C.red}
                        strokeWidth={2}
                      />
                    </div>
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
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 12px", background: t.done ? C.redLight : C.surface, borderRadius: 14, border: `1px solid ${t.done ? C.redBorder : C.border}`, transition: "background 0.2s, border 0.2s" }}>
                    <button onClick={() => toggleTodo(t.id)} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: t.done ? "none" : `2px solid ${C.border}`, background: t.done ? C.red : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.18s", boxShadow: t.done ? "0 2px 8px rgba(204,41,54,0.35)" : "none" }}>
                      {t.done && <svg width="12" height="9" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
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
                    <button key={t.id} onClick={() => setTrackTab(t.id)} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 40, cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? C.red : C.surface, color: active ? "#fff" : C.muted, display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease", boxShadow: active ? `0 4px 16px ${C.red44}` : `0 1px 4px rgba(0,0,0,0.06)`, border: active ? "none" : `1px solid ${C.border}`, fontFamily: "inherit" }}>
                      {Ico[t.icon](active ? "#fff" : C.muted, 15)}{tr("tab_" + t.id)}
                    </button>
                  );
                })}
              </div>

              <div style={{ background: C.bg, borderRadius: 20, marginTop: 8, padding: "4px 0 8px" }}>

              {trackTab === "sleep" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.purple}10`, border: `1px solid ${C.purple}25`, borderRadius: 12, padding: "9px 14px", marginBottom: 10 }}>
                    <Icon name="shield" size={13} color={C.purple} />
                    <p style={{ margin: 0, fontSize: 11, color: C.purple, fontWeight: 600, lineHeight: 1.4 }}>Suivi personnel uniquement · Ne remplace pas un professionnel de santé</p>
                  </div>
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
                          <button key={sport} onClick={() => { update("sport", "type", sport); update("sport", "isRest", sport === "Repos"); }} style={{ padding: "10px 18px", borderRadius: 40, border: active ? "none" : `1px solid ${C.border}`, background: active ? C.red : C.surface, color: active ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s", boxShadow: active ? `0 4px 16px ${C.red44}` : "none", fontFamily: "inherit" }}>
                            <span>{icons[sport]}</span> {sport}
                          </button>
                        );
                      })}
                    </div>
                    {today.sport.type === "Repos" && (<div style={{ marginTop: 8 }}><Toggle value={today.sport.stretching} onChange={v => update("sport", "stretching", v)} label="Étirement / mobilité" /></div>)}
                    {today.sport.type === "Musculation" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Nom de la seance"><input type="text" value={today.sport.sessionName || ""} onChange={e => update("sport", "sessionName", e.target.value)} placeholder="Ex: PPL Push, Full Body..." style={inp} /></Field>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Duree (min)"><input type="number" value={today.sport.duration || ""} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="Intensite"><div style={{ paddingTop: 6 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                        </div>
                        <Field label="PR / Notes"><input type="text" value={today.sport.notes || ""} placeholder="Ex: Bench 90kg x5" onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <ST style={{ margin: 0 }}>Récupération post-séance</ST>
                          <span style={{ fontSize: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "2px 8px", color: C.muted, fontWeight: 600 }}>APRÈS la séance</span>
                        </div>
                        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px", lineHeight: 1.5 }}>Comment tu te sens maintenant que la séance est terminée ? Muscles douloureux ? Énergie restante ?</p>
                        <Rating value={today.sport.recovery || 0} onChange={v => update("sport", "recovery", v)} color={today.sport.recovery <= 2 ? C.red : today.sport.recovery <= 3 ? C.orange : C.green} />
                        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{["","Très douloureux","Courbatures","Correct","Bien récupéré","Parfait, plein d'énergie"][today.sport.recovery] || ""}</p>
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
                          <div style={{ textAlign: "center", background: `${C.blue10}`, border: `1.5px solid ${C.blue22}`, borderRadius: 14, padding: 16 }}>
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
                          <select value={today.sport.footballType || ""} onChange={e => update("sport", "footballType", e.target.value)} style={{ ...inp, color: C.text, background: C.surfaceAlt }}>
                            <option value="" style={{ background: C.surfaceAlt, color: C.text }}>Choisir...</option><option style={{ background: C.surfaceAlt, color: C.text }}>Match</option><option style={{ background: C.surfaceAlt, color: C.text }}>Entrainement</option><option style={{ background: C.surfaceAlt, color: C.text }}>Futsal</option>
                          </select>
                        </Field>
                        {today.sport.footballType === "Match" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <Field label="Buts pour"><input type="number" value={today.sport.scoreFor || ""} min={0} onChange={e => update("sport", "scoreFor", +e.target.value)} style={inp} /></Field>
                            <Field label="Buts contre"><input type="number" value={today.sport.scoreAgainst || ""} min={0} onChange={e => update("sport", "scoreAgainst", +e.target.value)} style={inp} /></Field>
                            <Field label="Resultat">
                              <div style={{ padding: "13px 10px", borderRadius: 12, background: today.sport.scoreFor > today.sport.scoreAgainst ? `${C.green15}` : today.sport.scoreFor < today.sport.scoreAgainst ? `${C.red15}` : C.surfaceAlt, textAlign: "center", fontWeight: 800, fontSize: 13, color: today.sport.scoreFor > today.sport.scoreAgainst ? C.green : today.sport.scoreFor < today.sport.scoreAgainst ? C.red : C.muted }}>
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
                          <select value={today.sport.tennisType || ""} onChange={e => update("sport", "tennisType", e.target.value)} style={{ ...inp, color: C.text, background: C.surfaceAlt }}>
                            <option value="" style={{ background: C.surfaceAlt, color: C.text }}>Choisir...</option><option style={{ background: C.surfaceAlt, color: C.text }}>Match</option><option style={{ background: C.surfaceAlt, color: C.text }}>Entrainement</option>
                          </select>
                        </Field>
                        {today.sport.tennisType === "Match" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <Field label="Score (ex: 6-3, 4-6, 6-4)"><input type="text" value={today.sport.tennisScore || ""} placeholder="6-3, 4-6, 6-4" onChange={e => update("sport", "tennisScore", e.target.value)} style={inp} /></Field>
                            <Field label="Adversaire"><input type="text" value={today.sport.tennisOpponent || ""} placeholder="Nom" onChange={e => update("sport", "tennisOpponent", e.target.value)} style={inp} /></Field>
                            <div style={{ display: "flex", gap: 10 }}>
                              {["Victoire", "Defaite"].map(r => (
                                <button key={r} onClick={() => update("sport", "tennisResult", r)} style={{ flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.border}`, background: today.sport.tennisResult === r ? (r === "Victoire" ? `${C.green12}` : `${C.red12}`) : C.surface, fontWeight: 700, fontSize: 14, color: today.sport.tennisResult === r ? (r === "Victoire" ? C.green : C.red) : C.muted, cursor: "pointer" }}>
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
                          <select value={today.sport.boxeType || ""} onChange={e => update("sport", "boxeType", e.target.value)} style={{ ...inp, color: C.text, background: C.surfaceAlt }}>
                            <option value="" style={{ background: C.surfaceAlt, color: C.text }}>Choisir...</option><option style={{ background: C.surfaceAlt, color: C.text }}>Sparring</option><option style={{ background: C.surfaceAlt, color: C.text }}>Sac / Pattes</option><option style={{ background: C.surfaceAlt, color: C.text }}>Technique</option><option style={{ background: C.surfaceAlt, color: C.text }}>Combat</option>
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
                      {today.sport.photoUrl ? (
                        <div>
                          <img src={today.sport.photoUrl} alt="prog" style={{ width: "100%", borderRadius: 14, objectFit: "cover", maxHeight: 240, display: "block" }} />
                          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button onClick={() => sportPhotoRef.current.click()} style={{ flex: 1, padding: "11px", background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: C.text, fontWeight: 600, fontFamily: "inherit" }}>Remplacer</button>
                            <button onClick={() => update("sport", "photoUrl", null)} style={{ flex: 1, padding: "11px", background: `${C.red}15`, border: `1.5px solid ${C.red}30`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: C.red, fontWeight: 600, fontFamily: "inherit" }}>Supprimer</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => sportPhotoRef.current.click()} style={{ width: "100%", padding: 16, background: C.surfaceAlt, border: `2px dashed ${C.border}`, borderRadius: 14, cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}>{tr("sport_import_photo")}</button>
                      )}
                    </Card>
                  )}
                  {/* Compteur de pas */}
                  <Card>
                    <ST>Pas du jour</ST>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          value={today.sport.steps || ""}
                          placeholder="0"
                          min={0}
                          max={99999}
                          onChange={e => update("sport", "steps", +e.target.value)}
                          onFocus={e => e.target.select()}
                          style={{ background: "transparent", border: "none", outline: "none", fontSize: 38, fontWeight: 900, color: C.red, width: "100%", fontFamily: "inherit" }}
                        />
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Saisie manuelle · objectif 10 000 pas</p>
                      </div>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.surfaceAlt, border: `3px solid ${(today.sport.steps || 0) >= 10000 ? C.green : (today.sport.steps || 0) >= 7000 ? C.orange : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color 0.3s" }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: (today.sport.steps || 0) >= 10000 ? C.green : C.muted }}>
                          {today.sport.steps >= 10000 ? "✓" : `${Math.round(((today.sport.steps || 0) / 10000) * 100)}%`}
                        </span>
                      </div>
                    </div>
                    {/* Barre de progression */}
                    <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: `${Math.min(100, ((today.sport.steps || 0) / 10000) * 100)}%`, background: (today.sport.steps || 0) >= 10000 ? C.green : (today.sport.steps || 0) >= 7000 ? C.orange : C.red, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                    {/* Paliers */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      {[3000, 5000, 7500, 10000].map(target => (
                        <div key={target} style={{ textAlign: "center" }}>
                          <div style={{ width: 1, height: 4, background: C.border, margin: "0 auto 2px" }} />
                          <span style={{ fontSize: 9, color: (today.sport.steps || 0) >= target ? C.red : C.subtle, fontWeight: 700 }}>{target >= 1000 ? `${target/1000}k` : target}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color={C.red} label="Duree des seances" unit="min" />
                  {sportH.some(d => d.sport?.steps > 0) && (
                    <EvoChart data={sportH.slice(-30)} dataKey="sport.steps" color="#F97316" label="Pas quotidiens" unit=" pas" />
                  )}
                </div>
              )}

              {trackTab === "nutrition" && (() => {
                const activeGoalColor = GOAL_CONFIG[nutritionGoals.goalType]?.color || C.orange;
                const _nutritionDisclaimer = (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.orange}10`, border: `1px solid ${C.orange}25`, borderRadius: 12, padding: "9px 14px", marginBottom: 10 }}>
                    <Icon name="shield" size={13} color={C.orange} />
                    <p style={{ margin: 0, fontSize: 11, color: C.orange, fontWeight: 600, lineHeight: 1.4 }}>Indicateurs de suivi personnel · Consulte un nutritionniste pour un suivi médical</p>
                  </div>
                );
                const activeGoalLabel = GOAL_CONFIG[nutritionGoals.goalType]?.label || "Maintien";
                const goalMsg = getGoalMessage(nutritionGoals.goalType);

                // Smart macros: from science engine if TDEE available, else stored targets
                const displayMacros = scienceMacros && currentWeight ? scienceMacros : {
                  calTarget, protTarget, fatTarget, carbsTarget,
                };

                const MacroBar = ({ label, current, target, color, unit = "g" }) => {
                  const pct = target > 0 ? Math.min(110, Math.round((current / target) * 100)) : 0;
                  const over = current > target * 1.05;
                  const done = current >= target * 0.95 && !over;
                  const barColor = over ? C.orange : done ? C.green : color;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12, color: C.muted }}>
                        <span style={{ fontWeight: 700, color: C.text }}>{label}</span>
                        <span style={{ fontWeight: 800, color: barColor }}>{current}<span style={{ fontWeight: 400 }}>/{target}{unit}</span></span>
                      </div>
                      <div style={{ height: 7, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, background: barColor, width: `${Math.min(100, pct)}%`, transition: "width 0.5s ease" }} />
                      </div>
                      {over && <p style={{ fontSize: 10, color: C.orange, margin: "3px 0 0", fontWeight: 600 }}>Au-dessus de l'objectif (+{current - target}{unit})</p>}
                    </div>
                  );
                };

                // Repas filtrés et adaptés via mealEngine (portions calibrées sur calTarget)
                const mealsByCategory = {
                  breakfast: getMeals("breakfast", { goalType: nutritionGoals.goalType, veganOnly, userCalTarget: calTarget }),
                  lunch:     getMeals("lunch",     { goalType: nutritionGoals.goalType, veganOnly, userCalTarget: calTarget }),
                  snack:     getMeals("snack",     { goalType: nutritionGoals.goalType, veganOnly, userCalTarget: calTarget }),
                  dinner:    getMeals("dinner",    { goalType: nutritionGoals.goalType, veganOnly, userCalTarget: calTarget }),
                };
                const saveNG = ng => { setNutritionGoals(ng); localStorage.setItem("nutritionGoals", JSON.stringify(ng)); };

                return (
                  <div>
                    {_nutritionDisclaimer}
                    <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color={C.blue} label="Hydratation" unit="L" />
                    <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-30)} dataKey="nutrition.protein" color={C.purple} label="Protéines" unit="g" />
                    {temporalInsights.filter(i => i.msg.includes("prot") || i.msg.includes("repas") || i.msg.includes("eau")).map((ins, i) => <MsgBox key={i} type={ins.type} msg={ins.msg} suggestions={ins.suggestions} />)}

                    {/* ── Objectif principal ── */}
                    <Card>
                      <ST style={{ marginBottom: 14 }}>{tr("nutr_goals_title")}</ST>

                      {/* Sélecteur d'objectif */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                        {Object.entries(GOAL_CONFIG).map(([key, cfg]) => (
                          <button key={key} onClick={() => saveNG({ ...nutritionGoals, goalType: key })}
                            style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${nutritionGoals.goalType === key ? cfg.color : C.border}`, background: nutritionGoals.goalType === key ? `${cfg.color}18` : C.surfaceAlt, color: nutritionGoals.goalType === key ? cfg.color : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <Icon name={cfg.icon} size={13} color={nutritionGoals.goalType === key ? cfg.color : C.muted} />
                            {cfg.label}
                          </button>
                        ))}
                      </div>

                      {/* Message scientifique rotatif */}
                      <div style={{ background: `${activeGoalColor}10`, border: `1.5px solid ${activeGoalColor}28`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                        <p style={{ fontSize: 12, color: activeGoalColor, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon name={GOAL_CONFIG[nutritionGoals.goalType]?.icon || "heart"} size={13} color={activeGoalColor} />
                          {activeGoalLabel}
                        </p>
                        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.55 }}>{goalMsg}</p>
                        <p style={{ fontSize: 11, color: `${activeGoalColor}aa`, margin: "4px 0 0", fontWeight: 600 }}>{GOAL_CONFIG[nutritionGoals.goalType]?.tagline}</p>
                      </div>

                      {/* Alertes de cohérence (science-based) */}
                      {contradictions.length > 0 && contradictions.map((a, i) => (
                        <div key={i} style={{ background: a.level === "warning" ? `${C.red}10` : `${C.orange}10`, border: `1.5px solid ${a.level === "warning" ? C.red : C.orange}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 10 }}>
                          <p style={{ fontSize: 12, color: a.level === "warning" ? C.red : C.orange, fontWeight: 700, margin: "0 0 4px" }}>{a.icon} {a.msg}</p>
                          <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.5 }}>{a.tip}</p>
                          {a.suggestGoal && (
                            <button onClick={() => saveNG({ ...nutritionGoals, goalType: a.suggestGoal })}
                              style={{ marginTop: 8, background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                              Corriger l'objectif → {GOAL_CONFIG[a.suggestGoal]?.label}
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Bloc TDEE + calories sportives */}
                      {tdee > 0 && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 80, background: C.surfaceAlt, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{tdee}</div>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>TDEE kcal/j</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 80, background: `${activeGoalColor}12`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: activeGoalColor }}>{displayMacros.calTarget}</div>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>Objectif kcal</div>
                          </div>
                          {sportCalBurnScience > 0 && (
                            <div style={{ flex: 1, minWidth: 80, background: `${C.red}10`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: C.red }}>−{sportCalBurnScience}</div>
                              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>Sport kcal</div>
                            </div>
                          )}
                          {scienceMacros?.deficit > 0 && (
                            <div style={{ flex: 1, minWidth: 80, background: `${C.purple}10`, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: C.purple }}>−{scienceMacros.deficit}</div>
                              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 2 }}>Déficit net</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Macros calculées automatiquement */}
                      {scienceMacros && currentWeight ? (
                        <div style={{ background: `${activeGoalColor}12`, border: `1.5px solid ${activeGoalColor}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                          <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="user" size={11} color={C.muted} />
                            {currentWeight}kg · {ACTIVITY_LEVELS[activeActivity]?.label}{nutritionGoals.sex === "female" ? " · Femme" : nutritionGoals.sex === "male" ? " · Homme" : ""} · <span style={{ color: activeGoalColor, fontWeight: 700 }}>Calculé automatiquement</span>
                          </p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: C.orange, fontWeight: 800 }}>{scienceMacros.calTarget} kcal</span>
                            <span style={{ fontSize: 12, color: C.purple, fontWeight: 800 }}>{scienceMacros.protTarget}g prot</span>
                            <span style={{ fontSize: 12, color: C.blue, fontWeight: 800 }}>{scienceMacros.carbsTarget}g gluc</span>
                            <span style={{ fontSize: 12, color: C.green, fontWeight: 800 }}>{scienceMacros.fatTarget}g lip</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <p style={{ fontSize: 12, color: C.muted, margin: 0, flex: 1, lineHeight: 1.5 }}>Entre ton poids dans <strong>Corps</strong> et complète ton profil pour des macros personnalisées.</p>
                          <button onClick={() => setActivePage("settings")}
                            style={{ marginLeft: 10, flexShrink: 0, background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "7px 13px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                            Profil →
                          </button>
                        </div>
                      )}

                      {/* Estimation de progression réaliste */}
                      {(() => {
                        const progressText = formatProgress(progressEst, nutritionGoals.goalType);
                        if (!progressText) return null;
                        return (
                          <div style={{ background: `${activeGoalColor}08`, border: `1px solid ${activeGoalColor}20`, borderRadius: 12, padding: "10px 14px", marginBottom: 10 }}>
                            <p style={{ fontSize: 11, color: activeGoalColor, fontWeight: 700, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 5 }}>
                              <Icon name="chart" size={11} color={activeGoalColor} /> Estimation personnalisée
                            </p>
                            <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>{progressText}</p>
                          </div>
                        );
                      })()}

                      {/* Validation de la date cible */}
                      {(() => {
                        const tw = nutritionGoals.targetWeeks;
                        const wt = today.body?.weightTarget || nutritionGoals.weightTarget;
                        if (!tw || !wt || !currentWeight) return null;
                        const v = validateDateTarget(currentWeight, wt, nutritionGoals.goalType, tw);
                        if (!v) return null;
                        return (
                          <div style={{ background: `${v.color}10`, border: `1.5px solid ${v.color}35`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${v.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon name={v.zone === "not_recommended" ? "warning" : v.zone === "aggressive" ? "zap" : "shield"} size={14} color={v.color} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 800, color: v.color }}>{v.label}</span>
                              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: v.color, background: `${v.color}18`, padding: "2px 8px", borderRadius: 10 }}>
                                {v.weeklyRatePct}%/sem
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: C.text, margin: "0 0 4px", lineHeight: 1.5 }}>{v.message}</p>
                            {v.tip && <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>{v.tip}</p>}
                            <p style={{ fontSize: 11, color: C.muted, margin: "6px 0 0" }}>
                              Horizon choisi : <strong style={{ color: C.text }}>{tw} semaines</strong>
                              {v.earliestWeeks && v.zone !== "standard" && v.zone !== "conservative" && (
                                <> · Minimum recommandé : <strong style={{ color: v.color }}>{v.earliestWeeks} semaines</strong></>
                              )}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Barres de progression */}
                      <MacroBar label="Calories" current={calCurrent} target={displayMacros.calTarget} color={C.orange} unit=" kcal" />
                      <MacroBar label="Protéines" current={protCurrent} target={displayMacros.protTarget} color={C.purple} />
                      <MacroBar label="Glucides"  current={carbsCurrent} target={displayMacros.carbsTarget} color={C.blue} />
                      <MacroBar label="Lipides"   current={fatCurrent} target={displayMacros.fatTarget} color={C.green} />
                    </Card>

                    {/* ── Saisie du jour ── */}
                    <Card>
                      <ST>{tr("nutr_meals_day")}</ST>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                        <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label={tr("nutr_breakfast")} />
                        <Toggle value={today.nutrition.lunch}     onChange={v => update("nutrition", "lunch",     v)} label={tr("nutr_lunch")} />
                        <Toggle value={today.nutrition.dinner}    onChange={v => update("nutrition", "dinner",    v)} label={tr("nutr_dinner")} />
                        <Toggle value={today.nutrition.junk}      onChange={v => update("nutrition", "junk",      v)} label="Junk food" />
                      </div>
                      <ST>{tr("nutr_macros")}</ST>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Eau (L)">         <input type="number" value={today.nutrition.water    || ""} min={0} max={5}    step={0.25} onChange={e => update("nutrition","water",   +e.target.value)} style={inp} /></Field>
                        <Field label="Calories (kcal)"> <input type="number" value={today.nutrition.calories || ""} min={0} max={6000}             onChange={e => update("nutrition","calories",+e.target.value)} style={inp} /></Field>
                        <Field label="Protéines (g)">   <input type="number" value={today.nutrition.protein  || ""} min={0} max={400}              onChange={e => update("nutrition","protein", +e.target.value)} style={inp} /></Field>
                        <Field label="Glucides (g)">    <input type="number" value={today.nutrition.carbs    || ""} min={0} max={600}              onChange={e => update("nutrition","carbs",   +e.target.value)} style={inp} /></Field>
                        <Field label="Lipides (g)">     <input type="number" value={today.nutrition.fat      || ""} min={0} max={300}              onChange={e => update("nutrition","fat",     +e.target.value)} style={inp} /></Field>
                      </div>
                    </Card>

                    {/* ── Suggestions de repas - carousel premium ── */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px 16px 10px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <p style={{ fontSize: 17, fontWeight: 900, color: C.black, margin: 0, letterSpacing: -0.3 }}>Idées repas</p>
                        <button onClick={() => { const v = !veganOnly; setVeganOnly(v); localStorage.setItem("veganOnly", String(v)); }}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 20, border: `2px solid ${veganOnly ? C.green : C.border}`, background: veganOnly ? `${C.green}18` : C.surfaceAlt, color: veganOnly ? C.green : C.muted, fontSize: 11, fontWeight: 800, cursor: "pointer", transition: "all 200ms ease" }}>
                          🌱 Vegan{veganOnly ? " ✓" : ""}
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
                        Adaptées à <strong style={{ color: activeGoalColor }}>{activeGoalLabel}</strong>{veganOnly ? " · vegan" : ""} · Swipe ou flèches pour naviguer
                      </p>

                      {/* Carousel unique avec onglets par catégorie */}
                      <MealCarousel
                        mealsByCategory={mealsByCategory}
                        activeGoalColor={activeGoalColor}
                        onAdd={meal => {
                          setToday(prev => {
                            const n = prev.nutrition;
                            const updated = {
                              ...prev,
                              nutrition: {
                                ...n,
                                calories: (n.calories || 0) + (meal.macros?.cal   || 0),
                                protein:  (n.protein  || 0) + (meal.macros?.prot  || 0),
                                carbs:    (n.carbs    || 0) + (meal.macros?.carbs || 0),
                                fat:      (n.fat      || 0) + (meal.macros?.fat   || 0),
                              },
                            };
                            updated.score = calcScore(updated);
                            return updated;
                          });
                          setSaved(false);
                        }}
                      />
                    </div>

                    {/* ── Q&A nutritionnelles (Pro+) ── */}
                    {isPro ? (() => {
                      const allTips = [...(NUTRITION_TIPS.all || []), ...(NUTRITION_TIPS[nutritionGoals.goalType] || [])];
                      return <NutritionTipsBlock tips={allTips} goalType={nutritionGoals.goalType} />;
                    })() : (
                      <div onClick={() => setShowSubscription(true)} style={{ border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: "18px", textAlign: "center", cursor: "pointer", marginTop: 8 }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: C.text }}>Guide nutrition Pro</p>
                        <p style={{ margin: 0, fontSize: 12, color: C.muted }}>100+ conseils personnalisés · Disponible en Pro</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {trackTab === "body" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.orange}10`, border: `1px solid ${C.orange}25`, borderRadius: 12, padding: "9px 14px", marginBottom: 10 }}>
                    <Icon name="shield" size={13} color={C.orange} />
                    <p style={{ margin: 0, fontSize: 11, color: C.orange, fontWeight: 600, lineHeight: 1.4 }}>Suivi corporel personnel · Les données IMC sont indicatives, consulte un médecin pour un bilan complet</p>
                  </div>
                  <EvoChart data={history.filter(d => d.body?.weight > 0).slice(-60)} dataKey="body.weight" color={C.orange} label="Evolution du poids" unit="kg" />

                  {/* ── Bloc taille fixe depuis le profil ── */}
                  {(() => {
                    const h = nutritionGoals.height;
                    const goalCfg = GOAL_CONFIG[nutritionGoals.goalType];
                    const sexLabel = nutritionGoals.sex === "female" ? "Femme" : nutritionGoals.sex === "male" ? "Homme" : null;
                    if (!h) return (
                      <div onClick={() => setShowSettings(true)} style={{ background: C.surfaceAlt, border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>📏</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Taille non renseignée</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>Ta taille influence le TDEE et le déficit optimal. Appuie pour la renseigner.</p>
                        </div>
                        <span style={{ color: C.muted, fontSize: 18 }}>›</span>
                      </div>
                    );
                    const bmrDisplay = tdee > 0 ? `TDEE ${tdee} kcal/j` : null;
                    return (
                      <div style={{ background: `${C.orange}0D`, border: `1.5px solid ${C.orange}28`, borderRadius: 16, padding: "13px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.orange}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📏</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                            <span style={{ fontSize: 22, fontWeight: 900, color: C.orange }}>{h} cm</span>
                            {sexLabel && <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{sexLabel}</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                            {goalCfg?.emoji} {goalCfg?.label}
                            {bmrDisplay ? ` · ${bmrDisplay}` : ""}
                          </p>
                        </div>
                        <button onClick={() => setShowSettings(true)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer" }}>Modifier</button>
                      </div>
                    );
                  })()}

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
                      if (progressEst?.done) return (
                        <div style={{ marginBottom: 14, background: `${C.green}12`, border: `1.5px solid ${C.green}30`, borderRadius: 14, padding: "12px 16px" }}>
                          <p style={{ fontSize: 13, color: C.green, fontWeight: 800, margin: 0 }}>✓ Tu es à ton objectif !</p>
                        </div>
                      );
                      if (!progressEst) return null;
                      const goalCfg = GOAL_CONFIG[nutritionGoals.goalType];
                      const col = goalCfg?.color || C.orange;
                      const isGain = wt > w;
                      if (progressEst.recomp) return (
                        <div style={{ marginBottom: 14, background: `${col}12`, border: `1.5px solid ${col}28`, borderRadius: 14, padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: col }}>Recomposition corporelle</span>
                            <span style={{ fontSize: 13, fontWeight: 900, color: col }}>~{progressEst.minWeeks} à {progressEst.maxWeeks} sem.</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>📊 {progressEst.note}</p>
                        </div>
                      );
                      return (
                        <div style={{ marginBottom: 14, background: `${col}12`, border: `1.5px solid ${col}28`, borderRadius: 14, padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: col }}>
                              {isGain ? `+${progressEst.diff}kg` : `−${progressEst.diff}kg`} {isGain ? "à prendre" : "à perdre"}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 900, color: col, letterSpacing: -0.5 }}>~{progressEst.minWeeks} à {progressEst.maxWeeks} sem.</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                            📊 Estimation saine à {progressEst.weeklyMin} à {progressEst.weeklyMax} kg/semaine · {goalCfg?.tagline}
                          </p>
                        </div>
                      );
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
                  <Card>
                    <ST>Fréquence cardiaque</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="FC repos (bpm)"><input type="number" value={today.body?.restingHR || ""} min={30} max={200} onChange={e => update("body", "restingHR", +e.target.value)} style={inp} placeholder="Ex: 55" /></Field>
                      <Field label="FC max (bpm)"><input type="number" value={today.body?.maxHR || ""} min={100} max={220} onChange={e => update("body", "maxHR", +e.target.value)} style={inp} placeholder="Ex: 185" /></Field>
                    </div>
                    {(today.body?.restingHR > 0 || today.sport?.heartRate > 0) && (
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {today.body?.restingHR > 0 && (
                          <div style={{ flex: 1, minWidth: 100, background: `${C.blue10}`, border: `1.5px solid ${C.blue22}`, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: C.blue }}>{today.body.restingHR}</div>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>FC repos</div>
                          </div>
                        )}
                        {today.sport?.heartRate > 0 && (
                          <div style={{ flex: 1, minWidth: 100, background: `${C.red10}`, border: `1.5px solid ${C.red22}`, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{today.sport.heartRate}</div>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>FC sport moy.</div>
                          </div>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 0", lineHeight: 1.5 }}>💡 Connecte une app partenaire (Garmin, Strava…) depuis les paramètres pour importer tes données automatiquement.</p>
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
                      <Field label={tr("work_tasks_planned")}><input type="number" value={today.work.tasks || ""} min={0} max={20} onChange={e => update("work", "tasks", +e.target.value)} style={inp} /></Field>
                      <Field label={tr("work_tasks_done")}><input type="number" value={today.work.tasksCompleted || ""} min={0} max={20} onChange={e => update("work", "tasksCompleted", +e.target.value)} style={inp} /></Field>
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
                    <Field label={tr("work_screen_hours")}><input type="number" value={today.work.screenTime || ""} min={0} max={24} step={0.5} onChange={e => update("work", "screenTime", +e.target.value)} style={inp} /></Field>
                    {today.work.screenTime > 0 && (
                      <div style={{ marginTop: 12, padding: 14, background: today.work.screenTime <= 3 ? `${C.green10}` : `${C.red10}`, border: `1.5px solid ${today.work.screenTime <= 3 ? C.green22 : C.red22}`, borderRadius: 12, fontSize: 13, color: today.work.screenTime <= 3 ? C.green : C.red, fontWeight: 600 }}>
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
                      <button onClick={addTodo} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 800, cursor: "pointer", fontSize: 22 }}>+</button>
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
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "12px 14px", background: t.done ? C.redLight : C.surface, borderRadius: 14, border: `1px solid ${t.done ? C.redBorder : C.border}`, transition: "background 0.2s, border 0.2s" }}>
                            <button onClick={() => toggleTodo(t.id)} style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", border: t.done ? "none" : `2px solid ${C.border}`, background: t.done ? C.red : C.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.18s", boxShadow: t.done ? "0 2px 8px rgba(204,41,54,0.35)" : "none" }}>
                              {t.done && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                            <span style={{ fontSize: 14, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1, transition: "color 0.2s" }}>{t.text}</span>
                            <button onClick={() => deleteTodo(t.id)} style={{ background: "none", border: "none", color: C.subtle, cursor: "pointer", padding: 4, fontSize: 14, lineHeight: 1 }}>✕</button>
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

              <button onClick={saveDay} style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", background: saved ? `linear-gradient(135deg, ${C.green}, #128a3a)` : `linear-gradient(135deg, #CC2936, #8B1A22)`, color: "#fff", fontSize: 16, fontWeight: 800, transition: "all 0.35s", marginTop: 6, boxShadow: saved ? `0 8px 28px ${C.green44}` : "0 8px 28px rgba(204,41,54,0.4)", letterSpacing: 0.2 }}>
                {saved ? tr("saved") : tr("save_day")}
              </button>
              </div>
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
                    <PieChart><Pie data={patrimoine.filter(p => p.amount > 0)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={32} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10} fill={C.text}>
                      {patrimoine.filter(p => p.amount > 0).map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Pie><Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }} formatter={v => [`${v.toLocaleString("fr-FR")}€`, ""]} /></PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <Card>
                <ST>{tr("money_pockets")}</ST>
                {patrimoine.map((p, idx) => {
                  const isEditing = renamingPoche === p.id;
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "14px 16px", background: C.surfaceAlt, borderRadius: 16, borderLeft: `4px solid ${p.color}` }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <button onClick={() => movePoche(idx, -1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted }}>{Ico.up(C.muted, 14)}</button>
                        <button onClick={() => movePoche(idx, 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: C.muted }}>{Ico.down(C.muted, 14)}</button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing
                          ? <input autoFocus value={p.name} onChange={e => updatePoche(p.id, "name", e.target.value)} onKeyDown={e => e.key === "Enter" && setRenamingPoche(null)} style={{ ...inp, padding: "4px 8px", fontSize: 14, fontWeight: 700, width: "100%" }} />
                          : <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                        }
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                          <input
                            type="number"
                            value={p.amount === 0 ? "" : p.amount}
                            placeholder="0"
                            onChange={e => updatePoche(p.id, "amount", e.target.value === "" ? 0 : +e.target.value)}
                            onFocus={e => e.target.select()}
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: 22, fontWeight: 900, color: p.color, width: 140, fontFamily: "inherit" }}
                          />
                          <span style={{ fontSize: 13, color: C.muted }}>€</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        {/* Bouton edit avec badge couleur intégré */}
                        <button onClick={() => setRenamingPoche(isEditing ? null : p.id)} style={{ position: "relative", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          {Ico.edit(C.muted, 14)}
                          <label onClick={e => e.stopPropagation()} style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%", background: p.color, cursor: "pointer", boxShadow: `0 0 0 2px ${C.surface}`, display: "block" }}>
                            <input type="color" value={p.color} onChange={e => updatePoche(p.id, "color", e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none", padding: 0 }} />
                          </label>
                        </button>
                        <button onClick={() => deletePoche(p.id)} style={{ background: `${C.red12}`, border: `1px solid ${C.red22}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
                      </div>
                    </div>
                  );
                })}

                {/* Formulaire ajout - nom + montant, couleur auto */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={newPoche.name} onChange={e => setNewPoche(p => ({ ...p, name: e.target.value }))} placeholder="Nom" style={inp} />
                    <input
                      type="number"
                      value={newPoche.amount === 0 ? "" : newPoche.amount}
                      placeholder="Montant €"
                      onChange={e => setNewPoche(p => ({ ...p, amount: e.target.value === "" ? 0 : +e.target.value }))}
                      onFocus={e => e.target.select()}
                      style={inp}
                    />
                  </div>
                  <button onClick={addPoche} style={{ width: "100%", padding: "13px", background: C.red, color: "#fff", border: "none", borderRadius: 14, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Ajouter une poche</button>
                </div>
              </Card>
              <Card>
                <ST>Flux du jour</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Revenus */}
                  <div>
                    <Field label="Revenus (€)">
                      <input type="number" value={today.money.income || ""} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} />
                    </Field>
                    {today.money.income > 0 && patrimoine.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                        <select value={flowPocket.income} onChange={e => setFlowPocket(fp => ({ ...fp, income: e.target.value }))} style={{ ...inp, flex: 1, color: flowPocket.income ? C.text : C.muted, marginBottom: 0 }}>
                          <option value="">Ajouter à une poche…</option>
                          {patrimoine.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.amount || 0).toLocaleString("fr-FR")}€)</option>)}
                        </select>
                        {flowPocket.income && (
                          <button onClick={() => applyFlowToPocket("income", today.money.income, flowPocket.income)} style={{ padding: "10px 14px", background: "#1A7A4A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit" }}>+{today.money.income}€</button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Dépenses */}
                  <div>
                    <Field label="Dépenses (€)">
                      <input type="number" value={today.money.expense || ""} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} />
                    </Field>
                    {today.money.expense > 0 && patrimoine.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                        <select value={flowPocket.expense} onChange={e => setFlowPocket(fp => ({ ...fp, expense: e.target.value }))} style={{ ...inp, flex: 1, color: flowPocket.expense ? C.text : C.muted, marginBottom: 0 }}>
                          <option value="">Déduire d'une poche…</option>
                          {patrimoine.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.amount || 0).toLocaleString("fr-FR")}€)</option>)}
                        </select>
                        {flowPocket.expense && (
                          <button onClick={() => applyFlowToPocket("expense", today.money.expense, flowPocket.expense)} style={{ padding: "10px 14px", background: C.red, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit" }}>-{today.money.expense}€</button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Investi */}
                  <div>
                    <Field label="Investi (€)">
                      <input type="number" value={today.money.invested || ""} min={0} onChange={e => update("money", "invested", +e.target.value)} style={inp} />
                    </Field>
                    {today.money.invested > 0 && patrimoine.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                        <select value={flowPocket.invested} onChange={e => setFlowPocket(fp => ({ ...fp, invested: e.target.value }))} style={{ ...inp, flex: 1, color: flowPocket.invested ? C.text : C.muted, marginBottom: 0 }}>
                          <option value="">Affecter à une poche…</option>
                          {patrimoine.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.amount || 0).toLocaleString("fr-FR")}€)</option>)}
                        </select>
                        {flowPocket.invested && (
                          <button onClick={() => applyFlowToPocket("invested", today.money.invested, flowPocket.invested)} style={{ padding: "10px 14px", background: C.purple, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit" }}>+{today.money.invested}€</button>
                        )}
                      </div>
                    )}
                  </div>
                  <Field label="Note"><input type="text" placeholder="Ex: DCA ETF World..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
                </div>
              </Card>
              {/* Graphiques financiers — Premium */}
              {isAtLeast(userPlan, "premium") ? (() => {
                const moneyDays = history.slice(-30).map(d => ({
                  date: d.date ? d.date.slice(5).replace("-", "/") : "",
                  Revenus: d.money?.income || 0,
                  Dépenses: d.money?.expense || 0,
                  Investi: d.money?.invested || 0,
                })).filter(d => d.Revenus > 0 || d.Dépenses > 0 || d.Investi > 0);
                let cumul = 0;
                const patrimoineEvol = history.filter(d => d.money?.invested > 0).map(d => {
                  cumul += d.money.invested;
                  return { date: d.date ? d.date.slice(5).replace("-", "/") : "", Investi: cumul };
                });
                const totalIncome30 = history.slice(-30).reduce((a, d) => a + (d.money?.income || 0), 0);
                const totalExpense30 = history.slice(-30).reduce((a, d) => a + (d.money?.expense || 0), 0);
                const totalInvested30 = history.slice(-30).reduce((a, d) => a + (d.money?.invested || 0), 0);
                return (
                  <>
                    <Card>
                      <ST>Bilan 30 jours</ST>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <div style={{ background: `${C.green10}`, border: `1.5px solid ${C.green22}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#1A7A4A" }}>+{totalIncome30.toLocaleString("fr-FR")}€</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Revenus</div>
                        </div>
                        <div style={{ background: `${C.red12}`, border: `1.5px solid ${C.red22}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: C.red }}>-{totalExpense30.toLocaleString("fr-FR")}€</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Dépenses</div>
                        </div>
                        <div style={{ background: `${C.purple}18`, border: `1.5px solid ${C.purple}30`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: C.purple }}>{totalInvested30.toLocaleString("fr-FR")}€</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Investi</div>
                        </div>
                      </div>
                      {moneyDays.length > 1 ? (
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={moneyDays} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={6}>
                            <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={36} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }} formatter={v => [`${v.toLocaleString("fr-FR")} €`]} />
                            <Bar dataKey="Revenus" fill="#1A7A4A" radius={[3,3,0,0]} />
                            <Bar dataKey="Dépenses" fill={C.red} radius={[3,3,0,0]} />
                            <Bar dataKey="Investi" fill={C.purple} radius={[3,3,0,0]} />
                            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p style={{ textAlign: "center", fontSize: 13, color: C.muted, padding: "20px 0" }}>Enregistre quelques jours de flux pour voir le graphique.</p>
                      )}
                    </Card>
                    {patrimoineEvol.length > 1 && (
                      <Card>
                        <ST>Évolution investissements</ST>
                        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px" }}>Cumul des montants investis depuis tes premières saisies.</p>
                        <ResponsiveContainer width="100%" height={155}>
                          <AreaChart data={patrimoineEvol} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={C.purple} stopOpacity={0.7}/>
                                <stop offset="95%" stopColor={C.purple} stopOpacity={0.15}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={42} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k€` : `${v}€`} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }} formatter={v => [`${v.toLocaleString("fr-FR")} €`, "Investi cumulé"]} />
                            <Area type="monotone" dataKey="Investi" stroke={C.purple} strokeWidth={2} fill="url(#investGrad)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Card>
                    )}
                  </>
                );
              })() : (
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 0" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.purple}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="chart" size={22} color={C.purple} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Graphiques financiers</p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted }}>Revenus, dépenses, évolution · Premium</p>
                    </div>
                    <button onClick={() => setShowSubscription(true)} style={{ padding: "9px 14px", background: `linear-gradient(135deg, #6B35C8, #9333ea)`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Débloquer</button>
                  </div>
                </Card>
              )}
              <Card>
                <ST>Simulateur</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <Field label="Capital (€)"><input type="number" value={sim.amount === 0 ? "" : sim.amount} placeholder="0" onFocus={e => e.target.select()} onChange={e => setSim(s => ({ ...s, amount: e.target.value === "" ? 0 : +e.target.value }))} style={inp} /></Field>
                  <Field label="Versement/mois (€)"><input type="number" value={sim.monthly === 0 ? "" : sim.monthly} placeholder="0" onFocus={e => e.target.select()} onChange={e => setSim(s => ({ ...s, monthly: e.target.value === "" ? 0 : +e.target.value }))} style={inp} /></Field>
                  <Field label="Rendement/an (%)"><input type="number" value={sim.rate === 0 ? "" : sim.rate} placeholder="0" step={0.5} onFocus={e => e.target.select()} onChange={e => setSim(s => ({ ...s, rate: e.target.value === "" ? 0 : +e.target.value }))} style={inp} /></Field>
                  <Field label="Duree (ans)"><input type="number" value={sim.years === 0 ? "" : sim.years} placeholder="1" min={1} max={50} onFocus={e => e.target.select()} onChange={e => setSim(s => ({ ...s, years: e.target.value === "" ? 1 : +e.target.value }))} style={inp} /></Field>
                </div>
                {(() => {
                  const last = simResult[simResult.length - 1] || { invested: 0, interests: 0 };
                  const total = last.invested + last.interests;
                  return (
                    <div style={{ textAlign: "center", padding: "18px 20px", background: `${C.green10}`, border: `1.5px solid ${C.green22}`, borderRadius: 16, marginBottom: 16 }}>
                      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Dans {sim.years} ans</p>
                      <p style={{ fontSize: 38, fontWeight: 900, color: C.green, margin: "0 0 12px", letterSpacing: -0.5 }}>{total.toLocaleString("fr-FR")} €</p>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.12)", borderRadius: 8, padding: "4px 10px" }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#3B82F6", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6" }}>{last.invested.toLocaleString("fr-FR")} € versés</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${C.green10}`, border: `1px solid ${C.green22}`, borderRadius: 8, padding: "4px 10px" }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: C.green, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{last.interests.toLocaleString("fr-FR")} € interets</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <ResponsiveContainer width="100%" height={155}>
                  <AreaChart data={simResult} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="simGradInvested" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.7}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/></linearGradient>
                      <linearGradient id="simGradInterests" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0.25}/></linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.border} vertical={false} strokeDasharray="3 3"/>
                    <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={y => `${y}a`} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={38} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }} formatter={(v, name) => [`${Math.round(v).toLocaleString("fr-FR")} €`, name === "invested" ? "Versements" : "Interets"]}/>
                    <Area type="monotone" dataKey="invested" stackId="a" stroke="#3B82F6" strokeWidth={2} fill="url(#simGradInvested)" dot={false}/>
                    <Area type="monotone" dataKey="interests" stackId="a" stroke="#22C55E" strokeWidth={2} fill="url(#simGradInterests)" dot={false}/>
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
                  <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder={DATA_SOURCES.find(s => s.id === newGoal.sourceId)?.labelEx || "Ex: Mon objectif"} style={inp} />
                  <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Categorie" style={inp} />
                  <Field label="Source de donnees">
                    <select value={newGoal.sourceId} onChange={e => setNewGoal(p => ({ ...p, sourceId: e.target.value, target: "", label: "" }))} style={{ ...inp, color: C.text, background: C.surfaceAlt }}>
                      {DATA_SOURCES.map(s => <option key={s.id} value={s.id} style={{ background: C.surfaceAlt, color: C.text }}>{s.label}</option>)}
                    </select>
                  </Field>
                  {newGoal.sourceId !== "manual" && (<>
                    {(() => { const src = DATA_SOURCES.find(s => s.id === newGoal.sourceId); return (
                      <Field label={`Valeur cible${src?.unit ? ` (${src.unit})` : ""}`}>
                        <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} placeholder={src?.example || "Ex: 100"} style={inp} />
                      </Field>
                    ); })()}
                    <Toggle value={newGoal.reverse} onChange={v => setNewGoal(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
                  </>)}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Debut"><input type="date" value={newGoal.startDate} onChange={e => setNewGoal(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
                    <Field label="Fin"><input type="date" value={newGoal.endDate} onChange={e => setNewGoal(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
                  </div>
                  <button onClick={addGoal} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%" }}>+ Ajouter l'objectif</button>
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
                        <button onClick={() => deleteGoal(g.id)} style={{ background: `${C.red10}`, border: `1px solid ${C.red22}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>{Ico.trash(C.red, 14)}</button>
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
                {[["7","7j",null],["30","30j","starter"],["90","3 mois","pro"],["365","1 an","pro"],["all","Tout","pro"]].map(([v, l, minPlan]) => (
                  <button key={v} onClick={() => { if (minPlan && !isAtLeast(userPlan, minPlan)) { setShowSubscription(true); return; } setStatRange(v); localStorage.setItem("statRange", v); }} style={{ flex: 1, padding: "10px 3px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700, background: statRange === v ? C.red : C.surface, color: statRange === v ? "#fff" : C.muted, opacity: minPlan && !isAtLeast(userPlan, minPlan) ? 0.5 : 1, border: statRange === v ? "none" : `1px solid ${C.border}`, boxShadow: statRange === v ? `0 3px 12px ${C.red44}` : "none" }}>{l}{minPlan && !isAtLeast(userPlan, minPlan) ? " 🔒" : ""}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {(() => {
                  // Weight evolution: first vs last recorded weight in range
                  const weightDays = rangeH.filter(d => d.body?.weight > 0);
                  const weightFirst = weightDays[0]?.body?.weight;
                  const weightLast = weightDays[weightDays.length - 1]?.body?.weight;
                  const weightDeltaNum = weightFirst && weightLast ? weightLast - weightFirst : null;
                  const weightDelta = weightDeltaNum !== null ? weightDeltaNum.toFixed(1) : null;
                  const sportSessions = rangeH.filter(d => d.sport?.duration >= 30).length;
                  const avgSleepRange = rangeH.filter(d => d.sleep?.duration > 0);
                  const avgSleepVal = avgSleepRange.length ? (avgSleepRange.reduce((a, b) => a + b.sleep.duration, 0) / avgSleepRange.length).toFixed(1) : null;
                  return [
                    { label: "Jours trackes", value: history.length, color: C.red },
                    { label: "Score moyen", value: `${intel.scoreAvg}/100`, color: C.orange },
                    { label: "Sommeil moyen", value: avgSleepVal ? `${avgSleepVal}h` : "-", color: C.purple },
                    { label: "Seances sport", value: sportSessions, color: C.red },
                    { label: "Streak actuel", value: `${streak}j`, color: C.orange },
                    { label: "Évolution poids", value: weightDeltaNum !== null ? (weightDeltaNum > 0 ? `+${weightDelta}kg` : `${weightDelta}kg`) : "-", color: weightDeltaNum > 0 ? C.green : weightDeltaNum < 0 ? C.orange : C.muted },
                  ];
                })().map(item => (
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
              <EvoChart data={history.filter(d => d.body?.weight > 0).slice(-parseInt(statRange))} dataKey="body.weight" color={C.orange} label="Poids" unit="kg" />
              <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color={C.purple} label="Humeur" unit="/5" />
              <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-parseInt(statRange))} dataKey="nutrition.protein" color={C.purple} label="Protéines" unit="g" />
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
                  <Icon name="settings" size={15} color={C.black} /> Paramètres
                </button>
              </div>
              <Card accent style={{ textAlign: "center", paddingTop: 28, paddingBottom: 28 }}>
                <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handleProfilePhoto} />
                <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", display: "inline-block", position: "relative", marginBottom: 14 }}>
                  {profile.photo ? <img src={profile.photo} alt="" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.3)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }} />
                    : <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 42, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "M"}</div>}
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(255,255,255,0.95)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                    <Icon name="camera" size={14} color="#333" />
                  </div>
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
                    { label: "Streak", value: `${streak}j` },
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
                {(() => {
                  const bTitle = isAtLeast(userPlan, "pro")
                    ? `Membre ${userPlan === "premium" ? "Premium" : "Pro"} actif`
                    : userPlan === "starter" ? "Passer Pro ou Premium"
                    : "Passer Premium";
                  const bSub = isAtLeast(userPlan, "pro")
                    ? "Gérer mon abonnement →"
                    : userPlan === "starter" ? "Déjà Starter · upgrade dès 6,99€/mois"
                    : "7 jours gratuits · à partir de 3,99€/mois";
                  const bBg = isAtLeast(userPlan, "pro")
                    ? "linear-gradient(135deg, #1a1a2e, #16213e)"
                    : "linear-gradient(135deg, #CC2936, #8B1A22)";
                  const bShadow = isAtLeast(userPlan, "pro")
                    ? "0 10px 32px rgba(0,0,0,0.2)"
                    : "0 10px 32px rgba(204,41,54,0.35)";
                  return (
                    <div onClick={() => setShowSubscription(true)} style={{ background: bBg, borderRadius: 16, padding: "18px 20px", marginBottom: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: bShadow }}>
                      <div>
                        <p style={{ color: "#fff", fontWeight: 900, fontSize: 17, margin: "0 0 3px", letterSpacing: -0.2 }}>{bTitle}</p>
                        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: 0 }}>{bSub}</p>
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 }}>→</span>
                    </div>
                  );
                })()}
                <ST>Parametres</ST>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[{ value: "light", icon: "zap", label: "Clair" }, { value: "dark", icon: "bell", label: "Sombre" }].map(opt => {
                    const active = themeMode === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setThemeMode(opt.value)} style={{ flex: 1, padding: "12px 6px", borderRadius: 12, cursor: "pointer", border: active ? `2px solid ${C.red}` : `1.5px solid ${C.border}`, background: active ? C.redLight : C.surfaceAlt, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                        <Icon name={opt.icon} size={20} color={active ? C.red : C.muted} />
                        <span style={{ fontSize: 11, fontWeight: active ? 800 : 600, color: active ? C.red : C.muted }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { localStorage.removeItem("kojihlife_v9"); setOnboarded(false); }} style={{ width: "100%", padding: "14px", background: `${C.red10}`, border: `1.5px solid ${C.red22}`, borderRadius: 14, cursor: "pointer", fontSize: 14, color: C.red, fontWeight: 700 }}>
                  Refaire l'onboarding
                </button>
              </Card>
            </div>
          )}

        </PageTransition>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.navBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20, paddingBottom: "max(var(--sab), 4px)", boxShadow: darkMode ? "0 -4px 24px rgba(0,0,0,0.35)" : "0 -4px 24px rgba(0,0,0,0.07)" }}>
        {NAV.map(n => {
          const active = nav === n.id;
          return (
            <button key={n.id} onClick={() => setNav(n.id)}
              style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
              {/* Icône avec fond coloré actif */}
              <div style={{
                width: 44, height: 38, borderRadius: 14,
                background: active ? C.red12 : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.22s ease",
              }}>
                {Ico[n.icon](active ? C.red : C.muted, active ? 22 : 20)}
              </div>
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.red : C.muted, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1, transition: "color 0.2s ease" }}>
                {tr("nav_" + n.id)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}