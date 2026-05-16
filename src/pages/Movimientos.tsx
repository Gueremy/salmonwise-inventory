import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MovStatusBadge } from "@/components/StatusBadge";
import { TrazabilidadBusqueda } from "@/components/TrazabilidadBusqueda";
import { Search, FileText, FileSpreadsheet, ArrowUpDown, QrCode } from "lucide-react";
import type { MovimientoAPI, TipoMovimiento, EstadoMovimiento, Paginated } from "@/types";
import { tipoMovimientoLabel, estadoMovimientoLabel } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store/authStore";
import { useAprobarMovimiento, useRechazarMovimiento } from "@/hooks/useMovimientos";
import { toast } from "sonner";

const columnHelper = createColumnHelper<MovimientoAPI>();

function formatFecha(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es });
}

interface Filters {
  tipo: string;
  estado: string;
  desde: string;
  hasta: string;
  skip: number;
  limit: number;
}

function useMovimientosLista(filters: Filters) {
  return useQuery<MovimientoAPI[]>({
    queryKey: ['movimientos', 'lista', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        skip: filters.skip,
        limit: filters.limit,
      };
      if (filters.tipo)  params.tipo  = filters.tipo;
      if (filters.estado) params.estado = filters.estado;
      if (filters.desde)  params.desde  = filters.desde;
      if (filters.hasta)  params.hasta  = filters.hasta;
      const { data } = await apiClient.get<Paginated<MovimientoAPI> | MovimientoAPI[]>('/movimientos/', { params });
      return Array.isArray(data) ? data : data.items;
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

function AccionesCell({ mov }: { mov: MovimientoAPI }) {
  const usuario = useAuthStore((s) => s.usuario);
  const aprobar = useAprobarMovimiento();
  const rechazar = useRechazarMovimiento();

  const puedeAprobar = (usuario?.rol === 'jefe_bodega' || usuario?.rol === 'admin_sede' || usuario?.rol === 'super_admin')
    && mov.estado === 'pendiente';

  if (!puedeAprobar) return null;

  return (
    <div className="flex gap-1.5">
      <button
        className="text-xs px-2 py-1 rounded font-medium min-h-[32px]"
        style={{ backgroundColor: 'var(--color-status-disponible-bg)', color: 'var(--color-status-disponible)' }}
        onClick={() => {
          const id = toast.loading('Aprobando movimiento...');
          aprobar.mutate(mov.id, {
            onSuccess: () => { toast.dismiss(id); toast.success('Movimiento aprobado correctamente.'); },
            onError: ()  => { toast.dismiss(id); toast.error('No se pudo aprobar el movimiento.'); },
          });
        }}
      >
        Aprobar
      </button>
      <button
        className="text-xs px-2 py-1 rounded font-medium min-h-[32px]"
        style={{ backgroundColor: 'var(--color-status-critico-bg)', color: 'var(--color-status-critico)' }}
        onClick={() => {
          const motivo = prompt('Motivo del rechazo:');
          if (!motivo) return;
          const id = toast.loading('Rechazando movimiento...');
          rechazar.mutate({ id: mov.id, motivo }, {
            onSuccess: () => { toast.dismiss(id); toast.success('Movimiento rechazado.'); },
            onError: ()  => { toast.dismiss(id); toast.error('No se pudo rechazar el movimiento.'); },
          });
        }}
      >
        Rechazar
      </button>
    </div>
  );
}

const TIPOS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'entrada_proveedor', label: tipoMovimientoLabel.entrada_proveedor },
  { value: 'salida_produccion', label: tipoMovimientoLabel.salida_produccion },
  { value: 'traslado_interno',  label: tipoMovimientoLabel.traslado_interno },
];

const ESTADOS_MOV: Array<{ value: string; label: string }> = [
  { value: '',          label: 'Todos los estados' },
  { value: 'pendiente', label: estadoMovimientoLabel.pendiente },
  { value: 'aprobado',  label: estadoMovimientoLabel.aprobado },
  { value: 'rechazado', label: estadoMovimientoLabel.rechazado },
];

export default function Movimientos() {
  const [filters, setFilters] = useState<Filters>({ tipo: '', estado: '', desde: '', hasta: '', skip: 0, limit: 50 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showTrazabilidad, setShowTrazabilidad] = useState(false);

  const { data: movimientos, isLoading, isError } = useMovimientosLista(filters);

  const columns = [
    columnHelper.accessor('created_at', {
      header: 'Fecha/Hora',
      cell: (i) => <span className="text-muted-foreground text-xs">{formatFecha(i.getValue())}</span>,
    }),
    columnHelper.accessor('tipo', {
      header: 'Tipo',
      cell: (i) => tipoMovimientoLabel[i.getValue() as TipoMovimiento] ?? i.getValue(),
    }),
    columnHelper.accessor('nombre_producto', {
      header: 'Producto',
      cell: (i) => <span className="font-medium">{i.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('numero_lote', {
      header: 'Lote',
      cell: (i) => <span className="font-mono text-xs text-muted-foreground">{i.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('cantidad', {
      header: 'Cantidad',
      cell: (i) => `${i.getValue()} ${i.row.original.unidad}`,
    }),
    columnHelper.accessor('codigo_container', {
      header: 'Container',
      cell: (i) => i.getValue() ?? '—',
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: (i) => <MovStatusBadge estado={i.getValue() as EstadoMovimiento} />,
    }),
    columnHelper.accessor('codigo_empleado_creador', {
      header: 'Empleado',
      cell: (i) => <span className="text-muted-foreground text-xs">{i.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'acciones',
      header: '',
      cell: (i) => <AccionesCell mov={i.row.original} />,
    }),
  ];

  const table = useReactTable({
    data: movimientos ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const updateFilter = (key: keyof Filters, value: string | number) =>
    setFilters((f) => ({ ...f, [key]: value, skip: 0 }));

  return (
    <div className="p-6 animate-fade-in space-y-4">
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto, lote o container" readOnly />
          </div>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.tipo}
            onChange={(e) => updateFilter('tipo', e.target.value)}
          >
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.estado}
            onChange={(e) => updateFilter('estado', e.target.value)}
          >
            {ESTADOS_MOV.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          <Input type="date" className="w-40" value={filters.desde} onChange={(e) => updateFilter('desde', e.target.value)} />
          <Input type="date" className="w-40" value={filters.hasta} onChange={(e) => updateFilter('hasta', e.target.value)} />

          <Button variant="outline" size="sm" onClick={() => setShowTrazabilidad((v) => !v)}>
            <QrCode className="h-4 w-4 mr-1.5" /> Trazabilidad
          </Button>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel</Button>
        </div>

        {showTrazabilidad && (
          <div className="p-4 border-b border-border">
            <TrazabilidadBusqueda />
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-center" style={{ color: 'var(--color-status-critico)' }}>
              No se pudieron cargar los movimientos. Verifica tu conexión.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        <span className="flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No hay movimientos registrados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-border hover:bg-muted/30 transition">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 flex items-center justify-between border-t border-border text-xs text-muted-foreground">
          <span>{movimientos?.length ?? 0} resultados</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={filters.skip === 0}
              onClick={() => setFilters((f) => ({ ...f, skip: Math.max(0, f.skip - f.limit) }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={(movimientos?.length ?? 0) < filters.limit}
              onClick={() => setFilters((f) => ({ ...f, skip: f.skip + f.limit }))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
