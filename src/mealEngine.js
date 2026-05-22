// src/mealEngine.js — Moteur de nutrition sportive MYLIDE
// Repas simples, réalistes, adaptés à la nutrition sportive quotidienne.
// Quantités calibrées pour REF_CAL (homme 75kg, modéré, maintien ~2200 kcal/j).

export const REF_CAL = 2200;

// Fractions caloriques par repas (sur la journée)
export const MEAL_FRACTIONS = { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

// ── BASE DE DONNÉES REPAS ──────────────────────────────────────────────────
// macros = à quantités base (REF_CAL). goals = affinités nutritionnelles.
// Le moteur adapte les portions selon le profil réel de l'utilisateur.

export const MEAL_DB = {

breakfast: [
  { id:"b01", name:"Bowl avoine banane",
    ingredients:[{n:"Flocons d'avoine",q:60,u:"g"},{n:"Banane",q:120,u:"g"},{n:"Skyr nature",q:150,u:"g"}],
    macros:{cal:430,prot:26,carbs:73,fat:5}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"b02", name:"Oeufs brouillés toast",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Pain complet",q:2,u:"tranche"},{n:"Huile d'olive",q:5,u:"ml"}],
    macros:{cal:445,prot:27,carbs:30,fat:24}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"b03", name:"Yaourt grec granola myrtilles",
    ingredients:[{n:"Yaourt grec 0%",q:200,u:"g"},{n:"Granola",q:40,u:"g"},{n:"Myrtilles",q:80,u:"g"}],
    macros:{cal:316,prot:25,carbs:44,fat:5}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"b04", name:"Porridge whey chocolat",
    ingredients:[{n:"Flocons d'avoine",q:60,u:"g"},{n:"Whey chocolat",q:30,u:"g"},{n:"Lait demi-écrémé",q:200,u:"ml"}],
    macros:{cal:438,prot:38,carbs:52,fat:9}, goals:["masse","maintenance"], vegan:false },
  { id:"b05", name:"Toast beurre cacahuète banane",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Beurre de cacahuète",q:25,u:"g"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:416,prot:14,carbs:61,fat:15}, goals:["masse","maintenance"], vegan:true },
  { id:"b06", name:"Skyr fruits rouges amandes",
    ingredients:[{n:"Skyr nature",q:200,u:"g"},{n:"Fruits rouges",q:100,u:"g"},{n:"Amandes",q:20,u:"g"}],
    macros:{cal:292,prot:27,carbs:24,fat:11}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"b07", name:"Pancakes avoine",
    ingredients:[{n:"Flocons d'avoine moulus",q:80,u:"g"},{n:"Oeufs entiers",q:2,u:"x"},{n:"Lait demi-écrémé",q:100,u:"ml"}],
    macros:{cal:508,prot:28,carbs:58,fat:18}, goals:["masse","maintenance"], vegan:false },
  { id:"b08", name:"Omelette jambon fromage",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Jambon blanc",q:50,u:"g"},{n:"Gruyère",q:20,u:"g"}],
    macros:{cal:377,prot:36,carbs:2,fat:25}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"b09", name:"Fromage blanc miel noix",
    ingredients:[{n:"Fromage blanc 0%",q:200,u:"g"},{n:"Miel",q:15,u:"g"},{n:"Cerneaux de noix",q:20,u:"g"}],
    macros:{cal:279,prot:19,carbs:23,fat:14}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"b10", name:"Toast avocat oeufs pochés",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Avocat",q:100,u:"g"},{n:"Oeufs entiers",q:2,u:"x"}],
    macros:{cal:481,prot:22,carbs:39,fat:28}, goals:["maintenance","masse"], vegan:false },
  { id:"b11", name:"Smoothie banane whey",
    ingredients:[{n:"Banane",q:120,u:"g"},{n:"Whey vanille",q:30,u:"g"},{n:"Lait demi-écrémé",q:250,u:"ml"}],
    macros:{cal:340,prot:34,carbs:42,fat:6}, goals:["masse","maintenance","perte","seche"], vegan:false },
  { id:"b12", name:"Pain toast jambon oeufs durs",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Jambon blanc",q:60,u:"g"},{n:"Oeufs durs",q:2,u:"x"}],
    macros:{cal:394,prot:32,carbs:30,fat:16}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"b13", name:"Bol avoine miel amandes",
    ingredients:[{n:"Flocons d'avoine",q:70,u:"g"},{n:"Lait demi-écrémé",q:250,u:"ml"},{n:"Miel",q:10,u:"g"},{n:"Amandes",q:15,u:"g"}],
    macros:{cal:495,prot:21,carbs:70,fat:16}, goals:["masse","maintenance"], vegan:false },
  { id:"b14", name:"Cottage cheese fruits rouges",
    ingredients:[{n:"Cottage cheese",q:200,u:"g"},{n:"Fruits rouges",q:120,u:"g"},{n:"Granola",q:20,u:"g"}],
    macros:{cal:334,prot:27,carbs:32,fat:11}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"b15", name:"Muesli lait fruits",
    ingredients:[{n:"Muesli",q:60,u:"g"},{n:"Lait demi-écrémé",q:200,u:"ml"},{n:"Fruits rouges",q:100,u:"g"}],
    macros:{cal:374,prot:14,carbs:63,fat:9}, goals:["maintenance","masse"], vegan:false },
  { id:"b16", name:"Oeufs cocotte épinards",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Épinards",q:100,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:344,prot:27,carbs:19,fat:18}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"b17", name:"Skyr granola banane",
    ingredients:[{n:"Skyr nature",q:200,u:"g"},{n:"Granola",q:50,u:"g"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:428,prot:28,carbs:66,fat:7}, goals:["masse","maintenance"], vegan:false },
  { id:"b18", name:"Omelette champignons",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Champignons",q:150,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:354,prot:29,carbs:21,fat:18}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"b19", name:"Shake avoine protéine banane",
    ingredients:[{n:"Flocons d'avoine",q:50,u:"g"},{n:"Whey vanille",q:30,u:"g"},{n:"Lait demi-écrémé",q:200,u:"ml"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:507,prot:38,carbs:73,fat:9}, goals:["masse"], vegan:false },
  { id:"b20", name:"Yaourt grec banane miel",
    ingredients:[{n:"Yaourt grec 0%",q:200,u:"g"},{n:"Banane",q:120,u:"g"},{n:"Miel",q:10,u:"g"}],
    macros:{cal:251,prot:21,carbs:44,fat:0}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"b21", name:"Tartines fromage blanc",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Fromage blanc 0%",q:150,u:"g"},{n:"Confiture",q:20,u:"g"}],
    macros:{cal:290,prot:18,carbs:48,fat:3}, goals:["maintenance","perte"], vegan:false },
  { id:"b22", name:"Oeufs brouillés saumon fumé",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Saumon fumé",q:80,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:487,prot:44,carbs:16,fat:28}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"b23", name:"Galettes riz beurre cacahuète",
    ingredients:[{n:"Galettes de riz",q:4,u:"x"},{n:"Beurre de cacahuète",q:30,u:"g"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:476,prot:12,carbs:77,fat:16}, goals:["masse"], vegan:true },
  { id:"b24", name:"Bol chia fruits rouges",
    ingredients:[{n:"Graines de chia",q:40,u:"g"},{n:"Lait d'amande",q:250,u:"ml"},{n:"Fruits rouges",q:100,u:"g"},{n:"Granola",q:20,u:"g"}],
    macros:{cal:362,prot:10,carbs:45,fat:16}, goals:["maintenance","masse"], vegan:true },
  { id:"b25", name:"Crêpes avoine oeufs",
    ingredients:[{n:"Farine complète",q:60,u:"g"},{n:"Oeufs entiers",q:2,u:"x"},{n:"Lait demi-écrémé",q:150,u:"ml"}],
    macros:{cal:431,prot:27,carbs:48,fat:15}, goals:["maintenance","masse"], vegan:false },
  { id:"b26", name:"Fromage blanc céréales",
    ingredients:[{n:"Fromage blanc 0%",q:200,u:"g"},{n:"Céréales complètes",q:50,u:"g"},{n:"Lait demi-écrémé",q:150,u:"ml"}],
    macros:{cal:336,prot:26,carbs:48,fat:5}, goals:["maintenance","perte"], vegan:false },
  { id:"b27", name:"Toast beurre amande pomme",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Beurre d'amande",q:20,u:"g"},{n:"Pomme",q:150,u:"g"}],
    macros:{cal:359,prot:11,carbs:54,fat:12}, goals:["maintenance","masse"], vegan:true },
  { id:"b28", name:"Porridge avoine lait cannelle",
    ingredients:[{n:"Flocons d'avoine",q:70,u:"g"},{n:"Lait demi-écrémé",q:300,u:"ml"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:507,prot:20,carbs:88,fat:10}, goals:["masse","maintenance"], vegan:false },
  { id:"b29", name:"Shake whey pomme",
    ingredients:[{n:"Whey vanille",q:30,u:"g"},{n:"Lait demi-écrémé",q:300,u:"ml"},{n:"Pomme",q:150,u:"g"}],
    macros:{cal:333,prot:34,carbs:38,fat:7}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"b30", name:"Oeufs durs toast fromage",
    ingredients:[{n:"Oeufs durs",q:3,u:"x"},{n:"Pain complet",q:2,u:"tranche"},{n:"Emmental",q:30,u:"g"}],
    macros:{cal:515,prot:35,carbs:30,fat:28}, goals:["maintenance","seche","perte"], vegan:false },
],

lunch: [
  { id:"l01", name:"Poulet riz brocoli",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Riz basmati cuit",q:180,u:"g"},{n:"Brocoli",q:150,u:"g"}],
    macros:{cal:457,prot:55,carbs:44,fat:6}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"l02", name:"Steak haché pommes de terre",
    ingredients:[{n:"Steak haché 5%",q:150,u:"g"},{n:"Pommes de terre cuites",q:300,u:"g"},{n:"Haricots verts",q:150,u:"g"}],
    macros:{cal:479,prot:39,carbs:62,fat:8}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l03", name:"Saumon quinoa courgette",
    ingredients:[{n:"Saumon cuit",q:150,u:"g"},{n:"Quinoa cuit",q:120,u:"g"},{n:"Courgette",q:150,u:"g"}],
    macros:{cal:482,prot:45,carbs:31,fat:22}, goals:["maintenance","seche","perte"], vegan:false },
  { id:"l04", name:"Pâtes thon tomate",
    ingredients:[{n:"Pâtes cuites",q:200,u:"g"},{n:"Thon en boîte",q:150,u:"g"},{n:"Tomates",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:435,prot:45,carbs:36,fat:13}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l05", name:"Wrap poulet salade",
    ingredients:[{n:"Wrap blé complet",q:1,u:"x"},{n:"Poulet grillé",q:120,u:"g"},{n:"Fromage blanc 0%",q:50,u:"g"},{n:"Salade tomate",q:80,u:"g"}],
    macros:{cal:394,prot:47,carbs:33,fat:7}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"l06", name:"Lentilles riz oignons",
    ingredients:[{n:"Lentilles cuites",q:200,u:"g"},{n:"Riz cuit",q:150,u:"g"},{n:"Oignons",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:438,prot:17,carbs:68,fat:11}, goals:["maintenance","masse","perte"], vegan:true },
  { id:"l07", name:"Cabillaud riz haricots verts",
    ingredients:[{n:"Cabillaud cuit",q:200,u:"g"},{n:"Riz cuit",q:180,u:"g"},{n:"Haricots verts",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:502,prot:47,carbs:53,fat:12}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"l08", name:"Poulet patate douce épinards",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Patate douce cuite",q:200,u:"g"},{n:"Épinards",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:533,prot:53,carbs:44,fat:16}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"l09", name:"Boeuf carottes pommes de terre",
    ingredients:[{n:"Boeuf maigre cuit",q:130,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Carottes",q:100,u:"g"}],
    macros:{cal:450,prot:41,carbs:44,fat:11}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l10", name:"Crevettes riz poivrons",
    ingredients:[{n:"Crevettes cuites",q:200,u:"g"},{n:"Riz cuit",q:180,u:"g"},{n:"Poivrons",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:530,prot:53,carbs:53,fat:11}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"l11", name:"Pâtes bolognaise maison",
    ingredients:[{n:"Pâtes cuites",q:200,u:"g"},{n:"Steak haché 5%",q:150,u:"g"},{n:"Sauce tomate",q:100,u:"g"}],
    macros:{cal:381,prot:37,carbs:37,fat:9}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l12", name:"Saumon patate douce",
    ingredients:[{n:"Saumon cuit",q:150,u:"g"},{n:"Patate douce cuite",q:200,u:"g"},{n:"Haricots verts",q:100,u:"g"}],
    macros:{cal:519,prot:43,carbs:47,fat:20}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"l13", name:"Poulet pâtes pesto",
    ingredients:[{n:"Poulet cuit",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Pesto",q:20,u:"g"}],
    macros:{cal:481,prot:48,carbs:32,fat:17}, goals:["maintenance","masse"], vegan:false },
  { id:"l14", name:"Riz thon maïs",
    ingredients:[{n:"Riz cuit",q:180,u:"g"},{n:"Thon en boîte",q:150,u:"g"},{n:"Maïs",q:80,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:519,prot:44,carbs:57,fat:13}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l15", name:"Dinde couscous légumes",
    ingredients:[{n:"Dinde cuite",q:150,u:"g"},{n:"Couscous cuit",q:150,u:"g"},{n:"Courgette tomate",q:150,u:"g"}],
    macros:{cal:418,prot:52,carbs:44,fat:5}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"l16", name:"Saumon brocoli riz",
    ingredients:[{n:"Saumon cuit",q:130,u:"g"},{n:"Riz cuit",q:180,u:"g"},{n:"Brocoli",q:150,u:"g"}],
    macros:{cal:519,prot:41,carbs:53,fat:18}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"l17", name:"Boeuf brocoli riz",
    ingredients:[{n:"Boeuf maigre cuit",q:130,u:"g"},{n:"Riz cuit",q:180,u:"g"},{n:"Brocoli",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:593,prot:44,carbs:53,fat:21}, goals:["masse","maintenance"], vegan:false },
  { id:"l18", name:"Pâtes poulet épinards",
    ingredients:[{n:"Poulet cuit",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Épinards",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:484,prot:49,carbs:34,fat:16}, goals:["maintenance","seche","perte"], vegan:false },
  { id:"l19", name:"Burger maison salade",
    ingredients:[{n:"Steak haché 5%",q:150,u:"g"},{n:"Pain burger complet",q:1,u:"x"},{n:"Salade tomate oignon",q:100,u:"g"},{n:"Emmental",q:20,u:"g"}],
    macros:{cal:464,prot:43,carbs:35,fat:16}, goals:["maintenance","masse"], vegan:false },
  { id:"l20", name:"Cabillaud tomates poivrons",
    ingredients:[{n:"Cabillaud cuit",q:200,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Tomates",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:426,prot:45,carbs:38,fat:12}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"l21", name:"Pâtes jambon fromage",
    ingredients:[{n:"Pâtes cuites",q:180,u:"g"},{n:"Jambon blanc",q:80,u:"g"},{n:"Gruyère",q:30,u:"g"}],
    macros:{cal:380,prot:30,carbs:34,fat:14}, goals:["maintenance","masse"], vegan:false },
  { id:"l22", name:"Poulet salade composée",
    ingredients:[{n:"Poulet grillé",q:150,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Salade verte",q:100,u:"g"},{n:"Vinaigrette",q:15,u:"ml"}],
    macros:{cal:494,prot:52,carbs:36,fat:14}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"l23", name:"Steak quinoa champignons",
    ingredients:[{n:"Steak maigre",q:130,u:"g"},{n:"Quinoa cuit",q:150,u:"g"},{n:"Champignons",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:522,prot:46,carbs:31,fat:23}, goals:["seche","maintenance","masse"], vegan:false },
  { id:"l24", name:"Saumon pâtes courgette",
    ingredients:[{n:"Saumon cuit",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Courgette",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:547,prot:40,carbs:36,fat:28}, goals:["maintenance","masse"], vegan:false },
  { id:"l25", name:"Dinde riz brocoli",
    ingredients:[{n:"Dinde cuite",q:150,u:"g"},{n:"Riz basmati cuit",q:180,u:"g"},{n:"Brocoli",q:150,u:"g"}],
    macros:{cal:451,prot:52,carbs:53,fat:5}, goals:["perte","seche","maintenance","masse"], vegan:false },
  { id:"l26", name:"Boeuf haché courgettes pâtes",
    ingredients:[{n:"Boeuf haché 5%",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Courgette",q:150,u:"g"},{n:"Sauce tomate",q:100,u:"g"}],
    macros:{cal:391,prot:35,carbs:42,fat:8}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"l27", name:"Crevettes quinoa légumes",
    ingredients:[{n:"Crevettes cuites",q:200,u:"g"},{n:"Quinoa cuit",q:150,u:"g"},{n:"Légumes sautés",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:472,prot:55,carbs:35,fat:13}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"l28", name:"Poulet pâtes sauce tomate",
    ingredients:[{n:"Poulet cuit",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Sauce tomate",q:100,u:"g"}],
    macros:{cal:401,prot:48,carbs:37,fat:6}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"l29", name:"Salade niçoise",
    ingredients:[{n:"Thon en boîte",q:130,u:"g"},{n:"Pommes de terre",q:150,u:"g"},{n:"Oeufs durs",q:2,u:"x"},{n:"Haricots verts",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:541,prot:51,carbs:33,fat:23}, goals:["maintenance","seche","perte"], vegan:false },
  { id:"l30", name:"Poulet légumes rôtis",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Légumes rôtis",q:150,u:"g"},{n:"Huile d'olive",q:15,u:"ml"}],
    macros:{cal:582,prot:52,carbs:43,fat:21}, goals:["maintenance","masse"], vegan:false },
],

snack: [
  { id:"s01", name:"Pomme amandes",
    ingredients:[{n:"Pomme",q:150,u:"g"},{n:"Amandes",q:30,u:"g"}],
    macros:{cal:252,prot:7,carbs:28,fat:15}, goals:["maintenance","perte","seche","masse"], vegan:true },
  { id:"s02", name:"Fromage blanc miel",
    ingredients:[{n:"Fromage blanc 0%",q:200,u:"g"},{n:"Miel",q:10,u:"g"}],
    macros:{cal:132,prot:16,carbs:16,fat:1}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"s03", name:"Pain jambon",
    ingredients:[{n:"Pain complet",q:1,u:"tranche"},{n:"Jambon blanc",q:60,u:"g"}],
    macros:{cal:154,prot:15,carbs:15,fat:4}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"s04", name:"Shake protéines lait",
    ingredients:[{n:"Whey vanille",q:30,u:"g"},{n:"Lait demi-écrémé",q:250,u:"ml"}],
    macros:{cal:233,prot:32,carbs:15,fat:6}, goals:["masse","seche","perte","maintenance"], vegan:false },
  { id:"s05", name:"Banane beurre cacahuète",
    ingredients:[{n:"Banane",q:120,u:"g"},{n:"Beurre de cacahuète",q:20,u:"g"}],
    macros:{cal:225,prot:6,carbs:32,fat:10}, goals:["masse","maintenance"], vegan:true },
  { id:"s06", name:"Yaourt grec fruits rouges",
    ingredients:[{n:"Yaourt grec 0%",q:150,u:"g"},{n:"Fruits rouges",q:100,u:"g"}],
    macros:{cal:136,prot:16,carbs:18,fat:1}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"s07", name:"Skyr granola",
    ingredients:[{n:"Skyr nature",q:150,u:"g"},{n:"Granola",q:30,u:"g"}],
    macros:{cal:212,prot:20,carbs:24,fat:4}, goals:["maintenance","perte","masse"], vegan:false },
  { id:"s08", name:"Galettes riz beurre cacahuète",
    ingredients:[{n:"Galettes de riz",q:3,u:"x"},{n:"Beurre de cacahuète",q:20,u:"g"}],
    macros:{cal:262,prot:8,carbs:36,fat:10}, goals:["masse","maintenance"], vegan:true },
  { id:"s09", name:"Oeufs durs",
    ingredients:[{n:"Oeufs durs",q:3,u:"x"}],
    macros:{cal:240,prot:21,carbs:1,fat:17}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"s10", name:"Cottage cheese ananas",
    ingredients:[{n:"Cottage cheese",q:200,u:"g"},{n:"Ananas",q:80,u:"g"}],
    macros:{cal:238,prot:25,carbs:17,fat:8}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"s11", name:"Smoothie protéine banane",
    ingredients:[{n:"Whey vanille",q:30,u:"g"},{n:"Banane",q:120,u:"g"},{n:"Lait demi-écrémé",q:200,u:"ml"}],
    macros:{cal:317,prot:32,carbs:40,fat:5}, goals:["masse","maintenance"], vegan:false },
  { id:"s12", name:"Toast fromage blanc",
    ingredients:[{n:"Pain complet",q:1,u:"tranche"},{n:"Fromage blanc 0%",q:100,u:"g"},{n:"Confiture",q:15,u:"g"}],
    macros:{cal:171,prot:11,carbs:28,fat:1}, goals:["maintenance","perte"], vegan:false },
  { id:"s13", name:"Amandes banane",
    ingredients:[{n:"Amandes",q:25,u:"g"},{n:"Banane",q:120,u:"g"}],
    macros:{cal:252,prot:7,carbs:33,fat:13}, goals:["maintenance","masse"], vegan:true },
  { id:"s14", name:"Toast beurre amande",
    ingredients:[{n:"Pain complet",q:2,u:"tranche"},{n:"Beurre d'amande",q:20,u:"g"}],
    macros:{cal:281,prot:11,carbs:33,fat:12}, goals:["masse","maintenance"], vegan:true },
  { id:"s15", name:"Compote amandes",
    ingredients:[{n:"Compote sans sucre",q:100,u:"g"},{n:"Amandes",q:20,u:"g"}],
    macros:{cal:156,prot:5,carbs:14,fat:10}, goals:["perte","seche","maintenance"], vegan:true },
  { id:"s16", name:"Lait chocolat",
    ingredients:[{n:"Lait demi-écrémé",q:300,u:"ml"},{n:"Cacao maigre",q:20,u:"g"}],
    macros:{cal:207,prot:15,carbs:27,fat:6}, goals:["masse","maintenance"], vegan:false },
  { id:"s17", name:"Edamame",
    ingredients:[{n:"Edamame cuit",q:150,u:"g"}],
    macros:{cal:190,prot:17,carbs:11,fat:9}, goals:["seche","perte","maintenance"], vegan:true },
  { id:"s18", name:"Pomme fromage",
    ingredients:[{n:"Pomme",q:150,u:"g"},{n:"Emmental",q:30,u:"g"}],
    macros:{cal:192,prot:8,carbs:21,fat:10}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"s19", name:"Skyr nature toast",
    ingredients:[{n:"Skyr nature",q:200,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:207,prot:25,carbs:22,fat:2}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"s20", name:"Orange noix",
    ingredients:[{n:"Orange",q:180,u:"g"},{n:"Cerneaux de noix",q:20,u:"g"}],
    macros:{cal:216,prot:5,carbs:24,fat:13}, goals:["maintenance","perte","seche"], vegan:true },
],

dinner: [
  { id:"d01", name:"Omelette pommes de terre",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Pommes de terre cuites",q:200,u:"g"},{n:"Haricots verts",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:537,prot:28,carbs:46,fat:27}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"d02", name:"Saumon rôti courgettes riz",
    ingredients:[{n:"Saumon cuit",q:150,u:"g"},{n:"Courgette",q:200,u:"g"},{n:"Riz cuit",q:150,u:"g"}],
    macros:{cal:541,prot:44,carbs:49,fat:20}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"d03", name:"Poulet citron patate douce",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Patate douce cuite",q:200,u:"g"},{n:"Brocoli",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:563,prot:54,carbs:51,fat:16}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"d04", name:"Cabillaud purée brocoli",
    ingredients:[{n:"Cabillaud cuit",q:180,u:"g"},{n:"Purée de pommes de terre",q:200,u:"g"},{n:"Brocoli",q:150,u:"g"}],
    macros:{cal:355,prot:44,carbs:45,fat:7}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"d05", name:"Steak champignons haricots verts",
    ingredients:[{n:"Steak maigre",q:150,u:"g"},{n:"Champignons",q:200,u:"g"},{n:"Haricots verts",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:481,prot:51,carbs:17,fat:23}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"d06", name:"Dinde légumes rôtis riz",
    ingredients:[{n:"Dinde cuite",q:160,u:"g"},{n:"Légumes rôtis",q:300,u:"g"},{n:"Riz cuit",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:506,prot:52,carbs:43,fat:15}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"d07", name:"Saumon épinards quinoa",
    ingredients:[{n:"Saumon cuit",q:130,u:"g"},{n:"Épinards sautés",q:150,u:"g"},{n:"Quinoa cuit",q:120,u:"g"}],
    macros:{cal:450,prot:42,carbs:31,fat:20}, goals:["seche","maintenance","perte"], vegan:false },
  { id:"d08", name:"Oeufs en cocotte tomates",
    ingredients:[{n:"Oeufs entiers",q:4,u:"x"},{n:"Tomates",q:200,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:437,prot:33,carbs:24,fat:24}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"d09", name:"Poulet rôti pommes de terre",
    ingredients:[{n:"Poulet cuit",q:160,u:"g"},{n:"Pommes de terre cuites",q:250,u:"g"},{n:"Huile d'olive",q:15,u:"ml"}],
    macros:{cal:592,prot:55,carbs:43,fat:21}, goals:["masse","maintenance"], vegan:false },
  { id:"d10", name:"Cabillaud poivrons riz",
    ingredients:[{n:"Cabillaud cuit",q:200,u:"g"},{n:"Poivrons",q:200,u:"g"},{n:"Riz cuit",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:446,prot:45,carbs:40,fat:12}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"d11", name:"Pâtes saumon épinards",
    ingredients:[{n:"Pâtes cuites",q:150,u:"g"},{n:"Saumon cuit",q:120,u:"g"},{n:"Épinards",q:100,u:"g"},{n:"Crème légère",q:50,u:"ml"}],
    macros:{cal:507,prot:41,carbs:38,fat:23}, goals:["maintenance","masse"], vegan:false },
  { id:"d12", name:"Omelette épinards fromage",
    ingredients:[{n:"Oeufs entiers",q:4,u:"x"},{n:"Épinards",q:150,u:"g"},{n:"Gruyère",q:30,u:"g"},{n:"Pain complet",q:1,u:"tranche"}],
    macros:{cal:550,prot:43,carbs:22,fat:33}, goals:["seche","maintenance"], vegan:false },
  { id:"d13", name:"Boeuf haché poivrons riz",
    ingredients:[{n:"Boeuf haché 5%",q:130,u:"g"},{n:"Riz cuit",q:150,u:"g"},{n:"Poivrons",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:501,prot:31,carbs:51,fat:17}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"d14", name:"Dinde patate douce haricots",
    ingredients:[{n:"Dinde cuite",q:160,u:"g"},{n:"Patate douce cuite",q:250,u:"g"},{n:"Haricots verts",q:150,u:"g"}],
    macros:{cal:484,prot:53,carbs:61,fat:5}, goals:["masse","maintenance","perte"], vegan:false },
  { id:"d15", name:"Poulet légumes vapeur",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Légumes vapeur",q:300,u:"g"},{n:"Riz cuit",q:100,u:"g"}],
    macros:{cal:483,prot:54,carbs:50,fat:6}, goals:["perte","seche","maintenance","masse"], vegan:false },
  { id:"d16", name:"Oeufs champignons pommes de terre",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Champignons",q:200,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:528,prot:31,carbs:42,fat:27}, goals:["maintenance","masse"], vegan:false },
  { id:"d17", name:"Thon tomates pâtes",
    ingredients:[{n:"Thon en boîte",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Tomates",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:413,prot:40,carbs:36,fat:13}, goals:["maintenance","perte","seche"], vegan:false },
  { id:"d18", name:"Saumon soja gingembre riz",
    ingredients:[{n:"Saumon cuit",q:150,u:"g"},{n:"Riz cuit",q:150,u:"g"},{n:"Épinards",q:150,u:"g"},{n:"Sauce soja",q:10,u:"ml"}],
    macros:{cal:550,prot:47,carbs:48,fat:20}, goals:["maintenance","masse","seche"], vegan:false },
  { id:"d19", name:"Steak poêlé salade pommes de terre",
    ingredients:[{n:"Steak maigre",q:160,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Salade verte",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:575,prot:50,carbs:36,fat:23}, goals:["maintenance","masse"], vegan:false },
  { id:"d20", name:"Pâtes pesto poulet",
    ingredients:[{n:"Poulet cuit",q:130,u:"g"},{n:"Pâtes cuites",q:150,u:"g"},{n:"Pesto",q:25,u:"g"}],
    macros:{cal:509,prot:48,carbs:33,fat:20}, goals:["maintenance","masse"], vegan:false },
  { id:"d21", name:"Poulet courgettes tomates riz",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Courgette",q:200,u:"g"},{n:"Tomates",q:150,u:"g"},{n:"Riz cuit",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:529,prot:53,carbs:41,fat:17}, goals:["maintenance","masse","perte","seche"], vegan:false },
  { id:"d22", name:"Omelette jambon fromage salade",
    ingredients:[{n:"Oeufs entiers",q:4,u:"x"},{n:"Jambon blanc",q:60,u:"g"},{n:"Gruyère",q:30,u:"g"},{n:"Salade verte",q:100,u:"g"}],
    macros:{cal:524,prot:49,carbs:5,fat:34}, goals:["seche","perte","maintenance"], vegan:false },
  { id:"d23", name:"Boeuf haché courgettes",
    ingredients:[{n:"Boeuf haché 5%",q:160,u:"g"},{n:"Courgettes",q:300,u:"g"},{n:"Riz cuit",q:100,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:479,prot:38,carbs:39,fat:19}, goals:["maintenance","masse","perte"], vegan:false },
  { id:"d24", name:"Cabillaud brocoli pommes de terre",
    ingredients:[{n:"Cabillaud cuit",q:200,u:"g"},{n:"Pommes de terre",q:200,u:"g"},{n:"Brocoli",q:200,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:478,prot:50,carbs:48,fat:12}, goals:["perte","seche","maintenance"], vegan:false },
  { id:"d25", name:"Saumon asperges quinoa",
    ingredients:[{n:"Saumon cuit",q:130,u:"g"},{n:"Asperges",q:150,u:"g"},{n:"Quinoa cuit",q:120,u:"g"}],
    macros:{cal:450,prot:41,carbs:32,fat:19}, goals:["seche","maintenance","perte"], vegan:false },
  { id:"d26", name:"Poulet feta salade quinoa",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Feta",q:50,u:"g"},{n:"Salade composée",q:200,u:"g"},{n:"Quinoa cuit",q:100,u:"g"}],
    macros:{cal:551,prot:60,carbs:30,fat:19}, goals:["seche","maintenance"], vegan:false },
  { id:"d27", name:"Dinde légumes vapeur riz",
    ingredients:[{n:"Dinde cuite",q:160,u:"g"},{n:"Légumes vapeur",q:300,u:"g"},{n:"Riz cuit",q:150,u:"g"}],
    macros:{cal:516,prot:55,carbs:64,fat:5}, goals:["perte","masse","maintenance"], vegan:false },
  { id:"d28", name:"Crevettes poêlées riz poivrons",
    ingredients:[{n:"Crevettes cuites",q:200,u:"g"},{n:"Riz cuit",q:150,u:"g"},{n:"Poivrons",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:530,prot:53,carbs:53,fat:11}, goals:["maintenance","masse","seche","perte"], vegan:false },
  { id:"d29", name:"Omelette poireaux pommes de terre",
    ingredients:[{n:"Oeufs entiers",q:3,u:"x"},{n:"Pommes de terre",q:150,u:"g"},{n:"Poireaux",q:150,u:"g"},{n:"Huile d'olive",q:10,u:"ml"}],
    macros:{cal:538,prot:26,carbs:48,fat:27}, goals:["maintenance","masse"], vegan:false },
  { id:"d30", name:"Poulet champignons crème riz",
    ingredients:[{n:"Poulet cuit",q:150,u:"g"},{n:"Champignons",q:200,u:"g"},{n:"Crème légère",q:50,u:"ml"},{n:"Riz cuit",q:150,u:"g"}],
    macros:{cal:552,prot:58,carbs:51,fat:12}, goals:["maintenance","masse"], vegan:false },
],

};

// ── MOTEUR DE SCALING ──────────────────────────────────────────────────────
// Adapte les portions selon le profil de l'utilisateur.

/**
 * Calcule le facteur d'adaptation des portions.
 * @param {number} userCalTarget - Calories cibles de l'utilisateur
 * @returns {number} facteur entre 0.55 et 1.85
 */
export function getScaleFactor(userCalTarget) {
  if (!userCalTarget || userCalTarget <= 0) return 1;
  return Math.max(0.55, Math.min(1.85, userCalTarget / REF_CAL));
}

/**
 * Formate une quantité selon son unité et le facteur de scaling.
 */
function scaleQty(qty, unit, factor) {
  if (unit === "x" || unit === "tranche") {
    const scaled = qty * factor;
    if (scaled <= 1.3) return 1;
    if (scaled <= 2.3) return 2;
    if (scaled <= 3.3) return 3;
    return Math.round(scaled);
  }
  const scaled = qty * factor;
  // Arrondir à 5g/ml près
  return Math.round(scaled / 5) * 5 || 5;
}

/**
 * Retourne un repas avec portions adaptées au profil.
 */
export function scaleMeal(meal, factor) {
  const f = factor || 1;
  return {
    ...meal,
    ingredients: meal.ingredients.map(ing => ({
      ...ing,
      q: scaleQty(ing.q, ing.u, f),
    })),
    macros: {
      cal:   Math.round(meal.macros.cal   * f),
      prot:  Math.round(meal.macros.prot  * f),
      carbs: Math.round(meal.macros.carbs * f),
      fat:   Math.round(meal.macros.fat   * f),
    },
    scaleFactor: f,
  };
}

/**
 * Retourne les repas filtrés et adaptés pour un profil donné.
 * @param {string} cat - 'breakfast' | 'lunch' | 'snack' | 'dinner'
 * @param {object} opts - { goalType, veganOnly, userCalTarget, maxCount }
 */
export function getMeals(cat, opts = {}) {
  const { goalType = "maintenance", veganOnly = false, userCalTarget = REF_CAL, maxCount = 6 } = opts;
  const factor = getScaleFactor(userCalTarget);
  const pool = MEAL_DB[cat] || [];
  return pool
    .filter(m => m.goals.includes(goalType) && (!veganOnly || m.vegan))
    .slice(0, maxCount)
    .map(m => scaleMeal(m, factor));
}

/**
 * Emoji automatique selon le nom du repas.
 */
export function getMealEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes("saumon") || n.includes("thon") || n.includes("cabillaud") || n.includes("crevette")) return "🐟";
  if (n.includes("poulet") || n.includes("dinde")) return "🍗";
  if (n.includes("steak") || n.includes("boeuf")) return "🥩";
  if (n.includes("oeuf") || n.includes("omelette")) return "🍳";
  if (n.includes("avoine") || n.includes("porridge") || n.includes("bol")) return "🥣";
  if (n.includes("shake") || n.includes("smoothie") || n.includes("whey")) return "🥤";
  if (n.includes("yaourt") || n.includes("skyr") || n.includes("fromage blanc") || n.includes("cottage")) return "🥛";
  if (n.includes("pâtes") || n.includes("pasta")) return "🍝";
  if (n.includes("riz")) return "🍚";
  if (n.includes("wrap") || n.includes("burger")) return "🌯";
  if (n.includes("salade") || n.includes("niçoise")) return "🥗";
  if (n.includes("toast") || n.includes("pain") || n.includes("tartine") || n.includes("galette")) return "🍞";
  if (n.includes("pancake") || n.includes("crêpe")) return "🥞";
  if (n.includes("pomme") || n.includes("banane") || n.includes("fruit") || n.includes("orange") || n.includes("compote")) return "🍎";
  if (n.includes("amande") || n.includes("noix") || n.includes("cacahuète")) return "🥜";
  if (n.includes("edamame")) return "🫘";
  if (n.includes("lentille")) return "🫘";
  if (n.includes("chia")) return "🌱";
  return "🍽️";
}

/**
 * Label de la catégorie.
 */
export const CAT_LABELS = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  snack: "Collation",
  dinner: "Dîner",
};

export const CAT_ICONS = {
  breakfast: "🥣",
  lunch: "🥘",
  snack: "🍎",
  dinner: "🌙",
};
