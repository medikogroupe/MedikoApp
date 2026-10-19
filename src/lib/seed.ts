import { sql } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig, pharmacies, qcm, qcmAdmin } from "@/db/schema";

let seeded = false;

const QCM_SEED = [
  {
    matiere: "Cardiologie",
    question: "Quelle structure est la plus touchée dans l'AVC ischémique sylvien ?",
    propositions: ["Artère cérébrale moyenne", "Artère basilaire", "Artère spinale", "Veine jugulaire"],
    bonneReponse: "Artère cérébrale moyenne",
    explication: "L'artère cérébrale moyenne (sylvienne) est le territoire le plus souvent atteint.",
    niveau: "L3",
  },
  {
    matiere: "Cardiologie",
    question: "La valve située entre l'oreillette gauche et le ventricule gauche est :",
    propositions: ["La valve mitrale", "La valve tricuspide", "La valve aortique", "La valve pulmonaire"],
    bonneReponse: "La valve mitrale",
    explication: "La valve mitrale (bicuspide) sépare l'oreillette gauche du ventricule gauche.",
    niveau: "L2",
  },
  {
    matiere: "Cardiologie",
    question: "Signe majeur d'un infarctus du myocarde à l'ECG :",
    propositions: ["Sus-décalage du segment ST", "Onde P ample", "Bradycardie isolée", "Allongement du QT"],
    bonneReponse: "Sus-décalage du segment ST",
    explication: "Le sus-décalage ST traduit une lésion transmurale aiguë.",
    niveau: "L3",
  },
  {
    matiere: "Anatomie",
    question: "Combien d'os compte le squelette humain adulte ?",
    propositions: ["206", "212", "198", "224"],
    bonneReponse: "206",
    explication: "Le squelette adulte comporte 206 os après fusion des os du crâne et du sacrum.",
    niveau: "L1",
  },
  {
    matiere: "Anatomie",
    question: "Le poumon droit comporte :",
    propositions: ["3 lobes", "2 lobes", "4 lobes", "1 lobe"],
    bonneReponse: "3 lobes",
    explication: "Poumon droit : lobes supérieur, moyen et inférieur. Le gauche n'en a que 2.",
    niveau: "L1",
  },
  {
    matiere: "Pharmacologie",
    question: "L'antidote de référence du paracétamol est :",
    propositions: ["N-acétylcystéine", "Naloxone", "Flumazénil", "Vitamine K"],
    bonneReponse: "N-acétylcystéine",
    explication: "La N-acétylcystéine restaure le stock de glutathion hépatique.",
    niveau: "L2",
  },
  {
    matiere: "Pharmacologie",
    question: "Voie d'administration la plus rapide pour obtenir un effet systémique :",
    propositions: ["Intraveineuse", "Orale", "Cutanée", "Rectale"],
    bonneReponse: "Intraveineuse",
    explication: "La voie IV donne une biodisponibilité de 100 % immédiate.",
    niveau: "L1",
  },
  {
    matiere: "Soins infirmiers",
    question: "Avant tout soin invasif, le geste prioritaire est :",
    propositions: ["L'hygiène des mains", "La prise de température", "La pesée du patient", "Le bilan sanguin"],
    bonneReponse: "L'hygiène des mains",
    explication: "L'hygiène des mains reste la première mesure de prévention des infections.",
    niveau: "L1",
  },
  {
    matiere: "Urgences",
    question: "Fréquence des compressions thoraciques chez l'adulte :",
    propositions: ["100 à 120/min", "60 à 80/min", "140 à 160/min", "40 à 60/min"],
    bonneReponse: "100 à 120/min",
    explication: "Les recommandations fixent 100 à 120 compressions par minute, 5 à 6 cm de profondeur.",
    niveau: "L2",
  },
  {
    matiere: "Urgences",
    question: "Devant une hémorragie externe active, le premier geste est :",
    propositions: ["Compression directe", "Pose d'une perfusion", "Appel du laboratoire", "Prise de la glycémie"],
    bonneReponse: "Compression directe",
    explication: "La compression manuelle directe stoppe l'essentiel des hémorragies externes.",
    niveau: "L1",
  },
  {
    matiere: "Microbiologie",
    question: "Le paludisme grave en Côte d'Ivoire est principalement dû à :",
    propositions: ["Plasmodium falciparum", "Plasmodium vivax", "Plasmodium ovale", "Plasmodium malariae"],
    bonneReponse: "Plasmodium falciparum",
    explication: "P. falciparum est l'espèce dominante et responsable des formes graves.",
    niveau: "L2",
  },
  {
    matiere: "Obstétrique",
    question: "La durée normale d'une grossesse est de :",
    propositions: ["41 semaines d'aménorrhée", "36 semaines d'aménorrhée", "45 semaines d'aménorrhée", "30 semaines d'aménorrhée"],
    bonneReponse: "41 semaines d'aménorrhée",
    explication: "Le terme est fixé à 41 SA, soit 9 mois révolus.",
    niveau: "L3",
  },
];

const PHARMACIES_SEED = [
  { nom: "Pharmacie du Plateau", type: "pharmacie", ville: "Abidjan", commune: "Plateau", quartier: "Centre", adresse: "Av. Houphouët-Boigny", telephone: "0500123456", whatsapp: "2250500123456", latitude: 5.3245, longitude: -4.0197, horaires: "Ouvert 24/7", garde: true },
  { nom: "Pharmacie Sainte-Marie", type: "pharmacie", ville: "Abidjan", commune: "Cocody", quartier: "Riviera 2", adresse: "Bd François Mitterrand", telephone: "0501234567", whatsapp: "2250501234567", latitude: 5.3598, longitude: -3.9821, horaires: "08h - 22h", garde: false },
  { nom: "Pharmacie Niangon Nord", type: "pharmacie", ville: "Abidjan", commune: "Yopougon", quartier: "Niangon", adresse: "Route de Dabou", telephone: "0502345678", whatsapp: "2250502345678", latitude: 5.3466, longitude: -4.0881, horaires: "08h - 20h", garde: true },
  { nom: "Centre de Santé Urbain d'Adjamé", type: "centre_sante", ville: "Abidjan", commune: "Adjamé", quartier: "220 Logements", adresse: "Rue du Marché", telephone: "0503456789", whatsapp: "2250503456789", latitude: 5.3647, longitude: -4.0239, horaires: "08h - 20h", garde: false },
  { nom: "CHU de Treichville", type: "chu", ville: "Abidjan", commune: "Treichville", quartier: "Zone 3", adresse: "Bd de Marseille", telephone: "2721245000", whatsapp: "2250504567890", latitude: 5.2938, longitude: -4.0062, horaires: "Ouvert 24/7", garde: true },
  { nom: "CHU de Cocody", type: "chu", ville: "Abidjan", commune: "Cocody", quartier: "Danga", adresse: "Bd de l'Université", telephone: "2722481000", whatsapp: "2250505678901", latitude: 5.3466, longitude: -3.9876, horaires: "Ouvert 24/7", garde: true },
  { nom: "Polyclinique Sainte Anne-Marie", type: "clinique", ville: "Abidjan", commune: "Plateau", quartier: "Centre", adresse: "Av. Jean-Paul II", telephone: "2720222000", whatsapp: "2250506789012", latitude: 5.3283, longitude: -4.0167, horaires: "Ouvert 24/7", garde: false },
  { nom: "Pharmacie Koumassi Remblais", type: "pharmacie", ville: "Abidjan", commune: "Koumassi", quartier: "Remblais", adresse: "Bd du Cameroun", telephone: "0507890123", whatsapp: "2250507890123", latitude: 5.2929, longitude: -3.9472, horaires: "08h - 21h", garde: false },
  { nom: "Pharmacie d'Abobo Gare", type: "pharmacie", ville: "Abidjan", commune: "Abobo", quartier: "Gare", adresse: "Rue de la Gare", telephone: "0508901234", whatsapp: "2250508901234", latitude: 5.4186, longitude: -4.0196, horaires: "08h - 20h", garde: true },
  { nom: "Pharmacie du Centre Bouaké", type: "pharmacie", ville: "Bouaké", commune: "Bouaké Centre", quartier: "Commerce", adresse: "Av. Jacques Aka", telephone: "0509012345", whatsapp: "2250509012345", latitude: 7.6906, longitude: -5.0303, horaires: "08h - 20h", garde: true },
  { nom: "CHU de Bouaké", type: "chu", ville: "Bouaké", commune: "Bouaké Centre", quartier: "Air France", adresse: "Rue du CHU", telephone: "2731633000", whatsapp: "2250510123456", latitude: 7.6833, longitude: -5.0333, horaires: "Ouvert 24/7", garde: true },
  { nom: "Pharmacie Yamoussoukro Habitat", type: "pharmacie", ville: "Yamoussoukro", commune: "Yamoussoukro", quartier: "Habitat", adresse: "Bd de la Paix", telephone: "0511234567", whatsapp: "2250511234567", latitude: 6.8276, longitude: -5.2893, horaires: "08h - 20h", garde: false },
  { nom: "Centre de Santé de Daloa", type: "centre_sante", ville: "Daloa", commune: "Daloa", quartier: "Tazibouo", adresse: "Rue des Écoles", telephone: "0512345678", whatsapp: "2250512345678", latitude: 6.8773, longitude: -6.4502, horaires: "08h - 18h", garde: false },
  { nom: "Pharmacie de Korhogo", type: "pharmacie", ville: "Korhogo", commune: "Korhogo", quartier: "Soba", adresse: "Av. du Nord", telephone: "0513456789", whatsapp: "2250513456789", latitude: 9.4580, longitude: -5.6294, horaires: "08h - 20h", garde: true },
  { nom: "Pharmacie du Port San-Pédro", type: "pharmacie", ville: "San-Pédro", commune: "San-Pédro", quartier: "Cité", adresse: "Bd du Port", telephone: "0514567890", whatsapp: "2250514567890", latitude: 4.7485, longitude: -6.6363, horaires: "08h - 21h", garde: false },
];

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  try {
    const packs = await db.select({ c: sql<number>`count(*)::int` }).from(packsConfig);
    if ((packs[0]?.c ?? 0) === 0) {
      await db.insert(packsConfig).values([
        {
          nomPack: "MENSUEL",
          prixFcfa: 500,
          dureeJours: 30,
          lienPaiement: "https://pay.wave.com/m/medikoplus/c/ci/",
          description: "Accès complet pendant 30 jours : QCM, jeux, scanner, bibliothèque.",
        },
        {
          nomPack: "A_VIE",
          prixFcfa: 4900,
          dureeJours: 9999,
          lienPaiement: "https://pay.wave.com/m/medikoplus/c/ci/",
          description: "Accès à vie à toutes les fonctionnalités MEDIKO+.",
        },
      ]);
    }

    const q = await db.select({ c: sql<number>`count(*)::int` }).from(qcm);
    if ((q[0]?.c ?? 0) === 0) {
      await db.insert(qcm).values(QCM_SEED);
    }

    const ph = await db.select({ c: sql<number>`count(*)::int` }).from(pharmacies);
    if ((ph[0]?.c ?? 0) === 0) {
      const today = new Date().toISOString().slice(0, 10);
      await db.insert(pharmacies).values(
        PHARMACIES_SEED.map((p) => ({
          nom: p.nom,
          type: p.type,
          ville: p.ville,
          commune: p.commune,
          quartier: p.quartier,
          adresse: p.adresse,
          telephone: p.telephone,
          whatsapp: p.whatsapp,
          latitude: p.latitude,
          longitude: p.longitude,
          horaires: p.horaires,
          joursGarde: p.garde ? [today] : [],
          estDeGardeAujourdhui: p.garde,
        })),
      );
    }

    const admin = await db.select({ c: sql<number>`count(*)::int` }).from(qcmAdmin);
    if ((admin[0]?.c ?? 0) === 0) {
      await db.insert(qcmAdmin).values([
        {
          titre: "Examen blanc Cardiologie",
          module: "Cardiologie",
          dureeMinutes: 30,
          nbQuestions: 3,
          statut: "ACTIF",
        },
        {
          titre: "Évaluation Pharmacologie",
          module: "Pharmacologie",
          dureeMinutes: 20,
          nbQuestions: 2,
          statut: "ACTIF",
        },
      ]);
    }
    seeded = true;
  } catch {
    // La base n'est pas encore prête : on réessaiera au prochain appel.
  }
}
