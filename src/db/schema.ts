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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qcmAdmin = pgTable("qcm_admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  titre: text("titre").notNull(),
  module: text("module").notNull(),
  dureeMinutes: integer("duree_minutes").notNull().default(30),
  nbQuestions: integer("nb_questions").notNull().default(20),
  dateLancement: timestamp("date_lancement", { withTimezone: true }).notNull().defaultNow(),
  statut: text("statut").notNull().default("PROGRAMME"),
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
