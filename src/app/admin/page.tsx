import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import Footer from "@/components/Footer";
import { LogoIcon } from "@/components/Logo";
import { isAdmin } from "@/lib/auth";
import { CONTACT } from "@/lib/constants";
import { ensureSeed } from "@/lib/seed";

export default async function AdminPage() {
  await ensureSeed();
  const admin = await isAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <header className="bg-mp-blue px-4 text-white">
        <div className="mx-auto flex min-h-[60px] max-w-5xl items-center gap-3">
          <LogoIcon size={36} />
          <div>
            <p className="text-base font-bold uppercase tracking-wide">Administration MEDIKO+</p>
            <p className="text-xs text-white/75">Gestion comptes, packs, contenus et annuaire santé</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {admin ? <AdminDashboard /> : <AdminLogin />}
        <p className="mt-6 text-center text-xs text-mp-grey">
          Contact : {CONTACT.tel} | {CONTACT.email}
        </p>
      </main>
      <Footer />
    </div>
  );
}
