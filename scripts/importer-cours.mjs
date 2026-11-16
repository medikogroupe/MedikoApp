import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquante.");
  process.exit(1);
}

const dossier = path.join(process.cwd(), "data", "cours");
const lire = (f) => JSON.parse(fs.readFileSync(path.join(dossier, f), "utf8"));

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

const j = (v) => JSON.stringify(v);

try {
  await client.connect();
  await client.query("begin");

  const seed = lire("seed.json");
  let nbMatieres = 0;
  for (const d of seed.domaines) {
    const r = await client.query(
      `insert into public.domaines (slug, nom, description, ordre)
       values ($1, $2, $3, $4)
       on conflict (slug) do update set nom = excluded.nom, description = excluded.description, ordre = excluded.ordre
       returning id`,
      [d.slug, d.nom, d.description, d.ordre],
    );
    const domaineId = r.rows[0].id;
    for (const m of d.matieres) {
      await client.query(
        `insert into public.matieres (domaine_id, slug, code_officiel, nom, semestre, ordre)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (slug) do update set domaine_id = excluded.domaine_id, code_officiel = excluded.code_officiel,
           nom = excluded.nom, semestre = excluded.semestre, ordre = excluded.ordre`,
        [domaineId, m.slug, m.code_officiel, m.nom, m.semestre, m.ordre],
      );
      nbMatieres++;
    }
  }
  console.log(seed.domaines.length + " domaines, " + nbMatieres + " matieres.");

  const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith(".json") && f !== "seed.json");
  for (const f of fichiers) {
    const c = lire(f);
    const m = await client.query("select id from public.matieres where slug = $1", [c.matiere_slug]);
    if (!m.rows[0]) {
      console.log("Matiere inconnue, ignoree : " + c.matiere_slug);
      continue;
    }
    const id = m.rows[0].id;
    await client.query(
      `insert into public.cours (matiere_id, definition, objectifs, sections, resume, statut)
       values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, 'PUBLIE')
       on conflict (matiere_id) do update set definition = excluded.definition, objectifs = excluded.objectifs,
         sections = excluded.sections, resume = excluded.resume, statut = excluded.statut, updated_at = now()`,
      [id, c.cours.definition, j(c.cours.objectifs), j(c.cours.sections), j(c.cours.resume)],
    );
    await client.query("delete from public.qcm_cours where matiere_id = $1", [id]);
    for (const q of c.qcm) {
      await client.query(
        `insert into public.qcm_cours (matiere_id, ordre, question, options, bonne_reponse, explication)
         values ($1, $2, $3, $4::jsonb, $5, $6)`,
        [id, q.ordre, q.question, j(q.options), q.bonne_reponse, q.explication],
      );
    }
    await client.query(
      `insert into public.cas_cliniques (matiere_id, titre, enonce, questions)
       values ($1, $2, $3, $4::jsonb)
       on conflict (matiere_id) do update set titre = excluded.titre, enonce = excluded.enonce, questions = excluded.questions`,
      [id, c.cas_clinique.titre, c.cas_clinique.enonce, j(c.cas_clinique.questions)],
    );
    console.log("Cours importe : " + c.matiere_slug + " (" + c.qcm.length + " QCM, 1 cas clinique)");
  }

  await client.query("commit");
  console.log("Import termine.");
} catch (e) {
  await client.query("rollback").catch(() => undefined);
  console.error("Echec :", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}