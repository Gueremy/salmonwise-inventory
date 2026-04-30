import { Link } from "react-router-dom";
import { sedes, galpones, ocupacionToEstado, estadoColor } from "@/data/mock";
import { Boxes } from "lucide-react";

export default function Inventario() {
  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <p className="text-sm text-muted-foreground">Selecciona una sede para entrar a su vista 3D.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sedes.map((s) => {
          const sg = galpones.filter((g) => g.sedeId === s.id);
          return (
            <Link key={s.id} to={`/sedes/${s.id}`} className="bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{s.nombre}</h3>
              </div>
              <div className="flex gap-1.5 mt-2">
                {sg.map((g) => {
                  const est = ocupacionToEstado(g.ocupacion_prom);
                  return (
                    <div key={g.id} className="flex-1 rounded p-2 text-[11px]" style={{ backgroundColor: `${estadoColor[est]}22`, color: estadoColor[est] }}>
                      <div className="font-bold">{g.codigo}</div>
                      <div>{g.ocupacion_prom}%</div>
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
