import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, Usuario } from "@/context/RoleContext";
import { fetchHealth, login } from "@/lib/api";
import { fetchSession } from "@/api/auth";
import { DEFAULT_THEME } from "@/domain/organization";

const sedeLabel = (idSede: string | null) => idSede ?? "Global";

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario, setOrganizacion, setModulosActivos, setAuthenticated, setAccessToken, authenticated, setOnline } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    if (authenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    const check = (retries = 2) =>
      fetchHealth()
        .then(() => {
          if (!cancelled) { setBackendStatus("online"); setOnline(true); }
        })
        .catch(() => {
          if (cancelled) return;
          if (retries > 0) setTimeout(() => check(retries - 1), 3000);
          else { setBackendStatus("offline"); setOnline(false); }
        });
    check();
    return () => { cancelled = true; };
  }, [setOnline]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const tokens = await login(email, password);
      const session = await fetchSession(tokens.access_token);
      const operational = session.configuracion_operativa;
      const usuario: Usuario = {
        id: session.usuario.id,
        nombre: session.usuario.nombre,
        rol: session.usuario.rol,
        sede: sedeLabel(session.usuario.id_sede),
        id_organizacion: session.organizacion.id,
        organizacion_nombre: session.organizacion.nombre,
        permisos: session.permisos,
        modulos_activos: session.modulos_activos,
      };

      setUsuario(usuario);
      setOrganizacion({
        id: session.organizacion.id,
        codigo: session.organizacion.slug,
        nombre: session.organizacion.nombre,
        configuracion: {
          umbrales: {
            disponible_max: operational.umbrales_color.alerta - 0.0001,
            medio_max: operational.umbrales_color.critica - 0.0001,
            critico_min: operational.umbrales_color.critica,
          },
          colores: {
            color_disponible: operational.paleta_colores.optima ?? DEFAULT_THEME.color_disponible,
            color_medio: operational.paleta_colores.alerta ?? DEFAULT_THEME.color_medio,
            color_critico: operational.paleta_colores.critica ?? DEFAULT_THEME.color_critico,
            color_mantenimiento: operational.paleta_colores.libre ?? DEFAULT_THEME.color_mantenimiento,
            color_cuarentena: operational.paleta_colores.retenido ?? DEFAULT_THEME.color_cuarentena,
          },
          unidades_permitidas: Object.keys(operational.unidades),
          estrategia_picking_default: "FEFO",
        },
        atributos: {},
        activo: true,
        fecha_creacion: new Date().toISOString(),
      });
      setModulosActivos(session.modulos_activos);
      setAccessToken(tokens.access_token);
      setAuthenticated(true);
      setOnline(true);
      navigate(usuario.rol === "operario" ? "/operario" : usuario.rol === "gerencia" ? "/gerencia" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
      setAuthenticated(false);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch">
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
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
              Inventario visual para
              <br />
              tu organización
            </h2>
            <p className="text-primary-foreground/80 max-w-md">
              Visualización en tiempo real de sitios, zonas y ubicaciones de inventario.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">© 2026 SalmoTrack</div>
        </div>
      </div>

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
            <p className="text-sm text-muted-foreground mt-1">Accede al inventario de tu organización.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input id="email" type="email" value={email} placeholder="nombre@empresa.cl" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Contrasena</Label>
              <Input id="pwd" type="password" value={password} placeholder="Ingresa tu contrasena" onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <div>
                Estado backend: {backendStatus === "online" ? "online" : backendStatus === "offline" ? "offline" : "verificando..."}
              </div>
              <div>Ingresa tus credenciales asignadas para acceder al sistema.</div>
            </div>
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-secondary"
            disabled={loading || backendStatus === "offline" || !email.trim() || !password}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            SalmoTrack v2 · Plataforma de inventario
          </p>
        </div>
      </div>
    </div>
  );
}
