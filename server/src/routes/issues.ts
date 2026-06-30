import { Router } from 'express';
import { issues as store, users as userStore, uid, now } from '../store';
import { CATEGORIES, nearestWard, distanceMeters, POINTS } from '../constants';
import { Issue, Status, Category } from '../types';
import { broadcast } from '../sse';
import { award, refreshBadges } from '../gamify';
import { analyzeIssue, complaintDraft } from '../gemini';

const router = Router();
const VERIFY_THRESHOLD = 3; // community confirmations needed to auto-verify
const DUPLICATE_RADIUS_M = 90;

// List with optional filters
router.get('/issues', (req, res) => {
  const { category, status, ward, q, mine } = req.query as Record<string, string>;
  let list = store.all();
  if (category) list = list.filter((i) => i.category === category);
  if (status) list = list.filter((i) => i.status === status);
  if (ward) list = list.filter((i) => i.ward === ward);
  if (mine) list = list.filter((i) => i.reporterId === mine);
  if (q) {
    const s = q.toLowerCase();
    list = list.filter((i) => (i.title + i.description + i.address).toLowerCase().includes(s));
  }
  res.json(list);
});

// Nearby duplicates for the report flow
router.get('/issues/nearby', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const category = req.query.category as Category | undefined;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.json([]);
  const near = store
    .all()
    .filter((i) => i.status !== 'resolved' && i.status !== 'rejected')
    .map((i) => ({ i, d: distanceMeters(lat, lng, i.lat, i.lng) }))
    .filter((x) => x.d <= 250 && (!category || x.i.category === category))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)
    .map((x) => ({ ...x.i, distance: Math.round(x.d) }));
  res.json(near);
});

router.get('/issues/:id', (req, res) => {
  const i = store.find(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  res.json(i);
});

// Create a new issue
router.post('/issues', (req, res) => {
  const b = req.body as Partial<Issue> & { analysis?: any };
  const reporter = userStore.find(String(b.reporterId || ''));
  if (!reporter) return res.status(401).json({ error: 'unknown reporter' });
  if (typeof b.lat !== 'number' || typeof b.lng !== 'number') return res.status(400).json({ error: 'location required' });

  const category = (b.category || 'other') as Category;
  const meta = CATEGORIES[category] || CATEGORIES.other;
  const severity = Math.max(1, Math.min(5, Number(b.severity) || 3));
  const ward = b.ward || nearestWard(b.lat, b.lng);

  // geo + category duplicate detection
  const dup = store
    .all()
    .filter((i) => i.category === category && i.status !== 'resolved' && i.status !== 'rejected')
    .map((i) => ({ i, d: distanceMeters(b.lat!, b.lng!, i.lat, i.lng) }))
    .filter((x) => x.d <= DUPLICATE_RADIUS_M)
    .sort((a, b2) => a.d - b2.d)[0];

  const a = b.analysis || {};
  const issue: Issue = {
    id: uid(),
    title: (b.title || meta.label).toString().slice(0, 90),
    description: (b.description || '').toString().slice(0, 500),
    category,
    severity,
    status: 'reported',
    lat: b.lat,
    lng: b.lng,
    address: (b.address || `${ward}`).toString().slice(0, 160),
    ward,
    photoUrl: b.photoUrl ? String(b.photoUrl).slice(0, 2_500_000) : null,
    reporterId: reporter.id,
    reporterName: reporter.name,
    createdAt: now(),
    updatedAt: now(),
    upvotes: [],
    comments: [],
    timeline: [{ status: 'reported', at: now(), note: 'Issue reported by citizen', by: reporter.name }],
    assignedTo: null,
    ai: {
      source: a.source === 'gemini' ? 'gemini' : a.source === 'fallback' ? 'fallback' : 'fallback',
      confidence: Number(a.confidence ?? 0.7),
      suggestedDepartment: a.suggestedDepartment || meta.department,
      estimatedResolutionDays: Number(a.estimatedResolutionDays) || Math.max(1, Math.round(meta.baseDays * (severity / 3))),
      tags: Array.isArray(a.tags) ? a.tags.slice(0, 6) : [category],
      summary: a.summary || `${meta.label} • severity ${severity}/5 • routed to ${meta.department}`,
      safetyRisk: ['low', 'medium', 'high'].includes(a.safetyRisk) ? a.safetyRisk : severity >= 4 ? 'high' : 'medium',
      duplicateOf: dup ? dup.i.id : null,
    },
  };

  store.add(issue);
  award(reporter, 'report');
  broadcast('issue:new', publicSummary(issue));
  res.status(201).json({ issue, duplicateOf: dup ? { id: dup.i.id, title: dup.i.title, distance: Math.round(dup.d) } : null });
});

// Community confirmation ("I see this too")
router.post('/issues/:id/confirm', (req, res) => {
  const i = store.find(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  const userId = String(req.body.userId || '');
  const user = userStore.find(userId);
  if (!user) return res.status(401).json({ error: 'login required' });
  if (i.reporterId === userId) return res.status(400).json({ error: 'cannot confirm your own report' });

  if (!i.upvotes.includes(userId)) {
    i.upvotes.push(userId);
    award(user, 'confirm');
    // auto-verify when the community vouches
    if (i.status === 'reported' && i.upvotes.length >= VERIFY_THRESHOLD) {
      i.status = 'verified';
      i.timeline.push({ status: 'verified', at: now(), note: `Auto-verified by ${i.upvotes.length} community confirmations`, by: 'Community' });
      broadcast('issue:status', { id: i.id, status: i.status });
    }
    store.update(i);
    broadcast('issue:confirm', { id: i.id, upvotes: i.upvotes.length });
  }
  res.json(i);
});

// Comment
router.post('/issues/:id/comment', (req, res) => {
  const i = store.find(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  const user = userStore.find(String(req.body.userId || ''));
  const text = String(req.body.text || '').trim().slice(0, 500);
  if (!user) return res.status(401).json({ error: 'login required' });
  if (!text) return res.status(400).json({ error: 'empty comment' });
  const comment = { id: uid(), userId: user.id, userName: user.name, text, createdAt: now() };
  i.comments.push(comment);
  store.update(i);
  award(user, 'comment');
  broadcast('issue:comment', { id: i.id, comment });
  res.json(comment);
});

// Authority: update status
router.post('/issues/:id/status', (req, res) => {
  const i = store.find(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  const actor = userStore.find(String(req.body.userId || ''));
  if (!actor || actor.role !== 'authority') return res.status(403).json({ error: 'authority only' });
  const status = String(req.body.status) as Status;
  const valid: Status[] = ['reported', 'verified', 'in_progress', 'resolved', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'invalid status' });

  i.status = status;
  if (status === 'in_progress' || status === 'resolved') i.assignedTo = i.ai.suggestedDepartment;
  i.timeline.push({ status, at: now(), note: String(req.body.note || defaultNote(status)), by: actor.name });

  if (status === 'resolved') {
    const reporter = userStore.find(i.reporterId);
    if (reporter) { reporter.points += POINTS.resolvedBonus; refreshBadges(reporter); userStore.save(); }
  }
  store.update(i);
  broadcast('issue:status', { id: i.id, status });
  res.json(i);
});

// AI: draft a formal complaint
router.post('/issues/:id/complaint', async (req, res) => {
  const i = store.find(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  const draft = await complaintDraft(i);
  res.json(draft);
});

function defaultNote(s: Status): string {
  return s === 'verified' ? 'Verified by authority'
    : s === 'in_progress' ? 'Work order issued — crew dispatched'
    : s === 'resolved' ? 'Issue resolved and closed'
    : s === 'rejected' ? 'Marked invalid / duplicate'
    : 'Status updated';
}

function publicSummary(i: Issue) {
  return { id: i.id, title: i.title, category: i.category, severity: i.severity, ward: i.ward, lat: i.lat, lng: i.lng, reporterName: i.reporterName };
}

export default router;
