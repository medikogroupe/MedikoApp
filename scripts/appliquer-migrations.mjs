import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL absente de .env");
  process.exit(1);
}
let hote = "(inconnu)";
try { hote = new URL(url).hostname; } catch {}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
} catch (e) {
  console.error("Connexion impossible a " + hote + " : " + e.message);
  process.exit(1);
}
console.log("Connecte a : " + hote);

const existe = await client.query("select to_regclass('public.users') as t");
if (existe.rows[0].t) {
  console.log("Base deja initialisee (table users presente) : aucune migration appliquee.");
} else {
  const dossier = join(process.cwd(), "supabase", "migrations");
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".sql")).sort();
  try {
    await client.query("begin");
    for (const f of fichiers) {
      const sql = readFileSync(join(dossier, f), "utf8").replace(/^\uFEFF/, "");
      await client.query(sql);
      console.log("OK   " + f);
    }
    await client.query("commit");
    console.log("Base initialisee.");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("ECHEC, rien n'a ete cree : " + e.message);
    await client.end();
    process.exit(1);
  }
}
await client.end();