import { Category, Status } from './api';

export const CATEGORY_UI: Record<Category, { emoji: string; color: string }> = {
  pothole:        { emoji: '🕳️', color: '#a16207' },
  water_leakage:  { emoji: '💧', color: '#0284c7' },
  streetlight:    { emoji: '💡', color: '#f59e0b' },
  garbage:        { emoji: '🗑️', color: '#65a30d' },
  drainage:       { emoji: '🌊', color: '#0891b2' },
  traffic_signal: { emoji: '🚦', color: '#dc2626' },
  stray_animals:  { emoji: '🐕', color: '#9333ea' },
  illegal_dumping:{ emoji: '♻️', color: '#16a34a' },
  fallen_tree:    { emoji: '🌳', color: '#15803d' },
  electricity:    { emoji: '⚡', color: '#eab308' },
  public_safety:  { emoji: '⚠️', color: '#ea580c' },
  other:          { emoji: '📌', color: '#64748b' },
};

export const STATUS_UI: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  reported:    { label: 'Reported',    color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  verified:    { label: 'Verified',    color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  resolved:    { label: 'Resolved',    color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  rejected:    { label: 'Rejected',    color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
};

export const STATUS_ORDER: Status[] = ['reported', 'verified', 'in_progress', 'resolved'];

export function severityColor(s: number): string {
  return ['#94a3b8', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'][s] || '#94a3b8';
}
export function severityLabel(s: number): string {
  return ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical'][s] || 'Moderate';
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function cls(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ');
}
