const PUBLICS = ["/pharmacies", "/contact", "/offline", "/decouvrir", "/connexion", "/inscription"];

export function estPublic(chemin: string): boolean {
  return PUBLICS.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}