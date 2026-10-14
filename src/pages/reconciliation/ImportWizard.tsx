import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useRole } from "@/context/RoleContext";
import { uploadReconciliationFile } from "@/api/reconciliation";
import { toast } from "sonner";

export default function ImportWizard() {
  const { accessToken } = useRole();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    ubicacion: "",
    item: "",
    cantidad: "",
    lote: "",
    sitio: "",
    zona: "",
  });
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewRows([]);
    setColumns([]);
    if (!selected.name.toLowerCase().endsWith(".csv")) return;

    // Leer encabezados y primeras 3 filas para previsualización simple
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headerCols = lines[0].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        setColumns(headerCols);

        const sample: Array<Record<string, string>> = [];
        for (let i = 1; i < Math.min(lines.length, 4); i++) {
          const values = lines[i].split(/[,;\t]/).map((v) => v.trim().replace(/^"|"$/g, ""));
          const rowObj: Record<string, string> = {};
          headerCols.forEach((col, idx) => {
            rowObj[col] = values[idx] ?? "";
          });
          sample.push(rowObj);
        }
        setPreviewRows(sample);

        // Auto-mapeo sugerido por nombres de columna comunes
        setMapping({
          ubicacion: headerCols.find((c) => /ubic|container|pos|casill/i.test(c)) ?? headerCols[0] ?? "",
          item: headerCols.find((c) => /prod|item|art|sku|desc/i.test(c)) ?? headerCols[1] ?? "",
          cantidad: headerCols.find((c) => /cant|stock|qty|saldo/i.test(c)) ?? headerCols[2] ?? "",
          lote: headerCols.find((c) => /lote|batch/i.test(c)) ?? headerCols[3] ?? "",
          sitio: headerCols.find((c) => /sitio|sede/i.test(c)) ?? "",
          zona: headerCols.find((c) => /zona|galpon/i.test(c)) ?? "",
        });
      }
    };
    reader.readAsText(selected);
  };

  const handleProcess = async () => {
    if (!file || !accessToken) return;
    if (columns.length > 0 && (!mapping.ubicacion || !mapping.item || !mapping.cantidad)) {
      toast.error("Selecciona las columnas de ubicación, ítem y cantidad.");
      return;
    }
    setProcessing(true);
    try {
      const result = await uploadReconciliationFile(accessToken, file, columns.length > 0 ? {
        codigo_ubicacion: mapping.ubicacion,
        codigo_item: mapping.item,
        cantidad: mapping.cantidad,
        ...(mapping.lote ? { numero_lote: mapping.lote } : {}),
        ...(mapping.sitio ? { codigo_sitio: mapping.sitio } : {}),
        ...(mapping.zona ? { codigo_zona: mapping.zona } : {}),
      } : undefined);
      toast.success("Archivo importado y conciliado con éxito");
      navigate(`/reconciliation?job=${result.job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error durante la importación");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <Breadcrumbs
        items={[
          { label: "Conciliación", to: "/reconciliation" },
          { label: "Importar archivo ERP/WMS" },
        ]}
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importación y conciliación de inventario</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Carga existencias externas desde archivos CSV o planillas Excel para auditar diferencias contra el stock físico.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Archivo de inventario (CSV o Excel)</Label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        </div>

        {file?.name.toLowerCase().endsWith(".xlsx") && (
          <p className="text-xs text-muted-foreground">Excel se procesa con los encabezados estándar SITIO, ZONA, POSICION, SKU, LOTE y CANTIDAD.</p>
        )}

        {columns.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm">Mapeo de columnas detectadas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Ubicación *</Label>
                <select
                  value={mapping.ubicacion}
                  onChange={(e) => setMapping((m) => ({ ...m, ubicacion: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ítem / Producto *</Label>
                <select
                  value={mapping.item}
                  onChange={(e) => setMapping((m) => ({ ...m, item: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cantidad *</Label>
                <select
                  value={mapping.cantidad}
                  onChange={(e) => setMapping((m) => ({ ...m, cantidad: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Lote</Label>
                <select
                  value={mapping.lote}
                  onChange={(e) => setMapping((m) => ({ ...m, lote: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">(Ninguno)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {([ ["sitio", "Sitio (si el código de ubicación se repite)"], ["zona", "Zona (opcional)"] ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <select value={mapping[key]} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="">(Ninguno)</option>
                    {columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Previsualización tabular */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground">Vista previa de datos (primeras 3 filas):</span>
              <div className="rounded-md border border-border overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="p-2 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        {columns.map((col) => (
                          <td key={col} className="p-2 truncate max-w-[150px]">{row[col] ?? "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => navigate("/reconciliation")}>
            Cancelar
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!file || processing}
            className="bg-primary hover:bg-secondary"
          >
            {processing ? "Conciliando..." : "Procesar y conciliar"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
