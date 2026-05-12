import { useState, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

const TABS = [
  { id: "today", label: "Today", icon: "⚡" },
  { id: "sleep", label: "Sommeil", icon: "🌙" },
  { id: "sport", label: "Sport", icon: "💪" },
  { id: "nutrition", label: "Nutrition", icon: "🥗" },
  { id: "work", label: "Travail", icon: "🎯" },
  { id: "money", label: "Argent", icon: "💰" },
  { id: "mind", label: "Mental", icon: "🧠" },
  { id: "stats", label: "Stats", icon: "📊" },
];

const defaultDay = () => ({
  date: new Date().toISOString().split("T")[0],
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0 },
  sport: { type: "", duration: 0, intensity: 0, notes: "" },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, junk: false },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "" },
  money: { income: 0, expense: 0, invested: 0, note: "" },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

function calcDuration(bed, wake) {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let diff = (wh * 60 + wm) - (bh * 60 + bm);
  if (diff < 0) diff += 24 * 60;
  return Math.round(diff / 6) / 10;
}

function calcScore(day) {
  let s = 0;
  const sl = day.sleep;
  if (sl.duration >= 7 && sl.duration <= 9) s += 20;
  else if (sl.duration >= 6) s += 10;
  if (sl.quality >= 4) s += 5;
  const sp = day.sport;
  if (sp.duration >= 30) s += 15;
  if (sp.intensity >= 3) s += 5;
  const n = day.nutrition;
  if (n.breakfast) s += 3; if (n.lunch) s += 3; if (n.dinner) s += 3;
  if (n.water >= 2) s += 5; if (n.protein >= 120) s += 5;
  if (!n.junk) s += 5;
  const w = day.work;
  if (w.focus >= 4) s += 10;
  if (w.tasks > 0 && w.tasksCompleted >= w.tasks) s += 5;
  const m = day.mind;
  if (m.mood >= 4) s += 5; if (m.reading >= 20) s += 5;
  if (m.meditation) s += 5; if (m.learning) s += 3;
  return Math.min(100, s);
}

function getTip(day) {
  if (day.sleep.duration < 7 && day.sleep.duration > 0) return "🌙 Couche-toi 30min plus tôt — le sommeil est ton levier #1.";
  if (day.nutrition.water < 2 && day.nutrition.water > 0) return "💧 Bois un verre maintenant. Tu es sûrement déshydraté.";
  if (day.sport.duration < 30 && day.sport.duration > 0) return "💪 Même 20min comptent. Rajoute une courte session demain.";
  if (!day.mind.meditation) return "🧘 5min de cohérence cardiaque = -30% cortisol. Essaie ce soir.";
  if (day.mind.reading < 20 && day.mind.reading > 0) return "📖 20 pages/jour = 18 livres/an. Lance le chrono maintenant.";
  if (day.work.focus < 3 && day.work.focus > 0) return "🎯 Bloque 90min sans téléphone demain matin — deep work pur.";
  return "🔥 Continue comme ça. La constance fait tout.";
}

const Gold = "#D4AF37";
const Bg = "#0a0a0a";

const Rating = ({ value, max = 5, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} onClick={() => onChange(i + 1)}
        style={{ fontSize: 24, cursor: "pointer", color: i < value ? Gold : "#2a2a2a", transition: "color 0.15s" }}>★</span>
    ))}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div onClick={() => onChange(!value)} style={{
    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
    background: value ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${value ? Gold : "#1e1e1e"}`,
    borderRadius: 12, padding: "10px 14px", transition: "all 0.2s", userSelect: "none"
  }}>
    <div style={{ width: 38, height: 22, borderRadius: 11, background: value ? Gold : "#222", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
    <span style={{ fontSize: 13, color: value ? Gold : "#666" }}>{label}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
    {children}
  </div>
);

const inp = {
  background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e1e",
  borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14,
  outline: "none", width: "100%", boxSizing: "border-box"
};

const Card = ({ children, gold, style = {} }) => (
  <div style={{
    background: gold ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
    border: `1px solid ${gold ? "rgba(212,175,55,0.2)" : "#161616"}`,
    borderRadius: 18, padding: 18, ...style
  }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <p style={{ fontSize: 10, color: Gold, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14, marginTop: 0 }}>{children}</p>
);

export default function App() {
  const [tab, setTab] = useState("today");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kojihlife_v1");
      if (raw) {
        const data = JSON.parse(raw);
        setHistory(data || []);
        const todayDate = new Date().toISOString().split("T")[0];
        const entry = (data || []).find(d => d.date === todayDate);
        if (entry) setToday(entry);
      }
    } catch (e) {}
  }, []);

  const update = (section, field, val) => {
    setToday(prev => {
      const updated = { ...prev, [section]: { ...prev[section], [field]: val } };
      if (section === "sleep") updated.sleep.duration = calcDuration(updated.sleep.bedtime, updated.sleep.wakeup);
      updated.score = calcScore(updated);
      return updated;
    });
    setSaved(false);
  };

  const saveDay = () => {
    const updated = { ...today, score: calcScore(today) };
    const newHistory = [...history.filter(d => d.date !== today.date), updated].sort((a, b) => a.date.localeCompare(b.date));
