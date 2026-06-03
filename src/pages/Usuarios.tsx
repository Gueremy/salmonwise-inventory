import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/context/RoleContext";
import { ApiUser, asignarGalponesUsuario, fetchUsuarios, updateUsuario, UpdateUsuarioPayload } from "@/lib/api";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

const rolLabel: Record<ApiUser["rol"], string> = {
  jefe_bodega: "Jefe de Bodega",
  admin_sede: "Admin Sede",
  operario: "Operario",
  gerencia: "Gerencia",
  super_admin: "Super Admin",
};

type Draft = UpdateUsuarioPayload & {
  nombre: string;
  email: string;
  codigo_empleado: string;
};

function buildDraft(usuario: ApiUser): Draft {
  return {
    nombre: usuario.nombre,
    email: usuario.email,
    codigo_empleado: usuario.codigo_empleado,
    rol: usuario.rol,
    id_sede: usuario.id_sede,
    turno: usuario.turno,
    activo: usuario.activo,
  };
}

export default function Usuarios() {
  const { accessToken } = useRole();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedGalpones, setSelectedGalpones] = useState<string[]>([]);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios", accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: () => fetchUsuarios(accessToken!),
  });
  const inventoryQuery = useInventorySnapshot();
  const usuarios = usuariosQuery.data?.items ?? [];
  const selectedUser = usuarios.find((usuario) => usuario.id === selectedId) ?? usuarios[0] ?? null;
  const galpones = inventoryQuery.data?.galpones ?? [];
  const sedes = inventoryQuery.data?.sedes ?? [];
  const sedeById = useMemo(() => new Map(sedes.map((sede) => [sede.id, sede.nombre])), [sedes]);

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedId(selectedUser.id);
    setDraft(buildDraft(selectedUser));
    setSelectedGalpones([]);
  }, [selectedUser?.id]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUsuarioPayload }) => updateUsuario(accessToken!, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const asignarMutation = useMutation({
    mutationFn: ({ id, galponesIds }: { id: string; galponesIds: string[] }) => asignarGalponesUsuario(accessToken!, id, galponesIds),
  });

  const saveUser = () => {
    if (!selectedUser || !draft) return;
    updateMutation.mutate({ id: selectedUser.id, payload: draft });
  };

  const toggleGalpon = (id: string) => {
    setSelectedGalpones((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Gestion de usuarios</h2>
        <p className="text-sm text-muted-foreground">Conectado a GET/PATCH /usuarios/ y POST /usuarios/{"{id}"}/asignar-galpones.</p>
      </div>

      {usuariosQuery.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar la lista de usuarios desde la API.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <section className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_90px] gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
            <span>Usuario</span>
            <span>Rol</span>
            <span>Sede</span>
            <span>Estado</span>
          </div>
          {usuariosQuery.isLoading && <div className="p-4 text-sm text-muted-foreground">Cargando usuarios...</div>}
          {usuarios.map((usuario) => (
            <button
              key={usuario.id}
              onClick={() => setSelectedId(usuario.id)}
              className={`w-full grid grid-cols-[1.4fr_1fr_1fr_90px] gap-3 px-4 py-3 text-left text-sm border-b border-border/70 hover:bg-muted/50 ${
                usuario.id === selectedUser?.id ? "bg-primary/5" : ""
              }`}
            >
              <span>
                <span className="font-medium block">{usuario.nombre}</span>
                <span className="text-xs text-muted-foreground">{usuario.email}</span>
              </span>
              <span>{rolLabel[usuario.rol]}</span>
              <span>{usuario.id_sede ? sedeById.get(usuario.id_sede) ?? usuario.id_sede : "Global"}</span>
              <span className={usuario.activo ? "text-status-disponible" : "text-muted-foreground"}>
                {usuario.activo ? "Activo" : "Inactivo"}
              </span>
            </button>
          ))}
        </section>

        <aside className="bg-card border border-border rounded-lg p-5 h-fit space-y-5">
          {!selectedUser || !draft ? (
            <div className="text-sm text-muted-foreground">Selecciona un usuario para editar.</div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Perfil y permisos</h3>
              </div>

              <div className="space-y-3">
                <Input value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} />
                <Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                <Input value={draft.codigo_empleado} onChange={(event) => setDraft({ ...draft, codigo_empleado: event.target.value })} />
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.rol} onChange={(event) => setDraft({ ...draft, rol: event.target.value as ApiUser["rol"] })}>
                  {Object.entries(rolLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.turno ?? ""} onChange={(event) => setDraft({ ...draft, turno: event.target.value ? event.target.value as "A" | "B" : null })}>
                  <option value="">Sin turno</option>
                  <option value="A">Turno A</option>
                  <option value="B">Turno B</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(draft.activo)} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })} />
                  Usuario activo
                </label>
              </div>

              <Button onClick={saveUser} disabled={updateMutation.isPending} className="w-full bg-primary hover:bg-secondary">
                <Save className="h-4 w-4 mr-2" /> {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Asignar galpones</h4>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {galpones.map((galpon) => (
                    <label key={galpon.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <span>{galpon.codigo} · {galpon.nombre}</span>
                      <input type="checkbox" checked={selectedGalpones.includes(galpon.id)} onChange={() => toggleGalpon(galpon.id)} />
                    </label>
                  ))}
                  {galpones.length === 0 && <div className="text-xs text-muted-foreground">No hay galpones cargados desde la API.</div>}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={asignarMutation.isPending || galpones.length === 0}
                  onClick={() => asignarMutation.mutate({ id: selectedUser.id, galponesIds: selectedGalpones })}
                >
                  {asignarMutation.isPending ? "Asignando..." : "Guardar asignacion"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  La API reemplaza la asignacion anterior por la seleccion actual.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
