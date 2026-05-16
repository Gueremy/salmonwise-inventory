import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useGalpones } from "@/hooks/useGalpones";
import type { UsuarioAPI, Rol, Paginated } from "@/types";
import { rolLabel } from "@/types";

const ROL_OPTIONS: Rol[] = ['super_admin', 'admin_sede', 'jefe_bodega', 'operario', 'gerencia'];

function useUsuarios(idSede?: string) {
  return useQuery<UsuarioAPI[]>({
    queryKey: ['usuarios', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<UsuarioAPI> | UsuarioAPI[]>('/usuarios/', {
        params: idSede ? { id_sede: idSede } : {},
      });
      return Array.isArray(data) ? data : data.items;
    },
    staleTime: 30_000,
  });
}

function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; rol?: Rol; activo?: boolean }) =>
      apiClient.patch<UsuarioAPI>(`/usuarios/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

function useAsignarGalpones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, galpon_ids }: { id: string; galpon_ids: string[] }) =>
      apiClient.post(`/usuarios/${id}/asignar-galpones`, { galpon_ids }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

function AsignarGalponesModal({
  usuario,
  open,
  onClose,
}: { usuario: UsuarioAPI; open: boolean; onClose: () => void }) {
  const { data: galpones } = useGalpones(usuario.id_sede ?? undefined);
  const asignar = useAsignarGalpones();
  const [selected, setSelected] = useState<string[]>(usuario.galpon_ids ?? []);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = () => {
    asignar.mutate(
      { id: usuario.id, galpon_ids: selected },
      {
        onSuccess: () => { toast.success('Galpones asignados correctamente.'); onClose(); },
        onError:   () => toast.error('No se pudieron asignar los galpones.'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Asignar galpones — {usuario.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto py-2">
          {!galpones ? (
            <Skeleton className="h-8 w-full" />
          ) : galpones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin galpones en esta sede.</p>
          ) : (
            galpones.map((g) => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  onChange={() => toggle(g.id)}
                  className="rounded"
                />
                {g.codigo} — {g.nombre}
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={save}
            disabled={asignar.isPending}
            style={{ backgroundColor: 'var(--color-action-primary)' }}
          >
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const columnHelper = createColumnHelper<UsuarioAPI>();

export default function Usuarios() {
  const usuario = useAuthStore((s) => s.usuario);
  const idSede = usuario?.rol === 'admin_sede' ? (usuario.id_sede ?? undefined) : undefined;

  const { data: usuarios, isLoading, isError } = useUsuarios(idSede);
  const updateUsuario = useUpdateUsuario();
  const [galponModal, setGalponModal] = useState<UsuarioAPI | null>(null);

  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre',
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    columnHelper.accessor('email', {
      header: 'Correo',
      cell: (i) => <span className="text-muted-foreground text-sm">{i.getValue()}</span>,
    }),
    columnHelper.accessor('rol', {
      header: 'Rol',
      cell: (i) => (
        <select
          className="h-8 rounded border border-input bg-background px-2 text-sm"
          value={i.getValue()}
          onChange={(e) => {
            const newRol = e.target.value as Rol;
            const id = toast.loading('Actualizando rol...');
            updateUsuario.mutate(
              { id: i.row.original.id, rol: newRol },
              {
                onSuccess: () => { toast.dismiss(id); toast.success('Rol actualizado correctamente.'); },
                onError:   () => { toast.dismiss(id); toast.error('No se pudo actualizar el rol.'); },
              }
            );
          }}
        >
          {ROL_OPTIONS.map((r) => <option key={r} value={r}>{rolLabel[r]}</option>)}
        </select>
      ),
    }),
    columnHelper.accessor('sede_nombre', {
      header: 'Sede',
      cell: (i) => <span className="text-sm text-muted-foreground">{i.getValue() ?? 'Sin sede'}</span>,
    }),
    columnHelper.accessor('activo', {
      header: 'Estado',
      cell: (i) => (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded"
          style={i.getValue()
            ? { backgroundColor: 'var(--color-status-disponible-bg)', color: 'var(--color-status-disponible)' }
            : { backgroundColor: 'var(--color-status-mantenimiento-bg)', color: 'var(--color-status-mantenimiento)' }
          }
        >
          {i.getValue() ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'acciones',
      header: '',
      cell: (i) => (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[32px] text-xs"
            onClick={() => setGalponModal(i.row.original)}
          >
            Galpones
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[32px] text-xs"
            onClick={() => {
              const activo = !i.row.original.activo;
              const id = toast.loading(activo ? 'Activando usuario...' : 'Desactivando usuario...');
              updateUsuario.mutate(
                { id: i.row.original.id, activo },
                {
                  onSuccess: () => { toast.dismiss(id); toast.success(`Usuario ${activo ? 'activado' : 'desactivado'} correctamente.`); },
                  onError:   () => { toast.dismiss(id); toast.error('No se pudo actualizar el usuario.'); },
                }
              );
            }}
          >
            {i.row.original.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: usuarios ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-6 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Gestión de usuarios</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? '...' : `${usuarios?.length ?? 0} usuarios registrados`}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-center" style={{ color: 'var(--color-status-critico)' }}>
            No se pudieron cargar los usuarios. El servidor puede estar caído o sin permiso para este rol.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="text-left px-4 py-3 font-medium">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No hay usuarios registrados.
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
          </div>
        )}
      </div>

      {galponModal && (
        <AsignarGalponesModal
          usuario={galponModal}
          open={!!galponModal}
          onClose={() => setGalponModal(null)}
        />
      )}
    </div>
  );
}
