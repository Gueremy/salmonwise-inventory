import Dexie, { type Table } from 'dexie';

export interface MovimientoOffline {
  uuid_local: string;
  payload: Record<string, unknown>;
  sincronizado: boolean;
  created_at: number;
  intentos: number;
}

class AxiousDB extends Dexie {
  movimientos_offline!: Table<MovimientoOffline>;

  constructor() {
    super('axious_db');
    this.version(1).stores({
      movimientos_offline: 'uuid_local, sincronizado, created_at',
    });
  }
}

export const db = new AxiousDB();
