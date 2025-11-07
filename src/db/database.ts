import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { createTables } from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/jobs.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH, {
  create: true,
  readwrite: true,
  strict: true
});

db.exec('PRAGMA journal_mode = WAL;');

db.exec('PRAGMA busy_timeout = 5000;');

db.exec('PRAGMA foreign_keys = ON;');

createTables(db);

export default db;
