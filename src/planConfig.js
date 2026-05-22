// ─── MYLIDE - Plan & Feature Configuration ────────────────────────────────────

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
      "Export PDF de tes données",
      "Objectifs illimités",
      "5 poches patrimoniales",
      "Mensurations corporelles",
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
      "Radar historique illimité",
      "Poches patrimoniales illimitées",
      "Guide nutrition avancé (100+ conseils)",
      "Corrélations entre domaines de vie",
      "Export Excel / CSV complet",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Pour les plus engagés",
    price: 12.99,
    color: "#F59E0B",
    recommended: false,
    features: [
      "Tout ce qui est inclus dans Pro",
      "Support prioritaire par email",
      "Accès anticipé aux nouvelles fonctionnalités",
      "Participation aux bêtas exclusives",
      "Influence sur la roadmap MYLIDE",
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
  "FAQ complète (123 questions)",
  "Thème clair / sombre",
];

// ─── FEATURE → PLAN MAP ───────────────────────────────────────────────────────
export const FEATURE_PLAN_MAP = {
  // ── STARTER ──
  stats_30d:           "starter",
  radar_history_4w:    "starter",
  export_pdf:          "starter",
  goals_unlimited:     "starter",
  patrimoine_5:        "starter",
  body_mensuration:    "starter",

  // ── PRO ──
  stats_90d:           "pro",
  stats_1y:            "pro",
  stats_all:           "pro",
  radar_unlimited:     "pro",
  patrimoine_unlimited:"pro",
  nutrition_tips:      "pro",
  export_csv:          "pro",
  correlations:        "pro",

  // ── PREMIUM ──
  priority_support:    "premium",
  beta_access:         "premium",
  roadmap_vote:        "premium",
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
