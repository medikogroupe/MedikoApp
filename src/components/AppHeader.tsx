"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { LogoIcon } from "@/components/Logo";

export default function AppHeader({
  title,
  subtitle,
  back = true,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-mp-blue px-4 text-white shadow-sm">
      <div className="mx-auto flex min-h-[60px] max-w-3xl items-center gap-3 py-2">
        {back ? (
          <button
            type="button"
            aria-label="Retour"
            onClick={() => router.back()}
            className="rounded-lg p-1.5 hover:bg-white/10"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : null}
        <LogoIcon size={32} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold uppercase tracking-wide">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-white/75">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}
