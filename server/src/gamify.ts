import { User, Issue } from './types';
import { POINTS } from './constants';
import { issues as issueStore, users as userStore } from './store';

export function award(user: User, kind: keyof typeof POINTS): void {
  user.points += POINTS[kind];
  refreshBadges(user);
  userStore.save();
}

export function refreshBadges(user: User): void {
  if (user.role !== 'citizen') return;
  const mine: Issue[] = issueStore.all().filter((i) => i.reporterId === user.id);
  const badges = new Set(user.badges);
  if (mine.length >= 1) badges.add('📣 First Report');
  if (mine.length >= 5) badges.add('🔥 Prolific Reporter');
  if (mine.length >= 15) badges.add('🏙️ City Watcher');
  if (mine.some((i) => i.status === 'resolved')) badges.add('✅ Problem Solver');
  const confirms = issueStore.all().filter((i) => i.upvotes.includes(user.id)).length;
  if (confirms >= 10) badges.add('🤝 Community Validator');
  if (user.points >= 80) badges.add('⭐ Local Champion');
  if (user.points >= 160) badges.add('🦸 Community Hero');
  user.badges = [...badges];
}
