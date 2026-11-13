import PageShell from "@/components/PageShell";
import Consultation from "@/components/jeux/Consultation";

export default function ConsultationPage() {
  return (
    <PageShell title="Simulation de suivi" subtitle="Consulter, prescrire, revoir">
      <Consultation />
    </PageShell>
  );
}