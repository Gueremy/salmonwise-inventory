import { useState } from 'react';
import {
  Box, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  QrCode, Wifi, WifiOff, Search, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MovimientoForm } from '@/components/MovimientoForm';
import { useGalpones } from '@/hooks/useGalpones';
import { useContainers } from '@/hooks/useContainers';
import type { ContainerAPI } from '@/types';

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}

const ActionButton = ({ icon: Icon, label, onClick, color }: ActionButtonProps) => (
  <button
    onClick={onClick}
    className={`${color} text-white rounded-lg p-5 flex flex-col items-center justify-center gap-2 h-28 active:scale-95 transition shadow-sm`}
  >
    <Icon className="h-7 w-7" />
    <span className="text-sm font-semibold text-center leading-tight">{label}</span>
  </button>
);

export default function Operario() {
  const usuario        = useAuthStore((s) => s.usuario);
  const { logout }     = useAuth();
  const [openMov, setOpenMov]         = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerAPI | undefined>();
  const [online, setOnline]           = useState(true);
  const [search, setSearch]           = useState('');

  const idSede = usuario?.id_sede ?? '';
  const galponesQuery = useGalpones(idSede);
  const firstGalpon = galponesQuery.data?.[0];
  const containersQuery = useContainers(firstGalpon?.id);

  const filteredContainers = (containersQuery.data ?? []).filter((c) =>
    !search || c.codigo.toLowerCase().includes(search.toLowerCase()) || c.nombre_producto?.toLowerCase().includes(search.toLowerCase())
  );

  const openMovimientoForm = (c?: ContainerAPI) => {
    setSelectedContainer(c);
    setOpenMov(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-white/15 flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs opacity-80">Axious · Operario</div>
              <div className="font-semibold leading-tight">{usuario?.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnline(!online)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded ${
                online ? 'bg-status-disponible text-white' : 'bg-status-medio text-white'
              }`}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? 'ONLINE' : 'OFFLINE'}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-white/15"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!online && (
          <div className="mt-2 text-[11px] bg-status-medio/30 rounded px-2 py-1.5 flex items-center gap-1.5">
            <WifiOff className="h-3 w-3" /> Sin conexión — guardando movimientos localmente
          </div>
        )}
      </header>

      <main className="p-4 space-y-5 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="Buscar container o producto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={ArrowDownToLine} label="Registrar Entrada" onClick={() => openMovimientoForm()} color="bg-status-disponible" />
          <ActionButton icon={ArrowUpFromLine} label="Registrar Salida"  onClick={() => openMovimientoForm()} color="bg-secondary" />
          <ActionButton icon={RefreshCw}       label="Traslado"          onClick={() => openMovimientoForm()} color="bg-primary" />
          <ActionButton icon={QrCode}          label="Escanear QR"       onClick={() => {}}                    color="bg-status-cuarentena" />
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2 px-1">
            Containers en {firstGalpon?.nombre ?? usuario?.sede_nombre ?? 'tu sede'}
          </h3>

          {galponesQuery.isLoading || containersQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="bg-muted/40 rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
              {search ? 'Sin resultados para esa búsqueda.' : 'Sin containers en este galpón.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContainers.map((c) => {
                const pct = c.capacidad_max > 0 ? Math.round((c.ocupacion_actual / c.capacidad_max) * 100) : 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => openMovimientoForm(c)}
                    className="w-full text-left bg-card rounded-lg border border-border p-4 flex items-center justify-between hover:border-primary/50 transition active:scale-[.98]"
                  >
                    <div>
                      <div className="font-bold">{c.codigo}</div>
                      <div className="text-xs text-muted-foreground">{c.nombre_producto ?? 'Sin producto'}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-semibold">{pct}%</div>
                      <StatusBadge estado={c.estado} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <MovimientoForm
        open={openMov}
        onOpenChange={(v) => { setOpenMov(v); if (!v) setSelectedContainer(undefined); }}
        container={selectedContainer}
      />
    </div>
  );
}
