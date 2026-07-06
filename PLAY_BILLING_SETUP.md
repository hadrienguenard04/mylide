# 🟢 Mettre en place Google Play Billing — Guide MYLIDE

Ce guide liste **tout ce que tu dois faire toi-même** (comptes en ligne), en parallèle
du code déjà écrit dans le repo. Suis les étapes dans l'ordre.

> **Rappel** : le web continue d'utiliser Stripe. Google Play Billing sert **uniquement**
> à la version Android. Le code choisit automatiquement le bon système.

---

## ✅ Ce qui est DÉJÀ fait dans le code (moi)

- `src/playBilling.js` — déclenche le paiement Google dans l'appli Android
- `src/Subscription.jsx` — utilise Google sur Android, Stripe sur le web
- `src/planConfig.js` — IDs produits : `mylide_starter`, `mylide_pro`, `mylide_premium`
- `api/verify-google-purchase.js` — vérifie le paiement auprès de Google + active le plan
- `supabase-google-billing.sql` — colonnes à ajouter dans Supabase
- `package.json` — dépendance `google-auth-library` ajoutée

---

## 📋 CE QUE TU DOIS FAIRE

### Étape 1 — Installer la dépendance et déployer (5 min)

Dans le dossier du projet :

```bash
npm install
git add -A
git commit -m "Ajout Google Play Billing"
git push
```

Vercel redéploiera automatiquement.

---

### Étape 2 — Ajouter les colonnes Supabase (2 min)

1. Va sur **Supabase → ton projet → SQL Editor**
2. Copie-colle le contenu du fichier `supabase-google-billing.sql`
3. Clique **Run**

---

### Étape 3 — Créer les 3 abonnements dans Google Play Console (15 min)

> ⚠️ **PRÉREQUIS** : la page « Abonnements » n'affiche le bouton **« Créer un abonnement »**
> QUE si une version de l'appli **avec Google Play Billing activé** a déjà été importée.
> Si tu vois seulement « Importer un nouveau APK », fais D'ABORD l'**Étape 6**
> (reconstruire le `.aab` avec Play Billing) et importe-le dans un canal de test,
> puis reviens ici.

1. **Play Console → ton app MYLIDE → Monétiser → Produits → Abonnements**
2. Clique **Créer un abonnement** et crée-en **3**, avec ces **ID produit EXACTS** :

   | Plan     | ID produit (obligatoire, exact) | Prix       |
   |----------|---------------------------------|------------|
   | Starter  | `mylide_starter`                | 3,99 €/mois |
   | Pro      | `mylide_pro`                    | 6,99 €/mois |
   | Premium  | `mylide_premium`                | 12,99 €/mois |

3. Pour chaque abonnement, ajoute un **forfait de base** (mensuel, renouvellement auto).
4. Ajoute une **offre d'essai gratuit de 7 jours** sur chaque forfait de base
   (Offres → Ajouter une offre → Type « Essai gratuit » → 7 jours).
5. **Active** chaque abonnement.

> ⚠️ Si un ID ne correspond pas exactement (ex: `pro` au lieu de `mylide_pro`),
> le paiement échouera. Ils doivent être identiques à `androidSku` dans `planConfig.js`.

---

### Étape 4 — Créer le compte de service Google (pour que le serveur parle à Google) (15 min)

C'est ce qui permet à `api/verify-google-purchase.js` de vérifier les paiements.

1. **Google Play Console → Paramètres → Accès à l'API → Associer un projet Google Cloud**
   (crée un nouveau projet Cloud si demandé).
2. Va sur **Google Cloud Console → IAM et admin → Comptes de service → Créer**.
   - Nom : `mylide-play-billing`
   - Crée le compte, puis **Clés → Ajouter une clé → JSON** → un fichier `.json` se télécharge.
3. Retour dans **Play Console → Accès à l'API** : retrouve ce compte de service,
   clique **Accorder l'accès**, et donne-lui la permission
   **« Voir les données financières » + « Gérer les commandes et les abonnements »**.
4. Dans **Google Cloud → API et services → Bibliothèque**, active
   **« Google Play Android Developer API »**.

---

### Étape 5 — Mettre la clé dans Vercel (5 min)

1. Ouvre le fichier `.json` téléchargé à l'étape 4 (avec un éditeur de texte).
2. Copie **tout son contenu**.
3. Va sur **Vercel → ton projet → Settings → Environment Variables** et ajoute :

   | Nom                           | Valeur                                    |
   |-------------------------------|-------------------------------------------|
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | *(colle tout le contenu du fichier .json)* |
   | `GOOGLE_PLAY_PACKAGE_NAME`    | `app.mylide.pwa`                          |

4. **Redéploie** (Vercel → Deployments → Redeploy) pour appliquer.

---

### Étape 6 — Reconstruire l'appli Android avec Play Billing (10 min)

1. Va sur **https://www.pwabuilder.com** et entre l'URL `https://mylide.app`.
2. Génère le package **Android**.
3. Dans les options avancées, **coche « Include Google Play billing »** (ou
   « Enable Google Play billing »).
4. **TRÈS IMPORTANT** : utilise ta **clé de signature existante** (`signing.keystore`
   dans `Downloads/MYLIDE - Google Play package`), PAS une nouvelle — sinon Google
   refuse la mise à jour. PWABuilder te demande d'importer ta clé existante.
5. Télécharge le nouveau `.aab`.

---

### Étape 7 — Tester avant de publier (obligatoire)

1. **Play Console → Test → Test fermé** : envoie le nouveau `.aab`.
2. Ajoute ton compte Gmail comme **testeur avec licence** :
   **Play Console → Paramètres → Tests de licence → ajoute ton email**
   (ça permet de tester les achats sans être débité).
3. Installe l'appli depuis le lien de test, ouvre l'écran d'abonnement, achète un plan.
4. Vérifie que :
   - la feuille de paiement **Google** s'ouvre (pas Stripe),
   - après achat, ton plan passe bien à Pro/Premium dans l'app.

---

### Étape 8 — (Étape suivante, à faire ensemble) Renouvellements & annulations

Pour l'instant, le code **active** l'abonnement à l'achat. Il reste à gérer
automatiquement les **renouvellements mensuels** et les **annulations** côté Google
(l'équivalent du webhook Stripe). Ça se fait via les « Real-time Developer
Notifications » (Pub/Sub). Dis-moi quand l'étape 7 fonctionne et on enchaîne dessus.

---

## ❓ Récap simple

| Qui   | Quoi                                             |
|-------|--------------------------------------------------|
| Toi   | Étapes 1 à 7 (comptes Google, Vercel, Supabase)  |
| Moi   | Tout le code (déjà fait) + étape 8 ensuite       |

Si tu bloques sur une étape, dis-moi le **numéro de l'étape** et ce que tu vois à l'écran.
