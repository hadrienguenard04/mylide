import { useState, useEffect } from "react";
import { useC } from "./theme.jsx";
import { PLANS, FREE_FEATURES, getPlanName, getPlanPrice, PLAN_LEVELS, getTrialDaysLeft } from "./planConfig.js";
import { supabase } from "./supabase.js";
import { Icon } from "./icons.jsx";

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
function CheckIcon({ color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill={color + "20"} />
      <path d="M6.5 10.5l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeft({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onSubscribe, loading, currentPlan, compact = false }) {
  const C = useC();
  const isRec = plan.recommended;
  const isCurrent = currentPlan === plan.id;
  const isLoading = loading === plan.id;
  const col = plan.color;

  return (
    <div style={{
      position: "relative",
      background: isRec ? `linear-gradient(145deg, ${col}12 0%, ${C.surface} 100%)` : C.surface,
      borderRadius: compact ? 16 : 22,
      padding: compact ? (isRec ? "22px 10px 12px" : "14px 10px 12px") : (isRec ? "32px 22px 22px" : "22px"),
      border: isRec ? `2px solid ${col}` : `1.5px solid ${C.border}`,
      boxShadow: isRec ? `0 8px 28px ${col}20` : "0 2px 8px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s",
    }}>
      {isRec && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${col} 0%, #8B1A22 100%)`,
          color: "#fff", borderRadius: 30,
          padding: compact ? "3px 8px" : "5px 18px",
          fontSize: compact ? 8 : 10, fontWeight: 900,
          letterSpacing: 0.8, textTransform: "uppercase",
          whiteSpace: "nowrap", boxShadow: `0 4px 14px ${col}45`,
        }}>
          ✦ Recommandé
        </div>
      )}
      {isCurrent && !compact && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          background: "#10B981", color: "#fff",
          borderRadius: 8, padding: "3px 10px",
          fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
        }}>ACTIF</div>
      )}
      <div style={{ marginBottom: compact ? 6 : 14 }}>
        <h3 style={{ margin: 0, fontSize: compact ? 15 : 22, fontWeight: 900, letterSpacing: -0.5, color: isRec ? col : C.text }}>
          {plan.name}
        </h3>
        {!compact && (
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.muted, fontWeight: 500 }}>{plan.tagline}</p>
        )}
      </div>
      <div style={{ marginBottom: compact ? 10 : 16 }}>
        {compact ? (
          <>
            <div style={{ fontSize: 11, color: C.muted, textDecoration: "line-through", marginBottom: 1 }}>{plan.priceStr}€/mois</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: isRec ? col : C.text, lineHeight: 1 }}>0€</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>7 jours gratuits</div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, color: isRec ? col : C.text }}>0€</span>
              <span style={{ fontSize: 13, color: C.muted }}>/ 7 jours</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              puis <strong style={{ color: C.text }}>{plan.priceStr}€/mois</strong>{" · "}Résiliable à tout moment
            </p>
          </>
        )}
      </div>
      <div style={{ marginBottom: compact ? 10 : 20 }}>
        {(compact ? plan.features.slice(0, 3) : plan.features).map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: compact ? 5 : 9, marginBottom: compact ? 5 : 8 }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}>
              <CheckIcon color={isRec ? col : "#10B981"} size={compact ? 12 : 16} />
            </div>
            <span style={{ fontSize: compact ? 10 : 13, color: C.text, lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
        {compact && plan.features.length > 3 && (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: C.muted }}>+{plan.features.length - 3} autres...</p>
        )}
      </div>
      {isCurrent ? (
        <div style={{
          textAlign: "center", padding: compact ? "8px 4px" : "12px",
          background: "#10B98118", borderRadius: 10,
          color: "#10B981", fontWeight: 700, fontSize: compact ? 11 : 14,
        }}>
          Plan actuel
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          disabled={!!loading}
          style={{
            width: "100%", padding: compact ? "10px 4px" : "15px",
            borderRadius: compact ? 10 : 14, fontWeight: 800, fontSize: compact ? 11 : 15,
            cursor: loading ? "wait" : "pointer",
            border: isRec ? "none" : `1.5px solid ${C.border}`,
            background: isRec ? `linear-gradient(135deg, ${col} 0%, #8B1A22 100%)` : C.surfaceAlt,
            color: isRec ? "#fff" : C.text,
            boxShadow: isRec ? `0 4px 14px ${col}35` : "none",
            opacity: loading && !isLoading ? 0.55 : 1,
            transition: "all 0.2s",
          }}
        >
          {isLoading ? "..." : "Essai gratuit"}
        </button>
      )}
    </div>
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
function SuccessScreen({ plan, onClose }) {
  const C = useC();
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  const planData = PLANS.find(p => p.id === plan);
  const planName = getPlanName(plan);

  // Messages d'identité spécifiques par plan
  const identityMessages = {
    starter: "Les outils essentiels de MYLIDE sont maintenant disponibles.",
    pro: "Tu profites de l'expérience MYLIDE recommandée. Tes analyses avancées sont actives.",
    premium: "Merci de soutenir le développement de MYLIDE. Tu as accès à toutes les fonctionnalités actuelles et futures.",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", fontFamily: "'DM Sans', sans-serif",
      transition: "opacity 0.5s", opacity: visible ? 1 : 0,
    }}>
      <div style={{ fontSize: 68, marginBottom: 20, lineHeight: 1 }}>🎉</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, textAlign: "center", margin: "0 0 12px", letterSpacing: -0.5 }}>
        Bienvenue dans {planName} !
      </h1>
      <p style={{ color: C.muted, textAlign: "center", maxWidth: 300, lineHeight: 1.6, margin: "0 0 28px", fontSize: 14 }}>
        {identityMessages[plan] || "Ton abonnement est actif."}
      </p>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 28, width: "100%", maxWidth: 340 }}>
        {(planData?.features || []).slice(0, 4).map((f, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < arr.length - 1 ? 8 : 0 }}>
            <span style={{ color: "#10B981", fontSize: 15, fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 13, color: C.text }}>{f}</span>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{
        background: "linear-gradient(135deg, #CC2936, #8B1A22)",
        color: "#fff", border: "none", borderRadius: 14,
        padding: "15px 40px", fontWeight: 800, fontSize: 16,
        cursor: "pointer", boxShadow: "0 6px 20px rgba(204,41,54,0.35)",
      }}>
        Commencer à explorer →
      </button>
    </div>
  );
}

// ─── MANAGE SUBSCRIPTION ─────────────────────────────────────────────────────
function ManageSubscription({ subscriptionData, currentPlan, onManage, onCancel, onReactivate }) {
  const C = useC();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const planData = PLANS.find(p => p.id === currentPlan);
  const col = planData?.color || "#CC2936";
  const priceStr = getPlanPrice(currentPlan);
  const isTrialing = subscriptionData?.subscription_status === "trialing";
  const isCancelAtPeriodEnd = subscriptionData?.subscription_status === "cancel_at_period_end";
  const isPastDue = subscriptionData?.subscription_status === "past_due";
  const periodEndRaw = subscriptionData?.subscription_period_end || subscriptionData?.trial_end;
  const periodEnd = periodEndRaw
    ? new Date(periodEndRaw).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const trialDaysLeft = isTrialing ? getTrialDaysLeft(periodEndRaw) : null;

  // Message d'identité par plan
  const identityMsg = {
    starter: "Tu profites des outils essentiels de MYLIDE.",
    pro: "Tu profites de l'expérience MYLIDE recommandée. Tes analyses avancées sont actives.",
    premium: "Merci de soutenir MYLIDE. Tu profites de toutes les fonctionnalités actuelles et futures.",
  }[currentPlan] || "";

  // Message de résiliation adapté au plan
  const cancelMsg = {
    starter: `Ton abonnement Starter restera actif jusqu'au ${periodEnd}. Tu conserveras ensuite l'accès au plan Gratuit avec toutes tes données.`,
    pro: `Tu perdras l'accès aux analyses avancées, aux statistiques étendues et aux graphiques avancés. Ton accès Pro reste actif jusqu'au ${periodEnd}.`,
    premium: `Tes fonctionnalités Premium seront désactivées à la fin de la période. Toutes tes données, ton historique et tes objectifs sont conservés. Accès jusqu'au ${periodEnd}.`,
  }[currentPlan] || `Ton accès reste actif jusqu'au ${periodEnd}.`;

  const cancelMsgTrialing = `Ton essai se terminera à sa date prévue${periodEnd ? ` (${periodEnd})` : ""}. Aucun prélèvement ne sera effectué. Tu conserveras toutes tes données.`;

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Bandeau alerte paiement échoué */}
      {isPastDue && (
        <div style={{ background: "#FFF1F2", border: "1.5px solid #CC293650", borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="warning" size={18} color="#CC2936" strokeWidth={2} />
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#CC2936" }}>Échec de paiement</p>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#7F1D1D", lineHeight: 1.55 }}>
            Nous n'avons pas pu prélever ton abonnement. Mets à jour ton moyen de paiement pour éviter la suspension de ton accès.
          </p>
          <button onClick={async () => { setLoading(true); await onManage(); setLoading(false); }} disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: 12, background: "#CC2936", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            {loading ? "Chargement..." : "Mettre à jour ma carte →"}
          </button>
        </div>
      )}

      {/* Carte plan actif */}
      <div style={{ background: `linear-gradient(145deg, ${col}12, ${col}05)`, border: `2px solid ${col}35`, borderRadius: 22, padding: 22, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: `linear-gradient(135deg, ${col}, ${col}aa)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={currentPlan === "premium" ? "crown" : currentPlan === "pro" ? "zap" : "star"} size={24} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: C.text }}>Plan {getPlanName(currentPlan)}</p>
              {isTrialing && <span style={{ background: "#10B981", color: "#fff", borderRadius: 8, padding: "2px 9px", fontSize: 10, fontWeight: 800 }}>ESSAI</span>}
              {isCancelAtPeriodEnd && <span style={{ background: "#F59E0B", color: "#fff", borderRadius: 8, padding: "2px 9px", fontSize: 10, fontWeight: 800 }}>RÉSILIATION PROGRAMMÉE</span>}
              {isPastDue && <span style={{ background: "#CC2936", color: "#fff", borderRadius: 8, padding: "2px 9px", fontSize: 10, fontWeight: 800 }}>PAIEMENT ÉCHOUÉ</span>}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>
              {isTrialing ? `Essai gratuit · puis ${priceStr}€/mois` : `${priceStr}€/mois`}
            </p>
          </div>
        </div>

        {/* Jours restants essai */}
        {isTrialing && trialDaysLeft !== null && (
          <div style={{ background: "#10B98115", border: "1px solid #10B98130", borderRadius: 10, padding: "9px 14px", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#10B981", fontWeight: 700 }}>
              {trialDaysLeft === 0 ? "Essai se terminant aujourd'hui" : `Essai · ${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""} restant${trialDaysLeft > 1 ? "s" : ""}`}
            </p>
          </div>
        )}

        {periodEnd && (
          <div style={{ background: C.bg, borderRadius: 12, padding: "11px 14px" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>
              {isCancelAtPeriodEnd ? "Accès jusqu'au" : isTrialing ? "Essai gratuit jusqu'au" : "Prochain paiement le"}{" "}
              <strong style={{ color: C.text }}>{periodEnd}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Message d'identité */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 16px", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5, fontStyle: "italic" }}>{identityMsg}</p>
      </div>

      {/* Features incluses */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.text }}>Ce que tu as débloqué</p>
        {(PLANS.find(p => p.id === currentPlan)?.features || []).map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <Icon name="zap" size={14} color={col} strokeWidth={2.2} />
            <span style={{ fontSize: 13, color: C.text }}>{f}</span>
          </div>
        ))}
      </div>

      <button onClick={async () => { setLoading(true); await onManage(); setLoading(false); }} disabled={loading}
        style={{ width: "100%", padding: "14px", borderRadius: 14, background: C.surfaceAlt, border: `1.5px solid ${C.border}`, color: C.text, fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
        {loading ? "Chargement..." : "Gérer mon abonnement"}
      </button>

      {isCancelAtPeriodEnd ? (
        <div style={{ background: "linear-gradient(135deg, #CC293608, #CC293615)", border: "1.5px solid #CC293630", borderRadius: 14, padding: "16px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="heart" size={16} color="#CC2936" strokeWidth={2} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#CC2936" }}>Résiliation programmée</p>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
            Tu gardes ton accès {getPlanName(currentPlan)} jusqu'au {periodEnd}.<br />
            Toutes tes données sont conservées. Tu repasseras ensuite en plan Gratuit.
          </p>
          <button onClick={onReactivate} style={{ width: "100%", padding: "13px", borderRadius: 12, fontWeight: 800, fontSize: 14, background: `linear-gradient(135deg, ${col}, ${col}bb)`, color: "#fff", border: "none", cursor: "pointer", boxShadow: `0 4px 14px ${col}40` }}>
            Maintenir mon plan {getPlanName(currentPlan)}
          </button>
        </div>
      ) : !showConfirm ? (
        <button onClick={() => setShowConfirm(true)} style={{ width: "100%", padding: "12px", background: "none", border: `1.5px solid #CC293630`, borderRadius: 12, color: "#CC2936", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Résilier mon abonnement
        </button>
      ) : (
        <div style={{ background: "#FFF1F2", border: "1px solid #CC293630", borderRadius: 14, padding: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#CC2936", textAlign: "center" }}>
            Confirmer la résiliation ?
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
            {isTrialing ? cancelMsgTrialing : cancelMsg}
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: "#999", textAlign: "center" }}>
            Tes données, ton historique et tes objectifs ne seront jamais supprimés.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "11px", background: "none", border: `1.5px solid #CC293640`, borderRadius: 10, color: "#CC2936", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={async () => { setCancelLoading(true); await onCancel(); setCancelLoading(false); setShowConfirm(false); }} disabled={cancelLoading}
              style={{ flex: 1, padding: "11px", background: "#CC2936", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {cancelLoading ? "..." : "Confirmer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FREE PLAN BLOCK ──────────────────────────────────────────────────────────
function FreePlanBlock() {
  const C = useC();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "15px 18px", marginBottom: 12, background: C.surface }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Plan Gratuit</span>
          <span style={{ marginLeft: 8, fontSize: 11, background: C.surfaceAlt, color: C.muted, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
            TOUJOURS DISPONIBLE
          </span>
        </div>
        <span style={{ fontSize: 18, color: C.muted, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>&#8964;</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {FREE_FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <span style={{ color: C.muted, fontSize: 14 }}>&#9675;</span>
              <span style={{ fontSize: 13, color: C.muted }}>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PREMIUM LOCK OVERLAY (exporté pour usage dans App) ──────────────────────
// userPlan : plan actuel de l'utilisateur (pour message contextuel)
// plan : plan minimum requis
export function PremiumLock({ plan = "pro", userPlan = "free", onUpgrade, small = false, children }) {
  const C = useC();
  const planColors = { starter: "#3B82F6", pro: "#CC2936", premium: "#F59E0B" };
  const col = planColors[plan] || "#CC2936";
  const planName = getPlanName(plan);

  // Message contextuel selon le plan actuel
  const lockMsg = (() => {
    if (userPlan === "free") return `Disponible avec ${planName}`;
    if (userPlan === "starter" && (plan === "pro" || plan === "premium")) return `Disponible avec ${planName}`;
    if (userPlan === "pro" && plan === "premium") return "Disponible avec Premium";
    return `Disponible avec ${planName}`;
  })();

  if (!children) {
    return (
      <button onClick={onUpgrade} style={{
        display: "inline-flex", alignItems: "center", gap: small ? 4 : 5,
        background: col + "15", border: `1px solid ${col}30`,
        borderRadius: 8, padding: small ? "3px 8px" : "5px 12px",
        cursor: "pointer", color: col, fontWeight: 700,
        fontSize: small ? 10 : 12, letterSpacing: 0.3,
      }}>
        🔒 {planName.toUpperCase()}
      </button>
    );
  }

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div style={{ filter: "blur(4px)", pointerEvents: "none", opacity: 0.5 }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div style={{ background: C.bg, border: `1.5px solid ${col}`, borderRadius: 14, padding: "12px 18px", textAlign: "center", boxShadow: `0 4px 20px ${col}20` }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>{lockMsg}</p>
          <button onClick={onUpgrade} style={{ marginTop: 8, background: `linear-gradient(135deg, ${col}, ${col}bb)`, color: "#fff", border: "none", borderRadius: 10, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            Débloquer →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Subscription({ onClose, userPlan = "free", userId, userEmail, subscriptionData = {} }) {
  const C = useC();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const [paymentResult] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return { status: p.get("payment"), plan: p.get("plan") };
  });
  const [showSuccess, setShowSuccess] = useState(paymentResult.status === "success");

  useEffect(() => {
    if (paymentResult.status) {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const isSubscribed = userPlan && userPlan !== "free" && subscriptionData?.subscription_status !== "cancelled";

  // Plans disponibles à l'upgrade (seulement ceux supérieurs au plan actuel)
  const availablePlans = PLANS.filter(p => (PLAN_LEVELS[p.id] || 0) > (PLAN_LEVELS[userPlan] || 0));
  const plansToShow = isSubscribed ? availablePlans : PLANS;

  const handleSubscribe = async (plan) => {
    const envKey = `VITE_STRIPE_PRICE_${plan.id.toUpperCase()}`;
    const priceId = import.meta.env[envKey];
    if (!priceId || priceId.includes("TO_CONFIGURE") || priceId.includes("placeholder")) {
      setError("Paiement en cours de configuration. Reviens très bientôt !");
      return;
    }
    setLoading(plan.id);
    setError(null);
    try {
      const token = await getAuthToken();
      const r = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ priceId, userId, userEmail, plan: plan.id }),
      });
      const { url, error: apiErr } = await r.json();
      if (apiErr) throw new Error(apiErr);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e.message || "Erreur lors du paiement. Réessaie.");
      setLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const token = await getAuthToken();
      const r = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId }),
      });
      const { url, error: e } = await r.json();
      if (e) throw new Error(e);
      if (url) window.location.href = url;
    } catch {
      setError("Impossible d'accéder au portail. Réessaie.");
    }
  };

  const handleReactivate = async () => {
    try {
      const token = await getAuthToken();
      const r = await fetch("/api/reactivate-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId }),
      });
      const { success, error: e } = await r.json();
      if (e) throw new Error(e);
      if (success) window.location.reload();
    } catch (e) {
      setError(e.message || "Erreur lors de la réactivation. Réessaie.");
    }
  };

  const handleCancel = async () => {
    try {
      const token = await getAuthToken();
      const r = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId }),
      });
      const { success, period_end, error: e } = await r.json();
      if (e) throw new Error(e);
      if (success) {
        const dateStr = period_end ? new Date(period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
        setError(`✅ Résiliation enregistrée. Ton accès reste actif jusqu'au ${dateStr}.`);
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch (e) {
      setError(e.message || "Erreur lors de la résiliation. Réessaie.");
    }
  };

  if (showSuccess) {
    return <SuccessScreen plan={paymentResult.plan} onClose={() => { setShowSuccess(false); onClose(); }} />;
  }

  // Titre de la page adapté au plan actuel
  const pageTitle = (() => {
    if (!isSubscribed) return "Passer à la version premium";
    if (userPlan === "starter") return "Évoluer vers Pro ou Premium";
    if (userPlan === "pro") return "Évoluer vers Premium";
    return "Mon abonnement";
  })();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: C.bg, overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: C.bg + "ee", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{isSubscribed && userPlan === "premium" ? "Mon abonnement" : pageTitle}</span>
          <div style={{ width: 40 }} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>
        {isSubscribed ? (
          <>
            <div style={{ textAlign: "center", padding: "28px 0 24px" }}>
              <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #CC2936, #8B1A22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 28px rgba(204,41,54,0.3)" }}>
                <Icon name="crown" size={36} color="#fff" strokeWidth={1.8} />
              </div>
              <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>
                Membre {getPlanName(userPlan)}
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
                {PLANS.find(p => p.id === userPlan)?.identity || ""}
              </p>
            </div>
            <ManageSubscription subscriptionData={subscriptionData} currentPlan={userPlan} onManage={handleManage} onCancel={handleCancel} onReactivate={handleReactivate} />

            {/* Upgrade disponible pour Starter et Pro */}
            {plansToShow.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Évoluer</p>
                <div style={{ display: "grid", gridTemplateColumns: plansToShow.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
                  {plansToShow.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} loading={loading} currentPlan={userPlan} compact />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* HERO */}
            <div style={{ textAlign: "center", padding: "28px 0 24px" }}>
              <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.2, letterSpacing: -0.8 }}>
                Ton meilleur outil<br />de suivi de vie
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                Analyses avancées · Statistiques complètes<br />Insights personnalisés · Objectifs connectés
              </p>
            </div>

            {/* TRIAL BADGE */}
            <div style={{ background: "linear-gradient(135deg, #10B981, #059669)", borderRadius: 16, padding: "14px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 6px 20px rgba(16,185,129,0.25)" }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="gift" size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 14 }}>7 jours gratuits sur tous les plans</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.82)", fontSize: 12 }}>
                  Carte requise · Aucun débit pendant 7 jours · Résiliable à tout moment
                </p>
              </div>
            </div>

            {/* PLANS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16, alignItems: "start" }}>
              {PLANS.map(plan => (
                <PlanCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} loading={loading} currentPlan={userPlan} compact />
              ))}
            </div>

            <FreePlanBlock />

            {error && (
              <div style={{ background: error.startsWith("✅") ? "#F0FDF4" : "#FFF1F2", border: `1px solid ${error.startsWith("✅") ? "#BBF7D0" : "#CC293630"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <p style={{ margin: 0, color: error.startsWith("✅") ? "#166534" : "#CC2936", fontSize: 13, fontWeight: 600 }}>{error}</p>
              </div>
            )}

            {/* SOCIAL PROOF */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "#CC293610", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="quote" size={18} color="#CC2936" strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontStyle: "italic", color: C.text, lineHeight: 1.5 }}>
                  "MYLIDE a changé ma façon de voir mes habitudes. Les insights sont vraiment personnalisés."
                </p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 600 }}>Alex R., membre Pro depuis 3 mois</p>
              </div>
            </div>

            {/* LEGAL */}
            <div style={{ textAlign: "center", padding: "16px 0 0" }}>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                En souscrivant, tu acceptes les Conditions d'utilisation et la Politique de confidentialité.<br />
                L'abonnement se renouvelle automatiquement après l'essai.<br />
                Résiliation possible à tout moment depuis les paramètres.<br /><br />
                MYLIDE est une application de bien-être personnel.<br />
                Elle ne remplace pas un professionnel de santé.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
