export interface Lot {
  id: string;
  id_organizacion: string;
  id_item: string;
  numero_lote: string;
  fecha_fabricacion?: string | null;
  fecha_vencimiento?: string | null;
  cantidad_disponible?: number;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
}
