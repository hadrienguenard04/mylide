import { useState } from "react";
import { useC } from "./theme.jsx";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "disclaimer",
    title: "Avertissement sante",
    icon: "🏥",
    content: `MYLIDE est une application de bien-etre et de suivi personnel. Elle ne constitue pas un dispositif medical.

MYLIDE ne diagnostique, ne soigne, ne traite et ne remplace en aucun cas l'avis d'un professionnel de sante qualifie (medecin, nutritionniste, psychologue, kinesitherapeute, etc.).

Les donnees, scores, recommandations et insights fournis par MYLIDE sont des indicateurs de suivi personnel bases sur vos propres saisies. Ils ont une valeur informative et motivationnelle uniquement.

En cas de symptomes, de douleurs, ou de preoccupations concernant votre sante physique ou mentale, consultez immediatement un professionnel de sante.

MYLIDE decline toute responsabilite en cas d'utilisation des donnees de l'application a des fins medicales ou diagnostiques.`,
  },
  {
    id: "cgu",
    title: "Conditions generales d'utilisation",
    icon: "📋",
    content: `Derniere mise a jour : Mai 2026

1. OBJET
Les presentes conditions generales d'utilisation (CGU) regissent l'utilisation de l'application MYLIDE, disponible sur le web et les plateformes mobiles.

2. ACCEPTATION
En utilisant MYLIDE, vous acceptez sans reserve les presentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.

3. DESCRIPTION DU SERVICE
MYLIDE est une application de suivi de vie quotidienne permettant de tracer et analyser vos habitudes de sommeil, sport, nutrition, sante mentale, travail, finances et objectifs personnels.

4. COMPTE UTILISATEUR
Vous etes responsable de la confidentialite de vos identifiants. Toute utilisation de votre compte est sous votre responsabilite. Vous devez nous notifier immediatement en cas d'acces non autorise.

5. UTILISATION ACCEPTABLE
Vous vous engagez a ne pas :
- Utiliser l'application a des fins illegales
- Tenter d'acceder aux donnees d'autres utilisateurs
- Reverse engineer ou tenter de compromettre la securite de l'application
- Transmettre des contenus malveillants ou inappropries

6. ABONNEMENTS ET PAIEMENTS
Les abonnements sont proposes en trois formules (Starter, Pro, Premium). Chaque abonnement inclut une periode d'essai gratuit de 30 jours. Apres la periode d'essai, l'abonnement se renouvelle automatiquement selon la periodicite choisie. La resiliation peut etre effectuee a tout moment depuis les parametres de l'application.

7. PROPRIETE INTELLECTUELLE
MYLIDE et tous ses contenus (design, algorithmes, textes, logos) sont proteges par les droits de propriete intellectuelle. Toute reproduction sans autorisation est interdite.

8. LIMITATION DE RESPONSABILITE
MYLIDE est fourni "tel quel". Nous ne garantissons pas l'exactitude, l'exhaustivite ou l'adequation des informations fournies. MYLIDE n'est pas responsable des decisions prises sur la base des donnees de l'application.

9. MODIFICATION DES CGU
Nous nous reservons le droit de modifier les presentes CGU. Les utilisateurs seront notifies des changements significatifs. L'utilisation continue de l'application vaut acceptation des nouvelles conditions.

10. LOI APPLICABLE
Les presentes CGU sont regies par le droit francais. Tout litige sera soumis aux tribunaux competents de Paris.`,
  },
  {
    id: "privacy",
    title: "Politique de confidentialite",
    icon: "🔒",
    content: `Derniere mise a jour : Mai 2026

1. RESPONSABLE DU TRAITEMENT
MYLIDE est responsable du traitement de vos donnees personnelles.

2. DONNEES COLLECTEES
Nous collectons :
- Donnees de compte : email, prenom, date de naissance, photo de profil (facultative)
- Donnees de sante et bien-etre : sommeil, sport, nutrition, humeur, poids, mensurations (saisies volontairement par vous)
- Donnees financieres : revenus, depenses, patrimoine (saisies volontairement par vous)
- Donnees techniques : identifiant de session, type d'appareil, langue, parametres

Nous ne collectons pas : localisation GPS, contacts, donnees biometriques, historique de navigation.

3. FINALITES DU TRAITEMENT
Vos donnees sont utilisees pour :
- Vous fournir le service MYLIDE (calculs, graphiques, recommandations)
- Ameliorer l'application via des analyses aggregees et anonymisees
- Gerer votre abonnement et la facturation (via Stripe)
- Envoyer des notifications si vous y consentez

4. BASE LEGALE
- Execution du contrat (service MYLIDE)
- Consentement (donnees de sante, notifications)
- Interet legitime (securite, amelioration du produit)

5. CONSERVATION
Vos donnees sont conservees pendant la duree de votre compte actif, plus 30 jours apres la suppression du compte (delai de recuperation). Les donnees de facturation sont conservees 10 ans conformement aux obligations legales.

6. PARTAGE
Vos donnees ne sont jamais vendues ni partagees avec des tiers a des fins publicitaires. Elles sont partagees uniquement avec :
- Supabase (hebergement et base de donnees, UE)
- Stripe (paiement, avec uniquement les informations necessaires)
- Vercel (hebergement de l'application, UE)

7. SECURITE
Toutes les donnees sont chiffrees en transit (TLS 1.3) et au repos (AES-256). Les mots de passe ne sont jamais stockes en clair.

8. VOS DROITS (RGPD)
Vous disposez des droits suivants :
- Acces : obtenir une copie de vos donnees
- Rectification : corriger des donnees inexactes
- Effacement : supprimer votre compte et vos donnees
- Portabilite : exporter vos donnees (PDF ou CSV depuis les Parametres)
- Opposition : vous opposer a certains traitements
- Limitation : limiter l'utilisation de vos donnees

Pour exercer ces droits, rendez-vous dans Parametres > Confidentialite, ou contactez-nous.

9. COOKIES
MYLIDE n'utilise pas de cookies publicitaires. Des cookies techniques essentiels sont utilises pour maintenir votre session.`,
  },
  {
    id: "rgpd",
    title: "Gestion de vos donnees (RGPD)",
    icon: "🛡️",
    content: `MYLIDE est conforme au Reglement General sur la Protection des Donnees (RGPD - UE 2016/679).

VOS DROITS EN PRATIQUE

Acces a vos donnees :
Rendez-vous dans Parametres > Telecharger mes donnees pour exporter l'integralite de vos donnees en PDF ou en format Excel (CSV).

Suppression de votre compte :
Rendez-vous dans Parametres > Supprimer mon compte. La suppression est definitive apres 30 jours. Pendant ce delai, votre compte peut etre reactivable sur demande.

Portabilite :
L'export CSV est compatible avec Excel, Google Sheets et tout logiciel de traitement de donnees.

Consentement :
Lors de l'inscription, vous consentez explicitement :
- Au traitement de vos donnees de bien-etre
- A la reception de notifications (si activees)
- A la collecte de donnees analytiques anonymisees (desactivable dans Parametres)

Retrait du consentement :
Vous pouvez retirer votre consentement a tout moment depuis Parametres > Confidentialite.

DONNEES DE SANTE
Les donnees de bien-etre saisies dans MYLIDE (sommeil, sport, poids, humeur) sont considerees comme des donnees sensibles au sens du RGPD. Elles sont traitees avec des mesures de securite renforcees et ne sont jamais partagees sans votre consentement explicite.

TRANSFERTS INTERNATIONAUX
Nos prestataires (Supabase, Stripe, Vercel) s'engagent dans des garanties appropriees pour les transferts de donnees hors UE, conformement aux decisions d'adequation de la Commission europeenne.

CONTACT DPO
Pour toute question relative a la protection de vos donnees :
contact@mylide.app`,
  },
  {
    id: "subscription_legal",
    title: "Informations legales sur l'abonnement",
    icon: "💳",
    content: `RENOUVELLEMENT AUTOMATIQUE
L'abonnement MYLIDE se renouvelle automatiquement a la fin de chaque periode de facturation (mensuelle). Vous serez preleve du montant de l'abonnement choisi, sauf resiliation.

PERIODE D'ESSAI GRATUIT
Chaque plan beneficie d'un essai gratuit de 30 jours. Un moyen de paiement valide est requis pour demarrer l'essai. Aucun prelevement n'est effectue pendant la periode d'essai. Si vous resiliez avant la fin de l'essai, vous ne serez pas preleve.

RESILIATION
Vous pouvez resilier votre abonnement a tout moment :
1. Rendez-vous dans Parametres > Abonnement
2. Cliquez sur "Gerer mon abonnement"
3. Selectionnez "Annuler l'abonnement" dans le portail Stripe

La resiliation prend effet a la fin de la periode de facturation en cours. Vous conservez l'acces aux fonctionnalites premium jusqu'a cette date.

REMBOURSEMENT
Conformement a la legislation europeenne, vous beneficiez d'un droit de retractation de 14 jours a compter de l'achat. Pour exercer ce droit, contactez-nous a contact@mylide.app.

PRIX
Starter : 3,99€/mois TTC
Pro : 6,99€/mois TTC
Premium : 12,99€/mois TTC
Les prix incluent la TVA applicable.

MODIFICATION DES PRIX
En cas de modification des tarifs, vous serez notifie 30 jours a l'avance par email. Vous pourrez alors resilier sans frais avant l'entree en vigueur des nouveaux tarifs.

PAIEMENT SECURISE
Les paiements sont traites par Stripe, certifie PCI DSS niveau 1. MYLIDE ne stocke jamais vos informations de paiement.`,
  },
  {
    id: "ai",
    title: "Intelligence artificielle et insights",
    icon: "🧠",
    content: `NATURE DES INSIGHTS
Les recommandations, scores et insights generes par MYLIDE sont bases sur des algorithmes d'analyse de donnees personnelles. Ils constituent des indicateurs de bien-etre personnel, pas des diagnostics medicaux.

CE QUE MYLIDE PEUT FAIRE
- Identifier des tendances dans vos habitudes
- Calculer des scores de bien-etre sur la base de vos saisies
- Suggerer des ajustements dans vos routines
- Detecter des correlations entre differents aspects de votre vie
- Estimer des projections (financieres, corporelles) sur la base de vos donnees

CE QUE MYLIDE NE PEUT PAS FAIRE
- Diagnostiquer une maladie ou un trouble
- Remplacer l'avis d'un medecin, nutritionniste, psychologue ou tout autre professionnel de sante
- Garantir des resultats specifiques
- Fournir des recommandations medicales personnalisees

DONNEES UTILISEES
L'IA de MYLIDE analyse uniquement vos propres donnees locales. Vos donnees ne sont pas envoyees a des services d'IA externes (ChatGPT, etc.). Tout le traitement est realise sur nos serveurs securises.

TRANSPARENCE ALGORITHMIQUE
Les formules de calcul utilisees (scores, TDEE, estimations) sont documentees et accessibles dans la FAQ de l'application.`,
  },
];

// ─── ACCORDION ITEM ────────────────────────────────────────────────────────────
function Section({ section, isOpen, onToggle }) {
  const C = useC();
  return (
    <div style={{
      background: C.surface, border: `1px solid ${isOpen ? "#CC293640" : C.border}`,
      borderRadius: 16, overflow: "hidden", marginBottom: 10,
      boxShadow: isOpen ? "0 4px 20px rgba(204,41,54,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12,
          padding: "16px 18px", background: "transparent",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{section.icon}</span>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: isOpen ? "#CC2936" : C.text,
            transition: "color 0.18s",
          }}>{section.title}</span>
        </div>
        <svg
          width={18} height={18} viewBox="0 0 24 24"
          fill="none" stroke={isOpen ? "#CC2936" : C.muted}
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "none" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div style={{
        maxHeight: isOpen ? 2000 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.25s ease",
      }}>
        <div style={{
          padding: "0 18px 18px",
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14,
        }}>
          {section.content.split("\n").map((line, i) => {
            if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
            const isBold = /^[0-9]+\./.test(line.trim()) || /^[A-Z\s]{5,}$/.test(line.trim());
            return (
              <p key={i} style={{
                margin: "0 0 4px",
                fontSize: 13, lineHeight: 1.65,
                color: isBold ? C.text : C.muted,
                fontWeight: isBold ? 700 : 400,
              }}>
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LegalPage({ onBack, initialSection }) {
  const C = useC();
  const [openId, setOpenId] = useState(initialSection || null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 210,
      background: C.bg, overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.bg + "ee",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{
            width: 40, height: 40, borderRadius: 12,
            background: C.surfaceAlt, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
              stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Mentions legales</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>CGU · Confidentialite · RGPD · Sante</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 60px" }}>
        {/* Health disclaimer banner */}
        <div style={{
          background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
          border: "1.5px solid #F59E0B40",
          borderRadius: 16, padding: "14px 16px",
          marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 12.5, color: "#92400E", lineHeight: 1.6, fontWeight: 500 }}>
            MYLIDE est une application de bien-etre personnel.
            Elle ne remplace pas un professionnel de sante.
            Ne l'utilisez pas pour diagnostiquer ou traiter une condition medicale.
          </p>
        </div>

        {SECTIONS.map(section => (
          <Section
            key={section.id}
            section={section}
            isOpen={openId === section.id}
            onToggle={() => setOpenId(openId === section.id ? null : section.id)}
          />
        ))}

        {/* Contact */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "16px 18px", marginTop: 8,
          textAlign: "center",
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: C.text }}>Une question ?</p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            contact@mylide.app
          </p>
        </div>
      </div>
    </div>
  );
}
