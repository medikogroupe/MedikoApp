import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { CONTACT } from "@/lib/constants";
import { LogoFull } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#e4e9ef] bg-white px-4 py-6 text-center text-xs text-mp-grey">
      <div className="flex justify-center">
        <LogoFull variant="color" height={30} />
      </div>
      <p className="mt-3 font-semibold text-mp-text">MEDIKO+ — Super App Étudiants Santé — Côte d&apos;Ivoire</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a href={`tel:${CONTACT.telRaw}`} className="inline-flex items-center gap-1 hover:text-mp-blue">
          <Phone size={13} strokeWidth={2} /> {CONTACT.tel}
        </a>
        <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-1 hover:text-mp-blue">
          <Mail size={13} strokeWidth={2} /> {CONTACT.email}
        </a>
        <Link href="/contact" className="hover:text-mp-blue">
          Contact
        </Link>
        <Link href="/abonnement" className="hover:text-mp-blue">
          Abonnement
        </Link>
      </div>
      <p className="mt-3">© 2026 MEDIKO+ — Tous droits réservés — {CONTACT.domaine}</p>
    </footer>
  );
}
