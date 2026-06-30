import { Category, Ward } from './types';

export const CATEGORIES: Record<Category, { label: string; emoji: string; department: string; baseDays: number }> = {
  pothole:        { label: 'Pothole / Road Damage', emoji: '🕳️', department: 'Public Works (BBMP Roads)', baseDays: 7 },
  water_leakage:  { label: 'Water Leakage',          emoji: '💧', department: 'Water Board (BWSSB)',      baseDays: 3 },
  streetlight:    { label: 'Streetlight Outage',     emoji: '💡', department: 'Electrical (BBMP)',        baseDays: 4 },
  garbage:        { label: 'Garbage / Sanitation',   emoji: '🗑️', department: 'Solid Waste Mgmt',         baseDays: 2 },
  drainage:       { label: 'Drainage / Sewage',      emoji: '🌊', department: 'Stormwater Drain Dept',    baseDays: 6 },
  traffic_signal: { label: 'Traffic Signal Fault',   emoji: '🚦', department: 'Traffic Police',           baseDays: 2 },
  stray_animals:  { label: 'Stray Animals',          emoji: '🐕', department: 'Animal Control',           baseDays: 5 },
  illegal_dumping:{ label: 'Illegal Dumping',        emoji: '♻️', department: 'Solid Waste Mgmt',         baseDays: 4 },
  fallen_tree:    { label: 'Fallen Tree / Branch',   emoji: '🌳', department: 'Forest Cell (BBMP)',       baseDays: 1 },
  electricity:    { label: 'Power / Electrical',     emoji: '⚡', department: 'BESCOM',                    baseDays: 3 },
  public_safety:  { label: 'Public Safety Hazard',   emoji: '⚠️', department: 'Civil Defence',            baseDays: 2 },
  other:          { label: 'Other',                  emoji: '📌', department: 'Ward Office',              baseDays: 7 },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

// Bengaluru wards used for geolocation + dashboards
export const WARDS: Ward[] = [
  { name: 'Koramangala',    lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar',    lat: 12.9719, lng: 77.6412 },
  { name: 'HSR Layout',     lat: 12.9116, lng: 77.6389 },
  { name: 'Whitefield',     lat: 12.9698, lng: 77.7500 },
  { name: 'Jayanagar',      lat: 12.9250, lng: 77.5938 },
  { name: 'Malleshwaram',   lat: 13.0035, lng: 77.5647 },
  { name: 'Electronic City',lat: 12.8452, lng: 77.6602 },
  { name: 'MG Road',        lat: 12.9750, lng: 77.6060 },
];

export const CITY_CENTER = { lat: 12.9568, lng: 77.6400, zoom: 12 };

export function nearestWard(lat: number, lng: number): string {
  let best = WARDS[0];
  let bestD = Infinity;
  for (const w of WARDS) {
    const d = (w.lat - lat) ** 2 + (w.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = w; }
  }
  return best.name;
}

// Haversine distance in metres
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

// Gamification thresholds
export const LEVELS = [
  { level: 1, name: 'Newcomer',        min: 0 },
  { level: 2, name: 'Active Citizen',  min: 30 },
  { level: 3, name: 'Local Champion',  min: 80 },
  { level: 4, name: 'Community Hero',  min: 160 },
  { level: 5, name: 'Civic Legend',    min: 320 },
];

export function levelFor(points: number) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > points) || null;
  return { ...cur, next };
}

export const POINTS = {
  report: 10,
  confirm: 5,
  comment: 2,
  resolvedBonus: 25, // when an issue you reported is resolved
};
