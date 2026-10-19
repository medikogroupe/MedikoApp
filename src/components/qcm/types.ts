export type PropositionPublique = { idx: number; texte: string; imageId: string | null };

export type QuestionPublique = {
  id: string;
  matiere: string;
  type: "QCU" | "QCD" | "QCM" | string;
  question: string;
  imageId: string | null;
  propositions: PropositionPublique[];
  nbAttendues: number;
  points: number;
  penalite: number;
  mode: string;
};

export type Charge = {
  tentative: {
    id: string;
    titre: string;
    surveille: boolean;
    limiteAt: string;
    serverNow: string;
    sortiesMax: number;
    filigrane: string;
  };
  questions: QuestionPublique[];
  reponses: Record<string, number[]>;
  sorties: number;
};

export type DetailCorrection = {
  id: string;
  question: string;
  imageId: string | null;
  type: string;
  propositions: PropositionPublique[];
  bonnes: number[];
  choisies: number[];
  points: number;
  pointsMax: number;
  juste: boolean;
  repondu: boolean;
  explication: string;
};

export type ResultatFinal = {
  resultat: {
    id: string;
    titre: string;
    matiere: string;
    surveille: boolean;
    points: number;
    pointsMax: number;
    noteSur20: number;
    nbJustes: number;
    nbQuestions: number;
    sorties: number;
    dureeSecondes: number;
  };
  details: DetailCorrection[];
};
