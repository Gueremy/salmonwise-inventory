export interface Item {
  id: string;
  id_organizacion: string;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_minimo?: number;
  descripcion?: string | null;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
}
