const PUBLICS = ["/pharmacies", "/plus", "/contact", "/offline", "/decouvrir", "/visiteur", "/connexion", "/inscription"];

export function estPublic(chemin: string): boolean {
  return PUBLICS.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}