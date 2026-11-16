import Link from "next/link";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import { LogoIcon } from "@/components/Logo";
import VisiteurQcm from "@/components/VisiteurQcm";
import { getCurrentUser } from "@/lib/auth";
import { UUID_RE } from "@/lib/qcm";

export default async function VisiteurSessionPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  const valide = UUID_RE.test(id);

  // Un inscrit connecté passe par la version complète, enregistrée.
  const user = await getCurrentUser();
  if (user && valide) redirect(`/qcm/surveille/${id}`);

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <header className="bg-mp-blue px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <LogoIcon size={40} />
          <div>
            <p className="text-base font-bold uppercase tracking-wide">Examen</p>
            <p className="text-xs text-white/75">Mode invité</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        {valide ? (
          <VisiteurQcm sessionId={id} />
        ) : (
          <div className="mp-card space-y-3 p-4 text-sm">
            <p className="text-mp-grey">Ce lien d&apos;examen n&apos;est pas valide.</p>
            <Link href="/connexion" className="font-semibold text-mp-blue">
              Se connecter
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
