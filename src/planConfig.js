// ─── MYLIDE — Plan & Feature Configuration ────────────────────────────────────

export const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 };

// ─── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour bien commencer",
    price: 3.99,
    color: "#3B82F6",
    recommended: false,
    features: [
      "Statistiques sur 30 jours",
      "Radar historique (4 semaines)",
      "Export PDF complet",
      "Objectifs illimités",
      "5 poches patrimoniales",
      "Suggestions de repas intelligentes",
      "Mensurations corporelles",
      "Corrélations simples",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "L'expérience complète",
    price: 6.99,
    color: "#CC2936",
    recommended: true,
    features: [
      "Statistiques 1 an + historique complet",
      "Insights intelligents avancés",
      "Prédictions (patrimoine, poids, forme)",
      "Export Excel / CSV complet",
      "Corrélations avancées entre domaines",
      "Guide nutrition 100+ Q&A",
      "Daily State Engine complet",
      "Poches patrimoniales illimitées",
      "Radar historique illimité",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Tout MYLIDE, sans limite",
    price: 12.99,
    color: "#F59E0B",
    recommended: false,
    features: [
      "Tout ce qui est inclus dans Pro",
      "IA avancée & analyse en profondeur",
      "Accès prioritaire aux nouvelles fonctionnalités",
      "Fonctionnalités expérimentales",
      "Support prioritaire",
      "Modules exclusifs à venir",
    ],
  },
];

// ─── FREE PLAN FEATURES ───────────────────────────────────────────────────────
export const FREE_FEATURES = [
  "Tracker quotidien complet (7 modules)",
  "Score global du jour",
  "Radar de vie (aujourd'hui uniquement)",
  "Statistiques sur 7 jours",
  "3 objectifs maximum",
  "2 poches patrimoniales",
  "Intelligence temporelle de base",
  "Thème clair / sombre",
  "FAQ complète (123 questions)",
];

// ─── FEATURE → PLAN MAP ───────────────────────────────────────────────────────
// Chaque feature nécessite le plan indiqué (ou supérieur)
export const FEATURE_PLAN_MAP = {
  // ── STARTER ──
  stats_30d:           "starter",
  stats_90d:           "starter",
  radar_history:       "starter",
  export_pdf:          "starter",
  goals_unlimited:     "starter",
  meal_suggestions:    "starter",
  body_mensuration:    "starter",
  patrimoine_5:        "starter",
  correlations_basic:  "starter",

  // ── PRO ──
  stats_1y:            "pro",
  stats_all:           "pro",
  insights_advanced:   "pro",
  predictions:         "pro",
  export_csv:          "pro",
  correlations_adv:    "pro",
  nutrition_tips:      "pro",
  daily_state_engine:  "pro",
  patrimoine_unlimited:"pro",
  radar_unlimited:     "pro",

  // ── PREMIUM ──
  ai_deep:             "premium",
  experimental:        "premium",
  priority_support:    "premium",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function canAccess(userPlan, feature) {
  const required = FEATURE_PLAN_MAP[feature] || "free";
  return PLAN_LEVELS[userPlan || "free"] >= PLAN_LEVELS[required];
}

export function planLevel(plan) {
  return PLAN_LEVELS[plan || "free"];
}

export function isAtLeast(userPlan, minPlan) {
  return PLAN_LEVELS[userPlan || "free"] >= PLAN_LEVELS[minPlan || "free"];
}

export function getPlanColor(plan) {
  const p = PLANS.find(p => p.id === plan);
  return p?.color || "#6B7280";
}

export function getPlanName(plan) {
  if (plan === "free") return "Gratuit";
  const p = PLANS.find(p => p.id === plan);
  return p?.name || "Gratuit";
}
