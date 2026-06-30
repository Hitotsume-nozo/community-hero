// ── Shared types (mirror server) ─────────────────────────────────────
export type Category =
  | 'pothole' | 'water_leakage' | 'streetlight' | 'garbage' | 'drainage'
  | 'traffic_signal' | 'stray_animals' | 'illegal_dumping' | 'fallen_tree'
  | 'electricity' | 'public_safety' | 'other';
export type Status = 'reported' | 'verified' | 'in_progress' | 'resolved' | 'rejected';
export type Role = 'citizen' | 'authority';

export interface AiAnalysis {
  source: 'gemini' | 'fallback';
  confidence: number;
  suggestedDepartment: string;
  estimatedResolutionDays: number;
  tags: string[];
  summary: string;
  safetyRisk: 'low' | 'medium' | 'high';
  duplicateOf?: string | null;
}
export interface Comment { id: string; userId: string; userName: string; text: string; createdAt: string; }
export interface TimelineEvent { status: Status; at: string; note: string; by: string; }
export interface Issue {
  id: string; title: string; description: string; category: Category; severity: number;
  status: Status; lat: number; lng: number; address: string; ward: string;
  photoUrl: string | null; reporterId: string; reporterName: string;
  createdAt: string; updatedAt: string; upvotes: string[]; comments: Comment[];
  timeline: TimelineEvent[]; assignedTo: string | null; ai: AiAnalysis; distance?: number;
}
export interface Level { level: number; name: string; min: number; next?: { level: number; name: string; min: number } | null; }
export interface User { id: string; name: string; role: Role; points: number; badges: string[]; avatarColor: string; createdAt: string; level: Level; }
export interface CategoryMeta { key: Category; label: string; emoji: string; department: string; baseDays: number; }
export interface Config {
  categories: CategoryMeta[];
  wards: { name: string; lat: number; lng: number }[];
  cityCenter: { lat: number; lng: number; zoom: number };
  levels: { level: number; name: string; min: number }[];
  geminiEnabled: boolean; model: string;
}
export interface Analysis {
  source: 'gemini' | 'fallback'; category: Category; title: string; description: string;
  severity: number; suggestedDepartment: string; estimatedResolutionDays: number;
  tags: string[]; summary: string; safetyRisk: 'low' | 'medium' | 'high'; confidence: number; isCivicIssue: boolean;
}
export interface Stats {
  total: number; open: number; resolved: number; inProgress: number; verified: number;
  resolutionRate: number; avgResolutionDays: number; totalConfirmations: number; aiAnalyzed: number;
  byStatus: Record<string, number>;
  byCategory: { category: string; label: string; emoji: string; count: number }[];
  byWard: { ward: string; count: number; open: number }[];
  trend: { date: string; reported: number; resolved: number }[];
  severityDist: { severity: number; count: number }[];
}
export interface Insights {
  source: 'gemini' | 'fallback'; headline: string;
  hotspots: { ward: string; category: string; risk: string; reason: string }[];
  recommendations: string[];
}

// ── Fetch helper ─────────────────────────────────────────────────────
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((msg as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  config: () => req<Config>('/config'),
  health: () => req<{ ok: boolean; gemini: boolean }>('/health'),

  auth: (name: string, asAuthority = false) =>
    req<User>('/auth', { method: 'POST', body: JSON.stringify({ name, asAuthority }) }),
  user: (id: string) => req<User>(`/users/${id}`),
  leaderboard: () => req<(User & { rank: number })[]>('/leaderboard'),

  issues: (params: Record<string, string> = {}) =>
    req<Issue[]>('/issues?' + new URLSearchParams(params).toString()),
  issue: (id: string) => req<Issue>(`/issues/${id}`),
  nearby: (lat: number, lng: number, category?: string) =>
    req<Issue[]>(`/issues/nearby?` + new URLSearchParams({ lat: String(lat), lng: String(lng), ...(category ? { category } : {}) })),
  createIssue: (body: any) => req<{ issue: Issue; duplicateOf: any }>('/issues', { method: 'POST', body: JSON.stringify(body) }),
  confirm: (id: string, userId: string) => req<Issue>(`/issues/${id}/confirm`, { method: 'POST', body: JSON.stringify({ userId }) }),
  comment: (id: string, userId: string, text: string) => req<Comment>(`/issues/${id}/comment`, { method: 'POST', body: JSON.stringify({ userId, text }) }),
  setStatus: (id: string, userId: string, status: Status, note?: string) =>
    req<Issue>(`/issues/${id}/status`, { method: 'POST', body: JSON.stringify({ userId, status, note }) }),
  complaint: (id: string) => req<{ source: string; text: string }>(`/issues/${id}/complaint`, { method: 'POST' }),

  analyze: (body: { base64?: string; mime?: string; text?: string }) =>
    req<Analysis>('/ai/analyze', { method: 'POST', body: JSON.stringify(body) }),
  assistant: (question: string) => req<{ source: string; answer: string }>('/ai/assistant', { method: 'POST', body: JSON.stringify({ question }) }),
  insights: () => req<Insights>('/ai/insights'),
  stats: () => req<Stats>('/stats'),
};

// ── SSE live stream ─────────────────────────────────────────────────
export function subscribe(onEvent: (type: string, data: any) => void): () => void {
  const es = new EventSource('/api/stream');
  const types = ['issue:new', 'issue:confirm', 'issue:status', 'issue:comment'];
  const handlers = types.map((t) => {
    const h = (e: MessageEvent) => { try { onEvent(t, JSON.parse(e.data)); } catch {} };
    es.addEventListener(t, h as EventListener);
    return [t, h] as const;
  });
  return () => { handlers.forEach(([t, h]) => es.removeEventListener(t, h as EventListener)); es.close(); };
}
