import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import { LogoIcon } from "@/components/Logo";
import VisiteurQcm from "@/components/VisiteurQcm";
import { getCurrentUser } from "@/lib/auth";

export default async function VisiteurPage() {
  const user = await getCurrentUser();
  if (user) redirect("/qcm");

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <header className="bg-mp-blue px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <LogoIcon size={40} />
          <div>
            <p className="text-base font-bold uppercase tracking-wide">QCM d&apos;essai</p>
            <p className="text-xs text-white/75">Sans compte</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <VisiteurQcm />
      </main>
      <Footer />
    </div>
  );
}
