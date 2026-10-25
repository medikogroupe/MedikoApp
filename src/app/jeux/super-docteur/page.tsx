import PageShell from "@/components/PageShell";
import Millionnaire from "@/components/jeux/Millionnaire";

export default function MillionnairePage() {
  return (
    <PageShell title="Jeux Super Docteur" subtitle="Quiz santé · 15 questions">
      <Millionnaire />
    </PageShell>
  );
}
