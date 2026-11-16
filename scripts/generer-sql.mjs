import fs from "node:fs";
import path from "node:path";

const dossier = path.join(process.cwd(), "data", "cours");
const lire = (f) => JSON.parse(fs.readFileSync(path.join(dossier, f), "utf8"));
const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const jb = (v) => q(JSON.stringify(v)) + "::jsonb";

const out = ["begin;"];
const seed = lire("seed.json");

for (const d of seed.domaines) {
  out.push(`insert into public.domaines (slug, nom, description, ordre) values (${q(d.slug)}, ${q(d.nom)}, ${q(d.description)}, ${d.ordre}) on conflict (slug) do update set nom = excluded.nom, description = excluded.description, ordre = excluded.ordre;`);
}

const lignes = [];
for (const d of seed.domaines) {
  for (const m of d.matieres) {
    lignes.push(`(${q(d.slug)}, ${q(m.slug)}, ${q(m.code_officiel)}, ${q(m.nom)}, ${m.semestre}, ${m.ordre})`);
  }
}
out.push(`insert into public.matieres (domaine_id, slug, code_officiel, nom, semestre, ordre)
select d.id, v.slug, v.code_officiel, v.nom, v.semestre::smallint, v.ordre::integer
from (values
${lignes.join(",\n")}
) as v(domaine_slug, slug, code_officiel, nom, semestre, ordre)
join public.domaines d on d.slug = v.domaine_slug
on conflict (slug) do update set domaine_id = excluded.domaine_id, code_officiel = excluded.code_officiel, nom = excluded.nom, semestre = excluded.semestre, ordre = excluded.ordre;`);

const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith(".json") && f !== "seed.json");
for (const f of fichiers) {
  const c = lire(f);
  const m = `(select id from public.matieres where slug = ${q(c.matiere_slug)})`;
  out.push(`insert into public.cours (matiere_id, definition, objectifs, sections, resume, statut) values (${m}, ${q(c.cours.definition)}, ${jb(c.cours.objectifs)}, ${jb(c.cours.sections)}, ${jb(c.cours.resume)}, 'PUBLIE') on conflict (matiere_id) do update set definition = excluded.definition, objectifs = excluded.objectifs, sections = excluded.sections, resume = excluded.resume, statut = excluded.statut, updated_at = now();`);
  out.push(`delete from public.qcm_cours where matiere_id = ${m};`);
  for (const x of c.qcm) {
    out.push(`insert into public.qcm_cours (matiere_id, ordre, question, options, bonne_reponse, explication) values (${m}, ${x.ordre}, ${q(x.question)}, ${jb(x.options)}, ${x.bonne_reponse}, ${q(x.explication)});`);
  }
  out.push(`insert into public.cas_cliniques (matiere_id, titre, enonce, questions) values (${m}, ${q(c.cas_clinique.titre)}, ${q(c.cas_clinique.enonce)}, ${jb(c.cas_clinique.questions)}) on conflict (matiere_id) do update set titre = excluded.titre, enonce = excluded.enonce, questions = excluded.questions;`);
}

out.push("commit;");
fs.writeFileSync(path.join(process.cwd(), "supabase", "import-cours.sql"), out.join("\n") + "\n", "utf8");
console.log("supabase/import-cours.sql genere : " + out.length + " requetes.");