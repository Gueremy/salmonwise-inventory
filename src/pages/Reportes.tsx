import { useState } from "react";
import { FileSpreadsheet, FileText, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { downloadReport, ReportDownloadResult } from "@/api/reports";

function saveBlob(result: ReportDownloadResult) {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const { accessToken, hasModule } = useRole();
  const [loading, setLoading] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportDownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (kind: "pdf" | "excel" | "sernapesca") => {
    setLoading(kind);
    setError(null);
    try {
      const result = await downloadReport(accessToken!, kind);
      saveBlob(result);
      setLastReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Reportes de movimientos</h2>
        <p className="text-sm text-muted-foreground">
          Descarga PDF/Excel desde FastAPI y calcula SHA-256 del archivo entregado.
        </p>
      </div>

      <section className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleDownload("pdf")} disabled={Boolean(loading)} className="bg-primary hover:bg-secondary">
            <FileText className="h-4 w-4 mr-2" /> {loading === "pdf" ? "Generando..." : "PDF movimientos"}
          </Button>
          <Button onClick={() => handleDownload("excel")} disabled={Boolean(loading)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading === "excel" ? "Generando..." : "Excel movimientos"}
          </Button>
          {hasModule("pack_salmonero") && (
            <Button onClick={() => handleDownload("sernapesca")} disabled={Boolean(loading)} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading === "sernapesca" ? "Generando..." : "Excel SERNAPESCA"}
            </Button>
          )}
        </div>
      </section>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      {lastReport && (
        <section className="bg-card border border-border rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Fingerprint className="h-4 w-4 text-primary" /> Hash SHA-256 generado
          </div>
          <div className="text-sm text-muted-foreground">{lastReport.filename}</div>
          <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{lastReport.sha256}</code>
        </section>
      )}
    </div>
  );
}
