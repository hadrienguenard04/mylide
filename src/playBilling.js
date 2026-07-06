// ─── MYLIDE - Google Play Billing (TWA) ───────────────────────────────────────
// Gère les abonnements quand l'app tourne DANS l'appli Android (TWA PWABuilder).
// Sur le web classique, ces fonctions ne font rien → on retombe sur Stripe.
//
// Fonctionnement : Android expose l'API "Digital Goods" + "Payment Request".
// On demande à Google de facturer l'abonnement, on récupère un "purchaseToken",
// puis on l'envoie à notre serveur (/api/verify-google-purchase) qui vérifie
// auprès de Google que le paiement est réel avant d'activer le plan dans Supabase.

const PLAY_BILLING_METHOD = "https://play.google.com/billing";

// L'app tourne-t-elle dans l'appli Android avec Play Billing disponible ?
export function isPlayBillingAvailable() {
  return typeof window !== "undefined" && "getDigitalGoodsService" in window;
}

// Récupère le service Digital Goods de Google Play (ou null si indisponible).
async function getPlayService() {
  if (!isPlayBillingAvailable()) return null;
  try {
    return await window.getDigitalGoodsService(PLAY_BILLING_METHOD);
  } catch {
    return null;
  }
}

// Lance l'achat d'un abonnement via Google Play.
// `sku` = l'ID du produit d'abonnement défini dans la Google Play Console
//         (ex: "mylide_pro"), fourni par plan.androidSku.
//
// Retourne { purchaseToken } en cas de succès.
// Lève une erreur (message lisible) si annulation ou échec.
export async function purchaseViaPlay(sku) {
  const service = await getPlayService();
  if (!service) throw new Error("Google Play Billing indisponible sur cet appareil.");

  // 1) Vérifier que le produit existe côté Google (utile pour un message clair)
  let details = [];
  try {
    details = await service.getDetails([sku]);
  } catch {
    // getDetails peut échouer si le produit n'est pas encore publié — on continue,
    // Payment Request renverra une erreur explicite le cas échéant.
  }
  if (details && details.length === 0) {
    throw new Error("Cet abonnement n'est pas encore disponible. Réessaie plus tard.");
  }

  // 2) Construire la demande de paiement Google Play
  const paymentMethods = [{
    supportedMethods: PLAY_BILLING_METHOD,
    data: { sku },
  }];
  // Le montant réel est géré par Google d'après le SKU. Ce total est un placeholder
  // requis par l'API PaymentRequest ; il n'est pas utilisé pour la facturation.
  const paymentDetails = {
    total: { label: "Total", amount: { currency: "EUR", value: "0" } },
  };

  let request;
  try {
    request = new PaymentRequest(paymentMethods, paymentDetails);
  } catch (e) {
    throw new Error("Impossible d'initialiser le paiement Google Play.");
  }

  let response;
  try {
    response = await request.show(); // ouvre la feuille de paiement Google
  } catch (e) {
    // L'utilisateur a annulé ou une erreur est survenue
    throw new Error("Paiement annulé.");
  }

  const purchaseToken =
    response.details?.purchaseToken ||
    response.details?.token ||
    null;

  if (!purchaseToken) {
    await safeComplete(response, "fail");
    throw new Error("Paiement incomplet. Aucun jeton reçu de Google Play.");
  }

  // On confirme la transaction côté navigateur (le serveur validera ensuite).
  await safeComplete(response, "success");

  return { purchaseToken, sku };
}

// Confirme/échoue la transaction PaymentRequest sans planter si l'API diffère.
async function safeComplete(response, status) {
  try {
    if (response && typeof response.complete === "function") {
      await response.complete(status);
    }
  } catch {
    /* no-op */
  }
}

// (Optionnel) Liste les achats déjà effectués via Play — utile pour restaurer
// un abonnement après réinstallation. À câbler plus tard si besoin.
export async function listExistingPurchases() {
  const service = await getPlayService();
  if (!service || typeof service.listPurchases !== "function") return [];
  try {
    return await service.listPurchases();
  } catch {
    return [];
  }
}
