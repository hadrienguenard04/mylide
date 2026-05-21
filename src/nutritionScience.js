// ─── MYLIDE — Scientific Nutrition & Body Engine ─────────────────────────────
// References:
//   · Mifflin-St Jeor 1990 (BMR — most validated for general population)
//   · ISSN Position Stand 2017 (protein, nutrient timing)
//   · Helms et al. 2014 (protein during caloric restriction)
//   · Barakat et al. 2020 (body recomposition)
//   · Hall et al. 2012 (energy balance & weight loss)
//   · ACSM/ADA/DC 2016 (nutrition & athletic performance)
// ─────────────────────────────────────────────────────────────────────────────

// ── ACTIVITY LEVELS ───────────────────────────────────────────────────────────
export const ACTIVITY_LEVELS = {
  sedentary:   { label: "Sédentaire",        desc: "Travail de bureau, peu de marche",  factor: 1.2   },
  light:       { label: "Légèrement actif",  desc: "1–2 séances par semaine",           factor: 1.375 },
  moderate:    { label: "Modérément actif",  desc: "3–4 séances par semaine",           factor: 1.55  },
  active:      { label: "Très actif",        desc: "5–6 séances par semaine",           factor: 1.725 },
  very_active: { label: "Extrêmement actif", desc: "Athlète ou travail physique",       factor: 1.9   },
};

// ── GOAL CONFIGURATION ────────────────────────────────────────────────────────
export const GOAL_CONFIG = {
  perte: {
    label:  "Perte de poids",
    emoji:  "⚖️",
    color:  "#3B82F6",
    // Moderate deficit — Hall et al.: ~3500 kcal/lb fat, but metabolic adaptation
    // makes -300 to -500 more sustainable than aggressive restriction
    caloricAdjustment: -400,
    // Helms 2014 meta-analysis: 2.3–3.1 g/kg in deficit for muscle preservation
    proteinPerKg: 2.4,
    // Min 0.7 g/kg fat for hormonal health (testosterone, estrogen synthesis)
    fatPerKg: 0.75,
    // Safe loss rate: 0.5–1% body weight/week (Hall 2012)
    weeklyRateMin: 0.005,
    weeklyRateMax: 0.010,
    minCalories: 1400,
    maxDeficit: 700,
    tagline: "Déficit modéré · Conservation musculaire prioritaire",
  },
  masse: {
    label:  "Prise de masse",
    emoji:  "💪",
    color:  "#CC2936",
    // Lean bulk: +200–350 kcal. Beyond +500 → mostly fat gain (Slater 2019)
    caloricAdjustment: 280,
    // ISSN 2017: 1.6–2.2 g/kg sufficient for muscle synthesis in surplus
    proteinPerKg: 2.0,
    fatPerKg: 0.9,
    // Natural rate: ~0.25–0.5% body weight/week (Helms 2015 natural bodybuilding)
    weeklyRateMin: 0.0025,
    weeklyRateMax: 0.005,
    minCalories: 1800,
    maxSurplus: 500,
    tagline: "Surplus modéré · Qualité musculaire prioritaire",
  },
  maintenance: {
    label:  "Maintien",
    emoji:  "🎯",
    color:  "#16a34a",
    caloricAdjustment: 0,
    // 1.6–2.0 g/kg adequate for active individuals maintaining
    proteinPerKg: 1.8,
    fatPerKg: 0.9,
    weeklyRateMin: 0,
    weeklyRateMax: 0,
    minCalories: 1500,
    tagline: "Équilibre énergétique · Performance & récupération",
  },
  seche: {
    label:  "Sèche / Recompo",
    emoji:  "🔥",
    color:  "#7C3AED",
    // Barakat 2020: recomp works best near maintenance or very slight deficit
    caloricAdjustment: -150,
    // Highest protein need: 2.3–2.8 g/kg (Helms 2014, Barakat 2020)
    proteinPerKg: 2.6,
    fatPerKg: 0.72,
    // Recomp rate is slow: 0.1–0.3% weight/week; main changes = body composition
    weeklyRateMin: 0.001,
    weeklyRateMax: 0.003,
    minCalories: 1400,
    tagline: "Déficit léger · Recomposition progressive",
  },
};

// ── BMR — Mifflin-St Jeor (1990) ─────────────────────────────────────────────
// Validated against indirect calorimetry; ±10% accuracy in general population
export function calcBMR(weight, height, age, sex) {
  if (!weight || !height || !age || age < 1) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

// ── TDEE ──────────────────────────────────────────────────────────────────────
export function calcTDEE(weight, height, age, sex, activityLevel) {
  const bmr = calcBMR(weight, height, age, sex);
  if (!bmr) return 0;
  const factor = ACTIVITY_LEVELS[activityLevel]?.factor ?? 1.55;
  return Math.round(bmr * factor);
}

// ── SPORT CALORIE BURN (MET-based, ACSM) ─────────────────────────────────────
const MET = {
  Musculation: 5.5, Running: 9.5, Football: 8.0, Tennis: 7.0,
  Boxe: 10.5, Natation: 8.0, Vélo: 7.5, HIIT: 9.0,
  Yoga: 3.2, Marche: 3.5, Crossfit: 10.0, Cyclisme: 7.5,
  "Arts martiaux": 9.0, Basketball: 7.5, Escalade: 7.5,
};
export function calcSportBurn(weight, sportType, durationMin) {
  if (!weight || !sportType || !durationMin) return 0;
  const met = MET[sportType] ?? 6.0;
  return Math.round(met * weight * (durationMin / 60));
}

// ── MACRO CALCULATION ─────────────────────────────────────────────────────────
// Returns { calTarget, protTarget, fatTarget, carbsTarget, tdee, deficit, bmr }
export function calcMacros(weight, tdee, goalType, sportBurnToday = 0) {
  if (!weight || !tdee) return null;
  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  // Sport compensation: how much of today's burn to add back
  // Goal: perte → add 50% (keeps deficit, avoids overcompensation)
  //       seche → add 60%
  //       masse/maintenance → add 100% (fuel the training)
  const sportFactor = goalType === "perte" ? 0.5 : goalType === "seche" ? 0.6 : 1.0;
  const sportComp   = Math.round(sportBurnToday * sportFactor);

  const rawCal = tdee + cfg.caloricAdjustment + sportComp;
  const calTarget = Math.max(cfg.minCalories, Math.round(rawCal));

  const prot  = Math.round(weight * cfg.proteinPerKg);
  const fat   = Math.round(weight * cfg.fatPerKg);
  const carbsCal = calTarget - prot * 4 - fat * 9;
  const carbs = Math.max(50, Math.round(carbsCal / 4)); // min 50g carbs always

  return {
    calTarget,
    protTarget: prot,
    fatTarget: fat,
    carbsTarget: carbs,
    tdee,
    deficit: tdee - calTarget + sportBurnToday, // true daily deficit vs TDEE
    bmr: calcBMR(weight, 175, 30, "male"), // placeholder if no profile
  };
}

// ── PROGRESS ESTIMATION ───────────────────────────────────────────────────────
// Returns null if insufficient data, or an estimation object
export function estimateProgress(currentWeight, targetWeight, goalType) {
  if (!currentWeight || !targetWeight) return null;
  const diff = Math.abs(targetWeight - currentWeight);

  if (diff < 0.3) return { done: true };

  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  if (goalType === "seche") {
    // Recomp: weight may barely change — timeline is about body composition
    return {
      done: false,
      recomp: true,
      minWeeks: 10,
      maxWeeks: 24,
      diff: Math.round(diff * 10) / 10,
      note: "La recomposition se mesure aux mensurations et aux performances, pas seulement au poids.",
    };
  }

  if (goalType === "maintenance") return null;

  const weeklyMax = currentWeight * cfg.weeklyRateMax;
  const weeklyMin = currentWeight * cfg.weeklyRateMin;
  const minWeeks  = Math.ceil(diff / weeklyMax);
  const maxWeeks  = Math.ceil(diff / weeklyMin);

  return {
    done: false,
    recomp: false,
    minWeeks,
    maxWeeks,
    weeklyMin: Math.round(weeklyMin * 100) / 100,
    weeklyMax: Math.round(weeklyMax * 100) / 100,
    diff: Math.round(diff * 10) / 10,
    note: null,
  };
}

// ── CONTRADICTION DETECTION ───────────────────────────────────────────────────
// Always non-accusatory. Returns array of { level, icon, msg, tip }
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
  sportFreqWeek, // sport sessions in last 7 days
}) {
  const alerts = [];
  if (!goalType) return alerts;

  // 1. Calorie balance vs objective
  if (calCurrent > 0 && tdee > 0) {
    const balance = calCurrent - tdee; // + = surplus, - = deficit
    if (goalType === "perte" && balance > 250) {
      alerts.push({
        level: "warning", icon: "🍽️",
        msg:  "Ton apport calorique d'aujourd'hui semble supérieur à tes dépenses totales.",
        tip:  "Un déficit de 300–500 kcal par rapport à ton TDEE est la plage optimale pour une perte durable.",
      });
    }
    if (goalType === "masse" && balance < -100) {
      alerts.push({
        level: "warning", icon: "⚡",
        msg:  "Tu seras vraisemblablement en déficit calorique aujourd'hui.",
        tip:  "La construction musculaire nécessite un surplus modéré de 200–350 kcal. Ajoute une collation protéinée.",
      });
    }
    if (goalType === "seche" && balance > 350) {
      alerts.push({
        level: "info", icon: "🔥",
        msg:  "Tu seras aujourd'hui au-dessus de tes dépenses totales.",
        tip:  "La recomposition fonctionne mieux avec un équilibre énergétique ou un très léger déficit (−100 à −200 kcal).",
      });
    }
  }

  // 2. Protein adequacy vs goal
  if (protCurrent > 0 && protTarget > 0) {
    const pct = protCurrent / protTarget;
    if (pct < 0.55 && goalType === "seche") {
      alerts.push({
        level: "warning", icon: "🥩",
        msg:  "Ton apport en protéines est nettement en dessous de l'objectif.",
        tip:  "Des protéines élevées (2.4–2.8 g/kg) sont le levier principal de la recomposition corporelle.",
      });
    } else if (pct < 0.55 && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "🥩",
        msg:  "Ton apport en protéines est insuffisant pour stimuler la synthèse musculaire.",
        tip:  "Vise 1.8–2.2 g/kg de protéines réparties sur 3–4 repas pour optimiser la prise de masse.",
      });
    } else if (pct < 0.55 && goalType === "perte") {
      alerts.push({
        level: "info", icon: "🥩",
        msg:  "Un apport protéique faible peut accélérer la fonte musculaire en déficit.",
        tip:  "Des protéines élevées (2.2–2.6 g/kg) lors d'une perte de poids préservent la masse musculaire.",
      });
    }
  }

  // 3. Sleep & recovery vs goal
  if (sleepDuration > 0) {
    if (sleepDuration < 6.5 && goalType === "masse") {
      alerts.push({
        level: "info", icon: "😴",
        msg:  "Un sommeil insuffisant réduit la sécrétion d'hormone de croissance.",
        tip:  "La majorité de la synthèse protéique musculaire se produit pendant les phases de sommeil profond. Vise 7–9 heures.",
      });
    }
    if (sleepDuration < 6 && (goalType === "perte" || goalType === "seche")) {
      alerts.push({
        level: "info", icon: "😴",
        msg:  "Un manque de sommeil élève la ghréline (hormone de la faim) et le cortisol.",
        tip:  "Dormir moins de 6h ralentit la perte de masse grasse et réduit l'énergie disponible pour l'entraînement.",
      });
    }
  }

  // 4. Activity level vs recomposition goal
  if (goalType === "seche" && sportFreqWeek < 3) {
    alerts.push({
      level: "info", icon: "🏋️",
      msg:  "La recomposition corporelle est plus efficace avec une pratique sportive régulière.",
      tip:  "3–5 séances par semaine (musculation prioritaire) sont recommandées pour la recomposition.",
    });
  }

  // 5. Weight direction vs nutrition goal (hard conflict)
  if (currentWeight > 0 && targetWeight > 0) {
    const needsLoss = targetWeight < currentWeight - 0.5;
    const needsGain = targetWeight > currentWeight + 0.5;
    if (needsLoss && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:  "Ton poids cible implique une perte de poids, mais ton objectif nutritionnel est une prise de masse.",
        tip:  "Ces deux objectifs sont incompatibles. Ajuste ton objectif nutritionnel à 'Perte de poids'.",
        suggestGoal: "perte",
      });
    }
    if (needsGain && goalType === "perte") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:  "Ton poids cible implique une prise de poids, mais ton objectif nutritionnel est une perte de poids.",
        tip:  "Ajuste ton objectif nutritionnel à 'Prise de masse' ou 'Maintien'.",
        suggestGoal: "masse",
      });
    }
  }

  return alerts;
}

// ── INFER ACTIVITY LEVEL FROM HISTORY ────────────────────────────────────────
export function inferActivityLevel(history) {
  if (!history?.length) return "light";
  const last14 = history.slice(-14);
  const activeDays = last14.filter(d => d.sport?.duration >= 20 && !d.sport?.isRest).length;
  const perWeek = activeDays / 2;
  if (perWeek < 1)   return "sedentary";
  if (perWeek < 2.5) return "light";
  if (perWeek < 4)   return "moderate";
  if (perWeek < 6)   return "active";
  return "very_active";
}

// ── SPORT FREQUENCY (last 7 days) ─────────────────────────────────────────────
export function getWeeklySportFreq(history) {
  if (!history?.length) return 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const since = new Date(todayStr);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];
  return history.filter(d => d.date >= sinceStr && d.sport?.duration >= 20 && !d.sport?.isRest).length;
}

// ── ROTATING GOAL MESSAGES ────────────────────────────────────────────────────
export const GOAL_MESSAGES = {
  perte: [
    "Une perte progressive préserve la masse musculaire et facilite l'adhérence à long terme.",
    "Un déficit trop agressif peut ralentir ton métabolisme — la régularité prime sur la vitesse.",
    "La perte de poids durable se construit sur des semaines, pas des jours.",
    "Ton corps s'adapte mieux à un déficit modéré. La patience est une stratégie.",
  ],
  masse: [
    "Une prise de masse lente favorise un meilleur ratio muscle / graisse.",
    "Un surplus trop important augmente principalement le stockage de graisse, pas la masse musculaire.",
    "La constance à l'entraînement et en nutrition génère des adaptations structurelles durables.",
    "La progression en force est souvent le meilleur indicateur d'une prise de masse efficace.",
  ],
  maintenance: [
    "La phase de maintien consolide tes habitudes et optimise tes performances.",
    "Ton équilibre énergétique est stable — c'est la période idéale pour progresser en force.",
    "Le maintien n'est pas une pause : récupération et régularité restent les priorités.",
    "Un corps maintenu à un poids stable pendant plusieurs mois est souvent plus sain à long terme.",
  ],
  seche: [
    "La recomposition corporelle est plus progressive — le poids seul ne reflète pas les changements réels.",
    "Les mensurations, la force et les photos montrent les progrès que la balance ne voit pas.",
    "La recomposition demande patience et constance. Les résultats arrivent sur 3–6 mois.",
    "Priorise les protéines et l'entraînement : ce sont les deux leviers principaux de la recomposition.",
  ],
};

export function getGoalMessage(goalType) {
  const msgs = GOAL_MESSAGES[goalType] || GOAL_MESSAGES.maintenance;
  const idx = Math.floor(Date.now() / 86400000) % msgs.length;
  return msgs[idx];
}
