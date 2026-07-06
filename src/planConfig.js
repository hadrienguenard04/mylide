// ─── MYLIDE - Plan & Feature Configuration ────────────────────────────────────

export const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 };

// ─── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour bien commencer",
    price: 3.99,
    priceStr: "3,99",
    color: "#3B82F6",
    recommended: false,
    // ID du produit d'abonnement dans la Google Play Console (doit correspondre EXACTEMENT)
    androidSku: "mylide_starter",
    identity: "Tu profites déjà des outils essentiels de MYLIDE.",
    features: [
      "Statistiques sur 30 jours",
      "Radar historique (4 semaines)",
      "Objectifs illimités",
      "5 poches patrimoniales",
      "Mensurations corporelles",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "L'expérience recommandée",
    price: 6.99,
    priceStr: "6,99",
    color: "#CC2936",
    recommended: true,
    androidSku: "mylide_pro",
    identity: "Tu profites de l'expérience MYLIDE recommandée.",
    features: [
      "Statistiques 1 an + historique complet",
      "Radar historique illimité",
      "Poches patrimoniales illimitées",
      "Graphiques avancés des pas + analyses",
      "Guide nutrition avancé (100+ conseils)",
      "Corrélations entre domaines de vie",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "L'accès total, sans limite",
    price: 12.99,
    priceStr: "12,99",
    color: "#F59E0B",
    recommended: false,
    androidSku: "mylide_premium",
    identity: "Merci de soutenir le développement de MYLIDE.",
    features: [
      "Tout ce qui est inclus dans Pro",
      "Export PDF + Excel / CSV complet",
      "Graphiques financiers avancés",
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
  steps_advanced:      "pro",
  correlations:        "pro",

  // ── PREMIUM ──
  export_pdf:          "premium",
  export_csv:          "premium",
  financial_charts:    "premium",
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

export function getPlanPrice(plan) {
  const p = PLANS.find(p => p.id === plan);
  return p?.priceStr || null;
}

// Message contextuel selon le plan actuel et le plan requis
// Jamais "à partir de X€" si l'utilisateur paie déjà plus
export function getLockMessage(currentPlan, requiredPlan) {
  const currentLevel = PLAN_LEVELS[currentPlan || "free"];
  const requiredLevel = PLAN_LEVELS[requiredPlan || "free"];
  if (currentLevel >= requiredLevel) return null; // accès autorisé

  const requiredName = getPlanName(requiredPlan);

  if (currentPlan === "free") {
    return `Disponible avec ${requiredName} · Essai gratuit 7 jours`;
  }
  if (currentPlan === "starter") {
    if (requiredPlan === "pro") return "Disponible avec Pro";
    if (requiredPlan === "premium") return "Disponible avec Premium";
  }
  if (currentPlan === "pro") {
    return "Disponible avec Premium";
  }
  return `Disponible avec ${requiredName}`;
}

// Message d'identité selon le plan (affiché dans l'app)
export function getPlanIdentity(plan) {
  if (plan === "free") return "Commence à tracker ta vie gratuitement.";
  const p = PLANS.find(p => p.id === plan);
  return p?.identity || "";
}

// Message de mise à niveau contextuel (bouton CTA)
export function getUpgradeLabel(currentPlan, targetPlan) {
  if (currentPlan === "free") return `Essayer ${getPlanName(targetPlan)} gratuitement →`;
  return `Passer à ${getPlanName(targetPlan)} →`;
}

// Jours restants d'essai
export function getTrialDaysLeft(trialEnd) {
  if (!trialEnd) return null;
  const diff = new Date(trialEnd).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  return days > 0 ? days : 0;
}
