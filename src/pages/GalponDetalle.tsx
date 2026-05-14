import { useParams } from "react-router-dom";
import { useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { galpones, sedes, containers as allContainers, Container, estadoColor } from "@/data/mock";
import { GalponScene } from "@/components/three/GalponScene";
import { StatusLegend } from "@/components/StatusLegend";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Package, Thermometer, Truck, History, X, ClipboardEdit, type LucideIcon } from "lucide-react";
import { MovimientoForm } from "@/components/MovimientoForm";

export default function GalponDetalle() {
  const { id } = useParams();
  const galpon = galpones.find((g) => g.id === id);
  const sede = sedes.find((s) => s.id === galpon?.sedeId);
  const containers = allContainers.filter((c) => c.galponId === id);
  const [selected, setSelected] = useState<Container | null>(null);
  const [openMov, setOpenMov] = useState(false);

  if (!galpon || !sede) return <div className="p-6">Galpón no encontrado.</div>;

  // Para galpones que no son g1 mostramos los mismos containers como demo (aún hay grilla 3D)
  const display = containers.length > 0 ? containers : allContainers.slice(0, 12);

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs items={[
        { label: "Sedes", to: "/sedes" },
        { label: sede.nombre, to: `/sedes/${sede.id}` },
        { label: `Galpón ${galpon.codigo} – ${galpon.nombre}` },
      ]} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Galpón {galpon.codigo} — {galpon.nombre}</h2>
              <p className="text-sm text-muted-foreground">{display.length} containers · ocupación promedio {galpon.ocupacion_prom}%</p>
            </div>
            <Button onClick={() => setOpenMov(true)} className="bg-primary hover:bg-secondary">
              <ClipboardEdit className="h-4 w-4 mr-2" /> Registrar movimiento
            </Button>
          </div>
          <GalponScene containers={display} selectedId={selected?.id ?? null} onSelect={setSelected} />
          <StatusLegend />
        </div>

        {/* Panel detalle */}
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
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <StatusBadge estado={selected.estado} />

              {selected.producto ? (
                <>
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Row label="Producto" value={selected.producto} icon={Package} />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 flex justify-between"><span>Ocupación</span><span className="font-semibold">{selected.ocupacion}%</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${selected.ocupacion}%`, backgroundColor: estadoColor[selected.estado] }} />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{Math.round(selected.ocupacion * 20)} / 2.000 kg</div>
                    </div>
                    <Row label="Lote" value={selected.lote ?? "—"} />
                    <Row label="Fecha fabricación" value="01/02/2026" icon={Calendar} />
                    <Row
                      label="Vencimiento"
                      value={selected.vencimiento ?? "—"}
                      icon={Calendar}
                      warning={selected.vencimiento ? "⚠️ en 15 días" : undefined}
                    />
                    <Row label="Temperatura" value="4°C" icon={Thermometer} />
                    <Row label="Proveedor" value="Skretting Chile S.A." icon={Truck} />
                    <Row label="Último movimiento" value="hace 2 horas" icon={History} />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Button className="w-full bg-primary hover:bg-secondary" onClick={() => setOpenMov(true)}>
                      Registrar movimiento
                    </Button>
                    <Button variant="outline" className="w-full">Ver historial completo</Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground pt-3 border-t border-border">Container vacío o en estado especial.</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <MovimientoForm open={openMov} onOpenChange={setOpenMov} container={selected ?? undefined} />
    </div>
  );
}

interface RowProps { label: string; value: string; icon?: LucideIcon; warning?: string; }
const Row = ({ label, value, icon: Icon, warning }: RowProps) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
    <span className="text-right">
      <span className="font-medium">{value}</span>
      {warning && <div className="text-xs text-status-medio font-medium">{warning}</div>}
    </span>
  </div>
);
