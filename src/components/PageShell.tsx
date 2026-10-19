import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export default function PageShell({
  title,
  subtitle,
  back = true,
  nav = true,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  nav?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <AppHeader title={title} subtitle={subtitle} back={back} action={action} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">{children}</main>
      <Footer />
      {nav ? <BottomNav /> : null}
    </div>
  );
}
