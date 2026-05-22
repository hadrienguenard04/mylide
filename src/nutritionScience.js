// ─── MYLIDE - Scientific Nutrition & Body Engine v2 ───────────────────────────
// References scientifiques :
//   · Mifflin-St Jeor 1990          → BMR, la plus validée en population générale
//   · ISSN Position Stand 2017       → protéines, timing nutritionnel
//   · Helms et al. 2014             → protéines en déficit calorique
//   · Barakat et al. 2020           → recomposition corporelle
//   · Hall et al. 2012              → bilan énergétique et perte de poids
//   · ACSM/ADA/DC 2016              → nutrition et performance sportive
//   · Slater & Phillips 2011        → surplus calorique lean bulk
//   · Stachenfeld 2014              → différences physiologiques femme/homme
// ─────────────────────────────────────────────────────────────────────────────

// ── NIVEAUX D'ACTIVITÉ ────────────────────────────────────────────────────────
export const ACTIVITY_LEVELS = {
  sedentary:   { label: "Sédentaire",       desc: "Travail de bureau, peu de marche",         factor: 1.2   },
  light:       { label: "Légèrement actif", desc: "1 à 2 séances par semaine",                factor: 1.375 },
  moderate:    { label: "Modérément actif", desc: "3 à 4 séances par semaine",                factor: 1.55  },
  active:      { label: "Très actif",       desc: "5 à 6 séances par semaine",                factor: 1.725 },
  very_active: { label: "Athlétique",       desc: "Entraînement quotidien ou travail physique", factor: 1.9   },
};

// ── CONFIGURATION DES OBJECTIFS ───────────────────────────────────────────────
export const GOAL_CONFIG = {
  perte: {
    label:             "Perte de poids",
    emoji:             "⚖️",
    color:             "#3B82F6",
    // Hall et al. : déficit modéré 300-500 kcal/j = plus durable que la restriction agressive
    caloricAdjustment: -400,
    // Helms 2014 meta-analyse : 2,3 à 3,1 g/kg en déficit pour préserver la masse musculaire
    proteinPerKg:      2.4,
    // Minimum lipides : santé hormonale (testostérone, estrogènes)
    fatPerKgMale:      0.75,
    fatPerKgFemale:    0.90, // Stachenfeld 2014 : les femmes ont des besoins lipidiques plus élevés
    // Vitesse de perte saine : 0,5 à 1% du poids corporel par semaine (Hall 2012)
    weeklyRateMin:     0.005,
    weeklyRateMax:     0.010,
    minCalMale:        1500,
    minCalFemale:      1200, // Seuil clinique accepté pour les femmes
    maxDeficit:        700,
    tagline:           "Déficit modéré, conservation musculaire prioritaire",
    description:       "Une perte progressive préserve ta masse musculaire et facilite l'adhérence à long terme.",
  },
  masse: {
    label:             "Prise de masse",
    emoji:             "💪",
    color:             "#CC2936",
    // Slater 2019 : lean bulk +200 à +350 kcal. Au-delà de +500 kcal, c'est principalement de la graisse
    caloricAdjustment: 280,
    // ISSN 2017 : 1,6 à 2,2 g/kg suffit pour la synthèse musculaire en surplus
    proteinPerKg:      2.0,
    fatPerKgMale:      0.90,
    fatPerKgFemale:    1.00, // Besoins légèrement supérieurs pour la santé hormonale
    // Rythme naturel : 0,25 à 0,5% du poids par semaine (Helms 2015 natural bodybuilding)
    weeklyRateMin:     0.0025,
    weeklyRateMax:     0.005,
    minCalMale:        1800,
    minCalFemale:      1500,
    maxSurplus:        500,
    tagline:           "Surplus modéré, qualité musculaire prioritaire",
    description:       "Un surplus trop important augmente principalement la masse grasse. La progression lente est la plus efficace.",
  },
  maintenance: {
    label:             "Maintien",
    emoji:             "🎯",
    color:             "#16a34a",
    caloricAdjustment: 0,
    // 1,6 à 2,0 g/kg suffit pour les personnes actives en maintien
    proteinPerKg:      1.8,
    fatPerKgMale:      0.90,
    fatPerKgFemale:    0.95,
    weeklyRateMin:     0,
    weeklyRateMax:     0,
    minCalMale:        1500,
    minCalFemale:      1300,
    tagline:           "Équilibre énergétique, performance et récupération",
    description:       "Le maintien est la phase idéale pour consolider tes habitudes et optimiser tes performances.",
  },
  seche: {
    label:             "Sèche et Recompo",
    emoji:             "🔥",
    color:             "#7C3AED",
    // Barakat 2020 : la recomposition fonctionne mieux près de la maintenance ou en léger déficit
    caloricAdjustment: -150,
    // Protéines les plus élevées : 2,3 à 2,8 g/kg (Helms 2014, Barakat 2020)
    proteinPerKg:      2.6,
    fatPerKgMale:      0.75,
    fatPerKgFemale:    0.90,
    // Rythme de recompo : 0,1 à 0,3% du poids par semaine - les changements sont surtout compositionnels
    weeklyRateMin:     0.001,
    weeklyRateMax:     0.003,
    minCalMale:        1500,
    minCalFemale:      1200,
    tagline:           "Déficit léger, recomposition progressive",
    description:       "Le poids peut peu bouger - les vrais progrès se voient aux mensurations et aux performances.",
  },
};

// ── BMR - Mifflin-St Jeor (1990) ──────────────────────────────────────────────
// Validée contre la calorimétrie indirecte. Précision ±10% en population générale.
// Prend en compte les différences métaboliques homme/femme.
export function calcBMR(weight, height, age, sex) {
  if (!weight || !height || !age || age < 1) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  // Homme +5, Femme -161 (différence de masse musculaire et composition corporelle)
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

// ── TDEE - Dépense Énergétique Totale ─────────────────────────────────────────
export function calcTDEE(weight, height, age, sex, activityLevel) {
  const bmr = calcBMR(weight, height, age, sex);
  if (!bmr) return 0;
  const factor = ACTIVITY_LEVELS[activityLevel]?.factor ?? 1.375;
  return Math.round(bmr * factor);
}

// ── CALORIES BRÛLÉES PAR LE SPORT (méthode MET, ACSM) ────────────────────────
const MET_VALUES = {
  Musculation: 5.5,  Running: 9.5,     Football: 8.0,    Tennis: 7.0,
  Boxe: 10.5,        Natation: 8.0,    Vélo: 7.5,        HIIT: 9.0,
  Yoga: 3.2,         Marche: 3.5,      Crossfit: 10.0,   Cyclisme: 7.5,
  "Arts martiaux": 9.0, Basketball: 7.5, Escalade: 7.5,  Padel: 6.5,
  Pilates: 3.8,      Danse: 5.5,       Golf: 4.3,        Ski: 7.0,
};

export function calcSportBurn(weight, sportType, durationMin) {
  if (!weight || !sportType || !durationMin) return 0;
  const met = MET_VALUES[sportType] ?? 6.0;
  return Math.round(met * weight * (durationMin / 60));
}

// ── CALCUL DES MACROS ──────────────────────────────────────────────────────────
// Adapte les recommandations au sexe, au poids, au TDEE et à l'objectif.
// Retourne { calTarget, protTarget, fatTarget, carbsTarget, tdee, deficit, bmr, sexUsed }
export function calcMacros(weight, tdee, goalType, sportBurnToday = 0, sex = "male") {
  if (!weight || !tdee) return null;
  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  const isFemale = sex === "female";

  // Compensation sport :
  //   Perte      → +50% (maintient le déficit, évite la surcompensation)
  //   Sèche      → +60%
  //   Masse/Maint → +100% (fuel nécessaire pour la construction)
  const sportFactor = goalType === "perte" ? 0.5 : goalType === "seche" ? 0.6 : 1.0;
  const sportComp   = Math.round(sportBurnToday * sportFactor);

  const minCal  = isFemale ? cfg.minCalFemale : cfg.minCalMale;
  const rawCal  = tdee + cfg.caloricAdjustment + sportComp;
  const calTarget = Math.max(minCal, Math.round(rawCal));

  // Protéines : même ratio g/kg pour les deux sexes (différence est dans le poids absolu)
  const prot = Math.round(weight * cfg.proteinPerKg);

  // Lipides : minimum plus élevé pour les femmes (santé hormonale - Stachenfeld 2014)
  const fatPerKg = isFemale ? cfg.fatPerKgFemale : cfg.fatPerKgMale;
  const fat = Math.round(weight * fatPerKg);

  // Glucides : calories restantes après protéines et lipides
  const carbsCal = calTarget - prot * 4 - fat * 9;
  const carbs = Math.max(50, Math.round(carbsCal / 4)); // minimum 50g toujours

  // Déficit net réel par rapport au TDEE
  const deficit = tdee - calTarget + sportBurnToday;

  return {
    calTarget,
    protTarget:  prot,
    fatTarget:   fat,
    carbsTarget: carbs,
    tdee,
    deficit,
    surplus:     Math.max(0, calTarget - tdee),
    bmr:         calcBMR(weight, 175, 30, sex),
    sexUsed:     sex,
  };
}

// ── ESTIMATION DE PROGRESSION ──────────────────────────────────────────────────
// Retourne null si données insuffisantes, ou un objet de progression réaliste.
export function estimateProgress(currentWeight, targetWeight, goalType, sex = "male") {
  if (!currentWeight || !targetWeight) return null;
  const diff = Math.abs(targetWeight - currentWeight);

  if (diff < 0.3) return { done: true };

  const cfg = GOAL_CONFIG[goalType];
  if (!cfg) return null;

  const direction = targetWeight < currentWeight ? "perte" : "gain";
  const diffFormatted = Math.round(diff * 10) / 10;

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
        level: "info", icon: "🔥",
        msg:   "Ton apport est au-dessus de tes dépenses totales aujourd'hui.",
        tip:   "La recomposition fonctionne mieux avec un équilibre énergétique ou un très léger déficit de 100 à 200 kcal.",
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
        tip:   "Des protéines élevées (2,4 à 2,8 g/kg) sont le levier principal de la recomposition corporelle.",
      });
    } else if (pct < 0.55 && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "🥩",
        msg:   "Ton apport en protéines est insuffisant pour stimuler la synthèse musculaire.",
        tip:   "Vise 1,8 à 2,2 g/kg de protéines réparties sur 3 à 4 repas pour optimiser la prise de masse.",
      });
    } else if (pct < 0.55 && goalType === "perte") {
      alerts.push({
        level: "info", icon: "🥩",
        msg:   "Un apport protéique faible peut accélérer la fonte musculaire en déficit.",
        tip:   "Des protéines élevées (2,2 à 2,6 g/kg) lors d'une perte de poids préservent la masse musculaire.",
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
      tip:   "3 à 5 séances par semaine (musculation en priorité) sont recommandées pour la recomposition.",
    });
  }

  // 5. Direction du poids vs objectif nutritionnel (contradiction forte)
  if (currentWeight > 0 && targetWeight > 0) {
    const needsLoss = targetWeight < currentWeight - 0.5;
    const needsGain = targetWeight > currentWeight + 0.5;
    if (needsLoss && goalType === "masse") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:   "Ton objectif de poids implique une perte, mais ton objectif nutritionnel est une prise de masse.",
        tip:   "Ces deux objectifs sont incompatibles. Bascule sur Perte de poids pour être cohérent.",
        suggestGoal: "perte",
      });
    }
    if (needsGain && goalType === "perte") {
      alerts.push({
        level: "warning", icon: "⚖️",
        msg:   "Ton objectif de poids implique une prise, mais ton objectif nutritionnel est une perte de poids.",
        tip:   "Bascule sur Prise de masse ou Maintien pour être cohérent.",
        suggestGoal: "masse",
      });
    }
  }

  // 6. Spécifique femmes : lipides très bas
  if (sex === "female" && calCurrent > 0) {
    const fatCurrent = 0; // passed separately if needed - skip for now
  }

  return alerts;
}

// ── INFÉRENCE DU NIVEAU D'ACTIVITÉ ────────────────────────────────────────────
// Déduit automatiquement le niveau d'activité depuis les 14 derniers jours.
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

// ── FRÉQUENCE SPORTIVE (7 derniers jours) ─────────────────────────────────────
export function getWeeklySportFreq(history) {
  if (!history?.length) return 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const since = new Date(todayStr);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];
  return history.filter(d => d.date >= sinceStr && d.sport?.duration >= 20 && !d.sport?.isRest).length;
}

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
  const idx = Math.floor(Date.now() / 86400000) % msgs.length;
  return msgs[idx];
}

// ── FORMATAGE DES PROGRÈS ──────────────────────────────────────────────────────
// Retourne une string lisible et bienveillante pour l'affichage.
export function formatProgress(progressEst, goalType) {
  if (!progressEst) return null;
  if (progressEst.done) return "Tu as atteint ton objectif de poids ! 🎉";

  if (progressEst.recomp) {
    return `Recomposition estimée : 10 à 24 semaines · ${progressEst.diff} kg de différence · progression mesurable aux mensurations`;
  }

  const { diff, direction, minWeeks, maxWeeks, weeklyMin, weeklyMax } = progressEst;
  const verb = direction === "perte" ? "perdre" : "prendre";
  const rythme = `${weeklyMin} à ${weeklyMax} kg par semaine`;

  return `${diff} kg à ${verb} · Estimation saine : ${minWeeks} à ${maxWeeks} semaines · Rythme recommandé : ${rythme}`;
}
