import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const C = {
  bg: "#f0f0f0", surface: "#ffffff", surfaceAlt: "#e8e8e8", border: "#e0e0e0",
  red: "#CC2936", redLight: "rgba(204,41,54,0.08)", redBorder: "rgba(204,41,54,0.25)",
  black: "#111111", text: "#1a1a1a", muted: "#888888", subtle: "#cccccc",
  green: "#16a34a", orange: "#ea580c", purple: "#7c3aed", blue: "#2563eb",
};

const NAV_ORDER = ["today", "track", "money", "goals", "stats", "profile"];
const TRACK_ORDER = ["sleep", "sport", "nutrition", "body", "work", "todo", "mind"];

const DATA_SOURCES = [
  { id: "manual", label: "Manuel", unit: "", path: null },
  { id: "patrimoine", label: "Patrimoine total", unit: "€", path: "patrimoine_total" },
  { id: "poids", label: "Poids", unit: "kg", path: "body.weight" },
  { id: "proteines", label: "Protéines/jour", unit: "g", path: "nutrition.protein", isDaily: true },
  { id: "eau", label: "Eau/jour", unit: "L", path: "nutrition.water", isDaily: true },
  { id: "sport_duree", label: "Durée sport/séance", unit: "min", path: "sport.duration", isDaily: true },
  { id: "running_dist", label: "Distance running", unit: "km", path: "sport.running.distance", isDaily: true },
  { id: "masse_musculaire", label: "Masse musculaire", unit: "kg", path: "sport.muscleMass" },
  { id: "masse_graisseuse", label: "Masse graisseuse", unit: "%", path: "sport.bodyFat" },
  { id: "score", label: "Score global/jour", unit: "", path: "score", isDaily: true },
  { id: "humeur", label: "Humeur/jour", unit: "/5", path: "mind.mood", isDaily: true },
  { id: "lecture", label: "Lecture/jour", unit: "p", path: "mind.reading", isDaily: true },
  { id: "screen", label: "Temps d'écran/jour", unit: "h", path: "work.screenTime", isDaily: true, reverse: true },
  { id: "revenus", label: "Revenus/jour", unit: "€", path: "money.income", isDaily: true },
  { id: "focus", label: "Focus/jour", unit: "/5", path: "work.focus", isDaily: true },
];

const getNestedVal = (obj, path) => path?.split(".").reduce((o, k) => o?.[k] ?? 0, obj) ?? 0;

const calcGoalProgress = (goal, history, patrimoineTotal) => {
  if (!goal.sourceId || goal.sourceId === "manual") return goal.manualProgress || 0;
  const src = DATA_SOURCES.find(s => s.id === goal.sourceId);
  if (!src) return goal.manualProgress || 0;
  const target = Number(goal.target) || 1;
  const start = goal.startDate ? new Date(goal.startDate) : new Date();
  const end = goal.endDate ? new Date(goal.endDate) : new Date();
  if (src.id === "patrimoine") {
    const val = patrimoineTotal;
    return Math.min(100, Math.max(0, Math.round((val / target) * 100)));
  }
  const relevantDays = history.filter(d => { const dd = new Date(d.date); return dd >= start && dd <= end; });
  if (src.isDaily) {
    if (!relevantDays.length) return 0;
    let ok = 0;
    relevantDays.forEach(d => {
      const val = getNestedVal(d, src.path);
      if (goal.reverse) { if (val > 0 && val <= target) ok++; } else { if (val >= target) ok++; }
    });
    return Math.min(100, Math.round((ok / relevantDays.length) * 100));
  } else {
    const lastEntry = [...history].reverse().find(d => getNestedVal(d, src.path) > 0);
    const val = lastEntry ? getNestedVal(lastEntry, src.path) : 0;
    if (goal.reverse) {
      const sv = goal.startValue || val;
      return Math.min(100, Math.max(0, Math.round(((sv - val) / (sv - target)) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round((val / target) * 100)));
  }
};

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date(); const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
};

function calcDuration(bed, wake) {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number);
  let diff = (wh * 60 + wm) - (bh * 60 + bm);
  if (diff < 0) diff += 24 * 60;
  return Math.round(diff / 6) / 10;
}

function calcScore(day) {
  let s = 0;
  const sl = day.sleep;
  if (sl.duration >= 7.5) s += 25; else if (sl.duration >= 7) s += 18; else if (sl.duration >= 6) s += 10;
  if (sl.quality >= 4) s += 5; if (sl.noScreen) s += 3;
  const sp = day.sport;
  if (sp.isRest) { s += 10; if (sp.stretching) s += 5; }
  else { if (sp.duration >= 45) s += 15; else if (sp.duration >= 30) s += 10; if (sp.intensity >= 3) s += 5; if (sp.running?.did) s += 5; }
  const n = day.nutrition;
  if (n.breakfast) s += 4; if (n.lunch) s += 4; if (n.dinner) s += 4;
  if (n.water >= 2.5) s += 5; else if (n.water >= 2) s += 3;
  if (n.protein >= 150) s += 5; else if (n.protein >= 120) s += 3;
  if (!n.junk) s += 3;
  if (day.work.focus >= 4) s += 10; else if (day.work.focus >= 3) s += 6;
  if (day.work.tasks > 0 && day.work.tasksCompleted >= day.work.tasks) s += 5;
  if (day.work.screenTime > 0 && day.work.screenTime <= 3) s += 3; else if (day.work.screenTime > 5) s -= 5;
  const m = day.mind;
  if (m.mood >= 4) s += 5; if (m.reading >= 20) s += 5; if (m.meditation) s += 5;
  return Math.max(0, Math.min(100, s));
}

function getIntelligence(history) {
  const last7 = history.slice(-7); const last3 = history.slice(-3);
  const avgRecovery = last3.length ? last3.reduce((a, b) => a + (b.sport?.recovery || 3), 0) / last3.length : 3;
  const avgSleep = last7.filter(d => d.sleep?.duration > 0).reduce((a, b, _, arr) => a + b.sleep.duration / arr.length, 0);
  const avgScreen = last7.filter(d => d.work?.screenTime > 0).reduce((a, b, _, arr) => a + b.work.screenTime / arr.length, 0);
  const avgMood = last7.filter(d => d.mind?.mood > 0).reduce((a, b, _, arr) => a + b.mind.mood / arr.length, 0);
  const consecutiveSport = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].sport?.duration > 0 && !history[i].sport?.isRest) c++; else break; } return c; })();
  const lastSportType = last7.filter(d => d.sport?.type).slice(-1)[0]?.sport?.type || "";
  const bedtimes = last7.filter(d => d.sleep?.bedtime).map(d => { const [h, m] = d.sleep.bedtime.split(":").map(Number); return h * 60 + m; });
  const bedVariance = bedtimes.length > 2 ? Math.max(...bedtimes) - Math.min(...bedtimes) : 0;
  const alerts = []; const advice = []; let todayRec = "";
  if (consecutiveSport >= 3) { alerts.push({ type: "warning", msg: `💤 ${consecutiveSport} jours consécutifs — repos actif recommandé.` }); todayRec = "rest"; }
  else if (avgRecovery < 2.5) alerts.push({ type: "warning", msg: "⚠️ Récupération faible ces derniers jours." });
  if (avgSleep < 6.5) alerts.push({ type: "danger", msg: "🚨 Moins de 6h30 en moyenne. Performances -20%." });
  else if (avgSleep < 7) alerts.push({ type: "warning", msg: "🌙 Sommeil insuffisant. Couche-toi 30min plus tôt." });
  if (bedVariance > 90) alerts.push({ type: "warning", msg: `⏰ Heure de coucher irrégulière (±${Math.round(bedVariance / 60)}h). Régulation circadienne perturbée.` });
  if (avgScreen > 5) alerts.push({ type: "warning", msg: `📱 ${Math.round(avgScreen)}h d'écran/jour — sommeil dégradé.` });
  if (!todayRec && lastSportType) {
    const ppl = ["Push", "Pull", "Legs"]; const lastIdx = ppl.findIndex(x => lastSportType.includes(x));
    if (lastIdx >= 0) { todayRec = `PPL ${ppl[(lastIdx + 1) % 3]}`; advice.push(`💪 Recommandation : ${todayRec}`); }
  }
  const avgWater = last3.filter(d => d.nutrition?.water > 0).reduce((a, b, _, arr) => a + b.nutrition.water / arr.length, 0);
  if (avgWater < 2 && avgWater > 0) advice.push("💧 Hydratation insuffisante ces 3 derniers jours.");
  if (avgMood < 3 && avgMood > 0) advice.push("😔 Moral en baisse. 5min cohérence cardiaque.");
  const scoreAvg = Math.round(last7.filter(d => d.score > 0).reduce((a, b, _, arr) => a + b.score / arr.length, 0));
  return { alerts, advice, todayRec, consecutiveSport, avgSleep, avgScreen, scoreAvg };
}

const defaultDay = () => ({
  date: new Date().toISOString().split("T")[0],
  sleep: { bedtime: "", wakeup: "", quality: 0, duration: 0, noScreen: false },
  sport: { type: "", duration: 0, intensity: 0, notes: "", isRest: false, stretching: false, running: { did: false, distance: 0, time: 0 }, recovery: 0, bodyFat: 0, muscleMass: 0, photoUrl: "" },
  nutrition: { breakfast: false, lunch: false, dinner: false, water: 0, protein: 0, junk: false },
  body: { weight: 0, chest: 0, waist: 0, hips: 0, arms: 0, thighs: 0 },
  work: { focus: 0, tasks: 0, tasksCompleted: 0, highlight: "", screenTime: 0 },
  money: { income: 0, expense: 0, invested: 0, note: "" },
  mind: { mood: 0, reading: 0, meditation: false, learning: "", gratitude: "" },
  score: 0,
});

const defaultPatrimoine = () => ([
  { id: 1, name: "PEA Fortuneo", amount: 0, color: "#2563eb" },
  { id: 2, name: "AV Linxea", amount: 0, color: "#7c3aed" },
  { id: 3, name: "Trade Republic", amount: 0, color: "#16a34a" },
  { id: 4, name: "Livret A", amount: 0, color: "#ea580c" },
  { id: 5, name: "Corum", amount: 0, color: "#0891b2" },
]);

const defaultGoals = () => ([
  { id: 1, label: "100k€ patrimoine net", category: "Argent", color: "#CC2936", sourceId: "patrimoine", target: 100000, startDate: "2025-01-01", endDate: "2034-01-01", reverse: false, manualProgress: 0 },
  { id: 2, label: "BPJEPS validé", category: "Formation", color: "#16a34a", sourceId: "manual", target: 100, startDate: "2025-01-01", endDate: "2026-12-31", reverse: false, manualProgress: 80 },
  { id: 3, label: "Launch Angers Sept. 2026", category: "Business", color: "#2563eb", sourceId: "manual", target: 100, startDate: "2025-01-01", endDate: "2026-09-01", reverse: false, manualProgress: 40 },
]);

// ── SVG ICONS ──────────────────────────────────────────────────────────────
const Ico = {
  home: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  track: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  money: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  goals: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  stats: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  profile: (col, sz=22) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  sleep: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  sport: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  nutrition: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  body: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  work: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  todo: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  mind: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>,
  water: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  scale: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><path d="M6 12l6-8 6 8"/><path d="M2 20h20"/></svg>,
  focus: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  mood: (col, sz=18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
};

const NAV = [
  { id: "today", label: "Accueil", icon: "home" },
  { id: "track", label: "Tracker", icon: "track" },
  { id: "money", label: "Argent", icon: "money" },
  { id: "goals", label: "Objectifs", icon: "goals" },
  { id: "stats", label: "Stats", icon: "stats" },
  { id: "profile", label: "Profil", icon: "profile" },
];

const TRACK_TABS = [
  { id: "sleep", label: "Sommeil", icon: "sleep" },
  { id: "sport", label: "Sport", icon: "sport" },
  { id: "nutrition", label: "Nutrition", icon: "nutrition" },
  { id: "body", label: "Corps", icon: "body" },
  { id: "work", label: "Travail", icon: "work" },
  { id: "todo", label: "To-Do", icon: "todo" },
  { id: "mind", label: "Mental", icon: "mind" },
];

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

const EvoChart = ({ data, dataKey, color, label, unit, height = 150 }) => {
  if (data.length < 2) return (
    <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: 14, textAlign: "center", marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>📈 Graphique disponible après 2+ jours</p>
    </div>
  );
  const getVal = d => dataKey.split(".").reduce((o, k) => o?.[k], d) ?? 0;
  const last = getVal(data[data.length - 1]); const first = getVal(data[0]); const trend = last - first;
  return (
    <div style={{ background: C.surface, border: `2px solid ${color}33`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>{label}</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color }}>{last}{unit}</span>
          <span style={{ fontSize: 11, color: trend >= 0 ? C.green : C.red, background: trend >= 0 ? "rgba(22,163,74,0.1)" : "rgba(204,41,54,0.1)", borderRadius: 6, padding: "2px 6px" }}>{trend >= 0 ? "↑" : "↓"} {Math.abs(Math.round(trend * 10) / 10)}{unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs><linearGradient id={`g${label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke={C.border} vertical={false}/>
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 8 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={30} domain={["auto","auto"]} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${color}`, borderRadius: 10, fontSize: 11 }} formatter={v => [`${v}${unit}`, label]}/>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g${label.replace(/\s/g,"")})`} dot={false} activeDot={{ r: 4, fill: color }}/>
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

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 14, ...style }}>{children}</div>
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

// ── DOTS MENU ──────────────────────────────────────────────────────────────
const DotsMenu = ({ onRename, onColor, onDelete, color }) => {
  const [open, setOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowColors(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.muted, padding: "4px 8px", borderRadius: 8 }}>···</button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 32, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, minWidth: 170, overflow: "hidden" }}>
          {showColors ? (
            <div style={{ padding: 12 }} onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: 10, color: C.muted, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Couleur</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {["#CC2936","#16a34a","#2563eb","#7c3aed","#ea580c","#0891b2","#be185d","#111111"].map(col => (
                  <div key={col} onClick={() => { onColor(col); setOpen(false); setShowColors(false); }} style={{ width: 28, height: 28, borderRadius: "50%", background: col, cursor: "pointer", border: color === col ? `3px solid ${C.text}` : "3px solid transparent" }} />
                ))}
              </div>
              <input type="color" value={color} onChange={e => onColor(e.target.value)} style={{ width: "100%", height: 32, border: "none", borderRadius: 8, cursor: "pointer" }} />
            </div>
          ) : (
            <>
              <button onClick={() => setShowColors(true)} style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: C.text }}>🎨 Changer couleur</button>
              <button onClick={() => { onRename(); setOpen(false); }} style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: C.text, borderTop: `1px solid ${C.border}` }}>✏️ Renommer</button>
              <button onClick={() => { onDelete(); setOpen(false); }} style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", color: C.red, borderTop: `1px solid ${C.border}` }}>🗑️ Supprimer</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── DRAGGABLE LIST ─────────────────────────────────────────────────────────
const DraggableList = ({ items, onReorder, renderItem }) => {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div>
      {items.map((item, idx) => (
        <div key={item.id}
          draggable
          onDragStart={e => { e.stopPropagation(); setDragging(idx); e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
          onDrop={e => { e.preventDefault(); if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return; } const n = [...items]; const [r] = n.splice(dragging, 1); n.splice(idx, 0, r); onReorder(n); setDragging(null); setDragOver(null); }}
          onDragEnd={() => { setDragging(null); setDragOver(null); }}
          style={{ opacity: dragging === idx ? 0.4 : 1, borderTop: dragOver === idx && dragging !== idx ? `2px solid ${C.red}` : "2px solid transparent", transition: "border 0.1s, opacity 0.15s" }}>
          {renderItem(item, idx)}
        </div>
      ))}
    </div>
  );
};

// ── SWIPEABLE PAGES ────────────────────────────────────────────────────────
const useSwipe = (onSwipeLeft, onSwipeRight) => {
  const startX = useRef(null);
  const startY = useRef(null);
  return {
    onTouchStart: e => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; },
    onTouchEnd: e => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
      if (Math.abs(dx) > 60 && dy < 80) { if (dx < 0) onSwipeLeft(); else onSwipeRight(); }
      startX.current = null;
    },
  };
};

// ── PAGE TRANSITION ────────────────────────────────────────────────────────
const PageTransition = ({ children, pageKey }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { setVis(false); const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, [pageKey]);
  return (
    <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.22s ease, transform 0.22s ease" }}>
      {children}
    </div>
  );
};

// ── BG DECORATION ─────────────────────────────────────────────────────────
const BgDecor = () => (
  <svg style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: "100%", pointerEvents: "none", zIndex: 0, opacity: 0.35 }} viewBox="0 0 480 900" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="120" x2="480" y2="80" stroke="#CC2936" strokeWidth="1"/>
    <line x1="0" y1="280" x2="480" y2="320" stroke="#ffffff" strokeWidth="0.8"/>
    <line x1="0" y1="480" x2="480" y2="440" stroke="#CC2936" strokeWidth="0.6"/>
    <line x1="0" y1="640" x2="480" y2="680" stroke="#ffffff" strokeWidth="1"/>
    <line x1="0" y1="800" x2="480" y2="760" stroke="#CC2936" strokeWidth="0.7"/>
    <line x1="380" y1="0" x2="420" y2="900" stroke="#CC2936" strokeWidth="0.5"/>
    <line x1="60" y1="0" x2="40" y2="900" stroke="#ffffff" strokeWidth="0.6"/>
    <circle cx="440" cy="200" r="60" stroke="#CC2936" strokeWidth="0.5" fill="none"/>
    <circle cx="40" cy="700" r="80" stroke="#ffffff" strokeWidth="0.5" fill="none"/>
    <circle cx="240" cy="450" r="120" stroke="#CC2936" strokeWidth="0.3" fill="none"/>
  </svg>
);

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [nav, setNav] = useState("today");
  const [trackTab, setTrackTab] = useState("sleep");
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(defaultDay());
  const [saved, setSaved] = useState(false);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [goals, setGoals] = useState(defaultGoals());
  const [patrimoine, setPatrimoine] = useState(defaultPatrimoine());
  const [newPoche, setNewPoche] = useState({ name: "", amount: 0, color: C.blue });
  const [statRange, setStatRange] = useState("30");
  const [profile, setProfile] = useState({ name: "Hadrien", dob: "2004-01-01", photo: "" });
  const [sim, setSim] = useState({ amount: 10000, monthly: 200, rate: 10, years: 10 });
  const [newGoal, setNewGoal] = useState({ label: "", category: "", color: C.red, sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  const [renamingGoal, setRenamingGoal] = useState(null);
  const [renamingPoche, setRenamingPoche] = useState(null);
  const photoRef = useRef(); const sportPhotoRef = useRef();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kojihlife_v6");
      if (raw) {
        const data = JSON.parse(raw);
        setHistory(data.history || []); setTodos(data.todos || []);
        setGoals(data.goals || defaultGoals()); setPatrimoine(data.patrimoine || defaultPatrimoine());
        if (data.profile) setProfile(data.profile);
        const entry = (data.history || []).find(d => d.date === new Date().toISOString().split("T")[0]);
        if (entry) setToday(entry);
      }
    } catch (e) {}
  }, []);

  const saveAll = useCallback((h, t, g, p, pr) => {
    localStorage.setItem("kojihlife_v6", JSON.stringify({ history: h, todos: t, goals: g, patrimoine: p, profile: pr }));
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
    setHistory(newHistory); saveAll(newHistory, todos, goals, patrimoine, profile);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const t = [...todos, { id: Date.now(), text: newTodo, done: false, date: new Date().toISOString().split("T")[0] }];
    setTodos(t); saveAll(history, t, goals, patrimoine, profile); setNewTodo("");
  };
  const toggleTodo = id => { const t = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };
  const deleteTodo = id => { const t = todos.filter(t => t.id !== id); setTodos(t); saveAll(history, t, goals, patrimoine, profile); };

  const totalPatrimoine = patrimoine.reduce((a, b) => a + (Number(b.amount) || 0), 0);

  const updateGoalField = (id, f, v) => { const g = goals.map(g => g.id === id ? { ...g, [f]: v } : g); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };
  const addGoal = () => {
    if (!newGoal.label.trim()) return;
    const g = [...goals, { ...newGoal, id: Date.now(), manualProgress: 0 }];
    setGoals(g); saveAll(history, todos, g, patrimoine, profile);
    setNewGoal({ label: "", category: "", color: C.red, sourceId: "manual", target: "", startDate: new Date().toISOString().split("T")[0], endDate: "", reverse: false, manualProgress: 0 });
  };
  const deleteGoal = id => { const g = goals.filter(g => g.id !== id); setGoals(g); saveAll(history, todos, g, patrimoine, profile); };

  const updatePoche = (id, f, v) => { const p = patrimoine.map(p => p.id === id ? { ...p, [f]: v } : p); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };
  const addPoche = () => {
    if (!newPoche.name.trim()) return;
    const p = [...patrimoine, { ...newPoche, id: Date.now(), amount: Number(newPoche.amount) }];
    setPatrimoine(p); saveAll(history, todos, goals, p, profile); setNewPoche({ name: "", amount: 0, color: C.blue });
  };
  const deletePoche = id => { const p = patrimoine.filter(p => p.id !== id); setPatrimoine(p); saveAll(history, todos, goals, p, profile); };

  const updateProfile = (f, v) => { const pr = { ...profile, [f]: v }; setProfile(pr); saveAll(history, todos, goals, patrimoine, pr); };
  const handleProfilePhoto = e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => updateProfile("photo", ev.target.result); r.readAsDataURL(file); };
  const handleSportPhoto = e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => update("sport", "photoUrl", ev.target.result); r.readAsDataURL(file); };

  const intel = getIntelligence(history);
  const age = calcAge(profile.dob);
  const rangeH = history.slice(-parseInt(statRange));
  const scoreColor = today.score >= 80 ? C.green : today.score >= 60 ? C.orange : C.red;
  const streak = (() => { let c = 0; for (let i = history.length - 1; i >= 0; i--) { if (history[i].score > 0) c++; else break; } return c; })();
  const sleepH = history.filter(d => d.sleep?.duration > 0);
  const sportH = history.filter(d => d.sport?.duration > 0 && !d.sport?.isRest);
  const moodH = history.filter(d => d.mind?.mood > 0);
  const screenH = history.filter(d => d.work?.screenTime > 0);
  const waterH = history.filter(d => d.nutrition?.water > 0);
  const pace = today.sport.running?.time > 0 && today.sport.running?.distance > 0 ? (today.sport.running.time / today.sport.running.distance).toFixed(1) : null;
  const computedGoals = goals.map(g => ({ ...g, computedProgress: calcGoalProgress(g, history, totalPatrimoine) }));

  const simResult = useMemo(() => {
    let total = Number(sim.amount) || 0;
    const data = [{ year: 0, value: Math.round(total) }];
    for (let y = 1; y <= sim.years; y++) { total = total * (1 + sim.rate / 100) + sim.monthly * 12; data.push({ year: y, value: Math.round(total) }); }
    return data;
  }, [sim]);

  const radar = [
    { s: "Sommeil", v: Math.min(100, (today.sleep.duration / 9) * 100) },
    { s: "Sport", v: today.sport.isRest ? 60 : Math.min(100, today.sport.duration * 2) },
    { s: "Nutrition", v: (today.nutrition.breakfast ? 20 : 0) + (today.nutrition.lunch ? 20 : 0) + (today.nutrition.dinner ? 20 : 0) + Math.min(40, today.nutrition.water * 16) },
    { s: "Travail", v: today.work.focus * 20 },
    { s: "Mental", v: today.mind.mood * 20 },
    { s: "Corps", v: today.body?.weight > 0 ? 80 : 20 },
  ];

  // Swipe navigation
  const navIdx = NAV_ORDER.indexOf(nav);
  const trackIdx = TRACK_ORDER.indexOf(trackTab);
  const swipeNav = useSwipe(
    () => { if (nav === "track") { const ni = Math.min(trackIdx + 1, TRACK_ORDER.length - 1); setTrackTab(TRACK_ORDER[ni]); } else { const ni = Math.min(navIdx + 1, NAV_ORDER.length - 1); setNav(NAV_ORDER[ni]); } },
    () => { if (nav === "track") { const ni = Math.max(trackIdx - 1, 0); setTrackTab(TRACK_ORDER[ni]); } else { const ni = Math.max(navIdx - 1, 0); setNav(NAV_ORDER[ni]); } }
  );

  const STAT_CARDS = [
    { label: "Sommeil", value: today.sleep.duration ? `${today.sleep.duration}h` : "—", icon: "sleep", color: C.purple },
    { label: "Sport", value: today.sport.isRest ? "Repos" : today.sport.duration ? `${today.sport.duration}m` : "—", icon: "sport", color: C.red },
    { label: "Eau", value: today.nutrition.water ? `${today.nutrition.water}L` : "—", icon: "water", color: C.blue },
    { label: "Poids", value: today.body?.weight ? `${today.body.weight}kg` : "—", icon: "scale", color: C.orange },
    { label: "Focus", value: today.work.focus ? `${today.work.focus}/5` : "—", icon: "focus", color: C.red },
    { label: "Humeur", value: today.mind.mood ? `${today.mind.mood}/5` : "—", icon: "mood", color: C.green },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, maxWidth: 480, margin: "0 auto", paddingBottom: 80, position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{font-family:Inter,sans-serif!important;box-sizing:border-box}input,select{font-family:Inter,sans-serif!important}::-webkit-scrollbar{display:none}`}</style>

      <BgDecor />

      {/* HEADER */}
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setNav("profile")} style={{ cursor: "pointer" }}>
              {profile.photo ? <img src={profile.photo} alt="profil" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.red}` }} />
                : <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>{profile.name?.[0] || "H"}</div>}
            </div>
            <div>
              <p style={{ fontSize: 10, color: C.red, letterSpacing: 2, textTransform: "uppercase", margin: 0, fontWeight: 700 }}>Kojihsports</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Bonjour {profile.name} 👋</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{today.score}</div>
            <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase" }}>score {streak > 0 ? `· 🔥${streak}j` : ""}</div>
          </div>
        </div>
        {intel.alerts.length > 0 && <div style={{ marginTop: 10 }}><AlertBox type={intel.alerts[0].type} msg={intel.alerts[0].msg} /></div>}
        {intel.alerts.length === 0 && intel.advice.length > 0 && <div style={{ marginTop: 10 }}><AdviceBox msg={intel.advice[0]} /></div>}
      </div>

      <div style={{ padding: 16, position: "relative", zIndex: 1 }} {...swipeNav}>
        <PageTransition pageKey={nav + trackTab}>

          {/* ── TODAY ── */}
          {nav === "today" && (
            <div>
              <Card>
                <ST>Équilibre du jour</ST>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke={C.border}/>
                    <PolarAngleAxis dataKey="s" tick={{ fill: C.muted, fontSize: 11 }}/>
                    <Radar dataKey="v" stroke={C.red} fill={C.red} fillOpacity={0.1} strokeWidth={2.5}/>
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                {STAT_CARDS.map(item => (
                  <Card key={item.label} style={{ textAlign: "center", padding: 12, marginBottom: 0, borderTop: `3px solid ${item.color}` }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{Ico[item.icon](item.color, 20)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color, marginTop: 2 }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{item.label}</div>
                  </Card>
                ))}
              </div>
              {intel.alerts.length > 1 && (
                <Card><ST>Alertes</ST>{intel.alerts.map((a, i) => <AlertBox key={i} type={a.type} msg={a.msg} />)}{intel.advice.map((a, i) => <AdviceBox key={i} msg={a} />)}</Card>
              )}
              <EvoChart data={history.slice(-30)} dataKey="score" color={C.red} label="Score global (30j)" unit="" />
              <Card>
                <ST>Objectifs en cours</ST>
                {computedGoals.slice(0, 3).map(g => (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 12, color: g.color, fontWeight: 700 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: g.color, width: `${g.computedProgress}%`, transition: "width 0.4s" }} />
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <ST>To-Do du jour</ST>
                {todos.filter(t => t.date === today.date).slice(0, 4).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 16, cursor: "pointer" }}>{t.done ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                  </div>
                ))}
                {!todos.filter(t => t.date === today.date).length && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Aucune tâche → onglet Tracker</p>}
              </Card>
            </div>
          )}

          {/* ── TRACKER ── */}
          {nav === "track" && (
            <div>
              <div style={{ display: "flex", overflowX: "auto", gap: 6, marginBottom: 16, scrollbarWidth: "none" }}>
                {TRACK_TABS.map(t => {
                  const active = trackTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTrackTab(t.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: active ? "2px solid rgba(255,255,255,0.8)" : `1px solid ${C.border}`, cursor: "pointer", fontSize: 12, fontWeight: 600, background: active ? C.red : C.surface, color: active ? "#fff" : C.muted, display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s" }}>
                      {Ico[t.icon](active ? "#fff" : C.muted, 15)}
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {trackTab === "sleep" && (
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
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>{today.sleep.duration >= 7.5 ? "Optimal ✅" : today.sleep.duration >= 6.5 ? "Correct — vise 7h30+" : "Insuffisant ⚠️"}</p>
                      </div>
                    )}
                    <ST>Qualité</ST>
                    <Rating value={today.sleep.quality} onChange={v => update("sleep", "quality", v)} />
                    <div style={{ height: 14 }} />
                    <Toggle value={today.sleep.noScreen} onChange={v => update("sleep", "noScreen", v)} label="Pas d'écran 30min avant de dormir 📵" />
                  </Card>
                </div>
              )}

              {trackTab === "sport" && (
                <div>
                  {intel.todayRec === "rest" ? <AlertBox type="warning" msg={`💤 ${intel.consecutiveSport} jours consécutifs — repos recommandé.`} /> : intel.todayRec ? <AdviceBox msg={`🎯 Recommandation : ${intel.todayRec}`} /> : null}
                  <EvoChart data={sportH.slice(-30)} dataKey="sport.duration" color={C.red} label="Durée des séances" unit="min" />
                  <Card>
                    <ST>Type de séance</ST>
                    <Toggle value={today.sport.isRest} onChange={v => update("sport", "isRest", v)} label="Jour de repos 🛌" />
                    {today.sport.isRest ? (
                      <div style={{ marginTop: 12 }}><Toggle value={today.sport.stretching} onChange={v => update("sport", "stretching", v)} label="Étirements / Mobilité ✅" /></div>
                    ) : (
                      <div style={{ marginTop: 12 }}>
                        <Field label="Type">
                          <select value={today.sport.type} onChange={e => update("sport", "type", e.target.value)} style={{ ...inp, color: C.text }}>
                            <option value="">Choisir...</option>
                            {["PPL Push","PPL Pull","PPL Legs","Running","Football","Cardio","Full Body","Autre"].map(o => <option key={o} style={{ color: C.text }}>{o}</option>)}
                          </select>
                        </Field>
                        <div style={{ height: 12 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                          <Field label="Durée (min)"><input type="number" value={today.sport.duration} min={0} max={300} onChange={e => update("sport", "duration", +e.target.value)} style={inp} /></Field>
                          <Field label="Intensité"><div style={{ paddingTop: 6 }}><Rating value={today.sport.intensity} onChange={v => update("sport", "intensity", v)} /></div></Field>
                        </div>
                        <Field label="Notes / PR"><input type="text" placeholder="Ex: Bench 90kg ×5 🔥" value={today.sport.notes} onChange={e => update("sport", "notes", e.target.value)} style={inp} /></Field>
                      </div>
                    )}
                  </Card>
                  <Card>
                    <ST>Récupération musculaire</ST>
                    <Rating value={today.sport.recovery} onChange={v => update("sport", "recovery", v)} color={today.sport.recovery <= 2 ? C.red : today.sport.recovery <= 3 ? C.orange : C.green} />
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{["","Très douloureux 🔴 → Repos","Courbatures 🟠 → Séance légère","Correct 🟡 → Modéré","Bien 🟢 → Normal","Parfait 💪 → Intensif"][today.sport.recovery] || ""}</p>
                    {today.sport.recovery > 0 && today.sport.recovery <= 2 && !today.sport.isRest && <AlertBox type="warning" msg="⚠️ Récupération insuffisante. Risque de blessure." />}
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
                        {pace && <div style={{ textAlign: "center", background: C.surfaceAlt, borderRadius: 12, padding: 12 }}><span style={{ fontSize: 24, fontWeight: 900, color: C.red }}>{pace} min/km</span></div>}
                      </div>
                    )}
                    <EvoChart data={history.filter(d => d.sport?.running?.did && d.sport?.running?.distance > 0).slice(-20)} dataKey="sport.running.distance" color={C.blue} label="Distance running" unit="km" height={120} />
                  </Card>
                  <Card>
                    <ST>Composition corporelle</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <Field label="Masse graisseuse (%)"><input type="number" value={today.sport.bodyFat || ""} step={0.1} min={0} onChange={e => update("sport", "bodyFat", +e.target.value)} style={inp} /></Field>
                      <Field label="Masse musculaire (kg)"><input type="number" value={today.sport.muscleMass || ""} step={0.1} min={0} onChange={e => update("sport", "muscleMass", +e.target.value)} style={inp} /></Field>
                    </div>
                    <EvoChart data={history.filter(d => d.sport?.bodyFat > 0).slice(-30)} dataKey="sport.bodyFat" color={C.orange} label="Masse graisseuse" unit="%" height={100} />
                    <EvoChart data={history.filter(d => d.sport?.muscleMass > 0).slice(-30)} dataKey="sport.muscleMass" color={C.green} label="Masse musculaire" unit="kg" height={100} />
                  </Card>
                  <Card>
                    <ST>Photo de progression 📸</ST>
                    <input type="file" accept="image/*" ref={sportPhotoRef} style={{ display: "none" }} onChange={handleSportPhoto} />
                    <button onClick={() => sportPhotoRef.current.click()} style={{ width: "100%", padding: 12, background: C.surfaceAlt, border: `1px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", fontSize: 13, color: C.muted }}>📷 Importer une photo</button>
                    {today.sport.photoUrl && <img src={today.sport.photoUrl} alt="prog" style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 220 }} />}
                  </Card>
                </div>
              )}

              {trackTab === "nutrition" && (
                <div>
                  <EvoChart data={waterH.slice(-30)} dataKey="nutrition.water" color={C.blue} label="Hydratation" unit="L" />
                  <EvoChart data={history.filter(d => d.nutrition?.protein > 0).slice(-30)} dataKey="nutrition.protein" color={C.purple} label="Protéines" unit="g" />
                  <Card>
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
                    {today.nutrition.protein > 0 && today.nutrition.protein < 120 && <div style={{ marginTop: 10 }}><AlertBox type="warning" msg={`⚠️ ${today.nutrition.protein}g seulement. Objectif : 150g+.`} /></div>}
                  </Card>
                </div>
              )}

              {trackTab === "body" && (
                <div>
                  <EvoChart data={history.filter(d => d.body?.weight > 0).slice(-60)} dataKey="body.weight" color={C.orange} label="Évolution du poids" unit="kg" />
                  <Card>
                    <ST>Mensurations</ST>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Poids (kg)"><input type="number" value={today.body?.weight || ""} step={0.1} min={0} onChange={e => update("body", "weight", +e.target.value)} style={inp} /></Field>
                      <Field label="Poitrine (cm)"><input type="number" value={today.body?.chest || ""} min={0} onChange={e => update("body", "chest", +e.target.value)} style={inp} /></Field>
                      <Field label="Taille (cm)"><input type="number" value={today.body?.waist || ""} min={0} onChange={e => update("body", "waist", +e.target.value)} style={inp} /></Field>
                      <Field label="Hanches (cm)"><input type="number" value={today.body?.hips || ""} min={0} onChange={e => update("body", "hips", +e.target.value)} style={inp} /></Field>
                      <Field label="Bras (cm)"><input type="number" value={today.body?.arms || ""} min={0} onChange={e => update("body", "arms", +e.target.value)} style={inp} /></Field>
                      <Field label="Cuisses (cm)"><input type="number" value={today.body?.thighs || ""} min={0} onChange={e => update("body", "thighs", +e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              {trackTab === "work" && (
                <div>
                  <EvoChart data={history.filter(d => d.work?.focus > 0).slice(-30)} dataKey="work.focus" color={C.orange} label="Niveau de focus" unit="/5" />
                  {intel.avgScreen > 4 && <AlertBox type="warning" msg={`📱 ${Math.round(intel.avgScreen)}h d'écran/jour — sommeil dégradé.`} />}
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
                          <span>Complétion</span><span style={{ color: C.red, fontWeight: 700 }}>{Math.round(Math.min(1, today.work.tasksCompleted / today.work.tasks) * 100)}%</span>
                        </div>
                        <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3 }}>
                          <div style={{ height: "100%", borderRadius: 3, background: C.red, width: `${Math.min(100, (today.work.tasksCompleted / today.work.tasks) * 100)}%`, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    )}
                    <Field label="Highlight"><input type="text" placeholder="Ma meilleure action..." value={today.work.highlight} onChange={e => update("work", "highlight", e.target.value)} style={inp} /></Field>
                  </Card>
                  <Card>
                    <ST>Temps d'écran</ST>
                    <Field label="Heures aujourd'hui"><input type="number" value={today.work.screenTime} min={0} max={24} step={0.5} onChange={e => update("work", "screenTime", +e.target.value)} style={inp} /></Field>
                    {today.work.screenTime > 0 && (
                      <div style={{ marginTop: 10, padding: 10, background: C.surfaceAlt, borderRadius: 10, fontSize: 12, color: today.work.screenTime <= 3 ? C.green : today.work.screenTime <= 5 ? C.orange : C.red }}>
                        {today.work.screenTime <= 3 ? "✅ Excellent" : today.work.screenTime <= 5 ? "⚠️ Limite" : "🚨 Trop élevé — mélatonine perturbée"}
                      </div>
                    )}
                    <EvoChart data={screenH.slice(-30)} dataKey="work.screenTime" color={C.red} label="Temps d'écran" unit="h" height={100} />
                  </Card>
                </div>
              )}

              {trackTab === "todo" && (
                <div>
                  <Card>
                    <ST>Nouvelle tâche</ST>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Ajouter une tâche..." style={{ ...inp, flex: 1 }} />
                      <button onClick={addTodo} style={{ background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 700, cursor: "pointer", fontSize: 18 }}>+</button>
                    </div>
                  </Card>
                  {["today","older"].map(group => {
                    const todayDate = new Date().toISOString().split("T")[0];
                    const items = todos.filter(t => group === "today" ? t.date === todayDate : t.date !== todayDate);
                    if (!items.length) return null;
                    return (
                      <Card key={group}>
                        <ST>{group === "today" ? "Aujourd'hui" : "Anciennes"}</ST>
                        {items.map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                            <span onClick={() => toggleTodo(t.id)} style={{ fontSize: 18, cursor: "pointer" }}>{t.done ? "✅" : "⬜"}</span>
                            <span style={{ fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                            <span onClick={() => deleteTodo(t.id)} style={{ fontSize: 12, color: C.subtle, cursor: "pointer" }}>✕</span>
                          </div>
                        ))}
                      </Card>
                    );
                  })}
                  {!todos.length && <Card><p style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Aucune tâche !</p></Card>}
                </div>
              )}

              {trackTab === "mind" && (
                <div>
                  <EvoChart data={moodH.slice(-30)} dataKey="mind.mood" color={C.purple} label="Évolution humeur" unit="/5" />
                  <Card>
                    <ST>Humeur du jour</ST>
                    <Rating value={today.mind.mood} onChange={v => update("mind", "mood", v)} color={today.mind.mood >= 4 ? C.green : today.mind.mood >= 3 ? C.orange : C.red} />
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 6, marginBottom: 14 }}>{["","Difficile 😔","Moyen 😐","Correct 🙂","Bien 😊","Excellent 🔥"][today.mind.mood] || ""}</p>
                    {today.mind.mood > 0 && today.mind.mood <= 2 && <AlertBox type="warning" msg="Moral bas — 5min cohérence cardiaque." />}
                    <ST>Développement</ST>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Lecture (pages)"><input type="number" value={today.mind.reading} min={0} max={300} onChange={e => update("mind", "reading", +e.target.value)} style={inp} /></Field>
                      <Toggle value={today.mind.meditation} onChange={v => update("mind", "meditation", v)} label="Méditation / Cohérence cardiaque 🧘" />
                      <Field label="Compétence travaillée"><input type="text" placeholder="Ex: closing, copywriting..." value={today.mind.learning} onChange={e => update("mind", "learning", e.target.value)} style={inp} /></Field>
                      <Field label="Gratitude du jour"><input type="text" placeholder="Une chose positive..." value={today.mind.gratitude} onChange={e => update("mind", "gratitude", e.target.value)} style={inp} /></Field>
                    </div>
                  </Card>
                </div>
              )}

              <button onClick={saveDay} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: saved ? C.green : C.red, color: "#fff", fontSize: 15, fontWeight: 800, transition: "all 0.3s", marginTop: 4 }}>
                {saved ? "✓ Sauvegardé !" : "💾 Sauvegarder la journée"}
              </button>
            </div>
          )}

          {/* ── ARGENT ── */}
          {nav === "money" && (
            <div>
              <Card style={{ background: C.red, border: "none" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" }}>Patrimoine total</p>
                <p style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: 0 }}>{totalPatrimoine.toLocaleString("fr-FR")} €</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "4px 0 0" }}>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </Card>
              {patrimoine.some(p => p.amount > 0) && (
                <Card>
                  <ST>Répartition</ST>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={patrimoine.filter(p => p.amount > 0)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={9}>
                        {patrimoine.filter(p => p.amount > 0).map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                      <Tooltip formatter={v => [`${v.toLocaleString("fr-FR")}€`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <Card>
                <ST>Mes poches</ST>
                <DraggableList items={patrimoine} onReorder={p => { setPatrimoine(p); saveAll(history, todos, goals, p, profile); }} renderItem={p => (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 12px", background: C.surfaceAlt, borderRadius: 12, borderLeft: `4px solid ${p.color}` }}>
                    <span style={{ fontSize: 16, color: C.subtle, cursor: "grab", flexShrink: 0 }}>⠿</span>
                    <div style={{ flex: 1 }}>
                      {renamingPoche === p.id ? (
                        <input autoFocus value={p.name} onChange={e => updatePoche(p.id, "name", e.target.value)} onBlur={() => setRenamingPoche(null)} onKeyDown={e => e.key === "Enter" && setRenamingPoche(null)} style={{ ...inp, padding: "4px 8px", fontSize: 13, fontWeight: 600 }} />
                      ) : <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.name}</p>}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <input type="number" value={p.amount} onChange={e => updatePoche(p.id, "amount", +e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: 16, fontWeight: 800, color: p.color, width: 130 }} />
                        <span style={{ fontSize: 12, color: C.muted }}>€</span>
                      </div>
                    </div>
                    <DotsMenu color={p.color} onRename={() => setRenamingPoche(p.id)} onColor={col => updatePoche(p.id, "color", col)} onDelete={() => deletePoche(p.id)} />
                  </div>
                )} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input value={newPoche.name} onChange={e => setNewPoche(p => ({ ...p, name: e.target.value }))} placeholder="Nom (ex: Livret A)" style={inp} />
                    <input type="number" value={newPoche.amount} onChange={e => setNewPoche(p => ({ ...p, amount: +e.target.value }))} placeholder="Montant €" style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={newPoche.color} onChange={e => setNewPoche(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer" }} />
                    <button onClick={addPoche} style={{ flex: 1, padding: "11px", background: C.red, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Ajouter une poche</button>
                  </div>
                </div>
              </Card>
              <Card>
                <ST>Flux du jour</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Revenus (€)"><input type="number" value={today.money.income} min={0} onChange={e => update("money", "income", +e.target.value)} style={inp} /></Field>
                  <Field label="Dépenses (€)"><input type="number" value={today.money.expense} min={0} onChange={e => update("money", "expense", +e.target.value)} style={inp} /></Field>
                </div>
                <Field label="Investi (€)"><input type="number" value={today.money.invested} min={0} onChange={e => update("money", "invested", +e.target.value)} style={{ ...inp, marginBottom: 10 }} /></Field>
                <Field label="Note"><input type="text" placeholder="Ex: DCA ETF World..." value={today.money.note} onChange={e => update("money", "note", e.target.value)} style={inp} /></Field>
              </Card>
              <Card>
                <ST>Simulateur 📈</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Capital (€)"><input type="number" value={sim.amount} onChange={e => setSim(s => ({ ...s, amount: +e.target.value }))} style={inp} /></Field>
                  <Field label="Versement/mois (€)"><input type="number" value={sim.monthly} onChange={e => setSim(s => ({ ...s, monthly: +e.target.value }))} style={inp} /></Field>
                  <Field label="Rendement/an (%)"><input type="number" value={sim.rate} step={0.5} onChange={e => setSim(s => ({ ...s, rate: +e.target.value }))} style={inp} /></Field>
                  <Field label="Durée (ans)"><input type="number" value={sim.years} min={1} max={50} onChange={e => setSim(s => ({ ...s, years: +e.target.value }))} style={inp} /></Field>
                </div>
                <div style={{ textAlign: "center", padding: 14, background: C.surfaceAlt, borderRadius: 12, marginBottom: 14 }}>
                  <p style={{ fontSize: 10, color: C.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Dans {sim.years} ans</p>
                  <p style={{ fontSize: 32, fontWeight: 900, color: C.green, margin: 0 }}>{simResult[simResult.length - 1]?.value.toLocaleString("fr-FR")} €</p>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={simResult}>
                    <defs><linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid stroke={C.border} vertical={false}/>
                    <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 9 }} tickFormatter={y => `${y}a`} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: C.muted, fontSize: 9 }} width={40} tickFormatter={v => `${Math.round(v/1000)}k`} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 10, fontSize: 11 }} formatter={v => [`${v.toLocaleString("fr-FR")}€`, "Valeur"]}/>
                    <Area type="monotone" dataKey="value" stroke={C.green} strokeWidth={2.5} fill="url(#simGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* ── OBJECTIFS ── */}
          {nav === "goals" && (
            <div>
              <Card>
                <ST>Nouvel objectif</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Ex: 170g de protéines/jour" style={inp} />
                  <input value={newGoal.category} onChange={e => setNewGoal(p => ({ ...p, category: e.target.value }))} placeholder="Catégorie" style={inp} />
                  <Field label="Source de données">
                    <select value={newGoal.sourceId} onChange={e => setNewGoal(p => ({ ...p, sourceId: e.target.value }))} style={{ ...inp, color: C.text }}>
                      {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </Field>
                  {newGoal.sourceId !== "manual" && (
                    <>
                      <Field label={`Valeur cible (${DATA_SOURCES.find(s => s.id === newGoal.sourceId)?.unit || ""})`}>
                        <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} placeholder="Ex: 170" style={inp} />
                      </Field>
                      <Toggle value={newGoal.reverse} onChange={v => setNewGoal(p => ({ ...p, reverse: v }))} label="Objectif : descendre sous la cible" />
                    </>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Début"><input type="date" value={newGoal.startDate} onChange={e => setNewGoal(p => ({ ...p, startDate: e.target.value }))} style={inp} /></Field>
                    <Field label="Fin"><input type="date" value={newGoal.endDate} onChange={e => setNewGoal(p => ({ ...p, endDate: e.target.value }))} style={inp} /></Field>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, flexShrink: 0 }}>Couleur</label>
                    <input type="color" value={newGoal.color} onChange={e => setNewGoal(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${C.border}`, cursor: "pointer", padding: 2 }} />
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: newGoal.color, border: `2px solid ${C.border}` }} />
                    <span style={{ fontSize: 12, color: C.muted }}>← Aperçu</span>
                  </div>
                  <button onClick={addGoal} style={{ background: newGoal.color, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Ajouter l'objectif</button>
                </div>
              </Card>

              <DraggableList items={computedGoals} onReorder={g => { setGoals(g); saveAll(history, todos, g, patrimoine, profile); }} renderItem={g => {
                const src = DATA_SOURCES.find(s => s.id === g.sourceId);
                const daysLeft = g.endDate ? Math.max(0, Math.round((new Date(g.endDate) - new Date()) / 86400000)) : null;
                return (
                  <Card key={g.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <span style={{ fontSize: 16, color: C.subtle, cursor: "grab", flexShrink: 0 }}>⠿</span>
                        <div style={{ flex: 1 }}>
                          {renamingGoal === g.id ? (
                            <input autoFocus value={g.label} onChange={e => updateGoalField(g.id, "label", e.target.value)} onBlur={() => setRenamingGoal(null)} onKeyDown={e => e.key === "Enter" && setRenamingGoal(null)} style={{ ...inp, padding: "4px 8px", fontSize: 14, fontWeight: 700 }} />
                          ) : <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{g.label}</p>}
                          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: g.color, fontWeight: 600, background: `${g.color}18`, borderRadius: 6, padding: "2px 6px" }}>{g.category}</span>
                            {src && src.id !== "manual" && <span style={{ fontSize: 10, color: C.muted, background: C.surfaceAlt, borderRadius: 6, padding: "2px 6px" }}>🔗 {src.label}</span>}
                            {daysLeft !== null && <span style={{ fontSize: 10, color: daysLeft < 30 ? C.red : C.muted, background: C.surfaceAlt, borderRadius: 6, padding: "2px 6px" }}>⏱ {daysLeft}j restants</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: g.computedProgress >= 100 ? C.green : g.color }}>{g.computedProgress}%</span>
                        <DotsMenu color={g.color} onRename={() => setRenamingGoal(g.id)} onColor={col => updateGoalField(g.id, "color", col)} onDelete={() => deleteGoal(g.id)} />
                      </div>
                    </div>
                    <div style={{ height: 10, background: C.surfaceAlt, borderRadius: 5, marginBottom: g.sourceId === "manual" ? 0 : 4 }}>
                      <div style={{ height: "100%", borderRadius: 5, background: g.computedProgress >= 100 ? C.green : g.color, width: `${Math.min(100, g.computedProgress)}%`, transition: "width 0.6s ease" }} />
                    </div>
                    {g.sourceId === "manual" && (
                      <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} style={{ marginTop: 10 }}>
                        <input type="range" min={0} max={100} value={g.computedProgress}
                          onChange={e => updateGoalField(g.id, "manualProgress", +e.target.value)}
                          onMouseDown={e => e.stopPropagation()}
                          onTouchStart={e => e.stopPropagation()}
                          style={{ width: "100%", accentColor: g.color }} />
                      </div>
                    )}
                    {g.sourceId !== "manual" && g.target && (
                      <p style={{ fontSize: 10, color: C.muted, margin: "4px 0 0" }}>Cible : {Number(g.target).toLocaleString("fr-FR")}{src?.unit} {g.endDate ? `· Échéance : ${new Date(g.endDate).toLocaleDateString("fr-FR")}` : ""}</p>
                    )}
                  </Card>
                );
              }} />
            </div>
          )}

          {/* ── STATS ── */}
          {nav === "stats" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["7","7j"],["30","30j"],["90","3 mois"],["365","1 an"]].map(([v, l]) => (
                  <button key={v} onClick={() => setStatRange(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: statRange === v ? C.red : C.surfaceAlt, color: statRange === v ? "#fff" : C.muted }}>{l}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Jours trackés", value: history.length, color: C.red },
                  { label: "Score moyen", value: intel.scoreAvg, color: C.orange },
                  { label: "Nuits > 7h30", value: rangeH.filter(d => d.sleep?.duration >= 7.5).length, color: C.purple },
                  { label: "Séances sport", value: rangeH.filter(d => d.sport?.duration >= 30).length, color: C.red },
                  { label: "Streak actuel", value: `${streak}j 🔥`, color: C.orange },
                  { label: "Objectifs actifs", value: goals.length, color: C.green },
                ].map(item => (
                  <Card key={item.label} style={{ textAlign: "center", padding: 14, marginBottom: 0, borderTop: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: item.color, marginTop: 4 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.label}</div>
                  </Card>
                ))}
              </div>
              <EvoChart data={rangeH} dataKey="score" color={C.red} label="Score global" unit="" height={170} />
              <EvoChart data={sleepH.slice(-parseInt(statRange))} dataKey="sleep.duration" color={C.purple} label="Sommeil" unit="h" />
              <EvoChart data={sportH.slice(-parseInt(statRange))} dataKey="sport.duration" color={C.red} label="Sport" unit="min" />
              <EvoChart data={moodH.slice(-parseInt(statRange))} dataKey="mind.mood" color={C.purple} label="Humeur" unit="/5" />
              <EvoChart data={screenH.slice(-parseInt(statRange))} dataKey="work.screenTime" color={C.orange} label="Temps d'écran" unit="h" />
              <Card>
                <ST>Progression objectifs</ST>
                {computedGoals.map(g => (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 12, color: g.color, fontWeight: 700 }}>{g.computedProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 3 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: g.color, width: `${g.computedProgress}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ── PROFIL ── */}
          {nav === "profile" && (
            <div>
              <Card style={{ textAlign: "center" }}>
                <input type="file" accept="image/*" ref={photoRef} style={{ display: "none" }} onChange={handleProfilePhoto} />
                <div onClick={() => photoRef.current.click()} style={{ cursor: "pointer", display: "inline-block", position: "relative" }}>
                  {profile.photo ? <img src={profile.photo} alt="profil" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `4px solid ${C.red}` }} />
                    : <div style={{ width: 100, height: 100, borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 36, fontWeight: 900, margin: "0 auto" }}>{profile.name?.[0] || "H"}</div>}
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: C.red, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>📷</div>
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Appuie sur la photo pour changer</p>
              </Card>
              <Card>
                <ST>Informations</ST>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Prénom"><input value={profile.name} onChange={e => updateProfile("name", e.target.value)} style={inp} /></Field>
                  <Field label="Date de naissance"><input type="date" value={profile.dob || ""} onChange={e => updateProfile("dob", e.target.value)} style={inp} /></Field>
                  {age !== null && (
                    <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: C.muted }}>Âge calculé automatiquement</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{age} ans</span>
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <ST>Résumé</ST>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Jours trackés", value: history.length },
                    { label: "Streak", value: `${streak}j 🔥` },
                    { label: "Score moyen", value: intel.scoreAvg },
                    { label: "Objectifs", value: goals.length },
                    { label: "Patrimoine", value: `${(totalPatrimoine / 1000).toFixed(1)}k€` },
                    { label: "Tâches faites", value: todos.filter(t => t.done).length },
                  ].map(item => (
                    <div key={item.label} style={{ background: C.surfaceAlt, borderRadius: 12, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.red }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ background: C.red, border: "none" }}>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 6px" }}>Vision</p>
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: 0 }}>100k€ net/an · {age ? `avant ${30 - age} ans` : "30 ans"} · Kojihsports Angers</p>
              </Card>
            </div>
          )}

        </PageTransition>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(n => {
          const active = nav === n.id;
          return (
            <button key={n.id} onClick={() => setNav(n.id)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.2s" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? C.black : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                {Ico[n.icon](active ? C.red : C.black, 20)}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: active ? C.red : C.black, textTransform: "uppercase", letterSpacing: 0.5 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
