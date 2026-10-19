"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ListChecks, MapPin, User } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/qcm", label: "QCM", icon: ListChecks },
  { href: "/edt", label: "Agenda", icon: CalendarDays },
  { href: "/pharmacies", label: "Santé", icon: MapPin },
  { href: "/profil", label: "Profil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 border-t border-[#e4e9ef] bg-white">
      <div className="mx-auto flex max-w-3xl">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-mp-blue" : "text-mp-grey"
              }`}
            >
              <Icon size={20} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
