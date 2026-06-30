import { Router } from 'express';
import { users as store, uid, now } from '../store';
import { AVATAR_COLORS, levelFor } from '../constants';
import { refreshBadges } from '../gamify';
import { User } from '../types';

const router = Router();

function publicUser(u: User) {
  return { ...u, level: levelFor(u.points) };
}

// Login or create. asAuthority → returns the BBMP control-room account.
router.post('/auth', (req, res) => {
  const { name, asAuthority } = req.body as { name?: string; asAuthority?: boolean };

  if (asAuthority) {
    const auth = store.all().find((u) => u.role === 'authority');
    if (auth) return res.json(publicUser(auth));
  }

  const cleanName = (name || '').trim().slice(0, 40);
  if (!cleanName) return res.status(400).json({ error: 'name required' });

  let u = store.findByName(cleanName);
  if (!u) {
    u = {
      id: uid(),
      name: cleanName,
      role: 'citizen',
      points: 0,
      badges: [],
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      createdAt: now(),
    };
    store.add(u);
  }
  res.json(publicUser(u));
});

router.get('/users/:id', (req, res) => {
  const u = store.find(req.params.id);
  if (!u) return res.status(404).json({ error: 'not found' });
  refreshBadges(u);
  res.json(publicUser(u));
});

router.get('/leaderboard', (_req, res) => {
  const ranked = store
    .all()
    .filter((u) => u.role === 'citizen')
    .sort((a, b) => b.points - a.points)
    .slice(0, 20)
    .map((u, i) => ({ rank: i + 1, ...publicUser(u) }));
  res.json(ranked);
});

export default router;
