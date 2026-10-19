import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Gamepad2,
  LineChart,
  MapPin,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import Footer from "@/components/Footer";
import { LogoFull } from "@/components/Logo";
import { CONTACT } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

const FEATURES = [
  { icon: Stethoscope, titre: "QCM & examens blancs", texte: "Entraînement chronométré, correction immédiate et statistiques par matière." },
  { icon: CalendarDays, titre: "Emploi du temps", texte: "Cours, stages et révisions avec rappel 15 minutes avant chaque séance." },
  { icon: LineChart, titre: "Mes notes", texte: "Moyenne pondérée, courbe d'évolution et prédiction de validation." },
  { icon: ScanLine, titre: "Scanner documents", texte: "Numérisez vos polycopiés et générez un PDF propre en quelques secondes." },
  { icon: MapPin, titre: "Pharmacies de garde", texte: "Carte des pharmacies, centres de santé, CHU et cliniques de Côte d'Ivoire." },
  { icon: Gamepad2, titre: "Jeux pédagogiques", texte: "Colle-Colle Anatomie, Diagnostic Flash et Bloc Urgence." },
];

export default async function HomePage() {
  await ensureSeed();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <section className="bg-mp-blue px-4 pb-10 pt-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <LogoFull variant="white" height={48} />
          </div>
          <p className="mt-2 text-xs text-white/75">Super App Étudiants Santé — Côte d&apos;Ivoire</p>
          <h1 className="mt-8 text-2xl font-bold leading-snug">
            Bienvenue sur MEDIKO+
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            Votre partenaire pour réussir vos études de santé en Côte d&apos;Ivoire : révisions,
            organisation, documents et annuaire santé de proximité.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/inscription" className="mp-btn-yellow sm:w-auto sm:px-8">
              Créer un compte
            </Link>
            <Link
              href="/connexion"
              className="inline-flex w-full items-center justify-center rounded-[10px] border border-white/40 px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white sm:w-auto"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mp-grey">Fonctionnalités</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.titre} className="mp-card p-4">
                <Icon size={22} strokeWidth={2} className="text-mp-blue" />
                <p className="mt-2 text-sm font-bold">{f.titre}</p>
                <p className="mt-1 text-xs leading-relaxed text-mp-grey">{f.texte}</p>
              </div>
            );
          })}
        </div>

        <div className="mp-card mt-5 flex items-start gap-3 p-4">
          <ShieldCheck size={22} strokeWidth={2} className="mt-0.5 text-mp-blue" />
          <div>
            <p className="text-sm font-bold">Contenu vérifié</p>
            <p className="mt-1 text-xs text-mp-grey">
              Toutes les fiches et QCM sont relus avant publication. Support disponible{" "}
              {CONTACT.horaires.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/pharmacies" className="mp-btn-ghost flex-1">
            Pharmacies de garde
          </Link>
          <Link href="/contact" className="mp-btn-ghost flex-1">
            Contacter le support
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
