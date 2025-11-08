import type { Database } from 'bun:sqlite';
import { createLogger } from '../../logger';

const c = createLogger("Database");

export const createTables = (db: Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      retry_at TEXT,
      completed_at TEXT,
      error TEXT,
      output TEXT,
      duration INTEGER
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_state 
    ON jobs(state);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_retry 
    ON jobs(state, retry_at);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_created 
    ON jobs(created_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS dead_letter_queue (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      failed_at TEXT NOT NULL,
      error TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO config (key, value, updated_at) 
    VALUES (?, ?, datetime('now', 'utc'))
  `);

  insertConfig.run('max-retries', '3');
  insertConfig.run('backoff-base', '2');

  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      pid INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL,
      last_heartbeat TEXT NOT NULL
    );
  `);

  c.info("Database created successfully")
};
