import { useRole } from "@/context/RoleContext";
import { resolveLocationVisualState } from "@/domain/location";

interface Props {
  locations: any[];
  selectedId: string | null;
  onSelect: (location: any) => void;
  highlightedId?: string | null;
}

export const ZoneGrid2D = ({ locations, selectedId, onSelect, highlightedId }: Props) => {
  const { organizacion } = useRole();

  return (
    <div className="w-full h-[600px] rounded-lg border border-border bg-card p-4 overflow-y-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {locations.map((loc) => {
          const isSelected = selectedId === loc.id;
          const isHighlighted = highlightedId === loc.id;

          const visual = resolveLocationVisualState(
            {
              ocupacion_actual: Number(loc.ocupacion_actual ?? loc.ocupacionActual ?? 0),
              capacidad_maxima: Number(loc.capacidad_maxima ?? loc.capacidadMax ?? 100),
              estado: loc.estado,
            },
            organizacion.configuracion,
          );

          const itemName = loc.item_nombre ?? loc.producto ?? loc.atributos?.tipo_producto_permitido;
          const lotName = loc.lote_principal ?? loc.lote;

          return (
            <button
              key={loc.id}
              onClick={() => onSelect(loc)}
              className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between h-28 relative ${
                isHighlighted
                  ? "ring-2 ring-sky-500 border-sky-500 shadow-md bg-sky-500/10"
                  : isSelected
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <span className="font-bold text-sm tracking-tight">{loc.codigo}</span>
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: visual.color }}
                  title={`Estado: ${visual.estado}`}
                />
              </div>

              <div className="w-full my-1">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Ocupación</span>
                  <span className="font-semibold text-foreground">{visual.porcentaje}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(visual.porcentaje, 100)}%`, backgroundColor: visual.color }}
                  />
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground truncate w-full">
                {itemName ? `${itemName}${lotName ? ` · ${lotName}` : ""}` : "Disponible"}
              </div>
            </button>
          );
        })}
      </div>

      {locations.length === 0 && (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          No hay ubicaciones registradas en esta zona.
        </div>
      )}
    </div>
  );
};
