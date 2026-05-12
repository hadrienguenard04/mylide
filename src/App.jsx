import { useState, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid, BarChart, Bar } from "recharts";

// ── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#f5f5f5",
  surface: "#ffffff",
  surfaceAlt: "#f0f0f0",
  border: "#e5e5e5",
  red: "#CC2936",
  redLight: "rgba(204,41,54,0.08)",
  redBorder: "rgba(204,41,54,0.25)",
  black: "#111111",
  text: "#1a1a1a",
  muted: "#888888",
  subtle: "#cccccc",
  green: "#16a34a",
  orange: "#ea580c",
  purple: "#7c3aed",
  blue: "#2563eb",
};

const TABS = [
  { id: "today", label: "Today", icon: "⚡" },
  { id: "sleep", label: "Sommeil", icon: "🌙" },
  { id: "sport", label: "Sport", icon: "💪" },
  { id: "nutrition", label: "Nutrition", icon: "🥗" },
  { id: "body", label: "Corps", icon: "⚖️" },
  { id: "work", label: "Travail", icon: "🎯" },
  { id: "todo", label: "To-Do", icon: "✅" },
  { id: "money", label: "Argent", icon: "💰" },
  { id: "goals", label: "Objectifs", icon: "🏆" },
  { id: "mind", label: "Mental", icon: "🧠" },
  { id: "stats", label: "Stats", icon: "📊" },
];

const defaultDay = () => ({
  date: new Date().toISOString().split("T")[0],
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0, noScreen: false },
  sport: {
    type: "", duration: 0, intensity: 0, notes: "",
    isRest: false, stretching: false,
    running: { did: false, distance: 0, time: 0 },
    recovery: 0,
    bodyFat: 0, muscleMass: 0, photoUrl: ""
  },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, junk: false },
  body: { weight: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "", screenTime: 0 },
  money: { income: 0, expense: 0, invested: 0, note: "", patrimoine: 0 },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

const defaultGoals = () => ([
  { id: 1, label: "100k€ net/an à 30 ans", category: "Argent", progress: 0 },
  { id: 2, label: "BPJEPS validé", category: "Travail", progress: 0 },
  { id: 3, label: "Launch Angers Sept. 2026", category: "Business", progress: 0 },
  { id: 4, label: "1M€ patrimoine net", category: "Argent", progress: 0 },
]);

// ── SCORE (CALIBRÉ SCIENCE) ────────────────────────────────────────────────
function calcScore(day) {
  let s = 0;
  // Sommeil (25pts)
  const sl = day.sleep;
  if (sl.duration >= 7.5 && sl.duration <= 9) s += 25;
  else if (sl.duration >= 7) s += 18;
  else if (sl.duration >= 6) s += 10;
  if (sl.quality >= 4) s += 5;
  if (sl.noScreen) s += 3;
  // Sport (20pts)
  const sp = day.sport;
  if (sp.isRest) { s += 10; if (sp.stretching) s += 5; }
  else {
    if (sp.duration >= 45) s += 15;
    else if (sp.duration >= 30) s += 10;
    if (sp.intensity >= 3) s += 5;
    if (sp.running?.did) s += 5;
  }
  // Nutrition (20pts)
  const n = day.nutrition;
  if (n.breakfast) s += 4; if (n.lunch) s += 4; if (n.dinner) s += 4;
  if (n.water >= 2.5) s += 5; else if (n.water >= 2) s += 3;
  if (n.protein >= 150) s += 5; else if (n.protein >= 120) s += 3;
  if (!n.junk) s += 3;
  // Travail (15pts)
  if (day.work.focus >= 4) s += 10; else if (day.work.focus >= 3) s += 6;
  if (day.work.tasks > 0 && day.work.tasksCompleted >= day.work.tasks) s += 5;
  if (day.work.screenTime > 0 && day.work.screenTime <= 3) s += 3;
  else if (day.work.screenTime > 5) s -= 5;
  // Mental (15pts)
  const m = day.mind;
  if (m.mood >= 4) s += 5; if (m.reading >= 20) s += 5;
  if (m.meditation) s += 5;
  return Math.max(0, Math.min(100, s));
}

function calcDuration(bed, wake) {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let diff = (wh * 60 + wm) - (bh * 60 + bm);
  if (diff < 0) diff += 24 * 60;
  return Math.round(diff / 6) / 10;
}

// ── MOTEUR INTELLIGENT ─────────────────────────────────────────────────────
function getIntelligence(today, history) {
  const last7 = history.slice(-7);
  const last3 = history.slice(-3);

  const sportDays = last7.filter(d => d.sport?.duration > 0 && !d.sport?.isRest).length;
  const restDays = last7.filter(d => d.sport?.isRest).length;
  const avgRecovery = last3.length ? last3.reduce((a, b) => a + (b.sport?.recovery || 3), 0) / last3.length : 3;
  const avgSleep = last7.filter(d => d.sleep?.duration > 0).reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0);
  const avgMood = last7.filter(d => d.mind?.mood > 0).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
  const avgScreen = last7.filter(d => d.work?.screenTime > 0).reduce((a, b, _, arr) => a + b.work.screenTime / arr.length, 0);
  const consecutiveSport = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].sport?.duration > 0 && !history[i].sport?.isRest) c++; else break; } return c; })();
  const lastSportType = last7.filter(d => d.sport?.type).slice(-1)[0]?.sport?.type || "";

  const alerts = [];
  const advice = [];
  let todayRec = "";

  // Récupération
  if (consecutiveSport >= 3) {
    alerts.push({ type: "warning", msg: `💤 ${consecutiveSport} jours de sport consécutifs — ton corps réclame du repos. Récupération active aujourd'hui.` });
    todayRec = "rest";
  } else if (avgRecovery < 2.5) {
    alerts.push({ type: "warning", msg: "⚠️ Récupération musculaire faible ces derniers jours. Réduis l'intensité ou prends un jour off." });
  }

  // Sommeil → Focus → Performance
  if (avgSleep < 6.5) {
    alerts.push({ type: "danger", msg: "🚨 Moins de 6h30 en moyenne. Tes performances sportives et cognitives chutent de -20%. Priorité : sommeil." });
  } else if (avgSleep < 7) {
    alerts.push({ type: "warning", msg: "🌙 Sommeil insuffisant cette semaine. Couche-toi 30min plus tôt ce soir." });
  }

  // Écran → Sommeil
  if (avgScreen > 5) {
    alerts.push({ type: "warning", msg: `📱 ${Math.round(avgScreen)}h d'écran/jour en moyenne. Impact direct sur qualité du sommeil et focus. Objectif : max 3h.` });
  }

  // Recommandation sport du jour
  if (!todayRec) {
    if (lastSportType.includes("Push") || lastSportType.includes("Pull") || lastSportType.includes("Legs")) {
      const ppl = ["Push", "Pull", "Legs"];
      const lastIdx = ppl.findIndex(x => lastSportType.includes(x));
      const nextPpl = ppl[(lastIdx + 1) % 3];
      advice.push(`💪 Dernière séance : ${lastSportType} → Aujourd'hui : PPL ${nextPpl} recommandé`);
      todayRec = `PPL ${nextPpl}`;
    }
    if (sportDays >= 2 && restDays === 0) {
      advice.push("🏃 Bonne semaine de sport ! Pense à intégrer une sortie running légère pour varier les stimuli.");
    }
  }

  // Hydratation
  const avgWater = last3.filter(d => d.nutrition?.water > 0).reduce((a, b, _, arr) => a + b.nutrition.water / arr.length, 0);
  if (avgWater < 2) advice.push("💧 Hydratation insuffisante ces 3 derniers jours. Commence ta journée avec 500ml d'eau.");

  // Mood
  if (avgMood < 3 && avgMood > 0) advice.push("😔 Moral en baisse cette semaine. 5min de cohérence cardiaque + 10min de marche dehors.");

  const scoreAvg = last7.filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0);

  return { alerts, advice, todayRec, consecutiveSport, avgSleep, avgScreen, scoreAvg: Math.round(scoreAvg) };
}

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
const inp = {
  background: C.surfaceAlt, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14,
  outline: "none", width: "100%", boxSizing: "border-box"
};

const selInp = { ...inp, color: C.text, background: C.surfaceAlt };

const EvoChart = ({ data, dataKey, color, label, unit, height = 150 }) => {
  if (data.length < 2) return (
    <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>📈 Graphique disponible après 2+ jours de données</p>
    </div>
  );
  const getVal = (d) => { const keys = dataKey.split("."); return keys.reduce((o, k) => o?.[k], d) ?? 0; };
  const first = getVal(data[0]);
  const last = getVal(data[data.length - 1]);
  const trend = last - first;
  return (
    <div style={{ background: C.surface, border: `2px solid ${color}33`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>{label}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? "rgba(22,163,74,0.1)" : "rgba(204,41,54,0.1)", borderRadius: 6, padding: "2px 6px" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(Math.round(trend * 10) / 10)}{unit}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`g${dataKey.replace(".", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 8 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={30} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${color}`, borderRadius: 10, fontSize: 11, color: C.text }} formatter={v => [`${v}${unit}`, label]} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g${dataKey.replace(".", "")})`} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Rating = ({ value, max = 5, onChange, color = C.red }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} onClick={() => onChange(i + 1)} style={{ fontSize: 26, cursor: "pointer", color: i < value ? color : C.subtle, transition: "color 0.15s" }}>★</span>
    ))}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: value ? C.redLight : C.surfaceAlt, border: `1px solid ${value ? C.red : C.border}`, borderRadius: 12, padding: "10px 14px", transition: "all 0.2s", userSelect: "none" }}>
    <div style={{ width: 38, height: 22, borderRadius: 11, background: value ? C.red : C.subtle, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
    <span style={{ fontSize: 13, color: value ? C.red : C.muted, fontWeight: value ? 600 : 400 }}>{label}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
    {children}
  </div>
);

const Card = ({ children, accent, style = {} }) => (
  <div style={{ background: accent ? C.redLight : C.surface, border: `1px solid ${accent ? C.redBorder : C.border}`, borderRadius: 18, padding: 18, marginBottom: 14, ...style }}>{children}</div>
);

const ST = ({ children }) => (
  <p style={{ fontSize: 10, color: C.red, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, marginTop: 0, fontWeight: 700 }}>{children}</p>
);

const AlertBox = ({ type, msg }) => (
  <div style={{ background: type === "danger" ? "rgba(204,41,54,0.08)" : "rgba(234,88,12,0.08)", border: `1px solid ${type === "danger" ? C.red : C.orange}`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: type === "danger" ? C.red : C.orange, lineHeight: 1.5 }}>{msg}</div>
);

const AdviceBox = ({ msg }) => (
  <div style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: C.green, lineHeight: 1.5 }}>{msg}</div>
);

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [goals, setGoals] = useState(defaultGoals());
  const [newGoal, setNewGoal] = useState({ label: "", category: "" });
  const [statRange, setStatRange] = useState("30");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kojihlife_v3");
      if (raw) {
        const data = JSON.parse(raw);
        setHistory(data.history || []);
        setTodos(data.todos || []);
        setGoals(data.goals || defaultGoals());
        const todayDate = new Date().toISOString().split("T")[0];
        const entry = (data.history || []).find(d => d.date === todayDate);
        if (entry) setToday(entry);
      }
    } catch (e) {}
  }, []);

  const save = (h, t, g) => localStorage.setItem("kojihlife_v3", JSON.stringify({ history: h, todos: t, goals: g }));

  const update = (section, field, val) => {
    setToday(prev => {
      const updated = { ...prev, [section]: { ...prev[section], [field]: val } };
      if (section === "sleep") updated.sleep.duration = calcDuration(updated.sleep.bedtime, updated.sleep.wakeup);
      updated.score = calcScore(updated);
      return updated;
    });
    setSaved(false);
  };

  const updateNested = (section, sub, field, val) => {
    setToday(prev => {
      const updated = { ...prev, [section]: { ...prev[section], [sub]: { ...prev[section][sub], [field]: val } } };
      updated.score = calcScore(updated);
      return updated;
    });
    setSaved(false);
  };

  const saveDay = () => {
    const updated = { ...today, score: calcScore(today) };
    const newHistory = [...history.filter(d => d.date !== today.date), updated].sort((a, b) => a.date.localeCompare(b.date));
    setHistory(newHistory);
    save(newHistory, todos, goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const t = [...todos, { id: Date.now(), text: newTodo, done: false, date: new Date().toISOString().split("T")[0] }];
    setTodos(t); save(history, t, goals); setNewTodo("");
  };
  const toggleTodo = id => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); save(history, t, goals); };
  const deleteTodo = id => { const t = todos.filter(t => t.id !== id); setTodos(t); save(history, t, goals); };
  const updateGoal = (id, f, v) => { const g = goals.map(g => g.id === id ? { ...g, [f]: v } : g); setGoals(g); save(history, todos, g); };
  const addGoal = () => { if (!newGoal.label.trim()) return; const g = [...goals, { ...newGoal, id: Date.now(), progress: 0 }]; setGoals(g); save(history, todos, g); setNewGoal({ label: "", category: "" }); };
  const deleteGoal = id => { const g = goals.filter(g => g.id !== id); setGoals(g); save(history, todos, g); };

  const intel = getIntelligence(today, history);
  const last7 = history.slice(-7);
  const rangeH = history.slice(-parseInt(statRange));
  const scoreColor = today.score >= 80 ? C.green : today.score >= 60 ? C.orange : C.red;

  const sleepH = history.filter(d => d.sleep?.duration > 0);
  const sportH = history.filter(d => d.sport?.duration > 0 && !d.sport?.isRest);
  const weightH = history.filter(d => d.body?.weight > 0);
  const patriH = history.filter(d => d.money?.patrimoine > 0);
  const moodH = history.filter(d => d.mind?.mood > 0);
  const screenH = history.filter(d => d.work?.screenTime > 0);
  const waterH = history.filter(d => d.nutrition?.water > 0);

  const pace = today.sport.running?.time > 0 && today.sport.running?.distance > 0
    ? (today.sport.running.time / today.sport.running.distance).toFixed(1) : null;

  const radar = [
    { s: "Sommeil", v: Math.min(100, (today.sleep.duration / 9) * 100) },
    { s: "Sport", v: today.sport.isRest ? 60 : Math.min(100, today.sport.duration * 2) },
    { s: "Nutrition", v: (today.nutrition.breakfast ? 20 : 0) + (today.nutrition.lunch ? 20 : 0) + (today.nutrition.dinner ? 20 : 0) + Math.min(40, today.nutrition.water * 16) },
    { s: "Travail", v: today.work.focus * 20 },
    { s: "Mental", v: today.mind.mood * 20 },
    { s: "Corps", v: today.body?.weight > 0 ? 80 : 20 },
  ];

  const streak = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].score > 0) c++; else break; } return c; })();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>

      {/* HEADER */}
      <div style={{ padding: "24px 20px 14px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, background: C.surface, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 10, color: C.red, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px", fontWeight: 700 }}>Kojihsports</p>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.black }}>Life Tracker</h1>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{today.score}</div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>/ 100</div>
            {streak > 0 && <div style={{ fontSize: 10, color: C.orange, marginTop: 2 }}>🔥 {streak}j streak</div>}
          </div>
        </div>
        {intel.alerts.slice(0, 1).map((a, i) => (
          <div key={i} style={{ marginTop: 10, background: a.type === "danger" ? "rgba(204,41,54,0.08)" : "rgba(234,88,12,0.06)", border: `1px solid ${a.type === "danger" ? C.red : C.orange}`, borderRadius: 10, padding: "9px 13px", fontSize: 12, color: a.type === "danger" ? C.red : C.orange, lineHeight: 1.5 }}>{a.msg}</div>
        ))}
        {intel.alerts.length === 0 && intel.todayRec && (
          <div style={{ marginTop: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: C.green, lineHeight: 1.5 }}>
            🎯 Recommandation : <strong>{intel.todayRec}</strong>
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s", background: tab === t.id ? C.red : C.surfaceAlt, color: tab === t.id ? "#fff" : C.muted }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* TODAY */}
        {tab === "today" && (
          <div>
            <Card>
              <ST>Équilibre du jour</ST>
              <ResponsiveContainer width="100%" height={210}>
                <RadarChart data={radar}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="s" tick={{ fill: C.muted, fontSize: 11 }} />
                  <Radar dataKey="v" stroke={C.red} fill={C.red} fillOpacity={0.1} strokeWidth={2.5} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Sommeil", value: today.sleep.duration ? `${today.sleep.duration}h` : "—", icon: "🌙", color: C.purple },
                { label: "Sport", value: today.sport.isRest ? "Repos" : today.sport.duration ? `${today.sport.duration}m` : "—", icon: "💪", color: C.red },
                { label: "Eau", value: today.nutrition.water ? `${today.nutrition.water}L` : "—", icon: "💧", color: C.blue },
                { label: "Poids", value: today.body?.weight ? `${today.body.weight}kg` : "—", icon: "⚖️", color: C.orange },
                { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "—", icon: "🎯", color: C.red },
                { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "—", icon: "😊", color: C.green },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center", padding: 12, marginBottom: 0, borderTop: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: 18 }}>{item.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginTop: 3 }}>{item.value}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>

            {intel.alerts.length > 1 && (
              <Card>
                <ST>Alertes & Insights</ST>
                {intel.alerts.map((a, i) => <AlertBox key={i} type={a.type} msg={a.msg} />)}
                {intel.advice.map((a, i) => <AdviceBox key={i} msg={a} />)}
              </Card>
            )}

            <EvoChart data={history.slice(-30)} dataKey="score" color={C.red} label="Score global (30j)" unit="" />

            <Card>
              <ST>To-Do du jour</ST>
              {todos.filter(t => t.date === today.date).slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 16, cursor: "pointer" }}>{t.done ? "✅" : "⬜"}</span>
                  <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                </div>
              ))}
              {todos.filter(t => t.date === today.date).length === 0 && <p style={{ fontSize: 12, color: C.muted }}>Aucune tâche → onglet To-Do</p>}
            </Card>
          </div>
        )}

        {/* SOMMEIL */}
        {tab === "sleep" && (
          <div>
            <EvoChart data={sleepH.slice(-30)} dataKey="sleep.duration" color={C.purple} label="Durée de sommeil" unit="h" />
            <Card>
              <ST>Horaires</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label="Coucher"><input type="time" value={today.sleep.bedtime} onChange={e => update("sleep", "bedtime", e.target.value)} style={inp} /></Field>
                <Field label="Réveil"><input type="time" value={today.sleep.wakeup} onChange={e => update("sleep", "wakeup", e.target.value)} style={inp} /></Field>
              </div>
              {today.sleep.duration > 0 && (
                <div style={{ textAlign: "center", padding: 14, background: C.surfaceAlt, borderRadius: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: today.sleep.duration >= 7.5 ? C.green : today.sleep.duration >= 6.5 ? C.orange : C.red }}>{today.sleep.duration}h</span>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>
                    {today.sleep.duration >= 7.5 ? "Optimal ✅" : today.sleep.duration >= 6.5 ? "Correct, vise 7h30+" : "Insuffisant ⚠️"}
                  </p>
                </div>
              )}
              <ST>Qualité du sommeil</ST>
              <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
              <div style={{ height: 16 }} />
              <ST>Routine soir</ST>
              <Toggle value={today.sleep.noScreen} onChange={v => update("sleep", "noScreen", v)} label="Pas d'écran 30min avant de dormir 📵" />
            </Card>
            {intel.avgScreen > 4 && (
              <AlertBox type="warning" msg={`📱 Temps d'écran élevé (${Math.round(intel.avgScreen)}h/j) → perturbation mélatonine → sommeil dégradé. Coupe les écrans 1h avant de dormir.`} />
            )}
            <Card accent>
              <ST>Science du sommeil</ST>
              {["7h30–9h = zone optimale de récupération", "Pas d'écran 30–60min avant = +40% mélatonine", "Chambre à 18°C = sommeil profond optimisé", "Réveil à heure fixe = régulation circadienne", "Sommeil < 6h = -20% force musculaire le lendemain"].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* SPORT */}
        {tab === "sport" && (
          <div>
            {intel.todayRec === "rest" ? (
              <AlertBox type="warning" msg={`💤 ${intel.consecutiveSport} jours consécutifs de sport détectés. Ton corps a besoin de récupérer. Repos actif recommandé aujourd'hui.`} />
            ) : intel.todayRec ? (
              <AdviceBox msg={`🎯 Recommandation du jour : ${intel.todayRec}`} />
            ) : null}

            <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color={C.red} label="Durée des séances" unit="min" />

            <Card>
              <ST>Type de séance</ST>
              <Toggle value={today.sport.isRest} onChange={v => update("sport", "isRest", v)} label="Jour de repos 🛌" />
              {today.sport.isRest ? (
                <div style={{ marginTop: 12 }}>
                  <Toggle value={today.sport.stretching} onChange={v => update("sport", "stretching", v)} label="Étirements / Mobilité ✅" />
                  <div style={{ marginTop: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 10, padding: 12, fontSize: 12, color: C.green }}>
                    💡 Le repos est un entraînement. C'est pendant la récupération que le muscle se construit. +10pts au score.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <Field label="Type">
                    <select value={today.sport.type} onChange={e => update("sport", "type", e.target.value)} style={selInp}>
                      <option value="" style={{ color: C.text }}>Choisir...</option>
                      <option style={{ color: C.text }}>PPL Push</option>
                      <option style={{ color: C.text }}>PPL Pull</option>
                      <option style={{ color: C.text }}>PPL Legs</option>
                      <option style={{ color: C.text }}>Running</option>
                      <option style={{ color: C.text }}>Football</option>
                      <option style={{ color: C.text }}>Cardio</option>
                      <option style={{ color: C.text }}>Full Body</option>
                      <option style={{ color: C.text }}>Autre</option>
                    </select>
                  </Field>
                  <div style={{ height: 12 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Field label="Durée (min)"><input type="number" value={today.sport.duration} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                    <div>
                      <Field label="Intensité"><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></Field>
                    </div>
                  </div>
                  <Field label="Notes / PR"><input type="text" placeholder="Ex: Bench 90kg ×5 🔥" value={today.sport.notes} onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                </div>
              )}
            </Card>

            <Card>
              <ST>Récupération musculaire</ST>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Comment sont tes muscles aujourd'hui ?</p>
              <Rating value={today.sport.recovery} onChange={v => update("sport", "recovery", v)} color={today.sport.recovery <= 2 ? C.red : today.sport.recovery <= 3 ? C.orange : C.green} />
              <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                {["", "Très douloureux 🔴 → Repos obligatoire", "Courbatures 🟠 → Séance légère max", "Correct 🟡 → Intensité modérée", "Bien 🟢 → Séance normale", "Parfait 💪 → Séance intensive possible"][today.sport.recovery] || ""}
              </p>
              {today.sport.recovery > 0 && today.sport.recovery <= 2 && !today.sport.isRest && (
                <AlertBox type="warning" msg="⚠️ Récupération insuffisante. Risque de blessure si tu t'entraînes intensément. Préfère du repos ou une mobilité douce." />
              )}
            </Card>

            <Card>
              <ST>Running 🏃</ST>
              <Toggle value={today.sport.running?.did} onChange={v => updateNested("sport", "running", "did", v)} label="Sortie running aujourd'hui" />
              {today.sport.running?.did && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Field label="Distance (km)"><input type="number" value={today.sport.running.distance} min={0} step={0.1} onChange={e => updateNested("sport", "running", "distance", +e.target.value)} style={inp} /></Field>
                    <Field label="Temps (min)"><input type="number" value={today.sport.running.time} min={0} onChange={e => updateNested("sport", "running", "time", +e.target.value)} style={inp} /></Field>
                  </div>
                  {pace && (
                    <div style={{ textAlign: "center", background: C.surfaceAlt, borderRadius: 12, padding: 12 }}>
                      <span style={{ fontSize: 24, fontWeight: 900, color: C.red }}>{pace} min/km</span>
                      <p style={{ fontSize: 10, color: C.muted, margin: "4px 0 0" }}>Allure moyenne</p>
                    </div>
                  )}
                </div>
              )}
              <EvoChart data={history.filter(d => d.sport?.running?.did && d.sport?.running?.distance > 0).slice(-20)} dataKey="sport.running.distance" color={C.blue} label="Distance running" unit="km" height={120} />
            </Card>

            <Card>
              <ST>Composition corporelle</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Masse graisseuse (%)"><input type="number" value={today.sport.bodyFat || ""} step={0.1} min={0} max={50} onChange={e => update("sport", "bodyFat", +e.target.value)} style={inp} /></Field>
                <Field label="Masse musculaire (kg)"><input type="number" value={today.sport.muscleMass || ""} step={0.1} min={0} onChange={e => update("sport", "muscleMass", +e.target.value)} style={inp} /></Field>
              </div>
              <EvoChart data={history.filter(d => d.sport?.bodyFat > 0).slice(-30)} dataKey="sport.bodyFat" color={C.orange} label="Masse graisseuse" unit="%" height={120} />
              <EvoChart data={history.filter(d => d.sport?.muscleMass > 0).slice(-30)} dataKey="sport.muscleMass" color={C.green} label="Masse musculaire" unit="kg" height={120} />
            </Card>

            <Card>
              <ST>Photo de progression 📸</ST>
              <Field label="URL de la photo">
                <input type="text" placeholder="https://..." value={today.sport.photoUrl || ""} onChange={e => update("sport", "photoUrl", e.target.value)} style={inp} />
              </Field>
              {today.sport.photoUrl && (
                <img src={today.sport.photoUrl} alt="progression" style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 200 }} onError={e => e.target.style.display = "none"} />
              )}
            </Card>

            <Card accent>
              <ST>Science récupération</ST>
              {[
                "3–4 séances/sem max pour hypertrophie optimale",
                "48h de repos entre 2 séances du même groupe musculaire",
                "Le sommeil est la récupération #1 (GH sécrétée la nuit)",
                "Protéines dans les 2h post-séance = synthèse protéique max",
                "Repos actif (marche, étirements) > sédentarité totale"
              ].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* NUTRITION */}
        {tab === "nutrition" && (
          <div>
            <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color={C.blue} label="Hydratation" unit="L" />
            <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-30)} dataKey="nutrition.protein" color={C.purple} label="Protéines" unit="g" />
            <Card>
              <ST>Repas</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label="Petit-déjeuner ✅" />
                <Toggle value={today.nutrition.lunch} onChange={v => update("nutrition", "lunch", v)} label="Déjeuner ✅" />
                <Toggle value={today.nutrition.dinner} onChange={v => update("nutrition", "dinner", v)} label="Dîner ✅" />
                <Toggle value={today.nutrition.junk} onChange={v => update("nutrition", "junk", v)} label="Junk food / sucre rapide ❌" />
              </div>
              <ST>Quantités</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Eau (L)"><input type="number" value={today.nutrition.water} min={0} max={5} step={0.25} onChange={e => update("nutrition", "water", +e.target.value)} style={inp} /></Field>
                <Field label="Protéines (g)"><input type="number" value={today.nutrition.protein} min={0} max={300} onChange={e => update("nutrition", "protein", +e.target.value)} style={inp} /></Field>
              </div>
              {today.nutrition.protein > 0 && today.nutrition.protein < 120 && (
                <AlertBox type="warning" msg={`⚠️ ${today.nutrition.protein}g de protéines seulement. Objectif : 150g+. Ajoute une source protéinée à ton prochain repas.`} />
              )}
            </Card>
            <Card accent>
              <ST>Cibles scientifiques</ST>
              {["2–3L d'eau/jour minimum", "1,8–2,2g protéines/kg de poids (≈150–170g)", "3 repas structurés sans saut", "Glucides complexes avant effort, protéines après", "Légumes à chaque repas (fibres + micronutriments)"].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* CORPS */}
        {tab === "body" && (
          <div>
            <EvoChart data={weightH.slice(-60)} dataKey="body.weight" color={C.orange} label="Évolution du poids" unit="kg" />
            <Card>
              <ST>Mensurations</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Poids (kg)"><input type="number" value={today.body?.weight || ""} step={0.1} min={0} placeholder="75.5" onChange={e => update("body", "weight", +e.target.value)} style={inp} /></Field>
                <Field label="Poitrine (cm)"><input type="number" value={today.body?.chest || ""} min={0} onChange={e => update("body", "chest", +e.target.value)} style={inp} /></Field>
                <Field label="Taille (cm)"><input type="number" value={today.body?.waist || ""} min={0} onChange={e => update("body", "waist", +e.target.value)} style={inp} /></Field>
                <Field label="Hanches (cm)"><input type="number" value={today.body?.hips || ""} min={0} onChange={e => update("body", "hips", +e.target.value)} style={inp} /></Field>
                <Field label="Bras (cm)"><input type="number" value={today.body?.arms || ""} min={0} onChange={e => update("body", "arms", +e.target.value)} style={inp} /></Field>
                <Field label="Cuisses (cm)"><input type="number" value={today.body?.thighs || ""} min={0} onChange={e => update("body", "thighs", +e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <EvoChart data={history.filter(d => d.body?.arms > 0).slice(-60)} dataKey="body.arms" color={C.red} label="Tour de bras" unit="cm" />
          </div>
        )}

        {/* TRAVAIL */}
        {tab === "work" && (
          <div>
            <EvoChart data={history.filter(d => d.work?.focus > 0).slice(-30)} dataKey="work.focus" color={C.orange} label="Niveau de focus" unit="/5" />
            {intel.avgScreen > 4 && (
              <AlertBox type="warning" msg={`📱 ${Math.round(intel.avgScreen)}h d'écran/jour → -${Math.round((intel.avgScreen - 3) * 8)}% de focus. Objectif : max 3h productives.`} />
            )}
            <Card>
              <ST>Focus & Productivité</ST>
              <Rating value={today.work.focus} onChange={v => update("work", "focus", v)} />
              <div style={{ height: 16 }} />
              <ST>Tâches</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label="Prévues"><input type="number" value={today.work.tasks} min={0} max={20} onChange={e => update("work", "tasks", +e.target.value)} style={inp} /></Field>
                <Field label="Faites"><input type="number" value={today.work.tasksCompleted} min={0} max={20} onChange={e => update("work", "tasksCompleted", +e.target.value)} style={inp} /></Field>
              </div>
              {today.work.tasks > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: C.muted }}>
                    <span>Complétion</span>
                    <span style={{ color: C.red, fontWeight: 700 }}>{Math.round(Math.min(1, today.work.tasksCompleted / today.work.tasks) * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3 }}>
                    <div style={{ height: "100%", borderRadius: 3, background: C.red, width: `${Math.min(100, (today.work.tasksCompleted / today.work.tasks) * 100)}%`, transition: "width 0.4s" }} />
                  </div>
                </div>
              )}
              <Field label="Highlight du jour"><input type="text" placeholder="Ma meilleure action aujourd'hui..." value={today.work.highlight} onChange={e => update("work", "highlight", e.target.value)} style={inp} /></Field>
            </Card>
            <Card>
              <ST>Temps d'écran (lié focus + sommeil)</ST>
              <Field label="Heures d'écran aujourd'hui">
                <input type="number" value={today.work.screenTime} min={0} max={24} step={0.5} onChange={e => update("work", "screenTime", +e.target.value)} style={inp} />
              </Field>
              {today.work.screenTime > 0 && (
                <div style={{ marginTop: 10, padding: 10, background: C.surfaceAlt, borderRadius: 10, fontSize: 12, color: today.work.screenTime <= 3 ? C.green : today.work.screenTime <= 5 ? C.orange : C.red }}>
                  {today.work.screenTime <= 3 ? "✅ Excellent — focus et sommeil préservés" : today.work.screenTime <= 5 ? "⚠️ Limite — impact modéré sur sommeil" : "🚨 Trop élevé — mélatonine perturbée, focus dégradé demain"}
                </div>
              )}
              <EvoChart data={screenH.slice(-30)} dataKey="work.screenTime" color={C.red} label="Temps d'écran (30j)" unit="h" height={120} />
            </Card>
            <Card accent>
              <ST>Méthodes élite</ST>
              {["Deep Work : blocs 90min sans distraction", "MIT : 1 tâche critique d'abord le matin", "Écran < 3h/j hors travail = focus +40%", "Pas de téléphone avant 10h", "Revue soir : qu'aurais-je pu mieux faire ?"].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* TO-DO */}
        {tab === "todo" && (
          <div>
            <Card>
              <ST>Nouvelle tâche</ST>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Ajouter une tâche..." style={{ ...inp, flex: 1 }} />
                <button onClick={addTodo} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer", fontSize: 18 }}>+</button>
              </div>
            </Card>
            {["today", "older"].map(group => {
              const todayDate = new Date().toISOString().split("T")[0];
              const items = todos.filter(t => group === "today" ? t.date === todayDate : t.date !== todayDate);
              if (items.length === 0) return null;
              return (
                <Card key={group}>
                  <ST>{group === "today" ? "Aujourd'hui" : "Anciennes"}</ST>
                  {items.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                      <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                      <span onClick={() => deleteTodo(t.id)} style={{ fontSize: 12, color: C.subtle, cursor: "pointer" }}>✕</span>
                    </div>
                  ))}
                </Card>
              );
            })}
            {todos.length === 0 && <Card><p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Aucune tâche. Ajoutes-en une !</p></Card>}
          </div>
        )}

        {/* ARGENT */}
        {tab === "money" && (
          <div>
            <EvoChart data={patriH} dataKey="money.patrimoine" color={C.green} label="Évolution patrimoine" unit="€" />
            <EvoChart data={history.filter(d => d.money?.income > 0).slice(-30)} dataKey="money.income" color={C.red} label="Revenus" unit="€" />
            <Card>
              <ST>Flux du jour</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Revenus (€)"><input type="number" value={today.money.income} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} /></Field>
                <Field label="Dépenses (€)"><input type="number" value={today.money.expense} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Investi (€)"><input type="number" value={today.money.invested} min={0} onChange={e => update("money", "invested", +e.target.value)} style={inp} /></Field>
                <Field label="Patrimoine (€)"><input type="number" value={today.money.patrimoine} min={0} onChange={e => update("money", "patrimoine", +e.target.value)} style={inp} /></Field>
              </div>
              <Field label="Note / Action"><input type="text" placeholder="Ex: DCA ETF World, vente Verbio..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
            </Card>
            <Card accent>
              <ST>Rappels financiers</ST>
              {["Objectif : 100k€ net/an à 30 ans", "PEA Fortuneo · AV Linxea · Trade Republic", "Investir dès le 1er du mois", "Reviews Google Kojihsports → accumule", "MYGYM 360 Angers → Sept. 2026"].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>🎯 {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* OBJECTIFS */}
        {tab === "goals" && (
          <div>
            <Card>
              <ST>Nouvel objectif</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Ex: 10k€ CA Kojihsports" style={inp} />
                <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Catégorie (Argent, Sport...)" style={inp} />
                <button onClick={addGoal} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Ajouter l'objectif</button>
              </div>
            </Card>
            {goals.map(g => (
              <Card key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.black }}>{g.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: C.red, fontWeight: 600 }}>{g.category}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: g.progress >= 100 ? C.green : C.red }}>{g.progress}%</span>
                    <span onClick={() => deleteGoal(g.id)} style={{ fontSize: 12, color: C.subtle, cursor: "pointer" }}>✕</span>
                  </div>
                </div>
                <div style={{ height: 10, background: C.surfaceAlt, borderRadius: 5, marginBottom: 10 }}>
                  <div style={{ height: "100%", borderRadius: 5, background: g.progress >= 100 ? C.green : C.red, width: `${Math.min(100, g.progress)}%`, transition: "width 0.4s" }} />
                </div>
                <input type="range" min={0} max={100} value={g.progress} onChange={e => updateGoal(g.id, "progress", +e.target.value)} style={{ width: "100%", accentColor: C.red }} />
              </Card>
            ))}
          </div>
        )}

        {/* MENTAL */}
        {tab === "mind" && (
          <div>
            <EvoChart data={moodH.slice(-30)} dataKey="mind.mood" color={C.purple} label="Évolution humeur" unit="/5" />
            <Card>
              <ST>Humeur du jour</ST>
              <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} color={today.mind.mood >= 4 ? C.green : today.mind.mood >= 3 ? C.orange : C.red} />
              <p style={{ fontSize: 12, color: C.muted, marginTop: 6, marginBottom: 16 }}>
                {["", "Difficile 😔", "Moyen 😐", "Correct 🙂", "Bien 😊", "Excellent 🔥"][today.mind.mood] || ""}
              </p>
              {today.mind.mood <= 2 && today.mind.mood > 0 && (
                <AlertBox type="warning" msg="Moral bas détecté. 5min de cohérence cardiaque maintenant + note 3 choses positives dans gratitude." />
              )}
              <ST>Développement</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="Lecture (pages)"><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label="Méditation / Cohérence cardiaque 🧘" />
                <Field label="Compétence travaillée"><input type="text" placeholder="Ex: copywriting, closing, Excel..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                <Field label="Gratitude du jour"><input type="text" placeholder="Une chose positive aujourd'hui..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card accent>
              <ST>Rituel mental élite</ST>
              {["20min lecture/jour = 18 livres/an", "Gratitude = reset du système limbique", "5min cohérence cardiaque = -30% cortisol", "1 compétence active / semaine", "Humeur → directement liée au sommeil + sport"].map(t => (
                <p key={t} style={{ fontSize: 12, color: C.red, margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["7", "7j"], ["30", "30j"], ["90", "3 mois"], ["365", "1 an"]].map(([v, l]) => (
                <button key={v} onClick={() => setStatRange(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: statRange === v ? C.red : C.surfaceAlt, color: statRange === v ? "#fff" : C.muted }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Jours trackés", value: history.length, icon: "📅", color: C.red },
                { label: "Score moyen", value: `${intel.scoreAvg}`, icon: "⭐", color: C.orange },
                { label: "Nuits > 7h30", value: rangeH.filter(d => d.sleep?.duration >= 7.5).length, icon: "🌙", color: C.purple },
                { label: "Séances sport", value: rangeH.filter(d => d.sport?.duration >= 30).length, icon: "💪", color: C.red },
                { label: "Streak actuel", value: `${streak}j`, icon: "🔥", color: C.orange },
                { label: "Objectifs actifs", value: goals.length, icon: "🏆", color: C.green },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center", padding: 14, marginBottom: 0, borderTop: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>
            <EvoChart data={rangeH} dataKey="score" color={C.red} label={`Score global · ${statRange === "365" ? "1 an" : statRange + "j"}`} unit="" height={180} />
            <EvoChart data={sleepH.slice(-parseInt(statRange))} dataKey="sleep.duration" color={C.purple} label="Sommeil" unit="h" />
            <EvoChart data={sportH.slice(-parseInt(statRange))} dataKey="sport.duration" color={C.red} label="Sport" unit="min" />
            <EvoChart data={patriH.slice(-parseInt(statRange))} dataKey="money.patrimoine" color={C.green} label="Patrimoine" unit="€" />
            <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color={C.purple} label="Humeur" unit="/5" />
            <EvoChart data={screenH.slice(-parseInt(statRange))} dataKey="work.screenTime" color={C.orange} label="Temps d'écran" unit="h" />
            <Card accent>
              <ST>Objectifs long terme</ST>
              {goals.map(g => (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>🎯 {g.label}</span>
                    <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>{g.progress}%</span>
                  </div>
                  <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3 }}>
                    <div style={{ height: "100%", borderRadius: 3, background: g.progress >= 100 ? C.green : C.red, width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* SAVE */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "10px 16px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <button onClick={saveDay} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: saved ? C.green : C.red, color: "#fff", fontSize: 15, fontWeight: 800, transition: "all 0.3s" }}>
          {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la journée"}
        </button>
      </div>
    </div>
  );
}
