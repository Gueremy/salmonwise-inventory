export interface Alert {
  id: string;
  id_organizacion: string;
  id_ubicacion?: string | null;
  id_sitio?: string | null;
  id_usuario_revision?: string | null;
  tipo: string;
  severidad: "critica" | "media" | "baja" | string;
  descripcion: string;
  estado: "activa" | "resuelta" | "silenciada" | string;
  fecha_generacion: string | null;
  fecha_revision?: string | null;
}
