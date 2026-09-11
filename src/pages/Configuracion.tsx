import { useState } from "react";
import { Moon, Save, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rolLabel, useRole } from "@/context/RoleContext";
import { changePassword } from "@/lib/api";

export default function Configuracion() {
  const { usuario, accessToken, logout } = useRole();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!accessToken) return;
    if (newPassword !== confirmation) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setError("Usa al menos 8 caracteres, mayuscula, minuscula, numero y simbolo.");
      return;
    }

    setSaving(true);
    try {
      const result = await changePassword(accessToken, {
        contrasena_actual: currentPassword,
        nueva_contrasena: newPassword,
      });
      toast.success(result.mensaje);
      logout();
      navigate("/", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cambiar la contrasena.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5 p-6 animate-fade-in">
      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Perfil</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Nombre" value={usuario.nombre} />
          <ReadOnlyField label="Correo electronico" value={usuario.email} />
          <ReadOnlyField label="Rol" value={rolLabel[usuario.rol]} />
          <ReadOnlyField label="Sede" value={usuario.sede} />
        </div>
      </section>

      <section className="flex items-center justify-between rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-semibold">Apariencia</h2>
          <p className="text-xs text-muted-foreground">Tema {theme === "light" ? "claro" : "oscuro"}</p>
        </div>
        <Button variant="outline" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
          Cambiar tema
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Cambiar contrasena</h2>
        <form className="space-y-4" onSubmit={submit}>
          <PasswordField label="Contrasena actual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="Nueva contrasena" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Confirmar contrasena" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmation}>
            <Save className="mr-2 h-4 w-4" />{saving ? "Guardando..." : "Guardar nueva contrasena"}
          </Button>
        </form>
      </section>
    </div>
  );
}

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1.5"><Label>{label}</Label><Input value={value} readOnly className="bg-muted/40" /></div>
);

const PasswordField = ({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} />
  </div>
);
