import type { Traitement } from "@/lib/consultation-catalogue";

/** Facteurs pour les maladies chroniques. */
export const FACTEURS_EXTRA3: Record<string, string> = {
  diabete: "diabète",
  goutte: "goutte",
  hypertension: "hypertension artérielle",
  drepanocytose: "drépanocytose",
};

/** Traitements et soins du suivi des maladies chroniques (sans doses). */
export const EXTRA3: Traitement[] = [
  {
    id: "metformine",
    nom: "Metformine",
    type: "MEDICAMENT",
    forme: "Voie orale, au cours des repas",
    tags: ["antidiabetique", "antidiabetique-oral"],
    contre: ["insuffisance-renale"],
    revision: "La metformine est contre-indiquée en cas d'insuffisance rénale sévère (risque d'acidose lactique) : on évalue la fonction rénale avant de la prescrire.",
  },
  {
    id: "glibenclamide",
    nom: "Glibenclamide (sulfamide hypoglycémiant)",
    type: "MEDICAMENT",
    forme: "Voie orale",
    tags: ["antidiabetique", "antidiabetique-oral"],
    contre: ["insuffisance-renale"],
    revision: "Les sulfamides hypoglycémiants s'accumulent en cas d'insuffisance rénale et provoquent des hypoglycémies graves.",
  },
  {
    id: "insuline-basale",
    nom: "Insuline basale (injection)",
    type: "MEDICAMENT",
    forme: "Injection sous la peau",
    tags: ["antidiabetique", "antidiabetique-insuline"],
    contre: [],
    revision: "En cas d'insuffisance rénale sévère, l'insuline est le traitement le plus sûr ; elle s'accompagne d'une éducation à l'injection et à la prévention de l'hypoglycémie.",
  },
  {
    id: "statine",
    nom: "Statine (cholestérol)",
    type: "MEDICAMENT",
    forme: "Voie orale, le soir",
    tags: ["statine"],
    contre: ["grossesse"],
    revision: "Chez le diabétique de plus de 40 ans, une statine réduit le risque cardiovasculaire.",
  },
  {
    id: "education-chronique",
    nom: "Éducation thérapeutique et conseils d'hygiène de vie",
    type: "SOIN",
    forme: "Alimentation, activité physique, soins des pieds",
    tags: ["education"],
    contre: [],
    revision: "L'éducation thérapeutique (alimentation, activité physique, soins des pieds, reconnaissance de l'hypoglycémie) est la base du traitement d'une maladie chronique.",
  },
  {
    id: "controle-bio",
    nom: "Contrôle biologique régulier (glycémie, HbA1c)",
    type: "SOIN",
    forme: "Prise de sang programmée",
    tags: ["controle-bio"],
    contre: [],
    revision: "L'HbA1c, mesurée tous les 3 mois, reflète l'équilibre du diabète sur les semaines passées.",
  },
  {
    id: "depistage-complications",
    nom: "Dépistage des complications (fond d'œil, pieds, reins)",
    type: "SOIN",
    forme: "Examens programmés",
    tags: ["depistage-complications"],
    contre: [],
    revision: "Un dépistage régulier des yeux, des pieds et des reins détecte les complications avant qu'elles ne soient irréversibles.",
  },
  {
    id: "tisane",
    nom: "Remplacer le traitement par des tisanes de plantes",
    type: "SOIN",
    forme: "Tisanes",
    tags: ["tisane"],
    contre: ["diabete"],
    ponctuel: true,
    penalite: 10,
    revision: "Aucune plante ne remplace un traitement antidiabétique prouvé : arrêter le traitement aggrave la maladie.",
  },
];