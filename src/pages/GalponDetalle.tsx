import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { estadoColor } from "@/data/mock";
import { GalponScene } from "@/components/three/GalponScene";
import { StatusLegend } from "@/components/StatusLegend";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Package, ClipboardEdit, X, Grid3X3, Archive, type LucideIcon } from "lucide-react";
import { MovimientoForm } from "@/components/MovimientoForm";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

export default function GalponDetalle() {
  const { id } = useParams();
  const inventoryQuery = useInventorySnapshot();
  const galpones = inventoryQuery.data?.galpones ?? [];
  const sedes = inventoryQuery.data?.sedes ?? [];
  const containers = inventoryQuery.data?.containers ?? [];
  const galpon = galpones.find((item) => item.id === id);
  const sede = sedes.find((item) => item.id === galpon?.sedeId);
  const display = useMemo(
    () => containers.filter((item) => item.galponId === id),
    [containers, id],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMov, setOpenMov] = useState(false);
  const selected = display.find((item) => item.id === selectedId) ?? null;

  if (inventoryQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando galpon...</div>;
  }

  if (inventoryQuery.isError) {
    return <div className="p-6 text-sm text-muted-foreground">No se pudo cargar el galpon desde la API.</div>;
  }

  if (!galpon || !sede) {
    return <div className="p-6">Galpon no encontrado.</div>;
  }

  const ocupacionPromedio = display.length > 0
    ? Math.round(display.reduce((total, container) => total + container.ocupacion, 0) / display.length)
    : galpon.ocupacion_prom;

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: "Sedes", to: "/sedes" },
          { label: sede.nombre, to: `/sedes/${sede.id}` },
          { label: `Galpon ${galpon.codigo} · ${galpon.nombre}` },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Galpon {galpon.codigo} - {galpon.nombre}</h2>
              <p className="text-sm text-muted-foreground">
                {display.length} containers · ocupacion promedio {ocupacionPromedio}%
              </p>
            </div>
            <Button onClick={() => setOpenMov(true)} className="bg-primary hover:bg-secondary" disabled={display.length === 0}>
              <ClipboardEdit className="h-4 w-4 mr-2" /> Registrar movimiento
            </Button>
          </div>
          {display.length > 0 ? (
            <GalponScene containers={display} selectedId={selectedId} onSelect={(container) => setSelectedId(container.id)} />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Este galpon no tiene containers disponibles para visualizar.
            </div>
          )}
          <StatusLegend />
        </div>

        <aside className="bg-card border border-border rounded-lg p-5 h-fit sticky top-20">
          {!selected ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecciona un container en la escena 3D para ver detalle.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Container</div>
                  <h3 className="text-xl font-bold">{selected.codigo}</h3>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <StatusBadge estado={selected.estado} />

              <div className="space-y-3 pt-2 border-t border-border">
                <Row label="Tipo permitido" value={selected.tipoProductoPermitido} icon={Package} />
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                    <span>Ocupacion</span>
                    <span className="font-semibold">{selected.ocupacion}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${selected.ocupacion}%`, backgroundColor: estadoColor[selected.estado] }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {selected.ocupacionActual} / {selected.capacidadMax} {selected.unidadMedida}
                  </div>
                </div>
                <Row label="Posicion" value={`Fila ${selected.posicionFila}, Col ${selected.posicionCol}`} icon={Grid3X3} />
                <Row label="Codigo interno" value={selected.id} icon={Archive} />
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  La API actual del backend no expone lote, proveedor ni vencimiento por container.
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="w-full bg-primary hover:bg-secondary" onClick={() => setOpenMov(true)} disabled={display.length === 0}>
                  Registrar movimiento
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  Historial completo pendiente de integrar
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <MovimientoForm
        open={openMov}
        onOpenChange={setOpenMov}
        container={selected ?? undefined}
        availableContainers={display}
      />
    </div>
  );
}

const Row = ({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
    <span className="text-right font-medium">{value}</span>
  </div>
);
