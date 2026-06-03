import { useState } from "react";
import { FileSpreadsheet, FileText, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/context/RoleContext";
import { downloadReporte, ReportDownloadResult } from "@/lib/api";

function saveBlob(result: ReportDownloadResult) {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const { accessToken } = useRole();
  const [dias, setDias] = useState("30");
  const [tipo, setTipo] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportDownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("dias", dias || "30");
    if (tipo) params.set("tipo", tipo);
    return params.toString();
  };

  const handleDownload = async (kind: "pdf" | "excel" | "sernapesca") => {
    setLoading(kind);
    setError(null);
    try {
      const result = await downloadReporte(accessToken!, kind, buildQuery());
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
        <h2 className="text-xl font-bold">Reportes regulatorios</h2>
        <p className="text-sm text-muted-foreground">
          Descarga PDF/Excel desde FastAPI y calcula SHA-256 del archivo entregado.
        </p>
      </div>

      <section className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Dias hacia atras</span>
            <Input type="number" min="1" max="365" value={dias} onChange={(event) => setDias(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Tipo de movimiento</span>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={tipo} onChange={(event) => setTipo(event.target.value)}>
              <option value="">Todos</option>
              <option value="entrada_proveedor">Entrada proveedor</option>
              <option value="salida_produccion">Salida produccion</option>
              <option value="traslado_interno">Traslado interno</option>
              <option value="correccion">Correccion</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleDownload("pdf")} disabled={Boolean(loading)} className="bg-primary hover:bg-secondary">
            <FileText className="h-4 w-4 mr-2" /> {loading === "pdf" ? "Generando..." : "PDF movimientos"}
          </Button>
          <Button onClick={() => handleDownload("excel")} disabled={Boolean(loading)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading === "excel" ? "Generando..." : "Excel movimientos"}
          </Button>
          <Button onClick={() => handleDownload("sernapesca")} disabled={Boolean(loading)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading === "sernapesca" ? "Generando..." : "Excel SERNAPESCA"}
          </Button>
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
