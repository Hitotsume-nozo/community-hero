import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DB, Issue, User } from './types';
import { buildSeed } from './seed';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export const uid = (): string => crypto.randomUUID();
export const now = (): string => new Date().toISOString();

let db: DB = { issues: [], users: [] };
let saveTimer: NodeJS.Timeout | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function load(): void {
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      console.log(`[store] loaded ${db.issues.length} issues, ${db.users.length} users`);
      return;
    } catch (e) {
      console.warn('[store] db.json unreadable, reseeding', e);
    }
  }
  db = buildSeed();
  persistNow();
  console.log(`[store] seeded ${db.issues.length} issues, ${db.users.length} users`);
}

export function persistNow(): void {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 0));
}

// Debounced persistence to avoid hammering disk on bursty writes
export function persist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 400);
}

export function getDB(): DB {
  return db;
}

export function resetToSeed(): void {
  db = buildSeed();
  persistNow();
}

// ── Issue helpers ──────────────────────────────────────────────────
export const issues = {
  all: (): Issue[] => db.issues,
  find: (id: string): Issue | undefined => db.issues.find((i) => i.id === id),
  add: (i: Issue): Issue => {
    db.issues.unshift(i);
    persist();
    return i;
  },
  update: (i: Issue): Issue => {
    i.updatedAt = now();
    persist();
    return i;
  },
};

// ── User helpers ───────────────────────────────────────────────────
export const users = {
  all: (): User[] => db.users,
  find: (id: string): User | undefined => db.users.find((u) => u.id === id),
  findByName: (name: string): User | undefined =>
    db.users.find((u) => u.name.toLowerCase() === name.toLowerCase()),
  add: (u: User): User => {
    db.users.push(u);
    persist();
    return u;
  },
  save: (): void => persist(),
};
