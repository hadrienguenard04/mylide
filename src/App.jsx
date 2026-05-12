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
    setHistory(newHistory);
    localStorage.setItem("kojihlife_v1", JSON.stringify(newHistory));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const last7 = history.slice(-7);
  const avg7 = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0;
  const scoreColor = today.score >= 80 ? "#4ade80" : today.score >= 60 ? Gold : today.score >= 40 ? "#fb923c" : "#f87171";
  const tip = getTip(today);

  const radar = [
    { s: "Sommeil", v: Math.min(100, today.sleep.duration * 12) },
    { s: "Sport", v: Math.min(100, today.sport.duration * 2) },
    { s: "Nutrition", v: (today.nutrition.breakfast ? 25 : 0) + (today.nutrition.lunch ? 25 : 0) + (today.nutrition.dinner ? 25 : 0) + Math.min(25, today.nutrition.water * 12) },
    { s: "Travail", v: today.work.focus * 20 },
    { s: "Mental", v: today.mind.mood * 20 },
    { s: "Argent", v: today.money.income > 0 ? 80 : 30 },
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
        <div style={{ marginTop: 12, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, padding: "9px 13px", fontSize: 12, color: Gold, lineHeight: 1.5 }}>
          {tip}
        </div>
      </div>

      <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "10px 16px", borderBottom: "1px solid #111", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "6px 13px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, transition: "all 0.2s",
            background: tab === t.id ? Gold : "rgba(255,255,255,0.05)",
            color: tab === t.id ? "#000" : "#777"
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === "today" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Équilibre du jour</SectionTitle>
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
                { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "—", icon: "😊" },
                { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "—", icon: "🎯" },
                { label: "Lecture", value: today.mind.reading ? `${today.mind.reading}p` : "—", icon: "📖" },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 18 }}>{item.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: Gold, marginTop: 3 }}>{item.value}</div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>
            {last7.length > 1 && (
              <Card>
                <SectionTitle>Score 7 derniers jours · moy. {avg7}</SectionTitle>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={last7}>
                    <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#444", fontSize: 9 }} width={24} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" stroke={Gold} strokeWidth={2} dot={{ fill: Gold, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {tab === "sleep" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Horaires</SectionTitle>
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
              <SectionTitle>Qualité</SectionTitle>
              <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
            </Card>
            <Card gold>
              <SectionTitle>Objectifs</SectionTitle>
              {["7h30–9h de sommeil par nuit", "Coucher avant 23h30", "Réveil à heure fixe chaque jour", "Pas d'écran 30min avant de dormir", "Chambre fraîche (18–19°C)"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "sport" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Séance du jour</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Type">
                  <select value={today.sport.type} onChange={e => update("sport", "type", e.target.value)} style={{ ...inp }}>
                    <option value="">Aucun</option>
                    <option>PPL Push</option><option>PPL Pull</option><option>PPL Legs</option>
                    <option>Running</option><option>Football</option><option>Cardio</option><option>Autre</option>
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Durée (min)"><input type="number" value={today.sport.duration} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                  <Field label="Intensité"><div style={{ paddingTop: 8 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                </div>
                <Field label="Notes / PR"><input type="text" placeholder="Ex: Bench 90kg ×5 PR 🔥" value={today.sport.notes} onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <SectionTitle>Programme PPL</SectionTitle>
              {["Push → Poitrine, épaules, triceps", "Pull → Dos, biceps, ischios", "Legs → Quadri, fessiers, mollets", "2× par semaine + running + foot"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "nutrition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Repas</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <Toggle value={today.nutrition.breakfast} onChange={v => update("nutrition", "breakfast", v)} label="Petit-déjeuner ✅" />
                <Toggle value={today.nutrition.lunch} onChange={v => update("nutrition", "lunch", v)} label="Déjeuner ✅" />
                <Toggle value={today.nutrition.dinner} onChange={v => update("nutrition", "dinner", v)} label="Dîner ✅" />
                <Toggle value={today.nutrition.junk} onChange={v => update("nutrition", "junk", v)} label="Junk food / sucre ❌" />
              </div>
              <SectionTitle>Quantités</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Eau (L)"><input type="number" value={today.nutrition.water} min={0} max={5} step={0.25} onChange={e => update("nutrition", "water", +e.target.value)} style={inp} /></Field>
                <Field label="Protéines (g)"><input type="number" value={today.nutrition.protein} min={0} max={300} onChange={e => update("nutrition", "protein", +e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <SectionTitle>Cibles journalières</SectionTitle>
              {["2–3L d'eau minimum", "≥150g protéines (1,8–2g/kg)", "3 repas structurés", "Éviter junk en semaine", "Légumes à chaque repas"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "work" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Focus du jour</SectionTitle>
              <Rating value={today.work.focus} onChange={v => update("work", "focus", v)} />
              <div style={{ height: 14 }} />
              <SectionTitle>Tâches</SectionTitle>
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
              <SectionTitle>Méthodes élite</SectionTitle>
              {["Deep Work : blocs 90min sans distraction", "MIT : 1 tâche critique d'abord le matin", "Pas de téléphone avant 10h", "Revue soir : qu'aurais-je pu mieux faire ?"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "money" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Flux du jour</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Field label="Revenus (€)"><input type="number" value={today.money.income} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} /></Field>
                <Field label="Dépenses (€)"><input type="number" value={today.money.expense} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} /></Field>
              </div>
              <Field label="Investi (€)"><input type="number" value={today.money.invested} min={0} onChange={e => update("money", "invested", +e.target.value)} style={{ ...inp, marginBottom: 12 }} /></Field>
              <Field label="Note / Action"><input type="text" placeholder="Ex: DCA ETF World, vente position..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
            </Card>
            <Card gold>
              <SectionTitle>Rappels financiers</SectionTitle>
              {["Objectif : 100k€ net/an à 30 ans", "PEA Fortuneo · AV Linxea · Trade Republic", "Investir dès le 1er du mois", "Reviews Google Kojihsports → accumule"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>🎯 {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "mind" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle>Humeur</SectionTitle>
              <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} />
              <p style={{ fontSize: 11, color: "#444", marginTop: 4, marginBottom: 16 }}>
                {["", "Difficile 😔", "Moyen 😐", "Correct 🙂", "Bien 😊", "Excellent 🔥"][today.mind.mood] || ""}
              </p>
              <SectionTitle>Développement</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="Lecture (pages)"><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label="Méditation / Cohérence cardiaque" />
                <Field label="Compétence travaillée"><input type="text" placeholder="Ex: copywriting, Excel, closing..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                <Field label="Gratitude du jour"><input type="text" placeholder="Une chose positive aujourd'hui..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
              </div>
            </Card>
            <Card gold>
              <SectionTitle>Rituel mental élite</SectionTitle>
              {["20min lecture/jour = 18 livres/an", "Gratitude = reset du système limbique", "5min cohérence cardiaque = -30% cortisol", "1 compétence active / semaine"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>✓ {t}</p>
              ))}
            </Card>
          </div>
        )}

        {tab === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Jours trackés", value: history.length, icon: "📅" },
                { label: "Score moyen (7j)", value: avg7, icon: "⭐" },
                { label: "Nuits > 7h", value: last7.filter(d => d.sleep?.duration >= 7).length, icon: "🌙" },
                { label: "Séances sport", value: last7.filter(d => d.sport?.duration >= 30).length, icon: "💪" },
              ].map(item => (
                <Card key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22 }}>{item.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: Gold, marginTop: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{item.label}</div>
                </Card>
              ))}
            </div>
            {history.length > 1 && (
              <Card>
                <SectionTitle>Score global (14 derniers jours)</SectionTitle>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={history.slice(-14)}>
                    <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 9 }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#444", fontSize: 9 }} width={24} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" stroke={Gold} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
            <Card gold>
              <SectionTitle>Vision long terme</SectionTitle>
              {["100k€ net/an à 30 ans", "Launch Angers → Sept. 2026", "BPJEPS validé → UC1-2 + UC3", "1M€ patrimoine net (milestone)"].map(t => (
                <p key={t} style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>🎯 {t}</p>
              ))}
            </Card>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "10px 16px", background: Bg, borderTop: "1px solid #141414" }}>
        <button onClick={saveDay} style={{
          width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
          background: saved ? "#4ade80" : Gold, color: "#000", fontSize: 15, fontWeight: 800,
          transition: "all 0.3s"
        }}>
          {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la journée"}
        </button>
      </div>
    </div>
  );
}
