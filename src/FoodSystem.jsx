// src/FoodSystem.jsx — Système alimentaire complet MYLIDE
// Food search (Open Food Facts), journal alimentaire, plan du jour

import { useState, useCallback, useRef } from "react";
import { useC } from "./theme.jsx";
import { MEAL_DB, MEAL_FRACTIONS, getMeals, getMealEmoji, scaleMeal } from "./mealEngine.js";

// ── BASE LOCALE CIQUAL (ingrédients bruts courants) ───────────────────────
// Source : Ciqual 2020 — ANSES (Agence nationale de sécurité sanitaire)
// Valeurs pour 100g
const LOCAL_FOODS = [
  // Oeufs
  { name:"Oeuf entier cuit (dur/poché)", cal:155, prot:13, carbs:1.1, fat:11, tags:["oeuf","oeufs","egg"] },
  { name:"Oeuf entier cru", cal:147, prot:13, carbs:0.7, fat:10, tags:["oeuf","oeufs","egg cru"] },
  { name:"Blanc d'oeuf cuit", cal:52, prot:11, carbs:0.7, fat:0.2, tags:["blanc oeuf","albumine"] },
  // Céréales & féculents
  { name:"Flocons d'avoine", cal:367, prot:13, carbs:60, fat:7, tags:["flocon avoine","avoine","oats","porridge"] },
  { name:"Riz blanc cru", cal:360, prot:7, carbs:78, fat:0.7, tags:["riz","riz blanc","rice"] },
  { name:"Riz basmati cru", cal:356, prot:8, carbs:77, fat:0.7, tags:["riz basmati","basmati"] },
  { name:"Riz complet cru", cal:355, prot:8, carbs:74, fat:2, tags:["riz complet"] },
  { name:"Pâtes sèches (blé dur)", cal:352, prot:13, carbs:69, fat:1.5, tags:["pates","pasta","pâtes"] },
  { name:"Pâtes cuites", cal:138, prot:5, carbs:27, fat:0.6, tags:["pates cuites","pasta cuite"] },
  { name:"Pain complet", cal:246, prot:9, carbs:44, fat:2, tags:["pain complet","wholemeal"] },
  { name:"Pain de mie complet", cal:257, prot:9, carbs:44, fat:3.5, tags:["pain mie"] },
  { name:"Quinoa cru", cal:368, prot:14, carbs:60, fat:6, tags:["quinoa"] },
  { name:"Lentilles cuites", cal:116, prot:9, carbs:20, fat:0.4, tags:["lentille","lentilles"] },
  { name:"Pois chiches cuits", cal:164, prot:9, carbs:27, fat:2.6, tags:["pois chiche","chickpea"] },
  { name:"Haricots rouges cuits", cal:127, prot:8.7, carbs:22, fat:0.5, tags:["haricot rouge","red bean"] },
  // Légumes
  { name:"Patate douce crue", cal:86, prot:1.6, carbs:20, fat:0.1, tags:["patate douce","sweet potato"] },
  { name:"Patate douce cuite", cal:76, prot:1.6, carbs:17, fat:0.1, tags:["patate douce cuite"] },
  { name:"Pomme de terre cuite", cal:87, prot:2, carbs:19, fat:0.1, tags:["pomme de terre","potato","patate"] },
  { name:"Brocoli cuit", cal:28, prot:2.8, carbs:3, fat:0.3, tags:["brocoli","broccoli"] },
  { name:"Épinards cuits", cal:23, prot:2.9, carbs:1.4, fat:0.4, tags:["epinard","spinach"] },
  { name:"Tomate fraîche", cal:18, prot:0.9, carbs:3.5, fat:0.2, tags:["tomate","tomato"] },
  { name:"Avocat", cal:160, prot:2, carbs:2, fat:15, tags:["avocat","avocado"] },
  { name:"Carotte fraîche", cal:41, prot:0.9, carbs:9, fat:0.2, tags:["carotte","carrot"] },
  { name:"Courgette cuite", cal:19, prot:1.4, carbs:2.5, fat:0.3, tags:["courgette","zucchini"] },
  { name:"Champignons de Paris", cal:22, prot:3, carbs:0.5, fat:0.3, tags:["champignon","mushroom"] },
  { name:"Haricots verts cuits", cal:28, prot:1.9, carbs:4, fat:0.2, tags:["haricot vert","green bean"] },
  // Fruits
  { name:"Banane", cal:90, prot:1.1, carbs:21, fat:0.3, tags:["banane","banana"] },
  { name:"Pomme", cal:52, prot:0.3, carbs:12, fat:0.2, tags:["pomme","apple"] },
  { name:"Fraises", cal:32, prot:0.7, carbs:7, fat:0.3, tags:["fraise","strawberry"] },
  { name:"Myrtilles", cal:57, prot:0.7, carbs:13, fat:0.3, tags:["myrtille","blueberry"] },
  { name:"Fruits rouges (mélange)", cal:40, prot:0.8, carbs:9, fat:0.3, tags:["fruits rouges","berries"] },
  { name:"Orange", cal:47, prot:0.9, carbs:11, fat:0.1, tags:["orange"] },
  { name:"Mangue", cal:60, prot:0.8, carbs:14, fat:0.4, tags:["mangue","mango"] },
  // Viandes
  { name:"Blanc de poulet cru", cal:110, prot:23, carbs:0, fat:2, tags:["poulet","chicken","blanc poulet"] },
  { name:"Blanc de poulet cuit", cal:152, prot:32, carbs:0, fat:3, tags:["poulet cuit"] },
  { name:"Boeuf haché 5% MG cuit", cal:135, prot:22, carbs:0, fat:5, tags:["boeuf","steak hache","beef","viande hachee"] },
  { name:"Steak de boeuf maigre cuit", cal:175, prot:29, carbs:0, fat:6, tags:["steak boeuf","beef steak"] },
  { name:"Filet de dinde cru", cal:107, prot:23, carbs:0, fat:1.5, tags:["dinde","turkey"] },
  // Poissons
  { name:"Saumon cru", cal:206, prot:20, carbs:0, fat:14, tags:["saumon","salmon"] },
  { name:"Thon en conserve (naturel)", cal:116, prot:26, carbs:0, fat:1, tags:["thon","tuna"] },
  { name:"Cabillaud cuit", cal:90, prot:20, carbs:0, fat:1, tags:["cabillaud","cod","morue"] },
  { name:"Crevettes cuites", cal:90, prot:19, carbs:0, fat:1.3, tags:["crevette","shrimp"] },
  // Laitages
  { name:"Yaourt grec 0%", cal:59, prot:10, carbs:4, fat:0.3, tags:["yaourt grec","greek yogurt","skyr"] },
  { name:"Fromage blanc 0%", cal:47, prot:8, carbs:3.7, fat:0.2, tags:["fromage blanc"] },
  { name:"Skyr nature", cal:65, prot:11, carbs:4, fat:0.2, tags:["skyr"] },
  { name:"Lait demi-écrémé", cal:46, prot:3.2, carbs:4.8, fat:1.5, tags:["lait","milk"] },
  { name:"Cottage cheese", cal:98, prot:11, carbs:3, fat:4, tags:["cottage cheese","cottage"] },
  { name:"Mozzarella", cal:280, prot:17, carbs:2, fat:22, tags:["mozzarella"] },
  { name:"Parmesan râpé", cal:392, prot:36, carbs:0, fat:26, tags:["parmesan"] },
  // Protéines en poudre
  { name:"Whey protéine (poudre)", cal:370, prot:80, carbs:5, fat:4, tags:["whey","proteine poudre","protein powder"] },
  // Noix & graines
  { name:"Amandes", cal:575, prot:21, carbs:7, fat:50, tags:["amande","almond"] },
  { name:"Noix", cal:654, prot:15, carbs:7, fat:65, tags:["noix","walnut"] },
  { name:"Beurre de cacahuète", cal:598, prot:25, carbs:20, fat:50, tags:["beurre cacahuete","peanut butter"] },
  { name:"Graines de chia", cal:486, prot:16, carbs:35, fat:30, tags:["chia"] },
  { name:"Noix de cajou", cal:553, prot:18, carbs:27, fat:44, tags:["cajou","cashew"] },
  // Matières grasses
  { name:"Huile d'olive", cal:900, prot:0, carbs:0, fat:100, tags:["huile olive","olive oil"] },
  { name:"Huile de coco", cal:862, prot:0, carbs:0, fat:96, tags:["huile coco","coconut oil"] },
  { name:"Beurre", cal:750, prot:0.6, carbs:0.5, fat:82, tags:["beurre","butter"] },
  // Divers
  { name:"Granola nature", cal:450, prot:9, carbs:62, fat:16, tags:["granola","muesli"] },
  { name:"Miel", cal:305, prot:0.3, carbs:76, fat:0, tags:["miel","honey"] },
  { name:"Chocolat noir 70%", cal:560, prot:8, carbs:40, fat:40, tags:["chocolat noir","dark chocolate"] },
];

function searchLocalFoods(query) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  return LOCAL_FOODS.filter(f => {
    const name = f.name.toLowerCase();
    const tags = f.tags.join(" ");
    return words.every(w => name.includes(w) || tags.includes(w));
  }).map(f => ({ ...f, source: "local" }));
}

// ── API Open Food Facts ────────────────────────────────────────────────────
async function searchFoods(query) {
  if (!query || query.length < 2) return [];
  // On essaie d'abord l'API française, puis mondiale en fallback
  const urls = [
    `https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=15&fields=product_name,brands,nutriments,serving_size`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=15&fields=product_name,brands,nutriments,serving_size&lc=fr`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const products = (data.products || []).filter(p => {
        if (!p.product_name || p.product_name.trim().length < 2) return false;
        const n = p.nutriments || {};
        // Accepter si au moins une valeur nutritionnelle est présente
        return (n["energy-kcal_100g"] != null || n["energy_100g"] != null || n["proteins_100g"] != null);
      });
      if (products.length > 0) return products;
    } catch {}
  }
  return [];
}

function getMacrosPer100g(product) {
  const n = product.nutriments || {};
  // Priorité : kcal explicite, sinon conversion depuis kJ (÷4.184)
  const kcal = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? (n["energy_100g"] ? Math.round(n["energy_100g"] / 4.184) : null) ?? 0;
  return {
    calories: Math.round(Math.max(0, kcal)),
    protein:  Math.round((n["proteins_100g"]     || 0) * 10) / 10,
    carbs:    Math.round((n["carbohydrates_100g"] || 0) * 10) / 10,
    fat:      Math.round((n["fat_100g"]           || 0) * 10) / 10,
  };
}

function calcMacrosForQty(per100g, qty) {
  const f = qty / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein:  Math.round(per100g.protein  * f * 10) / 10,
    carbs:    Math.round(per100g.carbs    * f * 10) / 10,
    fat:      Math.round(per100g.fat      * f * 10) / 10,
  };
}

// ── FOOD SEARCH MODAL ─────────────────────────────────────────────────────
export const FoodSearchModal = ({ onClose, onAdd }) => {
  const C = useC();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(100);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef();

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      // 1. Cherche d'abord dans la base locale Ciqual
      const local = searchLocalFoods(query.trim());
      // 2. Cherche en parallèle sur Open Food Facts pour les produits packagés
      const offPromise = searchFoods(query.trim()).catch(() => []);
      const off = await offPromise;
      // Fusionne : local en premier, puis OFF (sans doublons par nom)
      const localNames = new Set(local.map(f => f.name.toLowerCase()));
      const offFiltered = off.filter(p => !localNames.has((p.product_name || "").toLowerCase()));
      setResults([...local, ...offFiltered]);
    } catch {
      setResults(searchLocalFoods(query.trim()));
    }
    setLoading(false);
  }, [query]);

  const per100g = selected
    ? (selected.source === "local"
        ? { calories: selected.cal, protein: selected.prot, carbs: selected.carbs, fat: selected.fat }
        : getMacrosPer100g(selected))
    : null;
  const preview = per100g ? calcMacrosForQty(per100g, qty) : null;

  const handleAdd = () => {
    if (!selected || !preview) return;
    const name = selected.source === "local" ? selected.name : selected.product_name;
    onAdd({
      id: Date.now(),
      name,
      brand: selected.source === "local" ? "Ciqual" : (selected.brands || ""),
      quantity: qty,
      unit: "g",
      calories: preview.calories,
      protein: preview.protein,
      carbs: preview.carbs,
      fat: preview.fat,
      per100g,
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", animation: "backdropIn 0.2s ease" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 480, background: C.bg, borderRadius: "24px 24px 0 0", maxHeight: "92vh", display: "flex", flexDirection: "column", animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1)" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.text }}>🔍 Rechercher un aliment</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Base Open Food Facts — millions d'aliments</p>
            </div>
            <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: C.muted, fontWeight: 700 }}>✕</button>
          </div>
          {/* Search bar */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Ex : poulet grillé, riz basmati, oeufs..."
              style={{ flex: 1, padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 15, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={doSearch} disabled={loading}
              style={{ padding: "13px 18px", borderRadius: 14, background: "#CC2936", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>
              {loading ? "..." : "Chercher"}
            </button>
          </div>
        </div>

        {/* Results / Selected */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 24px" }}>
          {/* État initial */}
          {!searched && !loading && (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🥗</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Cherche l'aliment que tu as mangé</p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>Les macros se calculeront automatiquement</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #CC2936", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Recherche en cours...</p>
            </div>
          )}

          {/* Pas de résultats */}
          {searched && !loading && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>😕</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Aucun résultat</p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>Essaie en anglais ou avec un autre terme</p>
            </div>
          )}

          {/* Selected product — quantity picker */}
          {selected && per100g && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: `#CC293610`, border: "1.5px solid #CC293630", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{selected.source === "local" ? selected.name : selected.product_name}</p>
                    {selected.source === "local"
                      ? <span style={{ fontSize: 10, background: "#CC293618", color: "#CC2936", borderRadius: 6, padding: "1px 6px", fontWeight: 800 }}>Base Ciqual · données ANSES</span>
                      : selected.brands && <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{selected.brands}</p>}
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: C.surfaceAlt, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: C.muted }}>✕ Changer</button>
                </div>
                {/* Per 100g */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "pour 100g", color: C.muted },
                    { label: `${per100g.calories} kcal`, color: "#f97316" },
                    { label: `${per100g.protein}g prot`, color: "#a855f7" },
                    { label: `${per100g.carbs}g gluc`, color: "#3b82f6" },
                    { label: `${per100g.fat}g lip`, color: "#22c55e" },
                  ].map((t, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 800, color: t.color, background: i === 0 ? C.surfaceAlt : `${t.color}15`, borderRadius: 8, padding: "3px 8px" }}>{t.label}</span>
                  ))}
                </div>
                {/* Quantity slider */}
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: C.text }}>Quelle quantité ?</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setQty(q => Math.max(5, q - 25))} style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>−</button>
                  <input type="number" value={qty} min={5} max={2000} step={5}
                    onChange={e => setQty(Math.max(5, Math.min(2000, Number(e.target.value))))}
                    style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, border: `1.5px solid #CC293640`, background: C.surface, color: C.text, fontSize: 18, fontWeight: 900, fontFamily: "inherit" }} />
                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>g</span>
                  <button onClick={() => setQty(q => Math.min(2000, q + 25))} style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>+</button>
                </div>
                {/* Quick qty buttons */}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {[50, 100, 150, 200, 250, 300].map(q => (
                    <button key={q} onClick={() => setQty(q)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${qty === q ? "#CC2936" : C.border}`, background: qty === q ? "#CC293615" : C.surfaceAlt, color: qty === q ? "#CC2936" : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {q}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview macros */}
              {preview && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", marginBottom: 14 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.muted }}>Pour {qty}g :</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { v: `${preview.calories}`, l: "kcal", c: "#f97316" },
                      { v: `${preview.protein}g`, l: "prot", c: "#a855f7" },
                      { v: `${preview.carbs}g`, l: "gluc", c: "#3b82f6" },
                      { v: `${preview.fat}g`, l: "lip", c: "#22c55e" },
                    ].map(({ v, l, c }) => (
                      <div key={l} style={{ background: `${c}12`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: c }}>{v}</div>
                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleAdd}
                style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg,#CC2936,#8B1A22)", color: "#fff", border: "none", borderRadius: 16, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
                + Ajouter à mon journal
              </button>
            </div>
          )}

          {/* Results list */}
          {!selected && searched && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted, fontWeight: 600 }}>{results.length} résultats · Appuie pour sélectionner</p>
              {results.map((p, i) => {
                const isLocal = p.source === "local";
                const name = isLocal ? p.name : p.product_name;
                const m = isLocal
                  ? { calories: p.cal, protein: p.prot, carbs: p.carbs, fat: p.fat }
                  : getMacrosPer100g(p);
                if (!name) return null;
                return (
                  <button key={i} onClick={() => { setSelected(p); setQty(isLocal ? 100 : 100); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surface, border: `1px solid ${isLocal ? "#CC293620" : C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", transition: "all 0.15s" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: isLocal ? "#CC293612" : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {getMealEmoji(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                        {isLocal && <span style={{ fontSize: 9, background: "#CC293618", color: "#CC2936", borderRadius: 6, padding: "1px 5px", fontWeight: 800, flexShrink: 0 }}>Ciqual</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>{m.calories} kcal</span>
                        <span style={{ fontSize: 11, color: C.muted }}>·</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7" }}>{m.protein}g P</span>
                        <span style={{ fontSize: 11, color: C.muted }}>·</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>{m.carbs}g G</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, flexShrink: 0 }}>pour 100g ›</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── FOOD LOG ────────────────────────────────────────────────────────────────
export const FoodLog = ({ foods = [], onRemove, displayMacros, C }) => {
  if (!foods.length) return null;

  const totals = foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    carbs: acc.carbs + (f.carbs || 0),
    fat: acc.fat + (f.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Journal du jour · {foods.length} aliment{foods.length > 1 ? "s" : ""}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {foods.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, borderRadius: 12, padding: "10px 12px", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{getMealEmoji(f.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{f.quantity}g</span>
                <span style={{ fontSize: 11, color: "#f97316", fontWeight: 700 }}>{f.calories} kcal</span>
                <span style={{ fontSize: 11, color: "#a855f7", fontWeight: 700 }}>{f.protein}g P</span>
              </div>
            </div>
            <button onClick={() => onRemove(f.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: C.muted, fontSize: 14, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      {/* Totaux */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "10px 14px", display: "flex", gap: 14, justifyContent: "space-around" }}>
        {[
          { v: Math.round(totals.calories), l: "kcal total", c: "#f97316" },
          { v: `${Math.round(totals.protein * 10) / 10}g`, l: "protéines", c: "#a855f7" },
          { v: `${Math.round(totals.carbs * 10) / 10}g`, l: "glucides", c: "#3b82f6" },
          { v: `${Math.round(totals.fat * 10) / 10}g`, l: "lipides", c: "#22c55e" },
        ].map(({ v, l, c }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PLAN DU JOUR GENERATOR ─────────────────────────────────────────────────
// Sélectionne le meilleur combo de repas pour atteindre les objectifs
export function generateDayPlan({ goalType, veganOnly, userCalTarget, protTarget }) {
  const cats = ["breakfast", "lunch", "snack", "dinner"];
  const result = {};
  let totalCal = 0, totalProt = 0;

  for (const cat of cats) {
    const meals = getMeals(cat, { goalType, veganOnly, userCalTarget });
    if (!meals.length) continue;

    // Score chaque repas : priorité protéines vs objectif prot de ce repas
    const protFraction = MEAL_FRACTIONS[cat] || 0.25;
    const protTarget_meal = protTarget * protFraction;

    const scored = meals.map(m => ({
      ...m,
      score: Math.abs(m.macros.prot - protTarget_meal) + Math.abs(m.macros.cal - userCalTarget * protFraction) * 0.01,
    })).sort((a, b) => a.score - b.score);

    result[cat] = scored[0];
    totalCal += scored[0]?.macros.cal || 0;
    totalProt += scored[0]?.macros.prot || 0;
  }

  return { meals: result, totalCal, totalProt };
}

// ── DAY PLAN DISPLAY ──────────────────────────────────────────────────────
export const DayPlanCard = ({ goalType, veganOnly, userCalTarget, protTarget, displayMacros, onAddMeal, C }) => {
  const [plan, setPlan] = useState(null);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    const p = generateDayPlan({ goalType, veganOnly, userCalTarget, protTarget });
    setPlan(p);
    setGenerated(true);
  };

  const CAT_LABELS_FR = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };
  const CAT_ICONS_FR  = { breakfast: "🥣", lunch: "🥘", snack: "🍎", dinner: "🌙" };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.text }}>🗓 Plan du jour</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
            Repas optimisés pour {userCalTarget} kcal · {protTarget}g prot
          </p>
        </div>
        <button onClick={generate}
          style={{ padding: "9px 16px", borderRadius: 14, background: "linear-gradient(135deg,#CC2936,#8B1A22)", color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          {generated ? "🔄 Regénérer" : "✨ Générer"}
        </button>
      </div>

      {!generated && (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.muted }}>
          <p style={{ margin: 0, fontSize: 13 }}>Génère un plan repas complet adapté à tes objectifs du jour</p>
        </div>
      )}

      {generated && plan && (
        <>
          {/* Totaux */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, background: plan.totalCal >= userCalTarget * 0.9 && plan.totalCal <= userCalTarget * 1.1 ? "#22c55e15" : "#f9731615", borderRadius: 12, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: plan.totalCal >= userCalTarget * 0.9 && plan.totalCal <= userCalTarget * 1.1 ? "#22c55e" : "#f97316" }}>{plan.totalCal} kcal</div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>objectif {userCalTarget}</div>
            </div>
            <div style={{ flex: 1, background: "#a855f715", borderRadius: 12, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#a855f7" }}>{plan.totalProt}g</div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>objectif {protTarget}g prot</div>
            </div>
          </div>

          {/* Repas */}
          {["breakfast", "lunch", "snack", "dinner"].map(cat => {
            const meal = plan.meals[cat];
            if (!meal) return null;
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{CAT_ICONS_FR[cat]}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{CAT_LABELS_FR[cat]}</span>
                </div>
                <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{getMealEmoji(meal.name)}</span>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>{meal.name}</p>
                    </div>
                    <button onClick={() => onAddMeal && onAddMeal(meal)}
                      style={{ padding: "5px 12px", borderRadius: 10, background: "#CC293615", border: "1.5px solid #CC293630", color: "#CC2936", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      + Ajouter
                    </button>
                  </div>
                  {/* Macros pills */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316", background: "#f9731615", borderRadius: 8, padding: "3px 8px" }}>{meal.macros.cal} kcal</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#a855f7", background: "#a855f715", borderRadius: 8, padding: "3px 8px" }}>{meal.macros.prot}g prot</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", background: "#3b82f615", borderRadius: 8, padding: "3px 8px" }}>{meal.macros.carbs}g gluc</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", background: "#22c55e15", borderRadius: 8, padding: "3px 8px" }}>{meal.macros.fat}g lip</span>
                  </div>
                  {/* Ingrédients avec quantités */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {meal.ingredients.map((ing, i) => {
                      const qDisplay = ing.u === "x" ? `${ing.q}×` :
                        ing.u === "tranche" ? `${ing.q} tr.` :
                        `${ing.q}${ing.u}`;
                      return (
                        <span key={i} style={{ fontSize: 11, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 9px", color: C.text, fontWeight: 600 }}>
                          {ing.n} · <strong>{qDisplay}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
