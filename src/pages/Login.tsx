import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Box, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore, type Usuario } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROUTE_BY_ROL: Record<string, string> = {
  operario:    '/operario',
  gerencia:    '/gerencia',
  super_admin: '/dashboard',
  admin_sede:  '/dashboard',
  jefe_bodega: '/dashboard',
};

const MAX_INTENTOS = 5;
const BLOQUEO_MS   = 5 * 60 * 1000;

export default function Login() {
  const navigate                                  = useNavigate();
  const { setTokens, setUsuario }                 = useAuthStore();
  const [intentos, setIntentos]                   = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta]       = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const bloqueado = bloqueadoHasta !== null && Date.now() < bloqueadoHasta;

  const onSubmit = async (formData: LoginForm) => {
    if (bloqueado) {
      const mins = Math.ceil((bloqueadoHasta! - Date.now()) / 60_000);
      toast.error(`Cuenta bloqueada temporalmente. Intenta en ${mins} minuto${mins !== 1 ? 's' : ''}.`);
      return;
    }

    try {
      const { data: auth } = await apiClient.post<{
        access_token: string;
        refresh_token: string;
      }>('/auth/login', {
        email:    formData.email,
        password: formData.password,
      });

      setTokens(auth.access_token, auth.refresh_token);

      const { data: me } = await apiClient.get<Usuario>('/auth/me');
      setUsuario(me);

      setIntentos(0);
      setBloqueadoHasta(null);

      navigate(ROUTE_BY_ROL[me.rol] ?? '/dashboard');
    } catch (err: unknown) {
      const next = intentos + 1;

      if (next >= MAX_INTENTOS) {
        setBloqueadoHasta(Date.now() + BLOQUEO_MS);
        setIntentos(0);
        toast.error('Cuenta bloqueada temporalmente. Intenta en 5 minutos.');
        return;
      }

      setIntentos(next);

      if (axios.isAxiosError(err) && !err.response) {
        toast.error('No hay conexión. Revisa el Wi-Fi.');
      } else {
        toast.error('Correo o contraseña incorrectos.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px, 60px 60px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
              <Box className="h-6 w-6" />
            </div>
            <div className="font-bold text-xl">Axious</div>
          </div>
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-3">
              Inventario 3D para<br />la industria salmonera
            </h2>
            <p className="text-primary-foreground/80 max-w-md">
              Visualización en tiempo real de bodegas, galpones y containers en pontones,
              plantas y centros de la Región de Los Lagos.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">© 2026 Skretting Los Lagos</div>
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div className="font-bold text-lg">Axious</div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ingresar</h1>
            <p className="text-sm text-muted-foreground mt-1">Accede a tu panel de gestión.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@empresa.cl"
                disabled={isSubmitting || bloqueado}
                className="h-12 text-base"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting || bloqueado}
                className="h-12 text-base"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || bloqueado}
              className="w-full min-h-[56px] text-base font-semibold bg-primary hover:bg-secondary"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : bloqueado ? (
                'Cuenta bloqueada temporalmente'
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
