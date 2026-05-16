import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { rolLabel } from "@/types";
import { Sun, Moon } from "lucide-react";

const passwordSchema = z
  .object({
    contrasena_actual: z.string().min(1, 'Ingresa tu contraseña actual.'),
    nueva_contrasena: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
      .regex(/[0-9]/, 'Debe incluir al menos un número.'),
    confirmar_contrasena: z.string(),
  })
  .refine((v) => v.nueva_contrasena === v.confirmar_contrasena, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmar_contrasena'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function useChangePassword() {
  return useMutation({
    mutationFn: (body: Omit<PasswordForm, 'confirmar_contrasena'>) =>
      apiClient.post('/auth/change-password', body).then((r) => r.data),
  });
}

export default function Configuracion() {
  const usuario = useAuthStore((s) => s.usuario);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const changePassword = useChangePassword();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitPassword = (data: PasswordForm) => {
    const id = toast.loading('Actualizando contraseña...');
    changePassword.mutate(
      { contrasena_actual: data.contrasena_actual, nueva_contrasena: data.nueva_contrasena },
      {
        onSuccess: () => {
          toast.dismiss(id);
          toast.success('Contraseña actualizada correctamente.');
          reset();
        },
        onError: () => {
          toast.dismiss(id);
          toast.error('No se pudo actualizar la contraseña. Verifica tu contraseña actual.');
        },
      }
    );
  };

  return (
    <div className="p-6 animate-fade-in space-y-6 max-w-2xl">
      {/* Perfil */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-base">Perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={usuario?.nombre ?? ''} readOnly className="bg-muted/40 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input value={usuario?.email ?? ''} readOnly className="bg-muted/40 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Input
              value={usuario ? rolLabel[usuario.rol] : ''}
              readOnly
              className="bg-muted/40 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sede</Label>
            <Input
              value={usuario?.sede_nombre ?? 'Sin sede asignada'}
              readOnly
              className="bg-muted/40 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Apariencia */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-base">Apariencia</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {theme === 'light' ? 'Claro' : 'Oscuro'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-muted transition min-h-[44px]"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-sm">{theme === 'light' ? 'Cambiar a oscuro' : 'Cambiar a claro'}</span>
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-base mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contraseña actual *</Label>
            <Input type="password" autoComplete="current-password" {...register('contrasena_actual')} />
            {errors.contrasena_actual && (
              <p className="text-xs text-destructive">{errors.contrasena_actual.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Nueva contraseña *</Label>
            <Input type="password" autoComplete="new-password" {...register('nueva_contrasena')} />
            {errors.nueva_contrasena && (
              <p className="text-xs text-destructive">{errors.nueva_contrasena.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres, una mayúscula y un número.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña *</Label>
            <Input type="password" autoComplete="new-password" {...register('confirmar_contrasena')} />
            {errors.confirmar_contrasena && (
              <p className="text-xs text-destructive">{errors.confirmar_contrasena.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="min-h-[44px]"
            style={{ backgroundColor: 'var(--color-action-primary)' }}
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>
    </div>
  );
}
