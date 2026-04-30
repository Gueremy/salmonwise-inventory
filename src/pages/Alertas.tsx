import { AlertTriangle, AlertCircle, Info, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const grupos = [
  {
    titulo: "Críticas", color: "destructive", bg: "bg-destructive/5 border-destructive/30", icon: AlertCircle,
    items: [
      { txt: "Container G2-C08 al 95% de capacidad — Galpón Químicos", time: "hace 1h" },
      { txt: "Producto LOT-2026-03-012 vence en 3 días — G1-C15", time: "hace 2h" },
    ],
  },
  {
    titulo: "Avisos", color: "status-medio", bg: "bg-status-medio/5 border-status-medio/30", icon: AlertTriangle,
    items: [
      { txt: "Container G3-C02 en cuarentena sin revisión > 48h", time: "hace 5h" },
      { txt: "Stock mínimo alcanzado: Antibiótico XYZ", time: "hace 7h" },
    ],
  },
  {
    titulo: "Informativas", color: "secondary", bg: "bg-secondary/5 border-secondary/30", icon: Info,
    items: [
      { txt: "Sincronización offline completada: 12 movimientos", time: "hace 8h" },
    ],
  },
];

export default function Alertas() {
  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {grupos.map((g) => (
        <section key={g.titulo}>
          <div className={`flex items-center gap-2 mb-2 text-${g.color}`}>
            <g.icon className="h-4 w-4" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">{g.titulo}</h3>
            <span className="text-xs text-muted-foreground">({g.items.length})</span>
          </div>
          <div className="space-y-2">
            {g.items.map((a, i) => (
              <div key={i} className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${g.bg}`}>
                <div className="text-sm">
                  <div className="font-medium">{a.txt}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm"><Check className="h-3.5 w-3.5 mr-1" />Revisada</Button>
                  <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1" />Ver container</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
