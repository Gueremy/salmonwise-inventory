import { useState } from 'react';
import {
  Box, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  QrCode, Wifi, WifiOff, Search, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { MovimientoForm } from '@/components/MovimientoForm';

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
  const [openMov, setOpenMov]   = useState(false);
  const [online, setOnline]     = useState(true);

  const items = [
    { codigo: 'G1-C04', producto: 'Alimento 5mm',       ocup: 65, estado: 'medio'       as const },
    { codigo: 'G1-C07', producto: 'Alimento 3mm',       ocup: 20, estado: 'disponible'  as const },
    { codigo: 'G2-C11', producto: 'Químico limpiador',  ocup: 85, estado: 'critico'     as const },
  ];

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
          <Input className="pl-9 h-12 text-base" placeholder="Buscar container o producto" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={ArrowDownToLine} label="Registrar Entrada" onClick={() => setOpenMov(true)} color="bg-status-disponible" />
          <ActionButton icon={ArrowUpFromLine} label="Registrar Salida"  onClick={() => setOpenMov(true)} color="bg-secondary" />
          <ActionButton icon={RefreshCw}       label="Traslado"          onClick={() => setOpenMov(true)} color="bg-primary" />
          <ActionButton icon={QrCode}          label="Escanear QR"       onClick={() => {}}               color="bg-status-cuarentena" />
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2 px-1">Mis containers asignados hoy</h3>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.codigo} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{it.codigo}</div>
                  <div className="text-xs text-muted-foreground">{it.producto}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-semibold">{it.ocup}%</div>
                  <StatusBadge estado={it.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-status-medio/10 border border-status-medio/30 rounded-lg p-4">
          <div className="text-sm font-semibold text-status-medio">⚠️ 2 movimientos rechazados</div>
          <div className="text-xs text-muted-foreground mt-0.5">Toca para revisar y reenviar</div>
        </div>
      </main>

      <MovimientoForm open={openMov} onOpenChange={setOpenMov} />
    </div>
  );
}
