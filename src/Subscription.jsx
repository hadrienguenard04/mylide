import { useState, useEffect } from "react";
import { useC } from "./theme.jsx";
import { PLANS, FREE_FEATURES, getPlanName } from "./planConfig.js";

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
      boxShadow: isRec
        ? `0 8px 28px ${col}20`
        : "0 2px 8px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s",
    }}>

      {/* Badge RECOMMANDE */}
      {isRec && (
        <div style={{
          position: "absolute", top: -11, left: "50%",
          transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${col} 0%, #8B1A22 100%)`,
          color: "#fff", borderRadius: 30,
          padding: compact ? "3px 8px" : "5px 18px",
          fontSize: compact ? 8 : 10, fontWeight: 900,
          letterSpacing: 0.8, textTransform: "uppercase",
          whiteSpace: "nowrap",
          boxShadow: `0 4px 14px ${col}45`,
        }}>
          ✦ TOP
        </div>
      )}

      {/* Badge ACTIF */}
      {isCurrent && !compact && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          background: "#10B981", color: "#fff",
          borderRadius: 8, padding: "3px 10px",
          fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
        }}>ACTIF</div>
      )}

      {/* Nom */}
      <div style={{ marginBottom: compact ? 6 : 14 }}>
        <h3 style={{ margin: 0, fontSize: compact ? 15 : 22, fontWeight: 900, letterSpacing: -0.5, color: isRec ? col : C.text }}>
          {plan.name}
        </h3>
        {!compact && (
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.muted, fontWeight: 500 }}>
            {plan.tagline}
          </p>
        )}
      </div>

      {/* Prix */}
      <div style={{ marginBottom: compact ? 10 : 16 }}>
        {compact ? (
          <>
            <div style={{ fontSize: 11, color: C.muted, textDecoration: "line-through", marginBottom: 1 }}>{plan.price}€/mois</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: isRec ? col : C.text, lineHeight: 1 }}>0€</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>1er mois gratuit</div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 14, color: C.muted, fontWeight: 600, textDecoration: "line-through" }}>{plan.price}€</span>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, color: isRec ? col : C.text }}>0€</span>
              <span style={{ fontSize: 13, color: C.muted }}>/1er mois</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              puis <strong style={{ color: C.text }}>{plan.price}€/mois</strong>{" · "}Résiliable à tout moment
            </p>
          </>
        )}
      </div>

      {/* Features */}
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

      {/* CTA */}
      {isCurrent ? (
        <div style={{
          textAlign: "center", padding: compact ? "8px 4px" : "12px",
          background: "#10B98118", borderRadius: 10,
          color: "#10B981", fontWeight: 700, fontSize: compact ? 11 : 14,
        }}>
          Actuel
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
            background: isRec
              ? `linear-gradient(135deg, ${col} 0%, #8B1A22 100%)`
              : C.surfaceAlt,
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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", fontFamily: "'DM Sans', sans-serif",
      transition: "opacity 0.5s",
      opacity: visible ? 1 : 0,
    }}>
      <div style={{ fontSize: 68, marginBottom: 20, lineHeight: 1 }}>🎉</div>
      <h1 style={{
        fontSize: 26, fontWeight: 900, color: C.text,
        textAlign: "center", margin: "0 0 12px", letterSpacing: -0.5,
      }}>
        Bienvenue dans MYLIDE {getPlanName(plan)} !
      </h1>
      <p style={{ color: C.muted, textAlign: "center", maxWidth: 300, lineHeight: 1.6, margin: "0 0 28px", fontSize: 14 }}>
        Ton abonnement est actif. Toutes les fonctionnalités sont maintenant debloquees.
      </p>
      <div style={{
        background: "#CC293610", border: "1px solid #CC293625",
        borderRadius: 16, padding: "16px 20px", marginBottom: 24,
        width: "100%", maxWidth: 340,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: C.text, textAlign: "center", lineHeight: 1.65 }}>
          Merci de soutenir MYLIDE. Ton abonnement permet de continuer
          a ameliorer l'application pour toute la communaute.
        </p>
      </div>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "16px 20px", marginBottom: 28,
        width: "100%", maxWidth: 340,
      }}>
        {["Toutes les statistiques avancees","Insights et predictions intelligents","Export PDF + Excel","Radar historique illimite"].map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 8 : 0 }}>
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
function ManageSubscription({ subscriptionData, currentPlan, onManage, onCancel }) {
  const C = useC();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const planColors = { starter: "#3B82F6", pro: "#CC2936", premium: "#F59E0B" };
  const planPrices = { starter: "3,99", pro: "6,99", premium: "12,99" };
  const col = planColors[currentPlan] || "#CC2936";
  const isTrialing = subscriptionData?.subscription_status === "trialing";
  const periodEnd = subscriptionData?.subscription_period_end
    ? new Date(subscriptionData.subscription_period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{
        background: `linear-gradient(145deg, ${col}12, ${col}05)`,
        border: `2px solid ${col}35`, borderRadius: 22, padding: 22, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: `linear-gradient(135deg, ${col}, ${col}aa)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 20,
          }}>
            {currentPlan === "starter" ? "S" : currentPlan === "pro" ? "P" : "★"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: C.text }}>
                Plan {getPlanName(currentPlan)}
              </p>
              {isTrialing && (
                <span style={{ background: "#10B981", color: "#fff", borderRadius: 8, padding: "2px 9px", fontSize: 10, fontWeight: 800 }}>
                  ESSAI
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{planPrices[currentPlan]}€/mois apres l'essai</p>
          </div>
        </div>
        {periodEnd && (
          <div style={{ background: C.bg, borderRadius: 12, padding: "11px 14px" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>
              {isTrialing ? "Essai gratuit jusqu'au" : "Prochain paiement le"}{" "}
              <strong style={{ color: C.text }}>{periodEnd}</strong>
            </p>
          </div>
        )}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.text }}>Ce que tu as debloques</p>
        {[
          "Toutes les statistiques avancees",
          "Insights intelligents & predictions",
          "Export donnees PDF + Excel",
          "Radar historique illimite",
          ...(currentPlan === "premium" ? ["IA avancee & analyse en profondeur","Acces prioritaire aux nouveautes"] : []),
        ].map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ color: col, fontWeight: 700, fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 13, color: C.text }}>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={async () => { setLoading(true); await onManage(); setLoading(false); }}
        disabled={loading}
        style={{
          width: "100%", padding: "14px", borderRadius: 14,
          background: C.surfaceAlt, border: `1.5px solid ${C.border}`,
          color: C.text, fontWeight: 700, fontSize: 15,
          cursor: "pointer", marginBottom: 10,
        }}
      >
        {loading ? "Chargement..." : "Gerer mon abonnement (Stripe)"}
      </button>

      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)} style={{ width: "100%", padding: "12px", background: "none", border: `1.5px solid #CC293630`, borderRadius: 12, color: "#CC2936", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Résilier mon abonnement
        </button>
      ) : (
        <div style={{ background: "#FFF1F2", border: "1px solid #CC293630", borderRadius: 14, padding: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#CC2936", textAlign: "center" }}>
            Confirmer la résiliation ?
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#CC2936", textAlign: "center", lineHeight: 1.5 }}>
            Tu gardes ton accès jusqu'à la fin de ta période en cours. Après ça, tu repasseras en plan Gratuit.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "11px", background: "none", border: `1.5px solid #CC293640`, borderRadius: 10, color: "#CC2936", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={async () => { setCancelLoading(true); await onCancel(); setCancelLoading(false); setShowConfirm(false); }} disabled={cancelLoading} style={{ flex: 1, padding: "11px", background: "#CC2936", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {cancelLoading ? "..." : "Oui, résilier"}
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
        <span style={{ fontSize: 18, color: C.muted, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>
          &#8964;
        </span>
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
export function PremiumLock({ plan = "pro", onUpgrade, small = false, children }) {
  const C = useC();
  const planColors = { starter: "#3B82F6", pro: "#CC2936", premium: "#F59E0B" };
  const col = planColors[plan] || "#CC2936";

  if (!children) {
    return (
      <button onClick={onUpgrade} style={{
        display: "inline-flex", alignItems: "center", gap: small ? 4 : 5,
        background: col + "15", border: `1px solid ${col}30`,
        borderRadius: 8, padding: small ? "3px 8px" : "5px 12px",
        cursor: "pointer", color: col, fontWeight: 700,
        fontSize: small ? 10 : 12, letterSpacing: 0.3,
      }}>
        🔒 {getPlanName(plan).toUpperCase()}
      </button>
    );
  }

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div style={{ filter: "blur(4px)", pointerEvents: "none", opacity: 0.5 }}>{children}</div>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <div style={{
          background: C.bg, border: `1.5px solid ${col}`,
          borderRadius: 14, padding: "12px 18px",
          textAlign: "center", boxShadow: `0 4px 20px ${col}20`,
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>
            Fonctionnalite {getPlanName(plan)}
          </p>
          <button onClick={onUpgrade} style={{
            marginTop: 8, background: `linear-gradient(135deg, ${col}, ${col}bb)`,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>
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

  const handleSubscribe = async (plan) => {
    const envKey = `VITE_STRIPE_PRICE_${plan.id.toUpperCase()}`;
    const priceId = import.meta.env[envKey];

    if (!priceId || priceId.includes("TO_CONFIGURE") || priceId.includes("placeholder")) {
      setError("Paiement en cours de configuration. Reviens tres bientot !");
      return;
    }
    setLoading(plan.id);
    setError(null);
    try {
      const r = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId, userEmail, plan: plan.id }),
      });
      const { url, error: apiErr } = await r.json();
      if (apiErr) throw new Error(apiErr);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e.message || "Erreur lors du paiement. Reessaie.");
      setLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const r = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const { url, error: e } = await r.json();
      if (e) throw new Error(e);
      if (url) window.location.href = url;
    } catch {
      setError("Impossible d'acceder au portail. Reessaie.");
    }
  };

  const handleCancel = async () => {
    try {
      const r = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const { success, immediate, period_end, error: e } = await r.json();
      if (e) throw new Error(e);
      if (success) {
        if (immediate) {
          onClose(); window.location.reload();
        } else {
          const dateStr = period_end ? new Date(period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
          setError(`✅ Résiliation programmée. Ton accès reste actif jusqu'au ${dateStr}.`);
        }
      }
    } catch (e) {
      setError(e.message || "Erreur lors de la résiliation. Reessaie.");
    }
  };

  if (showSuccess) {
    return <SuccessScreen plan={paymentResult.plan} onClose={() => { setShowSuccess(false); onClose(); }} />;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, background: C.bg,
      overflowY: "auto", WebkitOverflowScrolling: "touch",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.bg + "ee",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: 12,
            background: C.surfaceAlt, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            {isSubscribed ? "Mon abonnement" : "Passer Premium"}
          </span>
          <div style={{ width: 40 }} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>
        {isSubscribed ? (
          <>
            <div style={{ textAlign: "center", padding: "28px 0 24px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: "linear-gradient(135deg, #CC2936, #8B1A22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, margin: "0 auto 16px",
                boxShadow: "0 8px 28px rgba(204,41,54,0.3)",
              }}>&#11088;</div>
              <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>
                Membre {getPlanName(userPlan)}
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
                Tu beneficies de toutes les fonctionnalites premium.
              </p>
            </div>
            <ManageSubscription subscriptionData={subscriptionData} currentPlan={userPlan} onManage={handleManage} onCancel={handleCancel} />
          </>
        ) : (
          <>
            {/* HERO */}
            <div style={{ textAlign: "center", padding: "28px 0 24px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#CC293618", border: "1px solid #CC293628",
                borderRadius: 20, padding: "5px 14px",
                fontSize: 11, fontWeight: 700, color: "#CC2936",
                letterSpacing: 0.5, marginBottom: 18, textTransform: "uppercase",
              }}>
                Tout MYLIDE debloques
              </div>
              <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.2, letterSpacing: -0.8 }}>
                Votre meilleur outil<br />de suivi de vie
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                Analyses avancees · Predictions intelligentes<br />
                Insights personnalises · Exports complets
              </p>
            </div>

            {/* TRIAL BADGE */}
            <div style={{
              background: "linear-gradient(135deg, #10B981, #059669)",
              borderRadius: 16, padding: "14px 18px", marginBottom: 22,
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 6px 20px rgba(16,185,129,0.25)",
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🎁</span>
              <div>
                <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: 14 }}>
                  1 mois gratuit sur tous les plans
                </p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.82)", fontSize: 12 }}>
                  Carte requise · Aucun debit pendant 30 jours · Resiliable a tout moment
                </p>
              </div>
            </div>

            {/* PLANS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16, alignItems: "start" }}>
              {PLANS.map(plan => (
                <PlanCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} loading={loading} currentPlan={userPlan} compact />
              ))}
            </div>

            {/* FREE PLAN */}
            <FreePlanBlock />

            {/* ERROR */}
            {error && (
              <div style={{ background: "#FFF1F2", border: "1px solid #CC293630", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <p style={{ margin: 0, color: "#CC2936", fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
              </div>
            )}

            {/* SOCIAL PROOF */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>💬</span>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontStyle: "italic", color: C.text, lineHeight: 1.5 }}>
                  "MYLIDE a change ma facon de voir mes habitudes. Les insights sont vraiment personnalises."
                </p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 600 }}>
                  Alex R., membre Pro depuis 3 mois
                </p>
              </div>
            </div>

            {/* LEGAL */}
            <div style={{ textAlign: "center", padding: "16px 0 0" }}>
              <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                En souscrivant, tu acceptes les Conditions d'utilisation et la Politique de confidentialite.
                <br />
                L'abonnement se renouvelle automatiquement apres l'essai.
                <br />
                Resiliation possible a tout moment depuis les parametres.
                <br /><br />
                MYLIDE est une application de bien-etre personnel.
                Elle ne remplace pas un professionnel de sante.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
