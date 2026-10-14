import Dexie, { Table } from "dexie";
import { Site } from "@/domain/site";
import { Zone } from "@/domain/zone";
import { Location } from "@/domain/location";
import { Item } from "@/domain/item";
import { Lot } from "@/domain/lot";
import { LocationRule } from "@/domain/rules";
import { Organization } from "@/domain/organization";
import { MovementTypeConfig } from "@/domain/movement";

export interface LocalMovementRecord {
  uuid_local: string;
  organization_id: string;
  user_id?: string;
  id_tipo_movimiento: string;
  id_item: string;
  id_lote?: string | null;
  id_ubicacion_origen?: string | null;
  id_ubicacion_destino?: string | null;
  cantidad: number;
  unidad_medida: string;
  fecha_hora_local: string;
  observaciones?: string | null;
  atributos: Record<string, unknown>;
  status: "pending" | "syncing" | "synced" | "rejected";
  retry_count: number;
  last_error?: string | null;
  id_movimiento_servidor?: string | null;
  created_at: string;
}

export interface SyncLogRecord {
  id?: number;
  uuid_local: string;
  fecha_hora: string;
  estado: string;
  mensaje?: string | null;
}

export class SalmoTrackDB extends Dexie {
  organizations!: Table<Organization, string>;
  sites!: Table<Site, string>;
  zones!: Table<Zone, string>;
  locations!: Table<Location, string>;
  items!: Table<Item, string>;
  lots!: Table<Lot, string>;
  rules!: Table<LocationRule, string>;
  pendingMovements!: Table<LocalMovementRecord, string>;
  syncLog!: Table<SyncLogRecord, number>;
  movementTypes!: Table<MovementTypeConfig, string>;

  constructor() {
    super("SalmoTrackDB");

    this.version(1).stores({
      organizations: "id, codigo",
      sites: "id, id_organizacion, codigo",
      zones: "id, id_organizacion, id_sitio, codigo",
      locations: "id, id_organizacion, id_zona, codigo",
      items: "id, id_organizacion, codigo",
      lots: "id, id_organizacion, id_item, numero_lote",
      rules: "id, id_organizacion, id_ubicacion",
      pendingMovements: "uuid_local, organization_id, status, created_at",
      syncLog: "++id, uuid_local, fecha_hora, estado",
    });
    this.version(2).stores({ movementTypes: "id, id_organizacion, codigo" });
  }
}

export const db = new SalmoTrackDB();
