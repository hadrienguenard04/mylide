import { useState } from "react";
import { supabase } from "./supabase";
import mylidelogo from "./assets/logo.png";

const C = {
  red: "#CC2936", bg: "#f2f2f2", surface: "#ffffff",
  border: "#e0e0e0", muted: "#888888", text: "#1a1a1a",
  surfaceAlt: "#ebebeb", green: "#16a34a"
};

const inp = {
  background: C.surfaceAlt, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: "12px 14px", color: C.text,
  fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box"
};

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } }
      });
      if (error) setError(error.message);
      else setMessage("Vérifie ton email pour confirmer ton compte !");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.surface, borderRadius: 24, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
        
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={mylidelogo} alt="MYLIDE" style={{ width: 72, height: 72, margin: "0 auto 16px", display: "block", filter: "drop-shadow(0 8px 24px rgba(204,41,54,0.4))" }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: "0 0 4px" }}>MYLIDE</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Ton tracker de vie intelligent</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: C.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === m ? C.surface : "transparent", color: mode === m ? C.red : C.muted, boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ton prénom" style={inp} />
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inp} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={inp} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          
          {error && <p style={{ fontSize: 12, color: C.red, margin: 0, padding: "8px 12px", background: "rgba(204,41,54,0.08)", borderRadius: 8 }}>{error}</p>}
          {message && <p style={{ fontSize: 12, color: C.green, margin: 0, padding: "8px 12px", background: "rgba(22,163,74,0.08)", borderRadius: 8 }}>{message}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{ padding: "14px", background: `linear-gradient(135deg, ${C.red}, #a01e28)`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 20px rgba(204,41,54,0.3)", marginTop: 4 }}>
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.muted }}>ou</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button onClick={handleGoogle} disabled={loading} style={{ padding: "13px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.text, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}