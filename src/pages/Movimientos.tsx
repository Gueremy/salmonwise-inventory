import { useState } from "react";
import { Search, FileText, FileSpreadsheet, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MovStatusBadge } from "@/components/StatusBadge";

const movs = [
  { id: "1", fecha: "30/04/2026 10:05", tipo: "Salida producción", producto: "Alimento 8mm", lote: "LOT-2026-03-089", container: "G1-C03", operario: "María González", estado: "aprobado" as const, aprobador: "Roberto Soto" },
  { id: "2", fecha: "30/04/2026 09:15", tipo: "Entrada proveedor", producto: "Vitamina C Plus", lote: "LOT-2026-04-092", container: "G3-C02", operario: "Jean Pierre", estado: "pendiente" as const, aprobador: "—" },
  { id: "3", fecha: "30/04/2026 08:32", tipo: "Entrada proveedor", producto: "Alimento 5mm", lote: "LOT-2026-04-091", container: "G1-C05", operario: "Carlos Mamani", estado: "pendiente" as const, aprobador: "—" },
  { id: "4", fecha: "29/04/2026 16:48", tipo: "Traslado interno", producto: "Alimento 3mm", lote: "LOT-2026-04-023", container: "G1-C02", operario: "Carlos Mamani", estado: "rechazado" as const, aprobador: "Roberto Soto" },
  { id: "5", fecha: "29/04/2026 14:20", tipo: "Salida producción", producto: "Alimento Premium", lote: "LOT-2026-04-067", container: "G1-C06", operario: "María González", estado: "aprobado" as const, aprobador: "Roberto Soto" },
];

export default function Movimientos() {
  const [selected, setSelected] = useState<typeof movs[number] | null>(null);

  return (
    <div className="p-6 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto, lote o container" />
          </div>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5" />Filtros</Button>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {["Fecha/Hora", "Tipo", "Producto", "Lote", "Container", "Operario", "Estado", "Aprobador"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} onClick={() => setSelected(m)} className="border-t border-border hover:bg-muted/30 cursor-pointer transition">
                  <td className="px-4 py-3 text-muted-foreground">{m.fecha}</td>
                  <td className="px-4 py-3">{m.tipo}</td>
                  <td className="px-4 py-3 font-medium">{m.producto}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{m.lote}</td>
                  <td className="px-4 py-3">{m.container}</td>
                  <td className="px-4 py-3">{m.operario}</td>
                  <td className="px-4 py-3"><MovStatusBadge estado={m.estado} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{m.aprobador}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)}>
          <aside className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border p-6 overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selected.producto}</h3>
            <MovStatusBadge estado={selected.estado} />
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Fecha/Hora", selected.fecha],
                ["Tipo", selected.tipo],
                ["Lote", selected.lote],
                ["Container", selected.container],
                ["Operario", selected.operario],
                ["Aprobador", selected.aprobador],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-md bg-secondary/5 border border-secondary/30">
              <div className="text-xs font-semibold text-secondary mb-2">Datos SERNAPESCA</div>
              <div className="text-xs space-y-1.5 text-muted-foreground">
                <div>Proveedor: <span className="text-foreground font-medium">Skretting Chile S.A.</span></div>
                <div>N° guía: <span className="text-foreground font-medium">GD-2026-04891</span></div>
                <div>Vencimiento: <span className="text-foreground font-medium">15/08/2026</span></div>
                <div>Reg. sanitario: <span className="text-foreground font-medium">RS-CL-78921</span></div>
                <div>Temp. almacén: <span className="text-foreground font-medium">4°C</span></div>
              </div>
            </div>
            <Button className="w-full mt-5" variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
          </aside>
        </div>
      )}
    </div>
  );
}
