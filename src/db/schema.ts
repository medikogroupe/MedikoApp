import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  nomWhatsapp: text("nom_whatsapp").notNull(),
  numeroWhatsapp: text("numero_whatsapp").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  filiere: text("filiere").notNull().default("autre"),
  ville: text("ville").notNull().default("Abidjan"),
  projetCarriere: text("projet_carriere").default(""),
  pack: text("pack").notNull().default("FREE"),
  statut: text("statut").notNull().default("ACTIF"),
  packExpireAt: timestamp("pack_expire_at", { withTimezone: true }),
  /** Photo de profil (data URL JPEG 256 px). Vide = initiale. */
  photo: text("photo").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const edtPerso = pgTable("edt_perso", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  titre: text("titre").notNull(),
  lieu: text("lieu").default(""),
  date: date("date").notNull(),
  heureDebut: time("heure_debut").notNull(),
  heureFin: time("heure_fin").notNull(),
  type: text("type").notNull().default("cours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notesPerso = pgTable("notes_perso", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  matiere: text("matiere").notNull(),
  note: doublePrecision("note").notNull(),
  coef: integer("coef").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const carriere = pgTable("carriere", {
  userId: uuid("user_id").primaryKey(),
  objectif: text("objectif").default(""),
  specialite: text("specialite").default(""),
  bourseMontant: integer("bourse_montant").default(0),
  depensesJson: jsonb("depenses_json").$type<{ poste: string; montant: number }[]>().default([]),
  epargne: integer("epargne").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bibliothequePerso = pgTable("bibliotheque_perso", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  nomFichier: text("nom_fichier").notNull(),
  urlStorage: text("url_storage").notNull(),
  dossier: text("dossier").notNull().default("Général"),
  taille: integer("taille").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qcm = pgTable("qcm", {
  id: uuid("id").primaryKey().defaultRandom(),
  matiere: text("matiere").notNull(),
  question: text("question").notNull(),
  propositions: jsonb("propositions").$type<string[]>().notNull(),
  bonneReponse: text("bonne_reponse").notNull(),
  explication: text("explication").notNull().default(""),
  niveau: text("niveau").notNull().default("L1"),
  /** QCU = 1 bonne réponse, QCD = exactement 2 bonnes réponses, QCM = 1 à n bonnes réponses. */
  type: text("type").notNull().default("QCU"),
  /** Indices (0-based) des bonnes propositions. Vide = ancienne question, on lit bonneReponse. */
  bonnes: jsonb("bonnes").$type<number[]>().notNull().default([]),
  points: doublePrecision("points").notNull().default(1),
  penalite: doublePrecision("penalite").notNull().default(0),
  /** TOUT_OU_RIEN ou PARTIEL (QCD/QCM uniquement). */
  mode: text("mode").notNull().default("TOUT_OU_RIEN"),
  imageId: uuid("image_id"),
  /** Question obligatoire : la copie ne peut pas etre rendue tant qu'elle est vide. */
  obligatoire: boolean("obligatoire").notNull().default(false),
  propositionsImages: jsonb("propositions_images").$type<(string | null)[]>().notNull().default([]),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qcmImages = pgTable("qcm_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  mime: text("mime").notNull(),
  contenu: text("contenu").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qcmTentatives = pgTable("qcm_tentatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  qcmAdminId: uuid("qcm_admin_id"),
  titre: text("titre").notNull().default(""),
  matiere: text("matiere").notNull().default(""),
  questionIds: jsonb("question_ids").$type<string[]>().notNull().default([]),
  reponses: jsonb("reponses").$type<Record<string, number[]>>().notNull().default({}),
  statut: text("statut").notNull().default("EN_COURS"),
  points: doublePrecision("points").notNull().default(0),
  pointsMax: doublePrecision("points_max").notNull().default(0),
  noteSur20: doublePrecision("note_sur_20").notNull().default(0),
  nbJustes: integer("nb_justes").notNull().default(0),
  sorties: integer("sorties").notNull().default(0),
  surveille: boolean("surveille").notNull().default(false),
  debutAt: timestamp("debut_at", { withTimezone: true }).notNull().defaultNow(),
  limiteAt: timestamp("limite_at", { withTimezone: true }).notNull().defaultNow(),
  finAt: timestamp("fin_at", { withTimezone: true }),
});

export const qcmAdmin = pgTable("qcm_admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  titre: text("titre").notNull(),
  module: text("module").notNull(),
  dureeMinutes: integer("duree_minutes").notNull().default(30),
  nbQuestions: integer("nb_questions").notNull().default(20),
  dateLancement: timestamp("date_lancement", { withTimezone: true }).notNull().defaultNow(),
  statut: text("statut").notNull().default("PROGRAMME"),
  /** Filières autorisées. Vide = toutes les filières. */
  filieres: jsonb("filieres").$type<string[]>().notNull().default([]),
  /** Questions figées de la session (tirées au lancement). */
  questionIds: jsonb("question_ids").$type<string[]>().notNull().default([]),
  /** Nombre de sorties d'écran tolérées avant rendu automatique. 0 = illimité. */
  sortiesMax: integer("sorties_max").notNull().default(0),
  melanger: boolean("melanger").notNull().default(true),
  /** Consignes affichees a l'etudiant avant de commencer. */
  consignes: text("consignes").notNull().default(""),
  /** Niveau des questions tirees (L1 a M2). Vide = tous. */
  niveau: text("niveau").notNull().default(""),
  /** Sections du questionnaire : titre, description, questions choisies ou tirage. */
  sections: jsonb("sections").$type<Record<string, unknown>[]>().notNull().default([]),
  /** Date du gel : au premier demarrage d'un etudiant, les questions sont copiees dans snapshot. */
  figeAt: timestamp("fige_at", { withTimezone: true }),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resultatsQcm = pgTable("resultats_qcm", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  qcmAdminId: uuid("qcm_admin_id"),
  matiere: text("matiere").default(""),
  score: integer("score").notNull().default(0),
  total: integer("total").notNull().default(0),
  temps: integer("temps").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  type: text("type").notNull().default("pharmacie"),
  ville: text("ville").notNull().default("Abidjan"),
  commune: text("commune").notNull().default(""),
  quartier: text("quartier").default(""),
  adresse: text("adresse").default(""),
  telephone: text("telephone").default(""),
  whatsapp: text("whatsapp").default(""),
  latitude: doublePrecision("latitude").notNull().default(5.32),
  longitude: doublePrecision("longitude").notNull().default(-4.02),
  horaires: text("horaires").default("08h - 20h"),
  joursGarde: date("jours_garde").array(),
  estDeGardeAujourdhui: boolean("est_de_garde_aujourdhui").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const packsConfig = pgTable("packs_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  nomPack: text("nom_pack").notNull(),
  prixFcfa: integer("prix_fcfa").notNull().default(0),
  dureeJours: integer("duree_jours").notNull().default(30),
  lienPaiement: text("lien_paiement").notNull().default(""),
  description: text("description").default(""),
  estActif: boolean("est_actif").notNull().default(true),
  noteAdmin: text("note_admin").notNull().default(""),
  ordre: integer("ordre").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uploadsCommunaute = pgTable("uploads_communaute", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  fichierUrl: text("fichier_url").default(""),
  titre: text("titre").notNull(),
  matiere: text("matiere").default(""),
  description: text("description").default(""),
  statut: text("statut").notNull().default("EN_ATTENTE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paiements = pgTable("paiements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  pack: text("pack").notNull(),
  packId: uuid("pack_id"),
  montant: integer("montant").notNull().default(0),
  statut: text("statut").notNull().default("VALIDE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fichiers = pgTable("fichiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mime: text("mime").notNull().default("application/pdf"),
  contenu: text("contenu").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matieres = pgTable("matieres", {
  id: uuid("id").primaryKey().defaultRandom(),
  domaineId: uuid("domaine_id").notNull(),
  slug: text("slug").notNull(),
  codeOfficiel: text("code_officiel").notNull().default(""),
  nom: text("nom").notNull(),
  semestre: integer("semestre").notNull(),
  ordre: integer("ordre").notNull().default(0),
  estActif: boolean("est_actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pdfCours = pgTable("pdf_cours", {
  id: uuid("id").primaryKey().defaultRandom(),
  matiereId: uuid("matiere_id"),
  titre: text("titre").notNull(),
  nomFichier: text("nom_fichier").notNull(),
  taille: integer("taille").notNull().default(0),
  contenu: text("contenu").notNull(),
  estActif: boolean("est_actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const questionsGenerees = pgTable("questions_generees", {
  id: uuid("id").primaryKey().defaultRandom(),
  matiereId: uuid("matiere_id").notNull(),
  pdfId: uuid("pdf_id"),
  type: text("type").notNull(),
  contexte: text("contexte").notNull().default(""),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  bonnesReponses: jsonb("bonnes_reponses").$type<number[]>().notNull().default([]),
  explication: text("explication").notNull().default(""),
  statut: text("statut").notNull().default("BROUILLON"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});