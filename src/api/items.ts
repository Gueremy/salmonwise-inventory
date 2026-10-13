import { apiFetch } from "./client";
import { Item } from "../domain/item";
import { Lot } from "../domain/lot";
import { PaginatedResponse } from "./sites";

export async function fetchItems(token: string): Promise<Item[]> {
  try {
    const res = await apiFetch<Item[] | PaginatedResponse<Item>>("/api/v2/items", { token });
    return Array.isArray(res) ? res : res.items;
  } catch {
    // Adaptador legacy /productos
    const legacy = await apiFetch<PaginatedResponse<any>>("/productos?limit=500", { token });
    return legacy.items.map((p) => ({
      id: p.id,
      id_organizacion: "default",
      codigo: p.codigo_barras,
      nombre: p.nombre,
      categoria: p.categoria,
      unidad_medida: p.unidad_medida,
      stock_minimo: p.stock_minimo,
      descripcion: p.descripcion,
      atributos: {},
      activo: true,
      fecha_creacion: new Date().toISOString(),
    }));
  }
}

export async function fetchItemById(token: string, id: string): Promise<Item> {
  return apiFetch<Item>(`/api/v2/items/${id}`, { token });
}

export async function fetchLotsByItem(token: string, itemId: string): Promise<Lot[]> {
  const res = await apiFetch<Lot[] | PaginatedResponse<Lot>>("/api/v2/lotes", {
    token,
    params: { id_item: itemId },
  });
  return Array.isArray(res) ? res : res.items;
}
