import Link from "next/link";
import PageShell from "@/components/PageShell";

const SERVICES: { href: string; titre: string; texte: string }[] = [
  { href: "/edt", titre: "Agenda", texte: "Emploi du temps et rappels." },
  { href: "/pharmacies", titre: "Santé", texte: "Pharmacies de garde et établissements." },
  { href: "/cours-pdf", titre: "Cours en PDF", texte: "Vos cours par domaine." },
  { href: "/bibliotheque", titre: "Bibliothèque", texte: "Documents et ressources." },
  { href: "/communaute", titre: "Communauté", texte: "Échanger avec les autres étudiants." },
  { href: "/scanner", titre: "Scanner", texte: "Numériser vos documents." },
  { href: "/lecteur", titre: "Lecteur", texte: "Lire vos fichiers." },
  { href: "/stats", titre: "Statistiques", texte: "Suivre vos progrès." },
  { href: "/examen", titre: "Examen aléatoire", texte: "Un examen de 50 questions." },
  { href: "/abonnement", titre: "Abonnement", texte: "Votre accès et vos paiements." },
  { href: "/tuto", titre: "Tutoriels", texte: "Découvrir l'application." },
  { href: "/groupe", titre: "Groupe", texte: "Rejoindre le groupe des étudiants." },
  { href: "/soutenir", titre: "Soutenir", texte: "Faire un don." },
  { href: "/contact", titre: "Contact", texte: "Nous écrire." },
];

export default function PlusPage() {
  return (
    <PageShell title="Plus de services" subtitle="Tout le reste, au même endroit">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <Link key={s.href} href={s.href} className="mp-card block p-4">
            <p className="text-sm font-bold">{s.titre}</p>
            <p className="mt-1 text-xs text-mp-grey">{s.texte}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}