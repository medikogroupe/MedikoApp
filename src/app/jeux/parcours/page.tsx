import PageShell from "@/components/PageShell";
import ParcoursPatient from "@/components/jeux/ParcoursPatient";

export default function ParcoursPage() {
  return (
    <PageShell title="Parcours patient" subtitle="De l'accueil à la guérison">
      <ParcoursPatient />
    </PageShell>
  );
}