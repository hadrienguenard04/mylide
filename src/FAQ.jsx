import { useState, useMemo } from "react";
import { useC } from "./theme.jsx";

// ─── DATA ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  // ── GÉNÉRAL (15) ──────────────────────────────────────────────────────────
  {
    id: 1, cat: "general",
    q: "Qu'est-ce que MYLIDE ?",
    a: "MYLIDE est une application de suivi holistique de ta vie quotidienne. Elle centralise sommeil, sport, nutrition, mental, travail, argent et objectifs pour te donner une vision claire de ton état global et t'aider à prendre de meilleures décisions chaque jour.",
  },
  {
    id: 2, cat: "general",
    q: "Qu'est-ce que le score global ?",
    a: "Le score global est une synthèse de tous tes domaines de vie sur 100. Il reflète la cohérence de ta journée : un jour où tu dors bien, tu t'entraînes, tu t'alimentes correctement et tu gères ton stress obtiendra un score élevé. Ce n'est pas un jugement, c'est un outil de recul.",
  },
  {
    id: 3, cat: "general",
    q: "Que sont les recommandations ?",
    a: "Les recommandations sont des suggestions personnalisées générées chaque soir à partir de tes données. Elles pointent les domaines où tu peux t'améliorer demain et s'adaptent au fur et à mesure que MYLIDE apprend tes habitudes.",
  },
  {
    id: 4, cat: "general",
    q: "Comment fonctionne l'intelligence de MYLIDE ?",
    a: "MYLIDE analyse les corrélations entre tes différents domaines de vie. Si tu dors moins de 6h, l'application repère que ta productivité baisse 40 % le lendemain et te le signale. Plus tu enregistres de données, plus l'analyse devient précise.",
  },
  {
    id: 5, cat: "general",
    q: "Qu'est-ce que le Daily State Engine ?",
    a: "Le Daily State Engine est le moteur central qui calcule ton état du jour. Il combine tes entrées de la veille (sommeil, sport, humeur…) pour estimer ta capacité physique et mentale du jour, et ajuster les recommandations en conséquence.",
  },
  {
    id: 6, cat: "general",
    q: "Pourquoi mon score change-t-il d'un jour à l'autre ?",
    a: "Le score est recalculé chaque jour selon ce que tu as saisi. Une nuit courte, un repas déséquilibré ou une séance de sport intense modifient le résultat. C'est normal : ta vie n'est pas linéaire, et ton score ne l'est pas non plus.",
  },
  {
    id: 7, cat: "general",
    q: "Comment MYLIDE détecte-t-il les corrélations ?",
    a: "L'application compare tes séries temporelles sur toutes tes dimensions (sommeil, sport, humeur, productivité…). Quand deux variables évoluent régulièrement de concert, une corrélation est détectée et affichée dans la section Stats.",
  },
  {
    id: 8, cat: "general",
    q: "Qu'est-ce qu'un streak ?",
    a: "Un streak est le nombre de jours consécutifs où tu as rempli une entrée ou atteint un objectif. Les streaks renforcent la motivation et permettent à MYLIDE de détecter des tendances sur la durée.",
  },
  {
    id: 9, cat: "general",
    q: "Qu'est-ce qu'une alerte de cohérence ?",
    a: "Une alerte de cohérence apparaît quand tes données du jour semblent contradictoires avec ton historique. Par exemple : tu déclares une énergie de 9/10 mais tu n'as dormi que 4h. MYLIDE te le signale sans te juger.",
  },
  {
    id: 10, cat: "general",
    q: "Comment l'application apprend-elle de moi ?",
    a: "MYLIDE construit ton profil au fil du temps en observant tes patterns. Après 30 jours, les recommandations sont nettement plus pertinentes. Après 90 jours, l'application peut anticiper tes baisses de régime avant qu'elles arrivent.",
  },
  {
    id: 11, cat: "general",
    q: "MYLIDE a-t-il besoin d'une connexion internet ?",
    a: "La saisie quotidienne fonctionne hors ligne. La synchronisation, les recommandations avancées et la sauvegarde dans le cloud nécessitent une connexion. Tes données sont enregistrées localement en attendant.",
  },
  {
    id: 12, cat: "general",
    q: "Comment sont sécurisées mes données ?",
    a: "Tes données sont chiffrées en transit (TLS) et au repos (AES-256). Elles sont stockées dans une infrastructure sécurisée et ne sont jamais revendues ni partagées avec des tiers sans ton accord explicite.",
  },
  {
    id: 13, cat: "general",
    q: "Mes données sont-elles partagées avec des tiers ?",
    a: "Non. MYLIDE ne partage aucune donnée personnelle identifiable avec des tiers. Des données agrégées et anonymisées peuvent être utilisées pour améliorer l'algorithme, mais jamais pour de la publicité.",
  },
  {
    id: 14, cat: "general",
    q: "Puis-je exporter mes données ?",
    a: "Oui. Dans les paramètres, tu peux exporter l'ensemble de tes données au format JSON ou CSV à tout moment. Cette fonctionnalité est disponible pour tous les utilisateurs.",
  },
  {
    id: 15, cat: "general",
    q: "Quelles sont les prochaines fonctionnalités ?",
    a: "Les prochaines versions incluront la synchronisation Apple Health / Google Fit, un coach IA conversationnel, des rapports hebdomadaires PDF, et des intégrations avec des wearables comme la Whoop ou la Garmin.",
  },

  // ── SOMMEIL (12) ──────────────────────────────────────────────────────────
  {
    id: 16, cat: "sommeil",
    q: "Comment est calculé le score de sommeil ?",
    a: "Le score de sommeil prend en compte la durée (objectif : 7-9h), la régularité de l'heure de coucher, la qualité perçue (de 1 à 5) et la présence d'écrans avant de dormir. Chaque facteur est pondéré pour donner un score de 0 à 100.",
  },
  {
    id: 17, cat: "sommeil",
    q: "Quelle est la durée de sommeil optimale ?",
    a: "La science recommande 7 à 9 heures pour un adulte. MYLIDE adapte cet objectif selon ton profil : si tu t'entraînes intensément, 8,5 à 9h sont suggérés. En dessous de 6h, un malus significatif est appliqué au score.",
  },
  {
    id: 18, cat: "sommeil",
    q: "Que signifie la 'qualité' du sommeil dans MYLIDE ?",
    a: "La qualité est ton ressenti subjectif de 1 (nuit agitée, réveils fréquents) à 5 (sommeil profond, récupération complète). Elle pondère la durée : 8h de mauvaise qualité vaut moins que 7h de très bonne qualité.",
  },
  {
    id: 19, cat: "sommeil",
    q: "Pourquoi l'irrégularité de l'heure de coucher pénalise-t-elle le score ?",
    a: "Ton rythme circadien est sensible à la constance. Se coucher à des heures très variables perturbe la sécrétion de mélatonine et réduit la qualité des cycles de sommeil. MYLIDE valorise la régularité même si la durée totale est correcte.",
  },
  {
    id: 20, cat: "sommeil",
    q: "Comment le sommeil impacte-t-il la performance sportive ?",
    a: "Un sommeil insuffisant réduit la synthèse protéique, allonge le temps de récupération musculaire et augmente le risque de blessure. MYLIDE ajuste automatiquement tes recommandations d'entraînement si tu as dormi moins de 6h.",
  },
  {
    id: 21, cat: "sommeil",
    q: "Quel est l'impact du sommeil sur l'humeur ?",
    a: "Le manque de sommeil amplifie les émotions négatives et réduit la régulation émotionnelle. MYLIDE met en évidence cette corrélation dans tes stats : tu verras probablement que les journées où ton humeur est basse font suite à des nuits courtes.",
  },
  {
    id: 22, cat: "sommeil",
    q: "Comment le sommeil affecte-t-il la concentration ?",
    a: "Dormir moins de 7h équivaut cognitivement à deux verres d'alcool. MYLIDE tient compte de ta nuit pour évaluer ton potentiel de focus du lendemain et ajuster tes objectifs de travail en profondeur.",
  },
  {
    id: 23, cat: "sommeil",
    q: "Qu'est-ce que la dette de sommeil ?",
    a: "La dette de sommeil est le cumul d'heures de sommeil manquantes sur une période. MYLIDE la calcule sur 7 jours glissants et t'alerte quand elle dépasse 5h, car rembourser une dette de sommeil prend plusieurs nuits.",
  },
  {
    id: 24, cat: "sommeil",
    q: "Comment MYLIDE détecte-t-il la fatigue ?",
    a: "MYLIDE croise ta durée de sommeil, ta qualité déclarée, ton niveau d'énergie et ton historique sportif. Si plusieurs indicateurs convergent vers la fatigue, une alerte est émise pour te recommander de récupérer.",
  },
  {
    id: 25, cat: "sommeil",
    q: "Qu'est-ce que le bonus 'Pas d'écran avant de dormir' ?",
    a: "Les écrans émettent de la lumière bleue qui supprime la mélatonine. Si tu déclares ne pas avoir utilisé d'écran dans l'heure avant de te coucher, MYLIDE ajoute un bonus de qualité à ton score de sommeil.",
  },
  {
    id: 26, cat: "sommeil",
    q: "Pourquoi le sommeil influence-t-il ma nutrition ?",
    a: "Le manque de sommeil augmente la ghréline (hormone de la faim) et diminue la leptine (hormone de satiété). MYLIDE en tient compte : quand tu dors peu, les recommandations nutritionnelles deviennent plus strictes pour compenser.",
  },
  {
    id: 27, cat: "sommeil",
    q: "Comment est calculée l'heure de coucher recommandée ?",
    a: "MYLIDE analyse l'heure à laquelle tu te lèves habituellement et remonte 8h en arrière, puis ajoute 20 minutes pour l'endormissement. Cette heure est affichée dans le widget sommeil et dans tes recommandations du soir.",
  },

  // ── SPORT (12) ────────────────────────────────────────────────────────────
  {
    id: 28, cat: "sport",
    q: "Qu'est-ce que le taux de récupération ?",
    a: "Le taux de récupération est une note de 1 à 5 que tu attribues à ton ressenti physique après une séance. Il indique si ton corps est prêt pour un nouvel effort ou s'il a besoin de repos. MYLIDE l'utilise pour anticiper tes capacités du lendemain.",
  },
  {
    id: 29, cat: "sport",
    q: "Quand faut-il saisir une séance de sport ?",
    a: "Tu dois saisir ta séance APRÈS l'avoir effectuée, jamais avant. MYLIDE a besoin des données réelles (durée, intensité, ressenti) pour calculer ton score de récupération et ajuster tes recommandations du lendemain.",
  },
  {
    id: 30, cat: "sport",
    q: "Comment est calculé le score sport ?",
    a: "Le score sport combine : la cohérence avec ton programme (PPL, full body…), l'intensité de la séance, le taux de récupération et le respect des jours de repos. Une semaine équilibrée avec des jours de repos bien placés obtiendra un meilleur score qu'une semaine intensive sans repos.",
  },
  {
    id: 31, cat: "sport",
    q: "Que signifie l'intensité de la séance ?",
    a: "L'intensité va de 1 (marche légère) à 5 (entraînement HIIT maximal ou compétition). Elle influence le calcul calorique et le temps de récupération estimé. Une intensité 5 génère automatiquement une recommandation de repos le lendemain.",
  },
  {
    id: 32, cat: "sport",
    q: "Qu'est-ce que le programme PPL ?",
    a: "PPL signifie Push / Pull / Legs, un programme de musculation en 6 séances par semaine : 2 séances de poussé, 2 de tiré, 2 de jambes. MYLIDE peut suivre ta progression dans ce programme et t'alerter si tu sautilles les groupes musculaires.",
  },
  {
    id: 33, cat: "sport",
    q: "Qu'est-ce que le MET (équivalent métabolique) ?",
    a: "Le MET est une unité qui mesure l'intensité d'une activité par rapport au repos. La marche vaut environ 3 METs, le vélo modéré 6 METs, la course rapide 10 METs. MYLIDE utilise le MET pour estimer les calories brûlées selon ton poids.",
  },
  {
    id: 34, cat: "sport",
    q: "Comment le sport influence-t-il mes besoins caloriques ?",
    a: "Chaque séance enregistrée augmente ton TDEE (dépense énergétique totale) pour la journée. MYLIDE recalcule automatiquement tes macros recommandées en fonction de l'effort fourni, notamment pour les protéines et les glucides.",
  },
  {
    id: 35, cat: "sport",
    q: "Que se passe-t-il si je m'entraîne plusieurs jours d'affilée ?",
    a: "MYLIDE génère un avertissement après 4 jours consécutifs d'entraînement à intensité moyenne ou haute. Le surentraînement est une vraie menace pour la récupération et les performances. Un repos actif est alors recommandé.",
  },
  {
    id: 36, cat: "sport",
    q: "Qu'est-ce que le 'repos actif' ?",
    a: "Le repos actif est une journée sans entraînement intense mais avec une activité légère : marche, yoga, étirements ou nage douce. Il favorise la récupération musculaire sans surcharger le système nerveux. MYLIDE le comptabilise positivement.",
  },
  {
    id: 37, cat: "sport",
    q: "MYLIDE peut-il suivre ma fréquence cardiaque ?",
    a: "Actuellement, tu peux saisir manuellement ta fréquence cardiaque au repos dans la section Corps. La synchronisation automatique avec les montres connectées (Apple Watch, Garmin) est en cours de développement.",
  },
  {
    id: 38, cat: "sport",
    q: "Comment est calculée mon allure de course ?",
    a: "L'allure est calculée à partir de la distance et du temps que tu saisis après ta séance de course à pied. Elle est affichée en min/km et MYLIDE suit ton évolution sur le temps pour visualiser ta progression.",
  },
  {
    id: 39, cat: "sport",
    q: "Quels types de sport MYLIDE reconnaît-il ?",
    a: "MYLIDE propose plus de 30 types d'activités : musculation, course, vélo, natation, yoga, HIIT, sports collectifs, arts martiaux, escalade, etc. Tu peux aussi créer une activité personnalisée avec ton propre nom.",
  },

  // ── NUTRITION (15) ────────────────────────────────────────────────────────
  {
    id: 40, cat: "nutrition",
    q: "Comment sont calculés mes macros ?",
    a: "Tes macros (protéines, glucides, lipides) sont calculées à partir de ton poids, ta taille, ton âge, ton sexe, ton niveau d'activité et ton objectif (maintien, prise de masse, sèche, perte de poids). La formule de Mifflin-St Jeor est utilisée pour estimer ton métabolisme de base.",
  },
  {
    id: 41, cat: "nutrition",
    q: "Qu'est-ce que le TDEE ?",
    a: "Le TDEE (Total Daily Energy Expenditure) est ta dépense énergétique totale sur 24h, incluant ton métabolisme de base et tes activités physiques. C'est le nombre de calories que tu dois manger pour maintenir ton poids actuel.",
  },
  {
    id: 42, cat: "nutrition",
    q: "Qu'est-ce que l'objectif 'Maintien' ?",
    a: "En maintien, tu consommes exactement tes calories de maintenance (TDEE). L'objectif est de stabiliser ton poids tout en optimisant ta composition corporelle. Les macros sont équilibrées entre protéines, glucides et lipides.",
  },
  {
    id: 43, cat: "nutrition",
    q: "Qu'est-ce que la 'Prise de masse' ?",
    a: "La prise de masse (ou 'bulk') consiste à consommer un surplus calorique (généralement +300 à +500 kcal/jour) pour favoriser la croissance musculaire. MYLIDE augmente les glucides et les protéines et recommande un entraînement de musculation adapté.",
  },
  {
    id: 44, cat: "nutrition",
    q: "Qu'est-ce que la 'Sèche' ?",
    a: "La sèche est une phase de déficit calorique visant à réduire la masse grasse tout en préservant la masse musculaire. MYLIDE recommande un déficit modéré de -300 à -500 kcal/jour et augmente les protéines pour limiter la perte musculaire.",
  },
  {
    id: 45, cat: "nutrition",
    q: "Qu'est-ce que la 'Perte de poids' ?",
    a: "La perte de poids est similaire à la sèche mais sans objectif de préservation musculaire spécifique. Elle convient aux personnes qui ne font pas de musculation. Le déficit calorique est adapté pour viser -0,5 à -1 kg par semaine.",
  },
  {
    id: 46, cat: "nutrition",
    q: "Pourquoi boire plus d'eau pendant une sèche ?",
    a: "L'eau est essentielle pour éliminer les déchets métaboliques produits lors de la lipolyse (dégradation des graisses). Elle favorise aussi la satiété, réduit la rétention d'eau paradoxale et améliore les performances à l'entraînement.",
  },
  {
    id: 47, cat: "nutrition",
    q: "Pourquoi les protéines sont-elles si importantes ?",
    a: "Les protéines sont les briques de la construction musculaire et de la récupération. Elles ont aussi le meilleur effet thermique des macronutriments (30 % des calories consommées servent à les digérer) et le pouvoir rassasiant le plus élevé.",
  },
  {
    id: 48, cat: "nutrition",
    q: "Qu'est-ce que les glucides ?",
    a: "Les glucides sont la principale source d'énergie de ton cerveau et de tes muscles. MYLIDE distingue les glucides complexes (avoine, riz complet) à favoriser des glucides simples (sucre raffiné) à limiter. Ils sont ajustés selon ton niveau d'activité.",
  },
  {
    id: 49, cat: "nutrition",
    q: "Qu'est-ce que les lipides ?",
    a: "Les lipides (graisses) sont essentiels à la production hormonale, à l'absorption des vitamines liposolubles (A, D, E, K) et à la santé cardiovasculaire. MYLIDE recommande de privilégier les graisses insaturées (avocat, huile d'olive, noix).",
  },
  {
    id: 50, cat: "nutrition",
    q: "Pourquoi la junk food est-elle pénalisée dans le score ?",
    a: "La junk food apporte des calories vides (peu de micronutriments) et génère des pics d'insuline qui perturbent l'énergie et l'humeur. MYLIDE la pénalise non pour te juger, mais pour te rappeler l'impact sur tes performances globales.",
  },
  {
    id: 51, cat: "nutrition",
    q: "Comment les suggestions de repas sont-elles personnalisées ?",
    a: "Les suggestions tiennent compte de tes macros du jour, de tes préférences alimentaires renseignées, de ton objectif et de tes intolérances déclarées. Elles s'affinent au fil du temps selon tes habitudes enregistrées.",
  },
  {
    id: 52, cat: "nutrition",
    q: "Que fait le bouton 'Appliquer' dans les suggestions nutritionnelles ?",
    a: "Le bouton 'Appliquer' remplace tes objectifs de macros journaliers par les valeurs suggérées par MYLIDE pour aujourd'hui. Il prend en compte ta séance sportive du jour et ton niveau d'énergie déclaré.",
  },
  {
    id: 53, cat: "nutrition",
    q: "Est-ce que MYLIDE prend en charge les régimes vegans ?",
    a: "Oui. Tu peux activer le filtre 'Vegan' ou 'Végétarien' dans tes préférences nutritionnelles. Les suggestions de repas et les sources de protéines recommandées s'adaptent automatiquement (légumineuses, tofu, protéines végétales).",
  },
  {
    id: 54, cat: "nutrition",
    q: "Pourquoi mes calories sont-elles ajustées les jours de sport ?",
    a: "Les jours d'entraînement, ton TDEE augmente. MYLIDE recalcule automatiquement tes besoins caloriques en ajoutant les calories brûlées estimées lors de ta séance. Les glucides en particulier sont augmentés pour soutenir l'effort et la récupération.",
  },

  // ── CORPS (8) ─────────────────────────────────────────────────────────────
  {
    id: 55, cat: "corps",
    q: "Comment fonctionne l'objectif de poids ?",
    a: "Tu renseignes ton poids actuel et ton poids cible. MYLIDE calcule le déficit ou surplus calorique quotidien nécessaire pour atteindre cet objectif dans un délai réaliste, généralement à raison de 0,5 à 1 % de ton poids corporel par semaine.",
  },
  {
    id: 56, cat: "corps",
    q: "Quelle formule est utilisée pour estimer la composition corporelle ?",
    a: "MYLIDE utilise la formule de Mifflin-St Jeor pour le métabolisme de base et des indices anthropométriques (tour de taille, hanche, cou) pour estimer le pourcentage de masse grasse selon la méthode de la Marine américaine.",
  },
  {
    id: 57, cat: "corps",
    q: "Pourquoi viser 0,5 à 1 % de perte par semaine ?",
    a: "Au-delà de 1 % de ton poids par semaine, tu risques de perdre significativement du muscle en plus de la graisse. Un rythme de 0,5 à 1 % par semaine maximise la perte de masse grasse tout en préservant tes performances sportives.",
  },
  {
    id: 58, cat: "corps",
    q: "À quoi sert la mesure du tour de taille ?",
    a: "Le tour de taille est un indicateur de santé métabolique plus fiable que le poids seul. La graisse abdominale est associée à un risque cardiovasculaire plus élevé. MYLIDE suit son évolution pour te donner une image plus complète de ta santé.",
  },
  {
    id: 59, cat: "corps",
    q: "Qu'est-ce que la fréquence cardiaque au repos ?",
    a: "La fréquence cardiaque au repos (FCR) est le nombre de battements par minute quand tu es totalement relaxé. Une FCR basse (40-60 bpm chez les sportifs) indique une bonne santé cardiovasculaire. MYLIDE suit son évolution pour détecter le surmenage.",
  },
  {
    id: 60, cat: "corps",
    q: "Comment est calculée ma fréquence cardiaque maximale ?",
    a: "MYLIDE utilise la formule de Tanaka : FCmax = 208 - (0,7 × âge). C'est une estimation. Si tu as réalisé un test d'effort médical, tu peux entrer ta vraie FCmax pour des recommandations d'entraînement plus précises.",
  },
  {
    id: 61, cat: "corps",
    q: "Comment prendre correctement mes mensurations ?",
    a: "Pour le tour de taille : mesure à mi-chemin entre le bas des côtes et le haut du bassin, après une expiration normale. Pour les hanches : au niveau des fessiers les plus larges. Pour le cou : juste en dessous du larynx. Mesure toujours le matin à jeun.",
  },
  {
    id: 62, cat: "corps",
    q: "La synchronisation Apple Watch sera-t-elle disponible ?",
    a: "Oui, la synchronisation avec Apple Watch et Apple Health est prévue dans les prochaines versions. Elle permettra d'importer automatiquement fréquence cardiaque, étapes, séances sportives et données de sommeil.",
  },

  // ── MENTAL (8) ────────────────────────────────────────────────────────────
  {
    id: 63, cat: "mental",
    q: "Comment est calculé le score mental ?",
    a: "Le score mental prend en compte ton humeur déclarée (1-5), la durée de méditation, la lecture, la cohérence cardiaque et les activités de développement personnel. Il pondère également les alertes de stress croisées avec les données de sommeil et de travail.",
  },
  {
    id: 64, cat: "mental",
    q: "Comment la lecture influence-t-elle le score mental ?",
    a: "La lecture de non-fiction active les réseaux de pensée critique et d'apprentissage. MYLIDE valorise les sessions de lecture de plus de 20 minutes et les comptabilise positivement dans le score mental, car c'est une des habitudes les mieux documentées pour la longévité cognitive.",
  },
  {
    id: 65, cat: "mental",
    q: "Quel est l'effet de la méditation ?",
    a: "Même 10 minutes de méditation quotidienne réduisent le cortisol (hormone du stress) et améliorent la régulation émotionnelle. MYLIDE enregistre tes sessions de méditation et affiche leur impact sur ton humeur et ton sommeil dans les corrélations.",
  },
  {
    id: 66, cat: "mental",
    q: "Comment l'état mental impacte-t-il la productivité ?",
    a: "Un état mental dégradé réduit la capacité d'attention, la mémoire de travail et la prise de décision. MYLIDE ajuste ton score de travail en conséquence et te recommande des activités de récupération mentale plutôt que des sessions de deep work intenses.",
  },
  {
    id: 67, cat: "mental",
    q: "Qu'est-ce que la cohérence cardiaque ?",
    a: "La cohérence cardiaque est une technique de respiration (6 cycles par minute) qui synchronise le rythme cardiaque et le système nerveux autonome. Elle réduit le stress en 5 minutes et améliore la clarté mentale. MYLIDE te permet de logger tes sessions.",
  },
  {
    id: 68, cat: "mental",
    q: "Pourquoi une humeur basse déclenche-t-elle des alertes ?",
    a: "Une humeur constamment basse (moins de 2/5 sur plusieurs jours) peut indiquer un épuisement, un surmenage ou un épisode dépressif. MYLIDE t'alerte pour que tu fasses le point et te propose des ressources adaptées, sans jamais remplacer un professionnel de santé.",
  },
  {
    id: 69, cat: "mental",
    q: "Comment le mental est-il connecté au sommeil ?",
    a: "Le stress et l'anxiété sont parmi les principales causes d'insomnie. MYLIDE détecte les corrélations entre tes scores mentaux bas et tes nuits difficiles et te suggère des pratiques de relaxation en soirée pour améliorer la transition vers le sommeil.",
  },
  {
    id: 70, cat: "mental",
    q: "À quoi sert le champ 'Apprentissage de compétences' ?",
    a: "Ce champ permet de tracer le temps consacré à apprendre de nouvelles compétences (cours en ligne, formation, pratique délibérée). C'est un indicateur de croissance personnelle que MYLIDE intègre dans le score mental et dans le suivi de tes objectifs de développement.",
  },

  // ── TRAVAIL (10) ──────────────────────────────────────────────────────────
  {
    id: 71, cat: "travail",
    q: "Comment est calculé le score de focus ?",
    a: "Le score de focus combine : le nombre de tâches complétées, la durée de deep work déclarée, le temps d'écran (inversement corrélé) et ton niveau d'énergie du jour. Un bon score reflète une journée productive sans surcharge.",
  },
  {
    id: 72, cat: "travail",
    q: "Comment les tâches sont-elles comptabilisées ?",
    a: "Chaque tâche cochée dans le journal du jour est enregistrée. MYLIDE suit le taux de complétion sur la semaine (tâches réalisées / tâches planifiées) et l'affiche dans les stats travail. Consigne des tâches réalistes pour avoir des métriques utiles.",
  },
  {
    id: 73, cat: "travail",
    q: "Qu'est-ce que l'impact du temps d'écran ?",
    a: "Un temps d'écran excessif (plus de 10h/jour) est associé à une fatigue oculaire, une réduction de la productivité et une perturbation du sommeil. MYLIDE le comptabilise comme un facteur de stress et l'intègre dans le calcul du score de travail.",
  },
  {
    id: 74, cat: "travail",
    q: "Pourquoi le temps d'écran affecte-t-il le sommeil ?",
    a: "La lumière bleue des écrans (téléphone, ordinateur) inhibe la production de mélatonine, l'hormone du sommeil. Un temps d'écran élevé le soir retarde l'endormissement et réduit la durée du sommeil profond. MYLIDE corrèle ces deux métriques dans tes statistiques.",
  },
  {
    id: 75, cat: "travail",
    q: "Quelle est la formule du score de travail ?",
    a: "Score = (tâches complétées × 0,4) + (deep work hours × 0,3) + (énergie × 0,2) - (surcharge × 0,1). Les poids sont calibrés pour valoriser la qualité de travail sur la quantité brute.",
  },
  {
    id: 76, cat: "travail",
    q: "À quoi sert le champ 'Highlight' ?",
    a: "Le highlight est la réalisation la plus importante de ta journée, en une phrase. C'est une pratique du livre 'Make Time' qui t'aide à prioriser ce qui compte vraiment. MYLIDE l'utilise pour identifier tes patterns de productivité sur le long terme.",
  },
  {
    id: 77, cat: "travail",
    q: "Comment améliorer mon deep work ?",
    a: "MYLIDE recommande des blocs de 90 à 120 minutes sans interruption, avec le téléphone en mode avion. Planifie ton deep work le matin (quand le cortisol est naturellement plus élevé) et active le mode 'Ne pas déranger'. La régularité est plus efficace que la durée brute.",
  },
  {
    id: 78, cat: "travail",
    q: "Comment le travail est-il connecté au stress ?",
    a: "Un score de travail élevé combiné à peu de récupération (sommeil court, pas de sport) est un signal de burnout potentiel. MYLIDE détecte ce pattern et t'alerte avant que ça devienne problématique, en suggérant des journées de décompression.",
  },
  {
    id: 79, cat: "travail",
    q: "Comment est calculé le taux de complétion des tâches ?",
    a: "Le taux = tâches complétées / tâches planifiées × 100. MYLIDE affiche ce taux en stats hebdomadaires. Un taux chroniquement bas signifie que tu planifies trop ; un taux de 100 % tous les jours peut indiquer que tu ne te défies pas assez.",
  },
  {
    id: 80, cat: "travail",
    q: "Que sont les alertes de déséquilibre travail-vie ?",
    a: "Quand tu travailles plus de 10h pendant 3 jours consécutifs sans journée de récupération, MYLIDE génère une alerte de déséquilibre. Elle te rappelle que la performance à long terme dépend d'une alternance travail/repos saine.",
  },

  // ── ARGENT (8) ────────────────────────────────────────────────────────────
  {
    id: 81, cat: "argent",
    q: "Que sont les 'poches' dans MYLIDE ?",
    a: "Les poches sont des enveloppes budgétaires que tu crées librement : loyer, nourriture, loisirs, épargne, investissement… Elles t'aident à visualiser où va ton argent chaque mois sans avoir à connecter de compte bancaire.",
  },
  {
    id: 82, cat: "argent",
    q: "Comment mettre à jour mon patrimoine ?",
    a: "Tu peux mettre à jour ton patrimoine manuellement à la fréquence que tu souhaites (mensuellement conseillé). Il suffit d'entrer la valeur actuelle de chaque actif (compte courant, épargne, investissements, immobilier) et MYLIDE calcule le total et l'évolution.",
  },
  {
    id: 83, cat: "argent",
    q: "Qu'est-ce que le simulateur financier ?",
    a: "Le simulateur te permet de modéliser des scénarios : que se passe-t-il si j'épargne 200€ de plus par mois ? En combien de temps j'atteins mon objectif de patrimoine ? Il utilise des hypothèses de rendement conservatrices que tu peux ajuster.",
  },
  {
    id: 84, cat: "argent",
    q: "Qu'est-ce que le 'flux quotidien' ?",
    a: "Le flux quotidien est le résultat de tes revenus moins tes dépenses divisé par le nombre de jours du mois. Il te donne une vision concrète de ce que tu 'gagnes' ou 'perds' chaque jour, utile pour prendre de meilleures décisions d'achat.",
  },
  {
    id: 85, cat: "argent",
    q: "Comment suivre mes investissements dans MYLIDE ?",
    a: "Tu peux créer une poche 'Investissements' et y entrer la valeur mensuelle de ton portefeuille (actions, ETF, crypto…). MYLIDE suit l'évolution et l'intègre dans le calcul de ton patrimoine global et dans le suivi de tes objectifs financiers.",
  },
  {
    id: 86, cat: "argent",
    q: "Comment les objectifs financiers sont-ils liés au patrimoine ?",
    a: "Quand tu crées un objectif de type 'Patrimoine' (ex : atteindre 50 000€), MYLIDE lit automatiquement la valeur courante de ton patrimoine pour calculer la progression. La barre de l'objectif se met à jour dès que tu actualises ton patrimoine.",
  },
  {
    id: 87, cat: "argent",
    q: "L'argent influence-t-il le stress dans MYLIDE ?",
    a: "Oui. Si tu déclares une situation financière préoccupante ou un flux quotidien négatif persistant, MYLIDE l'intègre comme facteur de stress dans le score mental. L'argent est un vecteur de stress majeur et mérite d'être suivi sérieusement.",
  },
  {
    id: 88, cat: "argent",
    q: "Les fonctionnalités de transactions automatiques arrivent-elles bientôt ?",
    a: "Oui. Une connexion Open Banking (lecture seule) est en développement pour importer automatiquement les transactions de tes comptes bancaires. Elle sera optionnelle et sécurisée via agrégateur certifié. Aucune donnée de paiement ne transitera par nos serveurs.",
  },

  // ── OBJECTIFS (10) ────────────────────────────────────────────────────────
  {
    id: 89, cat: "objectifs",
    q: "Comment les objectifs sont-ils liés aux données ?",
    a: "Les objectifs 'intelligents' se connectent à une métrique de MYLIDE (poids, patrimoine, séances sport, score sommeil…). La progression est calculée automatiquement à partir de tes entrées quotidiennes, sans saisie manuelle supplémentaire.",
  },
  {
    id: 90, cat: "objectifs",
    q: "Qu'est-ce qu'un objectif manuel ?",
    a: "Un objectif manuel n'est pas connecté à une métrique. Tu mets à jour la progression toi-même, en pourcentage ou avec une valeur numérique. Utile pour des objectifs qualitatifs comme 'Lire 12 livres dans l'année' ou 'Apprendre la guitare'.",
  },
  {
    id: 91, cat: "objectifs",
    q: "Comment fonctionne la progression automatique ?",
    a: "MYLIDE lit la valeur actuelle de la métrique liée à ton objectif chaque jour. Si tu vises 75 kg et que tu pèses 82 kg au départ, la progression reflète ton avancement réel selon les pesées que tu enregistres dans la section Corps.",
  },
  {
    id: 92, cat: "objectifs",
    q: "Comment l'objectif de patrimoine est-il calculé ?",
    a: "La progression = (patrimoine actuel - patrimoine de départ) / (patrimoine cible - patrimoine de départ) × 100. Si tu avais 10 000€ au départ, que tu vises 50 000€ et que tu en as 20 000€ aujourd'hui, tu es à 25 % de ton objectif.",
  },
  {
    id: 93, cat: "objectifs",
    q: "Quelle est la différence entre un objectif quotidien et un objectif unique ?",
    a: "Un objectif quotidien est un comportement à répéter chaque jour (ex : boire 2L d'eau, méditer 10 min). Un objectif unique est un résultat à atteindre à une date précise (ex : peser 75 kg au 1er septembre). MYLIDE les traite différemment dans les statistiques.",
  },
  {
    id: 94, cat: "objectifs",
    q: "Comment définir une date limite pour un objectif ?",
    a: "Lors de la création d'un objectif, tu peux définir une date d'échéance. MYLIDE calcule automatiquement le rythme quotidien nécessaire pour atteindre l'objectif à temps et t'alerte si tu es en retard par rapport à cette trajectoire.",
  },
  {
    id: 95, cat: "objectifs",
    q: "À quoi correspondent les couleurs des objectifs ?",
    a: "Les couleurs permettent de classer visuellement tes objectifs par domaine : rouge pour la santé, bleu pour le travail/apprentissage, vert pour les finances, violet pour le personnel… Tu peux personnaliser les couleurs selon tes préférences.",
  },
  {
    id: 96, cat: "objectifs",
    q: "Qu'est-ce qu'un objectif inversé ?",
    a: "Un objectif inversé est un objectif où une valeur plus basse signifie une meilleure progression. Par exemple : 'Réduire mon temps d'écran sous 4h/jour'. MYLIDE l'identifie automatiquement quand tu définis une valeur cible inférieure à la valeur de départ.",
  },
  {
    id: 97, cat: "objectifs",
    q: "Comment prioriser mes objectifs ?",
    a: "Tu peux réorganiser tes objectifs par glisser-déposer sur l'écran. Ceux en haut de la liste sont considérés comme prioritaires et MYLIDE les met en avant dans tes recommandations quotidiennes.",
  },
  {
    id: 98, cat: "objectifs",
    q: "Quelles catégories d'objectifs existent ?",
    a: "MYLIDE propose : Santé & Corps, Performance sportive, Sommeil, Nutrition, Mental & Bien-être, Finances, Travail & Carrière, Apprentissage, Relations, et Projet personnel. Chaque catégorie se connecte aux métriques correspondantes.",
  },

  // ── STATS (8) ─────────────────────────────────────────────────────────────
  {
    id: 99, cat: "stats",
    q: "Quelle est la plage de dates disponible dans les stats ?",
    a: "Par défaut, les stats s'affichent sur les 30 derniers jours. Tu peux changer la plage à 7 jours, 90 jours, 6 mois, 1 an ou 'Depuis le début'. Plus la plage est longue, plus les tendances de fond sont visibles.",
  },
  {
    id: 100, cat: "stats",
    q: "Que signifie 'Depuis le début' dans les stats ?",
    a: "'Depuis le début' affiche toutes tes données depuis le premier jour où tu as utilisé MYLIDE. Cette vue est idéale pour mesurer ta progression globale sur le long terme et identifier des tendances saisonnières.",
  },
  {
    id: 101, cat: "stats",
    q: "Comment est calculée la moyenne de sommeil ?",
    a: "La moyenne de sommeil est calculée sur les jours où une entrée a été enregistrée dans la plage sélectionnée. Les jours sans entrée sont exclus du calcul pour éviter de fausser la moyenne avec des zéros.",
  },
  {
    id: 102, cat: "stats",
    q: "Comment lire le graphique d'évolution du poids ?",
    a: "Le graphique affiche ton poids enregistré sur la période, avec une ligne de tendance lissée. La ligne de tendance filtre les variations quotidiennes normales (eau, transit) pour montrer l'évolution réelle sur le moyen terme.",
  },
  {
    id: 103, cat: "stats",
    q: "Qu'est-ce que la heatmap montre ?",
    a: "La heatmap (carte de chaleur) affiche chaque jour de l'année colorisé selon ton score global. Les jours verts sont bons, les jours rouges sont difficiles. Elle te permet de visualiser d'un coup d'œil tes périodes de forme et de creux.",
  },
  {
    id: 104, cat: "stats",
    q: "Comment fonctionne la détection de patterns ?",
    a: "MYLIDE analyse tes données sur 90 jours minimum pour détecter des régularités : 'Tu performes mieux le mardi', 'Tes nuits sont plus courtes en fin de semaine', 'Ton humeur baisse le dimanche soir'. Ces insights s'affichent dans le tableau de bord principal.",
  },
  {
    id: 105, cat: "stats",
    q: "Comment interpréter le graphique d'évolution du score global ?",
    a: "Le graphique montre ton score jour par jour avec une moyenne mobile sur 7 jours. La moyenne mobile est plus utile que le score brut car elle filtre le bruit quotidien. Une tendance haussière sur 30 jours signifie que tu t'améliores globalement.",
  },
  {
    id: 106, cat: "stats",
    q: "Pourquoi les données historiques sont-elles importantes ?",
    a: "Les données historiques sont la mémoire de MYLIDE. Sans elles, l'application ne peut pas détecter les corrélations, identifier les tendances ou personnaliser les recommandations. Plus tu enregistres régulièrement, plus l'IA devient précise.",
  },

  // ── DONNÉES (7) ──────────────────────────────────────────────────────────
  {
    id: 107, cat: "donnees",
    q: "Quelles données MYLIDE stocke-t-il ?",
    a: "MYLIDE stocke tes entrées quotidiennes (sommeil, sport, nutrition, humeur, travail, finances, poids, mensurations), tes objectifs, tes paramètres de profil et les métadonnées associées. Aucune donnée de localisation ou de contact n'est collectée.",
  },
  {
    id: 108, cat: "donnees",
    q: "Mes données sont-elles chiffrées ?",
    a: "Oui. Toutes les données sont chiffrées en transit via TLS 1.3 et stockées au repos avec AES-256. Les sauvegardes sont également chiffrées. La clé de chiffrement est gérée côté serveur avec rotation régulière.",
  },
  {
    id: 109, cat: "donnees",
    q: "Qui a accès à mes données ?",
    a: "Seul toi as accès à tes données personnelles. L'équipe MYLIDE peut accéder à des données agrégées et anonymisées pour améliorer le produit, mais jamais à des données identifiables sans ton consentement explicite et une raison légitime.",
  },
  {
    id: 110, cat: "donnees",
    q: "Comment exporter mes données ?",
    a: "Rends-toi dans Paramètres > Données > Exporter. Tu peux choisir le format (JSON ou CSV) et la plage de dates. L'export est généré en quelques secondes et envoyé par email à ton adresse enregistrée, ou téléchargeable directement.",
  },
  {
    id: 111, cat: "donnees",
    q: "Comment supprimer mon compte ?",
    a: "Pour supprimer ton compte, va dans Paramètres > Compte > Supprimer le compte. La suppression est définitive et irréversible : toutes tes données sont effacées sous 30 jours conformément au RGPD. Un email de confirmation te sera envoyé.",
  },
  {
    id: 112, cat: "donnees",
    q: "MYLIDE est-il conforme au RGPD ?",
    a: "Oui. MYLIDE est conforme au Règlement Général sur la Protection des Données (RGPD). Tu disposes d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Tu peux exercer ces droits à tout moment depuis les paramètres ou par email.",
  },
  {
    id: 113, cat: "donnees",
    q: "La synchronisation avec Apple Health est-elle disponible ?",
    a: "La synchronisation avec Apple Health (iOS) et Google Fit (Android) est en cours de développement et sera disponible dans une prochaine mise à jour majeure. Elle permettra d'importer automatiquement pas, fréquence cardiaque, sommeil et entraînements.",
  },

  // ── QUESTIONS SUPPLÉMENTAIRES (bonus pour atteindre 120+) ─────────────────
  {
    id: 114, cat: "general",
    q: "MYLIDE remplace-t-il un médecin ou un thérapeute ?",
    a: "Non. MYLIDE est un outil de suivi et de conscience de soi, pas un outil médical. Il ne diagnostique aucune maladie et ne remplace pas l'avis d'un professionnel de santé. Si tu traverses une période difficile, consulte un médecin ou un psychologue.",
  },
  {
    id: 115, cat: "sommeil",
    q: "Les siestes sont-elles comptabilisées dans le score sommeil ?",
    a: "Oui. Tu peux enregistrer une sieste séparément. Une sieste de 20 à 30 minutes est valorisée positivement ; une sieste de plus d'une heure après 15h peut avoir un effet négatif sur l'endormissement nocturne et est comptabilisée avec un coefficient réduit.",
  },
  {
    id: 116, cat: "sport",
    q: "Puis-je enregistrer plusieurs séances le même jour ?",
    a: "Oui. Si tu fais une séance de musculation le matin et une session de yoga le soir, tu peux créer deux entrées sport pour la même journée. MYLIDE les additionne pour calculer ta charge totale et évaluer ton temps de récupération.",
  },
  {
    id: 117, cat: "nutrition",
    q: "MYLIDE compte-t-il les calories de l'alcool ?",
    a: "L'alcool peut être saisi comme une entrée nutritionnelle. L'alcool apporte 7 kcal/g (plus que les glucides ou protéines) et n'a aucune valeur nutritive. MYLIDE l'intègre dans le total calorique et signale son impact sur le sommeil et la récupération.",
  },
  {
    id: 118, cat: "mental",
    q: "Comment logger une séance de thérapie dans MYLIDE ?",
    a: "Tu peux la saisir dans le champ 'Apprentissage & développement personnel' avec la durée, ou la noter dans le journal mental avec une note subjective. MYLIDE valorise positivement tout investissement dans ta santé mentale.",
  },
  {
    id: 119, cat: "travail",
    q: "MYLIDE peut-il synchroniser mes tâches avec un gestionnaire de tâches externe ?",
    a: "Une intégration avec Notion, Todoist et Apple Reminders est prévue dans les prochaines versions. En attendant, les tâches sont saisies manuellement dans le journal de travail quotidien de MYLIDE.",
  },
  {
    id: 120, cat: "objectifs",
    q: "Puis-je partager un objectif avec quelqu'un d'autre ?",
    a: "La fonctionnalité de partage d'objectifs entre utilisateurs est en développement. Elle permettra de créer des défis mutuels ou de suivre des objectifs communs (sportifs, financiers) avec un ami ou un partenaire.",
  },
  {
    id: 121, cat: "stats",
    q: "Puis-je comparer deux périodes entre elles ?",
    a: "La comparaison de périodes (ex : ce mois-ci vs le mois dernier) sera disponible dans une prochaine mise à jour des statistiques. Pour l'instant, tu peux changer manuellement la plage de dates et noter les valeurs à comparer.",
  },
  {
    id: 122, cat: "corps",
    q: "À quelle fréquence dois-je me peser pour de meilleures données ?",
    a: "MYLIDE recommande de te peser le matin à jeun, après être allé aux toilettes, idéalement 3 à 5 fois par semaine. Cette fréquence permet d'avoir une tendance fiable tout en lissant les variations naturelles dues à l'hydratation et au transit.",
  },
  {
    id: 123, cat: "argent",
    q: "MYLIDE est-il sécurisé pour saisir des données financières ?",
    a: "Oui. Les données financières que tu saisis dans MYLIDE sont des montants généraux (patrimoine, budget, revenus), pas des numéros de compte ou de carte. Elles sont chiffrées comme toutes les autres données et ne sont jamais partagées.",
  },
];

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "all",       label: "Tout" },
  { key: "general",  label: "Général" },
  { key: "sommeil",  label: "Sommeil" },
  { key: "sport",    label: "Sport" },
  { key: "nutrition",label: "Nutrition" },
  { key: "corps",    label: "Corps" },
  { key: "mental",   label: "Mental" },
  { key: "travail",  label: "Travail" },
  { key: "argent",   label: "Argent" },
  { key: "objectifs",label: "Objectifs" },
  { key: "stats",    label: "Stats" },
  { key: "donnees",  label: "Données" },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────

function IconSearch({ size = 18, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChevron({ size = 18, color, open }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconArrowLeft({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ─── ACCORDION ITEM ──────────────────────────────────────────────────────────

function AccordionItem({ item, isOpen, onToggle, C }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${isOpen ? C.red + "44" : C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: isOpen
          ? `0 4px 20px ${C.red}12`
          : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Question row */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          minHeight: 44,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: isOpen ? 600 : 500,
            color: isOpen ? C.red : C.text,
            lineHeight: 1.45,
            fontFamily: "'DM Sans', sans-serif",
            transition: "color 0.18s ease",
          }}
        >
          {item.q}
        </span>
        <IconChevron size={18} color={isOpen ? C.red : C.muted} open={isOpen} />
      </button>

      {/* Answer - max-height animation trick */}
      <div
        style={{
          maxHeight: isOpen ? 600 : 0,
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease, opacity 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "0 16px 16px 16px",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: C.muted,
            fontFamily: "'DM Sans', sans-serif",
            borderTop: `1px solid ${C.border}`,
            paddingTop: 12,
            marginTop: 0,
          }}
        >
          {item.a}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function FAQPage({ onBack }) {
  const C = useC();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchCat = activeCategory === "all" || item.cat === activeCategory;
      const matchQuery =
        !q ||
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [query, activeCategory]);

  function handleToggle(id) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function handleCategoryChange(key) {
    setActiveCategory(key);
    setOpenId(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 210,
        background: C.bg,
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: "'DM Sans', sans-serif",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(var(--c-bg-rgb, 248,248,246), 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            padding: "12px 16px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: C.surfaceAlt,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.18s",
            }}
            aria-label="Retour"
          >
            <IconArrowLeft size={20} color={C.text} />
          </button>

          {/* Title block */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              FAQ
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                marginTop: 1,
                fontWeight: 400,
              }}
            >
              Aide &amp; Documentation
            </div>
          </div>

          {/* Count badge */}
          <div
            style={{
              background: C.red + "15",
              border: `1px solid ${C.red}30`,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: C.red,
              flexShrink: 0,
            }}
          >
            {filtered.length}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "16px 16px 40px",
        }}
      >
        {/* ── SEARCH BAR ────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconSearch size={18} color={C.muted} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenId(null);
            }}
            placeholder="Rechercher une question…"
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              border: `1.5px solid ${query ? C.red + "60" : C.border}`,
              background: C.surfaceAlt,
              paddingLeft: 44,
              paddingRight: 16,
              fontSize: 15,
              color: C.text,
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              boxSizing: "border-box",
              transition: "border-color 0.18s ease",
              caretColor: C.red,
            }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: C.muted + "30",
                border: "none",
                borderRadius: 50,
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 13,
                color: C.muted,
                lineHeight: 1,
              }}
              aria-label="Effacer"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── CATEGORY PILLS ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginBottom: 20,
            paddingBottom: 4,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                style={{
                  flexShrink: 0,
                  height: 34,
                  borderRadius: 20,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  border: isActive ? `1.5px solid ${C.red}` : `1.5px solid ${C.border}`,
                  background: isActive ? C.red : C.surface,
                  color: isActive ? "#FFFFFF" : C.muted,
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap",
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── ACCORDION LIST ────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: C.muted,
              fontSize: 15,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>
              Aucun résultat
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              Essaie d'autres mots-clés ou change de catégorie.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
                C={C}
              />
            ))}
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 40,
            padding: "20px",
            background: C.surface,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              marginBottom: 6,
            }}
          >
            Vous n'avez pas trouvé votre réponse ?
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              lineHeight: 1.5,
            }}
          >
            Contactez-nous sur{" "}
            <span style={{ color: C.red, fontWeight: 500 }}>
              support@mylide.app
            </span>
            . On répond généralement en moins de 24h.
          </div>
        </div>
      </div>
    </div>
  );
}
