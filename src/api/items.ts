import { apiFetch, apiFetchAllPages } from "./client";
import { Item } from "../domain/item";
import { Lot } from "../domain/lot";

export async function fetchItems(token: string): Promise<Item[]> {
  return apiFetchAllPages<Item>("/api/v2/items", token);
}

export async function fetchItemById(token: string, id: string): Promise<Item> {
  return apiFetch<Item>(`/api/v2/items/${id}`, { token });
}

export async function fetchLotsByItem(token: string, itemId: string): Promise<Lot[]> {
  return apiFetchAllPages<Lot>("/api/v2/lotes", token, { id_item: itemId });
}
