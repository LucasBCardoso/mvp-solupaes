import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('solupaes.db');

export type OutboxRow = {
  client_uuid: string;
  payload_json: string;
  photo_uri: string | null;
  attempts: number;
  last_error: string | null;
  created_at: number;
};

export type CacheRow = {
  id: string;
  client_uuid: string;
  fantasy_name: string;
  classification: 'A' | 'B' | 'C';
  viability_score: number;
  visited_at: string;
  status: string;
};

let initialized = false;

export function initDb(): void {
  if (initialized) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS visits_outbox (
      client_uuid TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      photo_uri TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visits_cache (
      id TEXT PRIMARY KEY NOT NULL,
      client_uuid TEXT NOT NULL,
      fantasy_name TEXT NOT NULL,
      classification TEXT NOT NULL,
      viability_score INTEGER NOT NULL,
      visited_at TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);
  initialized = true;
}

export function insertOutbox(row: Omit<OutboxRow, 'attempts' | 'last_error' | 'created_at'>): void {
  db.runSync(
    'INSERT OR REPLACE INTO visits_outbox (client_uuid, payload_json, photo_uri, attempts, last_error, created_at) VALUES (?, ?, ?, 0, NULL, ?)',
    [row.client_uuid, row.payload_json, row.photo_uri, Date.now()],
  );
}

export function listOutbox(): OutboxRow[] {
  return db.getAllSync<OutboxRow>('SELECT * FROM visits_outbox ORDER BY created_at ASC');
}

export function markOutboxFailure(clientUuid: string, error: string): void {
  db.runSync(
    'UPDATE visits_outbox SET attempts = attempts + 1, last_error = ? WHERE client_uuid = ?',
    [error, clientUuid],
  );
}

export function removeFromOutbox(clientUuid: string): void {
  db.runSync('DELETE FROM visits_outbox WHERE client_uuid = ?', [clientUuid]);
}

export function upsertVisitCache(row: CacheRow): void {
  db.runSync(
    `INSERT OR REPLACE INTO visits_cache
       (id, client_uuid, fantasy_name, classification, viability_score, visited_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.client_uuid, row.fantasy_name, row.classification, row.viability_score, row.visited_at, row.status],
  );
}

export function listVisitsCache(): CacheRow[] {
  return db.getAllSync<CacheRow>(
    'SELECT * FROM visits_cache ORDER BY visited_at DESC LIMIT 200',
  );
}

export function countOutbox(): number {
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM visits_outbox');
  return row?.c ?? 0;
}
