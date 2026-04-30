import { Link } from "react-router-dom";
import { Ship, Factory, Warehouse, Bell, ArrowRight } from "lucide-react";
import { sedes, ocupacionToEstado, estadoColor } from "@/data/mock";

const tipoIcon = { embarcacion: Ship, planta: Factory, bodega: Warehouse };

export default function Sedes() {
  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Vista global de las sedes de Skretting Los Lagos · Región de Los Lagos
        </p>
      </div>

      {/* Mapa estilizado */}
      <div className="bg-card rounded-lg border border-border/60 shadow-sm p-6 mb-6 relative overflow-hidden"
           style={{
             backgroundImage: `linear-gradient(135deg, hsl(var(--primary)/0.04), hsl(var(--secondary)/0.06))`,
           }}>
        <div className="absolute inset-0 opacity-[0.06]"
             style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative">
          <div className="text-sm font-medium text-primary mb-2">🗺️ Mapa de operaciones</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sedes.map((s) => {
              const Icon = tipoIcon[s.tipo];
              const estado = ocupacionToEstado(s.ocupacion);
              return (
                <Link
                  key={s.id}
                  to={`/sedes/${s.id}`}
                  className="group bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[estado] }} />
                  </div>
                  <div className="font-semibold text-sm leading-tight mb-1">{s.nombre}</div>
                  <div className="text-xs text-muted-foreground capitalize mb-3">{s.tipo}</div>

                  <div className="text-xs font-medium mb-1 flex justify-between">
                    <span>Ocupación</span><span>{s.ocupacion}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.ocupacion}%`, backgroundColor: estadoColor[estado] }} />
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className={`flex items-center gap-1 ${s.alertas > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      <Bell className="h-3 w-3" /> {s.alertas} alertas
                    </span>
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      Ver <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card"><div className="text-xs text-muted-foreground">Sedes activas</div><div className="text-2xl font-bold mt-1">4</div></div>
        <div className="kpi-card"><div className="text-xs text-muted-foreground">Total alertas</div><div className="text-2xl font-bold mt-1 text-destructive">{sedes.reduce((a, s) => a + s.alertas, 0)}</div></div>
        <div className="kpi-card"><div className="text-xs text-muted-foreground">Ocupación promedio</div><div className="text-2xl font-bold mt-1">{Math.round(sedes.reduce((a, s) => a + s.ocupacion, 0) / sedes.length)}%</div></div>
        <div className="kpi-card"><div className="text-xs text-muted-foreground">Movimientos hoy</div><div className="text-2xl font-bold mt-1">{sedes.reduce((a, s) => a + (s.movimientosHoy ?? 0), 0)}</div></div>
      </div>
    </div>
  );
}
