import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, Usuario } from "@/context/RoleContext";
import { fetchHealth, fetchMe, login } from "@/lib/api";

const sedeLabel = (idSede: string | null) => idSede ?? "Global";

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario, setAuthenticated, setAccessToken, authenticated, setOnline } = useRole();
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
    fetchHealth()
      .then(() => {
        setBackendStatus("online");
        setOnline(true);
      })
      .catch(() => {
        setBackendStatus("offline");
        setOnline(false);
      });
  }, [setOnline]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const tokens = await login(email, password);
      const me = await fetchMe(tokens.access_token);
      const usuario: Usuario = {
        id: me.id,
        nombre: me.nombre,
        rol: me.rol,
        sede: sedeLabel(me.id_sede),
      };

      setUsuario(usuario);
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
              Inventario 3D para
              <br />
              la industria salmonera
            </h2>
            <p className="text-primary-foreground/80 max-w-md">
              Visualizacion en tiempo real de bodegas, galpones y containers en pontones,
              plantas y centros de la Region de Los Lagos.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">© 2026 Skretting Los Lagos</div>
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
            <p className="text-sm text-muted-foreground mt-1">Accede a tu panel conectado al backend local.</p>
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
            Frontend Vite conectado a FastAPI local en http://localhost:8000.
          </p>
        </div>
      </div>
    </div>
  );
}
