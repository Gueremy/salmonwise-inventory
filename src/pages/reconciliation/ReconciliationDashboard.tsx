import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers,
  AlertTriangle,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Box,
  Eye,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useRole } from "@/context/RoleContext";
import { fetchInconsistencies, fetchJobInconsistencies, fetchSupervisorKpis, InconsistencyItem } from "@/api/reconciliation";
import { fetchLocationById } from "@/api/locations";
import { downloadReport, ReportDownloadResult } from "@/api/reports";
import { toast } from "sonner";

export default function ReconciliationDashboard() {
  const { accessToken } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");

  const [filterType, setFilterType] = useState<string>("todos");
  const [lastReport, setLastReport] = useState<ReportDownloadResult | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const kpisQuery = useQuery({
    queryKey: ["reconciliation-kpis", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchSupervisorKpis(accessToken!),
  });

  const inconsistenciesQuery = useQuery({
    queryKey: ["inconsistencies", accessToken, jobId],
    enabled: Boolean(accessToken),
    queryFn: () => jobId ? fetchJobInconsistencies(accessToken!, jobId) : fetchInconsistencies(accessToken!),
  });

  const kpis = kpisQuery.data ?? {
    capacidad_instalada: 0,
    stock_actual: 0,
    ubicaciones_libres: 0,
    porcentaje_uso: 0,
    total_inconsistencias: 0,
    capacidad_por_unidad: {},
    stock_por_unidad: {},
    totales_comparables: true,
  };

  const items = inconsistenciesQuery.data ?? [];
  const filteredItems = filterType === "todos"
    ? items
    : items.filter((item) => item.tipo === filterType || item.severidad === filterType);
  const formatTotals = (totals: Record<string, number>, scalar: number) => {
    const entries = Object.entries(totals);
    if (entries.length === 0) return scalar.toLocaleString("es-CL");
    return entries.map(([unit, value]) => `${Number(value).toLocaleString("es-CL")} ${unit}`).join(" · ");
  };

  const openInconsistency = async (item: InconsistencyItem) => {
    if (!accessToken || !item.id_ubicacion) return;
    try {
      const location = await fetchLocationById(accessToken, item.id_ubicacion);
      navigate(`/zones/${location.id_zona}?focus=${location.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la ubicación");
    }
  };

  const handleDownload = async (kind: "pdf" | "excel") => {
    if (!accessToken) return;
    setDownloading(kind);
    try {
      const result = await downloadReport(accessToken, kind, "", "inconsistencias");
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      setLastReport(result);
      toast.success(`Reporte ${result.filename} descargado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al descargar reporte");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de conciliación y supervisión</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detección automática de inconsistencias operativas y comparación física vs teórica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("excel")}
            disabled={Boolean(downloading)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("pdf")}
            disabled={Boolean(downloading)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
          <Button asChild className="bg-primary hover:bg-secondary size-sm">
            <Link to="/reconciliation/import">
              <UploadCloud className="h-4 w-4 mr-1.5" />
              Importar ERP/WMS
            </Link>
          </Button>
        </div>
      </div>

      {/* 5 KPIs Mandatorios */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">Capacidad Instalada</div>
          <div className="text-2xl font-bold mt-1">{formatTotals(kpis.capacidad_por_unidad, kpis.capacidad_instalada)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Volumen total</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">Stock Actual</div>
          <div className="text-2xl font-bold mt-1 text-primary">{formatTotals(kpis.stock_por_unidad, kpis.stock_actual)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Existencias físicas</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">Ubicaciones Libres</div>
          <div className="text-2xl font-bold mt-1 text-status-disponible">{kpis.ubicaciones_libres}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Listas para almacenar</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">% Utilización</div>
          <div className="text-2xl font-bold mt-1">{kpis.porcentaje_uso}%</div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(kpis.porcentaje_uso, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">Inconsistencias</div>
          <div className={`text-2xl font-bold mt-1 ${items.length > 0 ? "text-destructive" : "text-status-disponible"}`}>
            {items.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Divergencias detectadas</div>
        </div>
      </div>

      {/* Lista de Inconsistencias con navegación hacia 2D/3D */}
      {(kpisQuery.isError || inconsistenciesQuery.isError) && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          No se pudieron cargar los datos de conciliación. Revisa tu conexión o permisos.
        </div>
      )}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-base">Inconsistencias operativas</h2>
            <span className="text-xs text-muted-foreground">({filteredItems.length})</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              <option value="todos">Todas las inconsistencias</option>
              <option value="sobrecapacidad">Sobrecapacidad</option>
              <option value="lotes_mezclados">Lotes mezclados</option>
              <option value="alta">Severidad Alta</option>
              <option value="media">Severidad Media</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.map((inc) => (
            <div
              key={inc.id}
              className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-3 transition ${
                inc.severidad === "alta"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-status-medio/30 bg-status-medio/5"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      inc.severidad === "alta"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-status-medio text-black"
                    }`}
                  >
                    {inc.tipo.replace(/_/g, " ")}
                  </span>
                  {inc.ubicacion_codigo && (
                    <span className="font-semibold text-sm">Ubicación {inc.ubicacion_codigo}</span>
                  )}
                </div>
                <p className="text-xs text-foreground/90">{inc.descripcion}</p>
                <div className="text-[10px] text-muted-foreground">
                  Detectado el {new Date(inc.fecha_deteccion).toLocaleDateString("es-CL")}
                </div>
              </div>

              {/* Botón interactivo para navegar y resaltar la ubicación en 2D/3D */}
              {inc.id_ubicacion && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => void openInconsistency(inc)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                  Ver en 3D / 2D
                </Button>
              )}
            </div>
          ))}

          {filteredItems.length === 0 && !inconsistenciesQuery.isError && (
            <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-disponible opacity-80" />
              No se detectaron inconsistencias para el filtro seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* Auditoría SHA-256 del último reporte descargado */}
      {lastReport && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Fingerprint className="h-4 w-4 text-primary" /> Integridad criptográfica SHA-256
          </div>
          <div className="text-xs text-muted-foreground">{lastReport.filename}</div>
          <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs font-mono">
            {lastReport.sha256}
          </code>
        </div>
      )}
    </div>
  );
}
