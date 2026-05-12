import { useState, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, AreaChart, Area } from "recharts";

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
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0 },
  sport: { type: "", duration: 0, intensity: 0, notes: "" },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, junk: false },
  body: { weight: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "" },
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
  if (day.sport.duration >= 30) s += 15;
  if (day.sport.intensity >= 3) s += 5;
  const n = day.nutrition;
  if (n.breakfast) s += 3; if (n.lunch) s += 3; if (n.dinner) s += 3;
  if (n.water >= 2) s += 5; if (n.protein >= 120) s += 5;
  if (!n.junk) s += 5;
  if (day.work.focus >= 4) s += 10;
  if (day.work.tasks > 0 && day.work.tasksCompleted >= day.work.tasks) s += 5;
  if (day.mind.mood >= 4) s += 5; if (day.mind.reading >= 20) s += 5;
  if (day.mind.meditation) s += 5; if (day.mind.learning) s += 3;
  return Math.min(100, s);
}

function getTip(day) {
  if (day.sleep.duration < 7 && day.sleep.duration > 0) return "🌙 Couche-toi 30min plus tôt — le sommeil est ton levier #1.";
  if (day.nutrition.water < 2 && day.nutrition.water > 0) return "💧 Bois un verre maintenant. Tu es sûrement déshydraté.";
  if (day.sport.duration < 30 && day.sport.duration > 0) return "💪 Même 20min comptent. Rajoute une courte session demain.";
  if (!day.mind.meditation) return "🧘 5min de cohérence cardiaque = -30% cortisol. Essaie ce soir.";
  if (day.mind.reading < 20 && day.mind.reading > 0) return "📖 20 pages/jour = 18 livres/an. Lance le chrono.";
  if (day.work.focus < 3 && day.work.focus > 0) return "🎯 Bloque 90min sans téléphone demain matin.";
  return "🔥 Continue comme ça. La constance fait tout.";
}

const Gold = "#D4AF37";
const Bg = "#0a0a0a";
const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e1e", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

const EvoChart = ({ data, dataKey, color, label, unit, height = 160 }) => {
  if (data.length < 2) return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #161616", borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: "#333", margin: 0 }}>📈 Le graphique apparaîtra après 2+ jours de données</p>
    </div>
  );
  const first = data[0]?.[dataKey.split(".")[0]]?.[dataKey.split(".")[1]] ?? 0;
  const last = data[data.length - 1]?.[dataKey.split(".")[0]]?.[dataKey.split(".")[1]] ?? 0;
  const trend = last - first;
  const isGood = trend >= 0;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>{label}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: isGood ? "#4ade80" : "#f87171", background: isGood ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", borderRadius: 6, padding: "2px 6px" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(Math.round(trend * 10) / 10)}{unit}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#111" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#333", fontSize: 8 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#333", fontSize: 9 }} width={28} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#111", border: `1px solid ${color}44`, borderRadius: 10, fontSize: 11 }} formatter={v => [`${v}${unit}`, label]} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const Rating = ({ value, max = 5, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} onClick={() => onChange(i + 1)} style={{ fontSize: 24, cursor: "pointer", color: i < value ? Gold : "#2a2a2a", transition: "color 0.15s" }}>★</span>
    ))}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: value ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${value ? Gold : "#1e1e1e"}`, borderRadius: 12, padding: "10px 14px", transition: "all 0.2s", userSelect: "none" }}>
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

const Card = ({ children, gold, style = {} }) => (
  <div style={{ background: gold ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${gold ? "rgba(212,175,55,0.2)" : "#161616"}`, borderRadius: 18, padding: 18, ...style }}>{children}</div>
);

const ST = ({ children }) => (
  <p style={{ fontSize: 10, color: Gold, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14, marginTop: 0 }}>{children}</p>
);

export default function App() {
  const [tab, setTab] = useState("today");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [goals, setGoals] = useState(defaultGoals());
  const [newGoal, setNewGoal] = useState({ label: "", category: "", target: 100 });
  const [statRange, setStatRange] = useState("30");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kojihlife_v2");
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

  const save = (h, t, g) => localStorage.setItem("kojihlife_v2", JSON.stringify({ history: h, todos: t, goals: g }));

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
  const toggleTodo = (id) => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); save(history, t, goals); };
  const deleteTodo = (id) => { const t = todos.filter(t => t.id !== id); setTodos(t); save(history, t, goals); };
  const updateGoal = (id, field, val) => { const g = goals.map(g => g.id === id ? { ...g, [field]: val } : g); setGoals(g); save(history, todos, g); };
  const addGoal = () => {
    if (!newGoal.label.trim()) return;
    const g = [...goals, { ...newGoal, id: Date.now(), progress: 0 }];
    setGoals(g); save(history, todos, g);
    setNewGoal({ label: "", category: "", target: 100 });
  };
  const deleteGoal = (id) => { const g = goals.filter(g => g.id !== id); setGoals(g); save(history, todos, g); };

  const last7 = history.slice(-7);
  const avg7 = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0;
  const scoreColor = today.score >= 80 ? "#4ade80" : today.score >= 60 ? Gold : today.score >= 40 ? "#fb923c" : "#f87171";
  const rangeHistory = history.slice(-parseInt(statRange));
  const sleepH = history.filter(d => d.sleep?.duration > 0);
  const sportH = history.filter(d => d.sport?.duration > 0);
  const weightH = history.filter(d => d.body?.weight > 0);
  const patrimoineH = history.filter(d => d.money?.patrimoine > 0);
  const moodH = history.filter(d => d.mind?.mood > 0);
  const waterH = history.filter(d => d.nutrition?.water > 0);
  const proteinH = history.filter(d => d.nutrition?.protein > 0);
  const focusH = history.filter(d => d.work?.focus > 0);

  const radar = [
    { s: "Sommeil", v: Math.min(100, today.sleep.duration * 12) },
    { s: "Sport", v: Math.min(100, today.sport.duration * 2) },
    { s: "Nutrition", v: (today.nutrition.breakfast ? 25 : 0) + (today.nutrition.lunch ? 25 : 0) + (today.nutrition.dinner ? 25 : 0) + Math.min(25, today.nutrition.water * 12) },
    { s: "Travail", v: today.work.focus * 20 },
    { s: "Mental", v: today.mind.mood * 20 },
    { s: "Corps", v: today.body?.weight > 0 ? 80 : 30 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: Bg, color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 480, margin: "0 auto", paddingBottom: 90 }}>
      <div style={{ padding: "24px 20px 14px", borderBottom: "1px solid #141414", position: "sticky", top: 0, zIndex: 10, background: Bg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 10, color: Gold, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 4px" }}>Kojihsports</p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Life Tracker</h1>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#444" }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{today.score}</div>
            <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: 1 }}>/ 100</div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: Gold, lineHeight: 1.5 }}>{getTip(today)}</div>
      </div>

      <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "10px 16px", borderBottom: "1px solid #111", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "6px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s", background: tab === t.id ? Gold : "rgba(255,255,255,0.05)", color: tab === t.id ? "#000" : "#777" }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {tab === "today" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <ST>Équilibre du jour</ST>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radar}>
                  <PolarGrid stroke="#1a1a1a" />
                  <PolarAngleAxis dataKey="s" tick={{ fill: "#555", fontSize: 11 }} />
                  <Radar dataKey="v" stroke={Gold} fill={Gold} fillOpacity={0.12} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Sommeil", value: today.sleep.duration ? `${today.sleep.duration}h` : "—", icon: "🌙" },
                { label: "Sport", value: today.sport.duration ? `${today.sport.duration}m` : "—", icon: "💪" },
                { label: "Eau", value: today.nutrition.water ? `${today.nutrition.water}L` : "—", icon: "💧" },
                { label: "Poids", value: today.body?.weight ? `${today.body.weight}kg` : "—", icon: "⚖️" },
                { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "—", icon: "🎯" },
                { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "—", icon: "😊" },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 18 }}>{item.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: Gold, marginTop: 3 }}>{item.value}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>
            <EvoChart data={history.slice(-30)} dataKey="score" color={Gold} label="Score global" unit="" />
            <Card>
              <ST>To-Do du jour</ST>
              {todos.filter(t => t.date === today.date).slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 16, cursor: "pointer" }}>{t.done ? "✅" : "⬜"}</span>
                  <span style={{ fontSize: 13, color: t.done ? "#444" : "#ccc", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                </div>
              ))}
              {todos.filter(t => t.date === today.date).length === 0 && <p style={{ fontSize: 12, color: "#444" }}>Aucune tâche → onglet To-Do</p>}
            </Card>
          </div>
        )}

        {tab === "sleep" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={sleepH.slice(-30)} dataKey="sleep.duration" color="#818cf8" label="Durée de sommeil" unit="h" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Horaires</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label="Coucher"><input type="time" value={today.sleep.bedtime} onChange={e => update("sleep", "bedtime", e.target.value)} style={inp} /></Field>
                <Field label="Réveil"><input type="time" value={today.sleep.wakeup} onChange={e => update("sleep", "wakeup", e.target.value)} style={inp} /></Field>
              </div>
              {today.sleep.duration > 0 && (
                <div style={{ textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: today.sleep.duration >= 7 ? "#4ade80" : "#f87171" }}>{today.sleep.duration}h</span>
                  <span style={{ fontSize: 12, color: "#555", marginLeft: 6 }}>de sommeil</span>
                </div>
              )}
              <ST>Qualité</ST>
              <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
            </Card>
            <Card gold>
              <ST>Objectifs</ST>
              {["7h30–9h de sommeil par nuit", "Coucher avant 23h30", "Réveil à heure fixe", "Pas d'écran 30min avant de dormir", "Chambre fraîche (18–19°C)"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "sport" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color="#f97316" label="Durée des séances" unit="min" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Séance du jour</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Type">
                  <select value={today.sport.type} onChange={e => update("sport", "type", e.target.value)} style={inp}>
                    <option value="">Aucun</option>
                    <option>PPL Push</option><option>PPL Pull</option><option>PPL Legs</option>
                    <option>Running</option><option>Football</option><option>Cardio</option><option>Autre</option>
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Durée (min)"><input type="number" value={today.sport.duration} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                  <Field label="Intensité"><div style={{ paddingTop: 8 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                </div>
                <Field label="Notes / PR"><input type="text" placeholder="Ex: Bench 90kg ×5 🔥" value={today.sport.notes} onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <ST>Programme PPL</ST>
              {["Push → Poitrine, épaules, triceps", "Pull → Dos, biceps, ischios", "Legs → Quadri, fessiers, mollets", "2× par semaine + running + foot"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "nutrition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color="#38bdf8" label="Hydratation" unit="L" />
            <EvoChart data={proteinH.slice(-30)} dataKey="nutrition.protein" color="#a78bfa" label="Protéines" unit="g" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Repas</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label="Petit-déjeuner ✅" />
                <Toggle value={today.nutrition.lunch} onChange={v => update("nutrition", "lunch", v)} label="Déjeuner ✅" />
                <Toggle value={today.nutrition.dinner} onChange={v => update("nutrition", "dinner", v)} label="Dîner ✅" />
                <Toggle value={today.nutrition.junk} onChange={v => update("nutrition", "junk", v)} label="Junk food ❌" />
              </div>
              <ST>Quantités</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Eau (L)"><input type="number" value={today.nutrition.water} min={0} max={5} step={0.25} onChange={e => update("nutrition", "water", +e.target.value)} style={inp} /></Field>
                <Field label="Protéines (g)"><input type="number" value={today.nutrition.protein} min={0} max={300} onChange={e => update("nutrition", "protein", +e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <ST>Cibles</ST>
              {["2–3L d'eau minimum", "≥150g protéines", "3 repas structurés", "Légumes à chaque repas"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "body" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={weightH.slice(-60)} dataKey="body.weight" color="#fb923c" label="Évolution du poids" unit="kg" />
            <EvoChart data={weightH.slice(-60)} dataKey="body.arms" color="#4ade80" label="Tour de bras" unit="cm" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Mensurations du jour</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Poids (kg)"><input type="number" value={today.body?.weight || ""} step={0.1} min={0} placeholder="75.5" onChange={e => update("body", "weight", +e.target.value)} style={inp} /></Field>
                <Field label="Poitrine (cm)"><input type="number" value={today.body?.chest || ""} min={0} onChange={e => update("body", "chest", +e.target.value)} style={inp} /></Field>
                <Field label="Taille (cm)"><input type="number" value={today.body?.waist || ""} min={0} onChange={e => update("body", "waist", +e.target.value)} style={inp} /></Field>
                <Field label="Hanches (cm)"><input type="number" value={today.body?.hips || ""} min={0} onChange={e => update("body", "hips", +e.target.value)} style={inp} /></Field>
                <Field label="Bras (cm)"><input type="number" value={today.body?.arms || ""} min={0} onChange={e => update("body", "arms", +e.target.value)} style={inp} /></Field>
                <Field label="Cuisses (cm)"><input type="number" value={today.body?.thighs || ""} min={0} onChange={e => update("body", "thighs", +e.target.value)} style={inp} /></Field>
              </div>
            </Card>
          </div>
        )}

        {tab === "work" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={focusH.slice(-30)} dataKey="work.focus" color="#f59e0b" label="Niveau de focus" unit="/5" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Focus du jour</ST>
              <Rating value={today.work.focus} onChange={v => update("work", "focus", v)} />
              <div style={{ height: 14 }} />
              <ST>Tâches</ST>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label="Prévues"><input type="number" value={today.work.tasks} min={0} max={20} onChange={e => update("work", "tasks", +e.target.value)} style={inp} /></Field>
                <Field label="Faites"><input type="number" value={today.work.tasksCompleted} min={0} max={20} onChange={e => update("work", "tasksCompleted", +e.target.value)} style={inp} /></Field>
              </div>
              {today.work.tasks > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "#666" }}>
                    <span>Complétion</span>
                    <span style={{ color: Gold }}>{Math.round(Math.min(1, today.work.tasksCompleted / today.work.tasks) * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3 }}>
                    <div style={{ height: "100%", borderRadius: 3, background: Gold, width: `${Math.min(100, (today.work.tasksCompleted / today.work.tasks) * 100)}%`, transition: "width 0.4s" }} />
                  </div>
                </div>
              )}
              <Field label="Highlight du jour"><input type="text" placeholder="Ma meilleure action aujourd'hui..." value={today.work.highlight} onChange={e => update("work", "highlight", e.target.value)} style={inp} /></Field>
            </Card>
            <Card gold>
              <ST>Méthodes élite</ST>
              {["Deep Work : blocs 90min sans distraction", "MIT : 1 tâche critique d'abord", "Pas de téléphone avant 10h", "Revue soir : qu'aurais-je pu mieux faire ?"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "todo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <ST>Nouvelle tâche</ST>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Ajouter une tâche..." style={{ ...inp, flex: 1 }} />
                <button onClick={addTodo} style={{ background: Gold, color: "#000", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer", fontSize: 18 }}>+</button>
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
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 0", borderBottom: "1px solid #161616" }}>
                      <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 18, cursor: "pointer", flexShrink: 0 }}>{t.done ? "✅" : "⬜"}</span>
                      <span style={{ fontSize: 13, color: t.done ? "#444" : "#ccc", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                      <span onClick={() => deleteTodo(t.id)} style={{ fontSize: 12, color: "#333", cursor: "pointer" }}>✕</span>
                    </div>
                  ))}
                </Card>
              );
            })}
            {todos.length === 0 && <Card><p style={{ color: "#444", fontSize: 13, textAlign: "center" }}>Aucune tâche. Ajoutes-en une !</p></Card>}
          </div>
        )}

        {tab === "money" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={patrimoineH} dataKey="money.patrimoine" color="#4ade80" label="Évolution patrimoine" unit="€" />
            <EvoChart data={history.filter(d => d.money?.income > 0).slice(-30)} dataKey="money.income" color={Gold} label="Revenus" unit="€" />
            <Card style={{ marginBottom: 14 }}>
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
            <Card gold>
              <ST>Rappels financiers</ST>
              {["Objectif : 100k€ net/an à 30 ans", "PEA Fortuneo · AV Linxea · Trade Republic", "Investir dès le 1er du mois", "Reviews Google Kojihsports → accumule"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>🎯 {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "goals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <ST>Nouvel objectif</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Ex: 10k€ CA Kojihsports" style={inp} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Catégorie" style={inp} />
                  <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: +e.target.value }))} placeholder="Cible" style={inp} />
                </div>
                <button onClick={addGoal} style={{ background: Gold, color: "#000", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Ajouter</button>
              </div>
            </Card>
            {goals.map(g => (
              <Card key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{g.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: Gold }}>{g.category}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: g.progress >= 100 ? "#4ade80" : Gold }}>{g.progress}%</span>
                    <span onClick={() => deleteGoal(g.id)} style={{ fontSize: 12, color: "#333", cursor: "pointer" }}>✕</span>
                  </div>
                </div>
                <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, marginBottom: 10 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: g.progress >= 100 ? "#4ade80" : Gold, width: `${Math.min(100, g.progress)}%`, transition: "width 0.4s" }} />
                </div>
                <input type="range" min={0} max={100} value={g.progress} onChange={e => updateGoal(g.id, "progress", +e.target.value)} style={{ width: "100%", accentColor: Gold }} />
              </Card>
            ))}
          </div>
        )}

        {tab === "mind" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <EvoChart data={moodH.slice(-30)} dataKey="mind.mood" color="#c084fc" label="Évolution humeur" unit="/5" />
            <EvoChart data={history.filter(d => d.mind?.reading > 0).slice(-30)} dataKey="mind.reading" color="#34d399" label="Pages lues" unit=" pages" />
            <Card style={{ marginBottom: 14 }}>
              <ST>Humeur</ST>
              <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} />
              <p style={{ fontSize: 11, color: "#444", marginTop: 4, marginBottom: 16 }}>
                {["", "Difficile 😔", "Moyen 😐", "Correct 🙂", "Bien 😊", "Excellent 🔥"][today.mind.mood] || ""}
              </p>
              <ST>Développement</ST>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="Lecture (pages)"><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label="Méditation / Cohérence cardiaque" />
                <Field label="Compétence travaillée"><input type="text" placeholder="Ex: copywriting, Excel..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                <Field label="Gratitude du jour"><input type="text" placeholder="Une chose positive aujourd'hui..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <ST>Rituel mental élite</ST>
              {["20min lecture/jour = 18 livres/an", "Gratitude = reset du système limbique", "5min cohérence cardiaque = -30% cortisol", "1 compétence active / semaine"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["7", "7j"], ["30", "30j"], ["90", "3 mois"], ["365", "1 an"]].map(([v, l]) => (
                <button key={v} onClick={() => setStatRange(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: statRange === v ? Gold : "rgba(255,255,255,0.05)", color: statRange === v ? "#000" : "#666" }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Jours trackés", value: history.length, icon: "📅" },
                { label: "Score moyen", value: avg7, icon: "⭐" },
                { label: "Nuits > 7h", value: rangeHistory.filter(d => d.sleep?.duration >= 7).length, icon: "🌙" },
                { label: "Séances sport", value: rangeHistory.filter(d => d.sport?.duration >= 30).length, icon: "💪" },
                { label: "Tâches faites", value: todos.filter(t => t.done).length, icon: "✅" },
                { label: "Objectifs actifs", value: goals.length, icon: "🏆" },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: Gold, marginTop: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>
            <EvoChart data={rangeHistory} dataKey="score" color={Gold} label={`Score global · ${statRange === "365" ? "1 an" : statRange + "j"}`} unit="" height={180} />
            <EvoChart data={sleepH.slice(-parseInt(statRange))} dataKey="sleep.duration" color="#818cf8" label="Sommeil" unit="h" />
            <EvoChart data={sportH.slice(-parseInt(statRange))} dataKey="sport.duration" color="#f97316" label="Sport" unit="min" />
            <EvoChart data={patrimoineH.slice(-parseInt(statRange))} dataKey="money.patrimoine" color="#4ade80" label="Patrimoine" unit="€" />
            <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color="#c084fc" label="Humeur" unit="/5" />
            <Card gold>
              <ST>Vision long terme</ST>
              {goals.slice(0, 4).map(g => (
                <div key={g.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>🎯 {g.label}</span>
                    <span style={{ fontSize: 12, color: Gold }}>{g.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: Gold, width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "10px 16px", background: Bg, borderTop: "1px solid #141414" }}>
        <button onClick={saveDay} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: saved ? "#4ade80" : Gold, color: "#000", fontSize: 15, fontWeight: 800, transition: "all 0.3s" }}>
          {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la journée"}
        </button>
      </div>
    </div>
  );
}
