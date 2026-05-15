import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, ShieldCheck, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useCreateMovimiento } from "@/hooks/useMovimientos";
import type { ContainerAPI } from "@/types";

const schema = z.object({
  tipo: z.enum(['entrada_proveedor', 'salida_produccion', 'traslado_interno']),
  cantidad: z.coerce.number().positive({ message: 'La cantidad debe ser mayor a cero.' }),
  unidad: z.enum(['kg', 'lt', 'un']),
  observaciones: z.string().optional(),
  numero_lote: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  nombre_proveedor: z.string().optional(),
  num_guia_despacho: z.string().optional(),
  registro_sanitario: z.string().optional(),
  temperatura_almacen: z.coerce.number().optional(),
}).superRefine((val, ctx) => {
  if (val.tipo === 'entrada_proveedor') {
    const required = ['numero_lote', 'fecha_vencimiento', 'nombre_proveedor', 'num_guia_despacho', 'registro_sanitario'] as const;
    for (const field of required) {
      if (!val[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Campo requerido para entrada de proveedor.', path: [field] });
      }
    }
    if (!val.temperatura_almacen) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Temperatura requerida.', path: ['temperatura_almacen'] });
    }
  }
});

type FormData = z.infer<typeof schema>;

type TipoMov = 'entrada_proveedor' | 'salida_produccion' | 'traslado_interno';

const TIPOS: { id: TipoMov; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'entrada_proveedor', label: 'Entrada de proveedor', icon: ArrowDownToLine, desc: 'Recepción de insumo externo' },
  { id: 'salida_produccion', label: 'Salida a producción',  icon: ArrowUpFromLine, desc: 'Despacho a planta o pontón' },
  { id: 'traslado_interno',  label: 'Traslado interno',     icon: RefreshCw,       desc: 'Movimiento entre containers' },
];

const STEPS = ['Selección', 'Datos', 'Confirmación'];

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  container?: ContainerAPI;
}

export const MovimientoForm = ({ open, onOpenChange, container }: Props) => {
  const [step, setStep] = useState(0);
  const createMovimiento = useCreateMovimiento();

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'entrada_proveedor', unidad: 'kg' },
  });

  const tipo = watch('tipo');
  const isSernapesca = tipo === 'entrada_proveedor';

  const onSubmit = (data: FormData) => {
    if (!container) return;
    const toastId = toast.loading('Guardando movimiento...');
    createMovimiento.mutate(
      { ...data, id_container: container.id },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success('Movimiento registrado correctamente.');
          onOpenChange(false);
          setStep(0);
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error('No se pudo registrar el movimiento. Intenta de nuevo.');
        },
      }
    );
  };

  const goNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep(0); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < step
                  ? 'bg-primary border-primary text-white'
                  : i === step
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground'
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && (
            <Step1
              container={container}
              tipo={tipo}
              setTipo={(t) => setValue('tipo', t)}
            />
          )}

          {step === 1 && (
            <Step2
              register={register}
              errors={errors}
              watch={watch}
              isSernapesca={isSernapesca}
            />
          )}

          {step === 2 && (
            <Step3 values={getValues()} container={container} />
          )}

          <div className="flex justify-between gap-2 pt-4 mt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { if (step === 0) onOpenChange(false); else goBack(); }}>
              {step === 0 ? 'Cancelar' : <><ChevronLeft className="h-4 w-4 mr-1" /> Atrás</>}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} className="min-h-[44px]" style={{ backgroundColor: 'var(--color-action-primary)' }}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" className="min-h-[56px] text-base px-6" style={{ backgroundColor: 'var(--color-action-primary)' }} disabled={createMovimiento.isPending}>
                {createMovimiento.isPending ? 'Guardando...' : 'Confirmar y registrar'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface Step1Props {
  container?: ContainerAPI;
  tipo: TipoMov;
  setTipo: (t: TipoMov) => void;
}

const Step1 = ({ container, tipo, setTipo }: Step1Props) => (
  <div className="space-y-4">
    {container && (
      <div className="bg-muted/40 rounded-md px-4 py-3 text-sm">
        Container seleccionado: <span className="font-semibold">{container.codigo}</span>
        {container.nombre_producto && <> · <span className="text-muted-foreground">{container.nombre_producto}</span></>}
      </div>
    )}
    <div>
      <Label className="mb-2 block">Tipo de movimiento</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTipo(t.id)}
            className={`text-left p-3 rounded-md border-2 transition ${
              tipo === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <t.icon className={`h-5 w-5 mb-1.5 ${tipo === t.id ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-sm font-semibold">{t.label}</div>
            <div className="text-[11px] text-muted-foreground">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

interface Step2Props {
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  isSernapesca: boolean;
}

const Step2 = ({ register, errors, isSernapesca }: Step2Props) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Cantidad *</Label>
        <Input type="number" min={0} step="0.01" {...register('cantidad')} />
        {errors.cantidad && <p className="text-xs text-destructive">{errors.cantidad.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Unidad *</Label>
        <select {...register('unidad')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="kg">Kilogramos (kg)</option>
          <option value="lt">Litros (lt)</option>
          <option value="un">Unidades</option>
        </select>
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea rows={2} placeholder="Opcional" {...register('observaciones')} />
      </div>
    </div>

    {isSernapesca && (
      <div className="rounded-md border border-secondary/30 bg-secondary/5 p-4 space-y-3 animate-fade-in">
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--color-action-primary)' }}>
          <ShieldCheck className="h-4 w-4" /> Datos SERNAPESCA (obligatorios)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Número de lote *" error={errors.numero_lote?.message} {...register('numero_lote')} />
          <FormField label="Fecha de vencimiento *" type="date" error={errors.fecha_vencimiento?.message} {...register('fecha_vencimiento')} />
          <FormField label="Nombre del proveedor *" error={errors.nombre_proveedor?.message} {...register('nombre_proveedor')} />
          <FormField label="N° guía de despacho *" error={errors.num_guia_despacho?.message} {...register('num_guia_despacho')} />
          <FormField label="Temperatura almacén (°C) *" type="number" error={errors.temperatura_almacen?.message} {...register('temperatura_almacen')} />
          <FormField label="Registro sanitario *" error={errors.registro_sanitario?.message} {...register('registro_sanitario')} />
        </div>
      </div>
    )}
  </div>
);

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormField = ({ label, error, ...props }: FormFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <Input {...props} />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

interface Step3Props {
  values: FormData;
  container?: ContainerAPI;
}

const TIPO_LABEL: Record<TipoMov, string> = {
  entrada_proveedor: 'Entrada de proveedor',
  salida_produccion: 'Salida a producción',
  traslado_interno:  'Traslado interno',
};

const Step3 = ({ values, container }: Step3Props) => {
  const rows = [
    ['Container', container?.codigo ?? '—'],
    ['Tipo', TIPO_LABEL[values.tipo]],
    ['Cantidad', `${values.cantidad} ${values.unidad}`],
    ...(values.numero_lote ? [['Lote', values.numero_lote]] : []),
    ...(values.nombre_proveedor ? [['Proveedor', values.nombre_proveedor]] : []),
    ...(values.num_guia_despacho ? [['Guía despacho', values.num_guia_despacho]] : []),
    ...(values.observaciones ? [['Observaciones', values.observaciones]] : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Revisa los datos antes de confirmar. Una vez registrado, el movimiento quedará en estado pendiente de aprobación.
      </p>
      <div className="rounded-md border border-border overflow-hidden">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-4 py-2.5 text-sm border-b border-border last:border-0">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
