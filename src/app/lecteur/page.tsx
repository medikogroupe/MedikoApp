import PageShell from "@/components/PageShell";
import PdfViewer from "@/components/PdfViewer";

export default async function LecteurPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; titre?: string }>;
}) {
  const { url = "", titre = "Document" } = await searchParams;
  const valide = /^\/api\/(fichiers|pdf-cours)\/[0-9a-f-]{36}$/i.test(url);
  return (
    <PageShell title={titre.slice(0, 80)} subtitle="Lecture du document">
      {valide ? (
        <PdfViewer url={url} />
      ) : (
        <p className="mp-card p-4 text-xs text-mp-grey">Document introuvable.</p>
      )}
    </PageShell>
  );
}