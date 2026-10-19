import { Clock, Globe, Mail, MessageCircle, Phone } from "lucide-react";
import PageShell from "@/components/PageShell";
import { CONTACT } from "@/lib/constants";

export default function ContactPage() {
  return (
    <PageShell title="Contact & support" subtitle="Équipe MEDIKO+ Côte d'Ivoire">
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Support WhatsApp</h2>
        <p className="mt-1 text-xs text-mp-grey">
          Réponse rapide pour l&apos;activation des packs, les paiements et l&apos;assistance technique.
        </p>
        <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="mp-btn-yellow mt-3">
          <MessageCircle size={16} /> Écrire sur WhatsApp
        </a>
      </section>

      <section className="mp-card mt-4 divide-y divide-[#eef1f5]">
        <a href={`tel:${CONTACT.telRaw}`} className="flex items-center gap-3 p-4">
          <Phone size={20} strokeWidth={2} className="text-mp-blue" />
          <div>
            <p className="text-xs uppercase tracking-wide text-mp-grey">Téléphone</p>
            <p className="text-sm font-semibold">{CONTACT.tel}</p>
          </div>
        </a>
        <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 p-4">
          <Mail size={20} strokeWidth={2} className="text-mp-blue" />
          <div>
            <p className="text-xs uppercase tracking-wide text-mp-grey">Email</p>
            <p className="text-sm font-semibold">{CONTACT.email}</p>
          </div>
        </a>
        <div className="flex items-center gap-3 p-4">
          <Clock size={20} strokeWidth={2} className="text-mp-blue" />
          <div>
            <p className="text-xs uppercase tracking-wide text-mp-grey">Horaires</p>
            <p className="text-sm font-semibold">{CONTACT.horaires}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Globe size={20} strokeWidth={2} className="text-mp-blue" />
          <div>
            <p className="text-xs uppercase tracking-wide text-mp-grey">Site officiel</p>
            <p className="text-sm font-semibold">{CONTACT.domaine}</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
