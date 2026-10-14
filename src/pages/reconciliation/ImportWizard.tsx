import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useRole } from "@/context/RoleContext";
import { createMappingProfile, fetchMappingProfiles, ImportMapping, previewReconciliationFile, uploadReconciliationFile } from "@/api/reconciliation";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const suggestedMapping = (columns: string[]) => ({
  ubicacion: columns.find((c) => /ubic|container|pos|casill/i.test(c)) ?? columns[0] ?? "",
  item: columns.find((c) => /prod|item|art|sku|desc/i.test(c)) ?? columns[1] ?? "",
  cantidad: columns.find((c) => /cant|stock|qty|saldo/i.test(c)) ?? columns[2] ?? "",
  lote: columns.find((c) => /lote|batch/i.test(c)) ?? "",
  sitio: columns.find((c) => /sitio|sede/i.test(c)) ?? "",
  zona: columns.find((c) => /zona|galpon/i.test(c)) ?? "",
});

const toImportMapping = (mapping: ReturnType<typeof suggestedMapping>): ImportMapping => ({
  codigo_ubicacion: mapping.ubicacion,
  codigo_item: mapping.item,
  cantidad: mapping.cantidad,
  ...(mapping.lote ? { numero_lote: mapping.lote } : {}),
  ...(mapping.sitio ? { codigo_sitio: mapping.sitio } : {}),
  ...(mapping.zona ? { codigo_zona: mapping.zona } : {}),
});

export default function ImportWizard() {
  const { accessToken } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const profilesQuery = useQuery({
    queryKey: ["import-mapping-profiles", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchMappingProfiles(accessToken!),
  });

  const updateMapping = (field: keyof typeof mapping, value: string) => {
    setMapping((current) => ({ ...current, [field]: value }));
    setSelectedProfileId("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !accessToken) return;
    setFile(selected);
    setPreviewRows([]);
    setColumns([]);
    setSelectedProfileId("");
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const preview = await previewReconciliationFile(accessToken, selected);
      setColumns(preview.columnas);
      setPreviewRows(preview.filas);
      setMapping(suggestedMapping(preview.columnas));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "No se pudo leer el archivo");
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!accessToken || !profileName.trim() || !columns.length) return;
    setSavingProfile(true);
    try {
      const saved = await createMappingProfile(accessToken, profileName.trim(), toImportMapping(mapping));
      await queryClient.invalidateQueries({ queryKey: ["import-mapping-profiles"] });
      setSelectedProfileId(saved.id);
      setProfileName("");
      toast.success("Perfil de mapeo guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProcess = async () => {
    if (!file || !accessToken) return;
    if (previewLoading || previewError || !columns.length ||
        ![mapping.ubicacion, mapping.item, mapping.cantidad].every((value) => columns.includes(value))) {
      toast.error("Selecciona las columnas de ubicación, ítem y cantidad.");
      return;
    }
    setProcessing(true);
    try {
      const result = await uploadReconciliationFile(accessToken, file,
        toImportMapping(mapping), selectedProfileId || undefined);
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
            <Label htmlFor="inventory-file">Archivo de inventario (CSV o Excel)</Label>
            <input
              id="inventory-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        </div>

        {previewLoading && <p className="text-xs text-muted-foreground">Leyendo archivo para previsualizarlo...</p>}
        {previewError && <p role="alert" className="text-xs text-destructive">{previewError}</p>}

        {columns.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm">Mapeo de columnas detectadas</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Perfil guardado</Label>
              <select value={selectedProfileId} onChange={(event) => {
                const profile = profilesQuery.data?.find((item) => item.id === event.target.value);
                setSelectedProfileId(event.target.value);
                if (profile) setMapping({
                  ubicacion: profile.mapeo.codigo_ubicacion,
                  item: profile.mapeo.codigo_item,
                  cantidad: profile.mapeo.cantidad,
                  lote: profile.mapeo.numero_lote ?? "",
                  sitio: profile.mapeo.codigo_sitio ?? "",
                  zona: profile.mapeo.codigo_zona ?? "",
                });
              }} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs">
                <option value="">Mapeo personalizado de esta importación</option>
                {profilesQuery.data?.map((profile) => <option key={profile.id} value={profile.id}>{profile.nombre}</option>)}
              </select>
              {profilesQuery.isError && <p className="text-xs text-destructive">No se pudieron cargar los perfiles guardados.</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Ubicación *</Label>
                <select
                  value={mapping.ubicacion}
                  onChange={(e) => updateMapping("ubicacion", e.target.value)}
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
                  onChange={(e) => updateMapping("item", e.target.value)}
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
                  onChange={(e) => updateMapping("cantidad", e.target.value)}
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
                  onChange={(e) => updateMapping("lote", e.target.value)}
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
                  <select value={mapping[key]} onChange={(event) => updateMapping(key, event.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="">(Ninguno)</option>
                    {columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5 flex-1 min-w-48">
                <Label htmlFor="mapping-profile-name" className="text-xs">Guardar este mapeo para próximas importaciones</Label>
                <Input id="mapping-profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Nombre del perfil" />
              </div>
              <Button type="button" variant="outline" onClick={() => void saveProfile()}
                disabled={savingProfile || !profileName.trim() || ![mapping.ubicacion, mapping.item, mapping.cantidad].every((value) => columns.includes(value))}>
                {savingProfile ? "Guardando..." : "Guardar perfil"}
              </Button>
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
            disabled={!file || processing || previewLoading || Boolean(previewError) || !columns.length}
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
