import { Router } from 'express';
import { issues as store } from '../store';
import { CATEGORIES, WARDS } from '../constants';
import { Issue } from '../types';

const router = Router();

router.get('/stats', (_req, res) => {
  const list = store.all();
  const total = list.length;
  const byStatus = count(list, (i) => i.status);
  const byCategory = count(list, (i) => i.category);
  const byWard = count(list, (i) => i.ward);
  const resolved = list.filter((i) => i.status === 'resolved');
  const open = list.filter((i) => i.status !== 'resolved' && i.status !== 'rejected');

  // average resolution time (days) from timeline
  let totalDays = 0, resolvedWithTime = 0;
  for (const i of resolved) {
    const r = i.timeline.find((t) => t.status === 'resolved');
    if (r) { totalDays += (new Date(r.at).getTime() - new Date(i.createdAt).getTime()) / 864e5; resolvedWithTime++; }
  }
  const avgResolutionDays = resolvedWithTime ? +(totalDays / resolvedWithTime).toFixed(1) : 0;

  // 30-day trend (reported vs resolved per day)
  const days = 30;
  const trend: { date: string; reported: number; resolved: number }[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(Date.now() - d * 864e5);
    const key = day.toISOString().slice(0, 10);
    trend.push({
      date: key,
      reported: list.filter((i) => i.createdAt.slice(0, 10) === key).length,
      resolved: list.filter((i) => i.timeline.some((t) => t.status === 'resolved' && t.at.slice(0, 10) === key)).length,
    });
  }

  const severityDist = [1, 2, 3, 4, 5].map((s) => ({ severity: s, count: list.filter((i) => i.severity === s).length }));

  res.json({
    total,
    open: open.length,
    resolved: resolved.length,
    inProgress: byStatus['in_progress'] || 0,
    verified: byStatus['verified'] || 0,
    resolutionRate: total ? Math.round((resolved.length / total) * 100) : 0,
    avgResolutionDays,
    totalConfirmations: list.reduce((a, i) => a + i.upvotes.length, 0),
    aiAnalyzed: list.filter((i) => i.ai.source === 'gemini').length,
    byStatus,
    byCategory: Object.entries(byCategory).map(([k, v]) => ({ category: k, label: CATEGORIES[k as keyof typeof CATEGORIES]?.label || k, emoji: CATEGORIES[k as keyof typeof CATEGORIES]?.emoji || '📌', count: v })).sort((a, b) => b.count - a.count),
    byWard: WARDS.map((w) => ({ ward: w.name, count: byWard[w.name] || 0, open: list.filter((i) => i.ward === w.name && i.status !== 'resolved' && i.status !== 'rejected').length })).sort((a, b) => b.count - a.count),
    trend,
    severityDist,
  });
});

function count<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const a of arr) { const k = key(a); o[k] = (o[k] || 0) + 1; }
  return o;
}

export default router;
