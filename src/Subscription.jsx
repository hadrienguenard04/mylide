import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const C = {
  red: "#CC2936", bg: "#f2f2f2", surface: "#ffffff",
  border: "#e0e0e0", muted: "#888888", text: "#1a1a1a",
  surfaceAlt: "#ebebeb", green: "#16a34a"
};

export default function Subscription({ onClose }) {
  const [loading, setLoading] = useState(false);

  const features = {
    free: [
      "✅ Tracker quotidien (sommeil, sport, nutrition)",
      "✅ 3 objectifs maximum",
      "✅ Statistiques 7 derniers jours",
      "✅ 2 poches patrimoine",
      "❌ Intelligence temporelle",
      "❌ Statistiques illimitées",
      "❌ Objectifs illimités",
      "❌ Export des données",
    ],
    pro: [
      "✅ Tout ce qui est gratuit",
      "✅ Intelligence temporelle avancée",
      "✅ Statistiques illimitées",
      "✅ Objectifs illimités",
      "✅ Poches patrimoine illimitées",
      "✅ Export PDF / Excel",
      "✅ Synchronisation multi-appareils",
      "✅ Support prioritaire",
    ]
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Connecte-toi d'abord !"); return; }
      
      // Pour l'instant on redirige vers une page Stripe hébergée
      // On intégrera le vrai checkout quand le backend sera prêt
      alert("Fonctionnalité bientôt disponible ! Ton compte Stripe est en cours de validation.");
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, background: C.bg, borderRadius: "20px 20px 0 0", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, #CC2936, #a01e28)`, padding: "24px 20px 20px", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>KojihTrack Pro</h2>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 20, padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: 13 }}>✕ Fermer</button>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: "#fff" }}>3,59€</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>/mois</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 12px", marginTop: 10 }}>
            <p style={{ color: "#fff", fontSize: 13, margin: 0, fontWeight: 600 }}>🎁 1 mois gratuit — carte requise, annulation facile</p>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Comparaison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Gratuit */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Gratuit</p>
              {features.free.map((f, i) => (
                <p key={i} style={{ fontSize: 11, color: f.startsWith("❌") ? C.muted : C.text, margin: "0 0 6px", lineHeight: 1.4 }}>{f}</p>
              ))}
            </div>
            {/* Pro */}
            <div style={{ background: "rgba(204,41,54,0.06)", border: `2px solid #CC2936`, borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#CC2936", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Pro ⭐</p>
              {features.pro.map((f, i) => (
                <p key={i} style={{ fontSize: 11, color: C.text, margin: "0 0 6px", lineHeight: 1.4 }}>{f}</p>
              ))}
            </div>
          </div>

          {/* Bouton */}
          <button onClick={handleSubscribe} disabled={loading} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, #CC2936, #a01e28)`, color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 8px 24px rgba(204,41,54,0.35)", marginBottom: 12 }}>
            {loading ? "Chargement..." : "🚀 Commencer l'essai gratuit"}
          </button>

          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: "0 0 8px" }}>Carte bancaire requise. Annulation possible à tout moment.</p>
          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: 0 }}>Après l'essai, 3,59€/mois. Un email de confirmation sera envoyé.</p>
        </div>
      </div>
    </div>
  );
}