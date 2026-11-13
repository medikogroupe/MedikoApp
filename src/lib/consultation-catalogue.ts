export type Traitement = {
  id: string;
  nom: string;
  type: "MEDICAMENT" | "SOIN";
  forme: string;
  /** Besoins que ce traitement peut couvrir (voir les besoins de chaque cas). */
  tags: string[];
  /** Facteurs du patient qui contre-indiquent ce traitement. */
  contre: string[];
  /** Deux traitements de la meme famille prescrits ensemble font doublon. */
  famille?: string;
  /** Rappel pedagogique affiche a l'etudiant en cas d'erreur. */
  revision: string;
};

/** Libelles des facteurs du patient (allergies, terrain...). */
export const FACTEURS: Record<string, string> = {
  enfant: "âge inférieur à 12 ans",
  "allergie-penicilline": "allergie à la pénicilline",
  "insuffisance-renale": "insuffisance rénale",
  "insuffisance-hepatique": "insuffisance hépatique",
  grossesse: "grossesse",
};

/** Catalogue sans doses : les doses seront ajoutees apres validation par un medecin ou un pharmacien. */
export const CATALOGUE: Traitement[] = [
  {
    id: "oxygene",
    nom: "Oxygénothérapie",
    type: "SOIN",
    forme: "Au masque ou aux lunettes nasales",
    tags: ["oxygene"],
    contre: [],
    revision: "L'oxygène est indiqué quand la saturation est inférieure à 90 % : l'hypoxémie non corrigée est la première cause de décès dans la pneumonie de l'enfant.",
  },
  {
    id: "hospitalisation",
    nom: "Hospitalisation avec surveillance",
    type: "SOIN",
    forme: "Service de pédiatrie ou de médecine",
    tags: ["surveillance"],
    contre: [],
    revision: "Un patient avec des signes de gravité (hypoxémie, refus de boire, somnolence) doit être hospitalisé pour être surveillé de près.",
  },
  {
    id: "sro",
    nom: "Solution de réhydratation orale (SRO)",
    type: "SOIN",
    forme: "À boire par petites gorgées",
    tags: ["hydratation"],
    contre: [],
    revision: "Les SRO compensent les pertes en eau et en sels des diarrhées.",
  },
  {
    id: "perfusion",
    nom: "Perfusion de sérum salé",
    type: "SOIN",
    forme: "Voie intraveineuse",
    tags: ["hydratation", "hydratation-iv"],
    contre: [],
    revision: "La réhydratation par voie veineuse est réservée aux déshydratations sévères ou à l'impossibilité de boire.",
  },
  {
    id: "amoxicilline",
    nom: "Amoxicilline",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antibiotique", "antibiotique-oral"],
    contre: ["allergie-penicilline"],
    famille: "antibiotique",
    revision: "Les pénicillines (amoxicilline, ampicilline) sont contre-indiquées en cas d'allergie à la pénicilline : on recherche toujours une allergie avant de prescrire un antibiotique.",
  },
  {
    id: "ampicilline-gentamicine",
    nom: "Ampicilline + gentamicine",
    type: "MEDICAMENT",
    forme: "Injection",
    tags: ["antibiotique", "antibiotique-injectable"],
    contre: ["allergie-penicilline", "insuffisance-renale"],
    famille: "antibiotique",
    revision: "L'association ampicilline + gentamicine est un traitement de référence de la pneumonie sévère, mais elle contient une pénicilline : elle est contre-indiquée en cas d'allergie.",
  },
  {
    id: "ceftriaxone",
    nom: "Ceftriaxone",
    type: "MEDICAMENT",
    forme: "Injection",
    tags: ["antibiotique", "antibiotique-injectable"],
    contre: [],
    famille: "antibiotique",
    revision: "La ceftriaxone est une alternative injectable quand les pénicillines sont contre-indiquées (en l'absence d'allergie sévère aux céphalosporines).",
  },
  {
    id: "azithromycine",
    nom: "Azithromycine",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antibiotique", "antibiotique-oral"],
    contre: [],
    famille: "antibiotique",
    revision: "L'azithromycine est un antibiotique oral utile en relais ou en cas de contre-indication aux pénicillines, mais il ne suffit pas pour une pneumonie sévère à l'arrivée.",
  },
  {
    id: "paracetamol",
    nom: "Paracétamol",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antipyretique"],
    contre: ["insuffisance-hepatique"],
    famille: "antipyretique",
    revision: "Le paracétamol est l'antipyrétique de référence chez l'enfant.",
  },
  {
    id: "aspirine",
    nom: "Aspirine",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antipyretique"],
    contre: ["enfant"],
    famille: "antipyretique",
    revision: "L'aspirine est contre-indiquée chez l'enfant fébrile : risque de syndrome de Reye.",
  },
  {
    id: "antitussif",
    nom: "Sirop antitussif à la codéine",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antitussif"],
    contre: ["enfant"],
    revision: "Les antitussifs sont inutiles et dangereux chez le jeune enfant : la toux est un mécanisme de défense et ils ne traitent pas la pneumonie.",
  },
  {
    id: "corticoide",
    nom: "Corticoïde par voie générale",
    type: "MEDICAMENT",
    forme: "Voie orale ou injection",
    tags: ["corticoide"],
    contre: [],
    revision: "Les corticoïdes ne sont pas indiqués dans la pneumonie bactérienne de l'enfant.",
  },
  {
    id: "salbutamol",
    nom: "Salbutamol en inhalation",
    type: "MEDICAMENT",
    forme: "Inhalation",
    tags: ["bronchodilatateur"],
    contre: [],
    revision: "Le salbutamol traite l'asthme et la bronchiolite avec sifflements : il n'agit pas sur une pneumonie.",
  },
  {
    id: "cta",
    nom: "Association à base d'artémisinine (CTA)",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antipaludique"],
    contre: [],
    famille: "antipaludique",
    revision: "Un antipaludique ne se prescrit qu'après confirmation du paludisme par un test positif.",
  },
  {
    id: "artesunate",
    nom: "Artésunate injectable",
    type: "MEDICAMENT",
    forme: "Injection",
    tags: ["antipaludique", "antipaludique-injectable"],
    contre: [],
    famille: "antipaludique",
    revision: "L'artésunate injectable est réservé au paludisme grave confirmé.",
  },
];

export function traitement(id: string): Traitement | undefined {
  return CATALOGUE.find((t) => t.id === id);
}