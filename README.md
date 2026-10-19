# MEDIKO+ — Super App Étudiants Santé (Côte d'Ivoire)

PWA Next.js (App Router, TypeScript, Tailwind) destinée aux étudiants en santé : révisions QCM,
emploi du temps, notes, projet carrière, scanner de documents, bibliothèque personnelle,
jeux pédagogiques et annuaire des pharmacies / centres de santé de Côte d'Ivoire.

- Domaine : **medikoplus.site**
- Support : **01 70 50 13 56** — WhatsApp <https://wa.me/2250170501356>
- Email : **contact24@medikoplus.site**

## 1. Fonctionnalités

| Module | Route | Détail |
| --- | --- | --- |
| Inscription / Connexion | `/inscription`, `/connexion` | Nom WhatsApp, numéro +225, mot de passe 6 chiffres, filière, ville |
| Tableau de bord | `/dashboard` | Progression du jour, QCM à venir, cours du jour |
| Emploi du temps | `/edt` | Vue mois/semaine, rappel navigateur 15 min avant, cache offline |
| Mes notes | `/notes` | Moyenne pondérée, courbe Recharts, prédiction de validation |
| Projet carrière & finance | `/carriere` | Objectif, simulateur de revenu, budget et épargne |
| Bibliothèque perso | `/bibliotheque` | Dossiers, import PDF/images, recherche, lecture hors connexion |
| Scanner | `/scanner` | Caméra, 1 à 10 pages, amélioration de contraste, PDF jsPDF, upload |
| QCM | `/qcm` | Examen blanc chronométré, correction instantanée, stats par matière |
| QCM surveillé | `/qcm/surveille/[id]` | Plein écran, 1 tentative, détection blur/visibilitychange |
| Jeux | `/jeux` | Colle-Colle Anatomie (drag & drop, 60 s, image de score), Diagnostic Flash (15 s), Bloc Urgence |
| Annuaire santé | `/pharmacies` | Carte Leaflet/OpenStreetMap, « Autour de moi » (Haversine), filtres, gardes du jour |
| Communauté | `/communaute` | Partage de cours, validation par l'administration |
| Abonnement | `/abonnement` | Packs 500 F/30 jours et 4 900 F à vie, lien de paiement configurable |
| Administration | `/admin` | KPI, comptes, packs & liens de paiement, uploads, QCM surveillés, pharmacies (CRUD + CSV) |
| Contact | `/contact` | WhatsApp, téléphone, email, horaires |

## 2. Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL + Drizzle ORM (`src/db/schema.ts`) — script SQL Supabase fourni dans `supabase/migrations`
- Leaflet + OpenStreetMap, Recharts, jsPDF, PapaParse, Lucide React
- PWA : `public/manifest.json` + service worker `public/sw.js` (cache offline)

> Authentification : sessions signées HMAC stockées en cookie httpOnly (`src/lib/auth.ts`),
> mots de passe hachés via `scrypt`. Pour un déploiement Supabase, le script SQL
> `supabase/migrations/0001_mediko_plus_init.sql` contient le schéma complet et les policies RLS
> (`user_id = auth.uid()`) ainsi que la lecture publique de l'annuaire santé.

## 3. Démarrage local

```bash
git clone https://github.com/<votre-compte>/medikoplus.git
cd medikoplus
npm install
cp .env.example .env        # renseigner DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD
npx drizzle-kit push        # crée les tables
npm run dev                 # http://localhost:3000
```

Les données de démonstration (packs, banque de QCM, pharmacies de Côte d'Ivoire) sont insérées
automatiquement au premier appel de l'application (`src/lib/seed.ts`).

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL |
| `SESSION_SECRET` | Clé HMAC des cookies de session |
| `ADMIN_PASSWORD` | Mot de passe de la console `/admin` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Si vous branchez Supabase |

## 4. Déploiement test — Vercel (branche `main`)

1. Pousser le dépôt sur GitHub (`git push origin main`).
2. Sur Vercel : *New Project* → importer le dépôt → framework détecté **Next.js**.
3. Ajouter les variables d'environnement (`DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`).
4. Déployer : chaque push sur `main` déclenche une nouvelle mise en production.

## 5. Déploiement production — Contabo VPS

```bash
# Sur le VPS (Ubuntu 22.04+)
apt update && apt install -y docker.io docker-compose-plugin git
git clone https://github.com/<votre-compte>/medikoplus.git /opt/medikoplus
cd /opt/medikoplus
cp .env.example .env    # adapter POSTGRES_PASSWORD, SESSION_SECRET, ADMIN_PASSWORD
docker compose up -d --build
```

- `docker-compose.yml` lance PostgreSQL 16, l'application Next.js (port 3000) et Nginx (80/443).
- Le script `supabase/migrations/0001_mediko_plus_init.sql` est exécuté automatiquement à la
  première initialisation de la base.

### Nginx + HTTPS pour medikoplus.site

La configuration `nginx/medikoplus.conf` fait un reverse proxy vers `app:3000` et force HTTPS.
Générer les certificats :

```bash
apt install -y certbot
certbot certonly --standalone -d medikoplus.site -d www.medikoplus.site
docker compose restart nginx
```

Pointer les enregistrements DNS `A` de `medikoplus.site` et `www` vers l'IP du VPS Contabo.

## 6. Console d'administration

- Accès : `/admin`, mot de passe = `ADMIN_PASSWORD`.
- Gestion des comptes (activer / bloquer / changer le pack manuellement après réception du paiement).
- Packs & paiements : le champ **lien de paiement** (Wave, MTN MoMo, Orange Money) est modifiable
  à chaud, sans redéploiement ; il alimente directement le bouton « Payer » de `/abonnement`.
- Pharmacies : CRUD, import CSV (`nom, type, ville, commune, quartier, adresse, telephone,
  whatsapp, latitude, longitude, horaires, jours_garde` séparés par `|`) et bouton
  « Actualiser gardes » qui recalcule `est_de_garde_aujourdhui` selon la date du jour.

## 7. Scripts

```bash
npm run dev        # développement
npm run build      # build production
npm run start      # serveur production
npm run typecheck  # vérification TypeScript
npm run lint       # ESLint
```

© 2026 MEDIKO+ — Super App Étudiants Santé — Côte d'Ivoire
