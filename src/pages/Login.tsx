import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/context/RoleContext";
import { usuarios, rolLabel } from "@/data/mock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario } = useRole();
  const [email, setEmail] = useState("roberto.soto@skretting.cl");
  const [password, setPassword] = useState("••••••••");
  const [rolId, setRolId] = useState(usuarios[0].id);

  const handleLogin = () => {
    const u = usuarios.find((x) => x.id === rolId)!;
    setUsuario(u);
    navigate(u.rol === "operario" ? "/operario" : u.rol === "gerencia" ? "/gerencia" : "/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex items-stretch">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary">
        <div className="absolute inset-0 opacity-20"
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
            <div className="font-bold text-xl">SalmoTrack</div>
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

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div className="font-bold text-lg">SalmoTrack</div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ingresar</h1>
            <p className="text-sm text-muted-foreground mt-1">Accede a tu panel de gestión.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Contraseña</Label>
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rol (demo)</Label>
              <Select value={rolId} onValueChange={setRolId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre} — {rolLabel[u.rol]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleLogin} className="w-full bg-primary hover:bg-secondary">
            Ingresar
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Prototipo · datos simulados sin backend.
          </p>
        </div>
      </div>
    </div>
  );
}
