// ─── MYLIDE - Scientific Nutrition & Body Engine v3 ───────────────────────────
// Références scientifiques :
//   · Mifflin-St Jeor 1990          → BMR, la plus validée en population générale
//   · ISSN Position Stand 2017       → protéines, timing nutritionnel
//   · Helms et al. 2014             → protéines en déficit calorique
//   · Barakat et al. 2020           → recomposition corporelle
//   · Hall et al. 2012              → bilan énergétique et perte de poids
//   · ACSM/ADA/DC 2016              → nutrition et performance sportive
//   · Slater & Phillips 2011        → surplus calorique lean bulk
//   · Stachenfeld 2014              → différences physiologiques femme/homme
//
// v3 — Changements clés :
//   · Déficits/surplus en % du TDEE (pas ajustement fixe)
//   · Suppression de la double-comptabilisation du sport dans calcMacros
//     (le facteur d'activité du TDEE couvre déjà la dépense sportive habituelle)
//   · Protéines plafonnées à 2.2 g/kg pour sèche/perte (2.6 était excessif)
//   · Plancher lipides : max(g/kg, 20% calories, 50g absolu) — santé hormonale
//   · Protéines clampées 1.4–2.5 g/kg (garde-fous)
// ─────────────────────────────────────────────────────────────────────────────

// ── NIVEAUX D'ACTIVITÉ ────────────────────────────────────────────────────────
export const ACTIVITY_LEVELS = {
  sedentary:   { label: "Sédentaire",       desc: "Travail de bureau, peu de marche",           factor: 1.2   },
  light:       { label: "Légèrement actif", desc: "1 à 2 séances par semaine",                  factor: 1.375 },
  moderate:    { label: "Modérément actif", desc: "3 à 4 séances par semaine",                  factor: 1.55  },
  active:      { label: "Très actif",       desc: "5 à 6 séances par semaine",                  factor: 1.725 },
  very_active: { label: "Athlétique",       desc: "Entraînement quotidien ou travail physique", factor: 1.9   },
};

// ── CONFIGURATION DES OBJECTIFS ───────────────────────────────────────────────
// deficitPct / surplusPct : % du TDEE à retrancher / ajouter
// maxDeltaCal : plafond absolu en kcal (évite les extrêmes sur de forts TDEE)
export const GOAL_CONFIG = {
  perte: {
    label:          "Perte de poids",
    icon:           "chart",
    color:          "#3B82F6",
    color:          "#3B82F6",
    // Hall 2012 : déficit 15-20% du TDEE = perte saine sans ralentissement métabolique
    deficitPct:     0.18,
    maxDeltaCal:    600,   // plafond : jamais plus de 600 kcal de déficit
    // Helms 2014 : 2.0-2.4 g/kg préserve le muscle en déficit modéré
    proteinPerKg:   2.2,
    // Minimum lipides : santé hormonale (testostérone, estrogènes)
    fatPerKgMale:   0.80,
    fatPerKgFemale: 0.90, // Stachenfeld 2014 : besoins lipidiques plus élevés chez les femmes
    // Vitesse de perte saine : 0.5 à 1% du poids corporel par semaine
    weeklyRateMin:  0.005,
    weeklyRateMax:  0.010,
    minCalMale:     1500,
    minCalFemale:   1200,
    tagline:        "Déficit modéré, conservation musculaire prioritaire",
    description:    "Une perte progressive préserve ta masse musculaire et facilite l'adhérence à long terme.",
  },
  masse: {
    label:          "Prise de masse",
    icon:           "zap",
    color:          "#CC2936",
    // Slater 2019 : lean bulk +200 à +350 kcal. Au-delà, c'est principalement de la graisse
    surplusPct:     0.08,
    maxDeltaCal:    350,   // plafond : jamais plus de 350 kcal de surplus
    // ISSN 2017 : 1.6-2.2 g/kg suffit pour la synthèse musculaire en surplus
    proteinPerKg:   2.0,
    fatPerKgMale:   0.90,
    fatPerKgFemale: 1.00,
    // Rythme naturel : 0.25 à 0.5% du poids par semaine
    weeklyRateMin:  0.0025,
    weeklyRateMax:  0.005,
    minCalMale:     1800,
    minCalFemale:   1500,
    tagline:        "Surplus modéré, qualité musculaire prioritaire",
    description:    "Un surplus trop important augmente principalement la masse grasse. La progression lente est la plus efficace.",
  },
  maintenance: {
    label:          "Maintien",
    icon:           "heart",
    color:          "#16a34a",
    // Pas de delta : équilibre calorique
    deficitPct:     0,
    maxDeltaCal:    0,
    // 1.6-2.0 g/kg suffit pour les personnes actives en maintien
    proteinPerKg:   1.8,
    fatPerKgMale:   0.90,
    fatPerKgFemale: 0.95,
    weeklyRateMin:  0,
    weeklyRateMax:  0,
    minCalMale:     1500,
    minCalFemale:   1300,
    tagline:        "Équilibre énergétique, performance et récupération",
    description:    "Le maintien est la phase idéale pour consolider tes habitudes et optimiser tes performances.",
  },
  seche: {
    label:          "Sèche et Recompo",
    icon:           "refresh",
    color:          "#7C3AED",
    // Barakat 2020 : la recomposition fonctionne mieux avec un léger déficit (5-10%)
    // Un déficit de 8% sur un TDEE de 3172 = ~254 kcal → très progressif, idéal pour la recompo
    deficitPct:     0.08,
    maxDeltaCal:    350,   // plafond : jamais plus de 350 kcal de déficit
    // Helms 2014 / Barakat 2020 : 2.0-2.4 g/kg en sèche (2.6 était excessif et non prouvé)
    proteinPerKg:   2.2,
    fatPerKgMale:   0.85,
    fatPerKgFemale: 0.95,
    // Rythme recompo : 0.1 à 0.3% par semaine — mesurable aux mensurations, pas à la balance
    weeklyRateMin:  0.001,
    weeklyRateMax:  0.003,
    minCalMale:     1500,
    minCalFemale:   1200,
    tagline:        "Déficit léger, recomposition progressive",
    description:    "Le poids peut peu bouger - les vrais progrès se voient aux mensurations et aux performances.",
  },
};

// ── OBJECTIF HYDRATATION PERSONNALISÉ ────────────────────────────────────────
// Référence : EFSA 2010 — 35 ml/kg/jour pour adulte actif (femme légèrement moins)
// Ajusté selon activité, sport du jour, transpiration estimée.
// Retourne l'objectif en litres (arrondi au 0.25L le plus proche).
export function calcWaterTarget({ weight, sex, activityLevel, hasSport = false, sportDuration = 0 }) {
  if (!weight || weight < 30) return 2.5; // fallback si poids manquant
  // Base EFSA : 35 ml/kg (homme), 31 ml/kg (femme — besoins légèrement inférieurs)
  const mlPerKg = sex === "female" ? 31 : 35;
  let baseL = (weight * mlPerKg) / 1000;
  // Ajustement activité
  const activityBonus = {
    sedentary: 0,
    light:     0.2,
    moderate:  0.4,
    active:    0.6,
    very_active: 0.8,
  }[activityLevel || "moderate"] ?? 0.3;
  baseL += activityBonus;
  // Ajustement sport du jour (transpiration estimée selon durée)
  if (hasSport && sportDuration > 0) {
    const sportBonus = Math.min(1.0, sportDuration / 60 * 0.7); // ~0.7L/heure de sport
    baseL += sportBonus;
  }
  // Plancher / plafond
  baseL = Math.max(1.5, Math.min(4.0, baseL));
  // Arrondir au 0.25L le plus proche
  return Math.round(baseL * 4) / 4;
}

// ── BMR - Mifflin-St Jeor (1990) ──────────────────────────────────────────────
// Validée contre la calorimétrie indirecte. Précision ±10% en population générale.
export function calcBMR(weight, height, age, sex) {
  if (!weight || !height || !age || age < 1) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  // Homme +5, Femme -161 (différence de masse musculaire et composition corporelle)
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

// ── TDEE - Dépense Énergétique Totale ─────────────────────────────────────────
// Le facteur d'activité intègre déjà la dépense sportive hebdomadaire habituelle.
// Exemple : facteur 1.725 ("très actif") = 5-6 séances/semaine déjà comptées.
export function calcTDEE(weight, height, age, sex, activityLevel) {
  const bmr = calcBMR(weight, height, age, sex);
  if (!bmr) return 0;
  const factor = ACTIVITY_LEVELS[activityLevel]?.factor ?? 1.375;
  return Math.round(bmr * factor);
}

// ── CALORIES BRÛLÉES PAR UNE SÉANCE (méthode MET, ACSM) ──────────────────────
// NB : cette valeur est informative uniquement. Elle n'est PAS ajoutée à calTarget
// car le TDEE via le facteur d'activité couvre déjà la dépense sportive habituelle.
const MET_VALUES = {
  Musculation: 5.5,  Running: 9.5,       Football: 8.0,   Tennis: 7.0,
  Boxe: 10.5,        Natation: 8.0,      Vélo: 7.5,       HIIT: 9.0,
  Yoga: 3.2,         Marche: 3.5,        Crossfit: 10.0,  Cyclisme: 7.5,
  "Arts martiaux": 9.0, Basketball: 7.5, Escalade: 7.5,   Padel: 6.5,
  Pilates: 3.8,      Danse: 5.5,         Golf: 4.3,       Ski: 7.0,
};

export function calcSportBurn(weight, sportType, durationMin) {
  if (!weight || !sportType || !durationMin) return 0;
  const met = MET_VALUES[sportType] ?? 6.0;
  return Math.round(met * weight * (durationMin / 60));
}

// ── CALCUL DES MACROS ──────────────────────────────────────────────────────────
// Adapte les recommandations au sexe, poids, TDEE et objectif.
// Retourne { calTarget, protTarget, fatTarget, carbsTarget, tdee, deficit, surplus, deltaCal, bmr, sexUsed }
//
// IMPORTANT : sportBurnToday est conservé comme paramètre pour la compatibilité ascendante
// mais N'EST PLUS ajouté à calTarget — le facteur d'activité du TDEE couvre déjà la
// dépense sportive habituelle. L'ajouter constituerait une double comptabilisation.
export function calcMacros(weight, tdee, goalType, sportBurnToday = 0, sex = "male") {
  if (!weight || !tdee) return null;
  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  const isFemale = sex === "female";

  // ── 1. Cible calorique ────────────────────────────────────────────────────
  // Delta en % du TDEE, plafonné par maxDeltaCal
  let deltaCal = 0;
  if (cfg.deficitPct > 0) {
    // Déficit : min( %TDEE, plafond absolu )
    deltaCal = -Math.min(Math.round(tdee * cfg.deficitPct), cfg.maxDeltaCal);
  } else if (cfg.surplusPct > 0) {
    // Surplus : min( %TDEE, plafond absolu )
    deltaCal = Math.min(Math.round(tdee * cfg.surplusPct), cfg.maxDeltaCal);
  }

  const minCal    = isFemale ? cfg.minCalFemale : cfg.minCalMale;
  const rawCal    = tdee + deltaCal;
  const calTarget = Math.max(minCal, Math.round(rawCal));

  // ── 2. Protéines ──────────────────────────────────────────────────────────
  // Clamp 1.4–2.5 g/kg : protège contre les valeurs aberrantes de la config
  const protPerKg = Math.min(2.5, Math.max(1.4, cfg.proteinPerKg));
  const prot      = Math.round(weight * protPerKg);

  // ── 3. Lipides ────────────────────────────────────────────────────────────
  // Plancher triple pour garantir la santé hormonale :
  //   (a) g/kg selon l'objectif
  //   (b) ≥ 20% des calories totales (recommandation clinique minimale)
  //   (c) ≥ 50g absolu (minimum vital)
  const fatPerKgBase  = isFemale ? cfg.fatPerKgFemale : cfg.fatPerKgMale;
  const fatFromKg     = Math.round(weight * fatPerKgBase);
  const fatFrom20pct  = Math.round((calTarget * 0.20) / 9);
  const fat           = Math.max(fatFromKg, fatFrom20pct, 50);

  // ── 4. Glucides ───────────────────────────────────────────────────────────
  // Calories restantes après protéines et lipides
  const carbsCal = calTarget - prot * 4 - fat * 9;
  const carbs    = Math.max(50, Math.round(carbsCal / 4)); // minimum 50g

  // ── 5. Bilan ──────────────────────────────────────────────────────────────
  const deficit = Math.max(0, tdee - calTarget);
  const surplus = Math.max(0, calTarget - tdee);

  return {
    calTarget,
    protTarget:  prot,
    fatTarget:   fat,
    carbsTarget: carbs,
    tdee,
    deficit,
    surplus,
    deltaCal,   // delta réel appliqué (négatif = déficit, positif = surplus)
    bmr:        calcBMR(weight, 175, 30, sex), // estimation si height/age indisponibles
    sexUsed:    sex,
  };
}

// ── ESTIMATION DE PROGRESSION ──────────────────────────────────────────────────
export function estimateProgress(currentWeight, targetWeight, goalType, sex = "male") {
  if (!currentWeight || !targetWeight) return null;
  const diff = Math.abs(targetWeight - currentWeight);

  if (diff < 0.3) return { done: true };

  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  const direction      = targetWeight < currentWeight ? "perte" : "gain";
  const diffFormatted  = Math.round(diff * 10) / 10;

  if (goalType === "seche") {
    return {
      done:     false,
      recomp:   true,
      minWeeks: 10,
      maxWeeks: 24,
      diff:     diffFormatted,
      direction,
      note:     "La recomposition se mesure aux mensurations et aux performances - pas seulement au poids.",
    };
  }

  if (goalType === "maintenance") return null;

  const weeklyMax = currentWeight * cfg.weeklyRateMax;
  const weeklyMin = currentWeight * cfg.weeklyRateMin;
  const minWeeks  = Math.ceil(diff / weeklyMax);
  const maxWeeks  = Math.ceil(diff / weeklyMin);

  return {
    done:       false,
    recomp:     false,
    minWeeks,
    maxWeeks,
    weeklyMin:  Math.round(weeklyMin * 100) / 100,
    weeklyMax:  Math.round(weeklyMax * 100) / 100,
    diff:       diffFormatted,
    direction,
    note:       null,
  };
}

// ── DÉTECTION DES CONTRADICTIONS ───────────────────────────────────────────────
// Non culpabilisant. Retourne un tableau de { level, icon, msg, tip, suggestGoal? }
export function detectContradictions({
  goalType,
  currentWeight,
  targetWeight,
  calCurrent,
  calTarget,
  protCurrent,
  protTarget,
  tdee,
  sleepDuration,
  sportFreqWeek,
  sex = "male",
}) {
  const alerts = [];
  if (!goalType) return alerts;

  // 1. Balance calorique vs objectif
  if (calCurrent > 0 && tdee > 0) {
    const balance = calCurrent - tdee;
    if (goalType === "perte" && balance > 250) {
      alerts.push({
        level: "warning", icon: "🍽️",
        msg:   "Ton apport calorique dépasse tes dépenses aujourd'hui.",
        tip:   "Un déficit de 300 à 500 kcal par rapport à ton TDEE est la plage optimale pour une perte durable.",
      });
    }
    if (goalType === "masse" && balance < -100) {
      alerts.push({
        level: "warning", icon: "⚡",
        msg:   "Tu seras vraisemblablement en déficit calorique aujourd'hui.",
        tip:   "La construction musculaire nécessite un surplus modéré de 200 à 350 kcal. Ajoute une collation protéinée.",
      });
    }
    if (goalType === "seche" && balance > 350) {
      alerts.push({
        level: "info", icon: "📊",
        msg:   "Ton apport est au-dessus de tes dépenses totales aujourd'hui.",
        tip:   "La recomposition fonctionne mieux avec un léger déficit de 150 à 300 kcal. Ça reste très proche de la maintenance.",
      });
    }
  }

  // 2. Apport protéique vs objectif
  if (protCurrent > 0 && protTarget > 0) {
    const pct = protCurrent / protTarget;
    if (pct < 0.55 && goalType === "seche") {
      alerts.push({
        level: "warning", icon: "🥩",
        msg:   "Ton apport en protéines est nettement en dessous de l'objectif.",
        tip:   "Vise 2.0 à 2.2 g/kg de protéines en sèche — c'est le levier principal de préservation musculaire.",
      });
    } else if (pct < 0.55 && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "🥩",
        msg:   "Ton apport en protéines est insuffisant pour stimuler la synthèse musculaire.",
        tip:   "Vise 1.8 à 2.2 g/kg répartis sur 3 à 4 repas pour optimiser la prise de masse.",
      });
    } else if (pct < 0.55 && goalType === "perte") {
      alerts.push({
        level: "info", icon: "🥩",
        msg:   "Un apport protéique faible peut accélérer la fonte musculaire en déficit.",
        tip:   "Des protéines autour de 2.0 à 2.2 g/kg en perte de poids préservent efficacement la masse musculaire.",
      });
    }
  }

  // 3. Sommeil et récupération vs objectif
  if (sleepDuration > 0) {
    if (sleepDuration < 6.5 && goalType === "masse") {
      alerts.push({
        level: "info", icon: "😴",
        msg:   "Un sommeil insuffisant réduit la sécrétion d'hormone de croissance.",
        tip:   "La majorité de la synthèse protéique musculaire a lieu pendant le sommeil profond. Vise 7 à 9 heures.",
      });
    }
    if (sleepDuration < 6 && (goalType === "perte" || goalType === "seche")) {
      alerts.push({
        level: "info", icon: "😴",
        msg:   "Un manque de sommeil élève la ghréline (hormone de la faim) et le cortisol.",
        tip:   "Dormir moins de 6h ralentit la perte de masse grasse et réduit l'énergie disponible pour l'entraînement.",
      });
    }
  }

  // 4. Activité vs objectif de recomposition
  if (goalType === "seche" && sportFreqWeek < 3) {
    alerts.push({
      level: "info", icon: "🏋️",
      msg:   "La recomposition corporelle est plus efficace avec une pratique sportive régulière.",
      tip:   "3 à 5 séances par semaine (musculation en priorité) maximisent la recomposition.",
    });
  }

  // 5. Direction du poids vs objectif nutritionnel (contradiction forte)
  if (currentWeight > 0 && targetWeight > 0) {
    const needsLoss = targetWeight < currentWeight - 0.5;
    const needsGain = targetWeight > currentWeight + 0.5;
    if (needsLoss && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:   "Ton objectif de poids implique une perte, mais ton mode nutritionnel est une prise de masse.",
        tip:   "Ces deux objectifs sont incompatibles. Bascule sur Perte de poids pour être cohérent.",
        suggestGoal: "perte",
      });
    }
    if (needsGain && goalType === "perte") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:   "Ton objectif de poids implique une prise, mais ton mode nutritionnel est une perte de poids.",
        tip:   "Bascule sur Prise de masse ou Maintien pour être cohérent.",
        suggestGoal: "masse",
      });
    }
  }

  return alerts;
}

// ── INFÉRENCE DU NIVEAU D'ACTIVITÉ ────────────────────────────────────────────
export function inferActivityLevel(history) {
  if (!history?.length) return "light";
  const last14     = history.slice(-14);
  const activeDays = last14.filter(d => d.sport?.duration >= 20 && !d.sport?.isRest).length;
  const perWeek    = activeDays / 2;
  if (perWeek < 1)   return "sedentary";
  if (perWeek < 2.5) return "light";
  if (perWeek < 4)   return "moderate";
  if (perWeek < 6)   return "active";
  return "very_active";
}

// ── FRÉQUENCE SPORTIVE (7 derniers jours) ─────────────────────────────────────
export function getWeeklySportFreq(history) {
  if (!history?.length) return 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const since    = new Date(todayStr);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];
  return history.filter(d =>
    d.date >= sinceStr && d.sport?.duration >= 20 && !d.sport?.isRest
  ).length;
}

// ── PÉDAGOGIE CUISSON : POIDS CRU vs CUIT ────────────────────────────────────
// Les valeurs nutritionnelles standard (Ciqual, USDA) sont données pour le poids CRU.
// La cuisson réduit le poids par évaporation d'eau — pas les glucides/protéines/lipides.
// Ces ratios permettent de convertir entre les deux.
export const COOKING_FACTORS = {
  // Céréales et féculents
  "Riz blanc cru":      { ratio: 2.5,  unit: "g cru → g cuit", note: "100g cru ≈ 250g cuit · 75-78g glucides pour 100g cru" },
  "Riz complet cru":    { ratio: 2.2,  unit: "g cru → g cuit", note: "100g cru ≈ 220g cuit · 70-72g glucides pour 100g cru" },
  "Pâtes crues":        { ratio: 2.4,  unit: "g cru → g cuit", note: "100g cru ≈ 240g cuit · 72-75g glucides pour 100g cru" },
  "Flocons d'avoine":   { ratio: 2.5,  unit: "g cru → g cuit (porridge)", note: "100g cru ≈ 250g cuit · 58-60g glucides pour 100g cru" },
  "Quinoa cru":         { ratio: 2.8,  unit: "g cru → g cuit", note: "100g cru ≈ 280g cuit · 60-64g glucides pour 100g cru" },
  "Lentilles crues":    { ratio: 2.5,  unit: "g cru → g cuit", note: "100g cru ≈ 250g cuit · 50-52g glucides, 24g prot pour 100g cru" },
  "Pois chiches crus":  { ratio: 2.3,  unit: "g cru → g cuit", note: "100g cru ≈ 230g cuit · 50g glucides, 19g prot pour 100g cru" },
  // Viandes
  "Poulet cru":         { ratio: 0.75, unit: "g cru → g cuit", note: "100g cru ≈ 75g cuit · les protéines restent identiques" },
  "Bœuf cru":           { ratio: 0.70, unit: "g cru → g cuit", note: "100g cru ≈ 70g cuit" },
  "Saumon cru":         { ratio: 0.80, unit: "g cru → g cuit", note: "100g cru ≈ 80g cuit" },
};

// Règle pédagogique affichée à l'utilisateur
export const COOKING_PEDAGOGY = {
  headline: "Poids cru ou cuit ?",
  rules: [
    "Les bases de données nutritionnelles (Ciqual, MyFitnessPal) utilisent le poids CRU par défaut.",
    "100g de riz CRU → ~250g de riz CUIT (mais toujours ~75-78g de glucides).",
    "100g de riz CUIT → seulement ~25-30g de glucides (le reste c'est de l'eau absorbée).",
    "Pour les viandes : 100g de poulet CRU → ~75g cuit, mais les protéines sont identiques.",
    "Règle simple : pèse toujours CRU si tu veux être précis. Ou ajoute le ratio ×2.5 pour le riz.",
  ],
  examples: [
    { label: "Riz CRU",  per100g: { carbs: 77, prot: 7,  fat: 1  } },
    { label: "Riz CUIT", per100g: { carbs: 28, prot: 2.5,fat: 0.3 } },
    { label: "Pâtes CRUES",  per100g: { carbs: 73, prot: 13, fat: 1.5 } },
    { label: "Pâtes CUITES", per100g: { carbs: 28, prot: 5,  fat: 0.6 } },
    { label: "Poulet CRU",  per100g: { carbs: 0, prot: 22, fat: 2  } },
    { label: "Poulet CUIT", per100g: { carbs: 0, prot: 29, fat: 3  } }, // concentré
  ],
};

// ── MESSAGES ROTATIFS PAR OBJECTIF ────────────────────────────────────────────
export const GOAL_MESSAGES = {
  perte: [
    "Une perte progressive préserve la masse musculaire et facilite l'adhérence à long terme.",
    "Un déficit trop agressif peut ralentir ton métabolisme - la régularité prime sur la vitesse.",
    "La perte de poids durable se construit sur des semaines, pas sur des jours.",
    "Ton corps s'adapte mieux à un déficit modéré. La patience est une stratégie.",
  ],
  masse: [
    "Une prise de masse lente favorise un meilleur ratio muscle/graisse.",
    "Un surplus trop important augmente principalement le stockage de graisse, pas la masse musculaire.",
    "La constance à l'entraînement et en nutrition génère des adaptations structurelles durables.",
    "La progression en force est souvent le meilleur indicateur d'une prise de masse efficace.",
  ],
  maintenance: [
    "La phase de maintien consolide tes habitudes et optimise tes performances.",
    "Ton équilibre énergétique est stable - c'est la période idéale pour progresser en force.",
    "Le maintien n'est pas une pause : récupération et régularité restent les priorités.",
    "Un corps stabilisé à un poids stable sur plusieurs mois est souvent plus sain à long terme.",
  ],
  seche: [
    "La recomposition est plus progressive - le poids seul ne reflète pas les vrais changements.",
    "Les mensurations, la force et les photos montrent les progrès que la balance ne voit pas.",
    "La recomposition demande patience et constance. Les résultats arrivent sur 3 à 6 mois.",
    "Priorise les protéines et l'entraînement : ce sont les deux leviers principaux.",
  ],
};

export function getGoalMessage(goalType) {
  const msgs = GOAL_MESSAGES[goalType] || GOAL_MESSAGES.maintenance;
  const idx  = Math.floor(Date.now() / 86400000) % msgs.length;
  return msgs[idx];
}

// ── FORMATAGE DES PROGRÈS ──────────────────────────────────────────────────────
export function formatProgress(progressEst, goalType) {
  if (!progressEst) return null;
  if (progressEst.done) return "Objectif de poids atteint.";

  if (progressEst.recomp) {
    return `Recomposition estimée : 10 à 24 semaines · ${progressEst.diff} kg de différence · progression mesurable aux mensurations`;
  }

  const { diff, direction, minWeeks, maxWeeks, weeklyMin, weeklyMax } = progressEst;
  const verb  = direction === "perte" ? "perdre" : "prendre";
  const rythme = `${weeklyMin} à ${weeklyMax} kg/semaine`;

  return `${diff} kg à ${verb} · Estimation : ${minWeeks} à ${maxWeeks} semaines · Rythme conseillé : ${rythme}`;
}

// ── VALIDATION DE DATE CIBLE ──────────────────────────────────────────────────
// Traduit la date choisie par l'utilisateur en vitesse hebdomadaire,
// puis vérifie si cette vitesse est cohérente avec les recommandations scientifiques.
// Références : Slater & Phillips 2011, Hall 2012, Helms 2014, Barakat 2020
//
// Retourne : { zone, label, color, message, tip, weeklyRate, weeklyRatePct, weeksChosen, earliestWeeks }
export function validateDateTarget(currentWeight, targetWeight, goalType, weeksChosen) {
  if (!currentWeight || !targetWeight || !weeksChosen || weeksChosen <= 0) return null;
  if (goalType === "maintenance") return null;

  const absDiff       = Math.abs(targetWeight - currentWeight);
  const weeklyRate    = absDiff / weeksChosen;         // kg par semaine
  const weeklyRatePct = weeklyRate / currentWeight;    // fraction du poids corporel

  let zone, label, color, message, tip, earliestWeeks;

  if (goalType === "masse") {
    // Slater 2019 : 0.25-0.5%/semaine = lean bulk optimal
    earliestWeeks = Math.ceil(absDiff / (currentWeight * 0.005));
    if (weeklyRatePct <= 0.0025) {
      zone = "conservative"; color = "#16a34a"; label = "Estimation conservatrice";
      message = "Rythme très progressif — qualité musculaire maximale.";
    } else if (weeklyRatePct <= 0.005) {
      zone = "standard"; color = "#16a34a"; label = "Rythme conseillé";
      message = "Zone optimale pour une prise de masse de qualité (0,25–0,5 %/semaine).";
    } else if (weeklyRatePct <= 0.0075) {
      zone = "aggressive"; color = "#F59E0B"; label = "Rythme ambitieux";
      message = "Au-dessus de la zone standard. Risque accru de prise de gras.";
      tip = `Date réaliste minimum : ${earliestWeeks} semaines pour une prise de masse propre.`;
    } else {
      zone = "not_recommended"; color = "#CC2936"; label = "Date cible non recommandée";
      message = "À ce rythme, la prise sera surtout de la masse grasse, pas du muscle.";
      tip = `Nous recommandons au moins ${earliestWeeks} semaines. Tu peux reformuler en "prise de poids" si tu veux aller plus vite.`;
    }

  } else if (goalType === "perte") {
    // Hall 2012 : 0.5-1.0%/semaine = zone saine de perte
    earliestWeeks = Math.ceil(absDiff / (currentWeight * 0.010));
    if (weeklyRatePct <= 0.005) {
      zone = "conservative"; color = "#16a34a"; label = "Estimation conservatrice";
      message = "Rythme très progressif — préservation musculaire maximale.";
    } else if (weeklyRatePct <= 0.010) {
      zone = "standard"; color = "#16a34a"; label = "Rythme conseillé";
      message = "Zone optimale pour perdre du gras en préservant le muscle (0,5–1 %/semaine).";
    } else if (weeklyRatePct <= 0.015) {
      zone = "aggressive"; color = "#F59E0B"; label = "Rythme ambitieux";
      message = "Légèrement au-dessus de la zone recommandée. Surveille récupération et énergie.";
      tip = `Date réaliste minimum : ${earliestWeeks} semaines dans la zone sûre.`;
    } else {
      zone = "not_recommended"; color = "#CC2936"; label = "Date cible non recommandée";
      message = "Ce rythme sort du cadre prudent. Risque de perte musculaire et de fatigue.";
      tip = `Nous recommandons au moins ${earliestWeeks} semaines pour préserver ta masse musculaire.`;
    }

  } else if (goalType === "seche") {
    // Barakat 2020 : recompo = léger déficit, progression lente mesurable aux mensurations
    earliestWeeks = Math.ceil(absDiff / (currentWeight * 0.005));
    if (weeklyRatePct <= 0.003) {
      zone = "standard"; color = "#16a34a"; label = "Rythme conseillé";
      message = "Rythme adapté à une recomposition progressive et durable.";
    } else if (weeklyRatePct <= 0.005) {
      zone = "aggressive"; color = "#F59E0B"; label = "Rythme ambitieux";
      message = "Vitesse élevée pour une recomposition — tu te rapproches d'une sèche classique.";
      tip = "Si tu veux aller plus vite, l'objectif \"Perte de poids\" sera plus adapté.";
    } else {
      zone = "not_recommended"; color = "#CC2936"; label = "Ce n'est plus une recomposition";
      message = "À ce rythme, l'objectif approprié est plutôt une perte de poids.";
      tip = "Bascule vers \"Perte de poids\" pour une logique nutritionnelle et un plan adaptés.";
    }
  }

  return {
    zone,
    label,
    color,
    message,
    tip: tip || null,
    weeklyRate:    Math.round(weeklyRate * 100) / 100,
    weeklyRatePct: Math.round(weeklyRatePct * 1000) / 10,  // % avec 1 décimale
    weeksChosen,
    earliestWeeks: earliestWeeks || null,
    absDiff:       Math.round(absDiff * 10) / 10,
  };
}
