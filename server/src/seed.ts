import crypto from 'crypto';
import { DB, Issue, User, Category, Status, AiAnalysis } from './types';
import { CATEGORIES, CATEGORY_KEYS, WARDS, AVATAR_COLORS, POINTS } from './constants';

// Deterministic RNG (mulberry32) so the seeded demo is identical every run
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260622);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);
const uid = () => crypto.randomUUID();

const CITIZEN_NAMES = [
  'Aarav Sharma', 'Diya Nair', 'Vihaan Reddy', 'Ananya Iyer', 'Kabir Singh',
  'Meera Krishnan', 'Rohan Gupta', 'Saanvi Rao', 'Arjun Menon', 'Ishita Das',
  'Aditya Verma', 'Navya Pillai', 'Karthik Bhat', 'Priya Joshi',
];

const TEMPLATES: Record<Category, { titles: string[]; descs: string[] }> = {
  pothole: {
    titles: ['Deep pothole near junction', 'Crater-sized pothole on main road', 'Pothole damaging two-wheelers'],
    descs: [
      'A large pothole has formed after the rains. Several bikers have skidded here, especially at night.',
      'The road has caved in near the bus stop. Water collects making it invisible to drivers.',
    ],
  },
  water_leakage: {
    titles: ['Pipeline burst flooding street', 'Continuous water leak from main', 'Drinking water leaking for days'],
    descs: [
      'A BWSSB pipeline has burst and clean water is being wasted for over 48 hours.',
      'Water is gushing onto the road and seeping into nearby shops.',
    ],
  },
  streetlight: {
    titles: ['Streetlights off for a week', 'Dark stretch unsafe at night', 'Flickering streetlight'],
    descs: [
      'An entire stretch of streetlights is non-functional, making it unsafe for women returning late.',
      'The streetlight pole sparks and flickers — a safety hazard.',
    ],
  },
  garbage: {
    titles: ['Garbage pile overflowing', 'Uncollected waste for days', 'Black spot forming on corner'],
    descs: [
      'Garbage has not been collected for 5 days. The stench is unbearable and stray dogs scatter it around.',
      'An unofficial dumping black spot is forming at the street corner.',
    ],
  },
  drainage: {
    titles: ['Open drain overflowing', 'Sewage backflow onto road', 'Blocked stormwater drain'],
    descs: [
      'The stormwater drain is clogged and sewage is overflowing onto the footpath.',
      'An open manhole near the drain is a serious safety risk for children.',
    ],
  },
  traffic_signal: {
    titles: ['Traffic signal not working', 'Signal stuck on red', 'Blinking signal causing jams'],
    descs: [
      'The traffic signal at the junction has been dead since morning, causing chaos during peak hours.',
      'Signal timing is faulty, leading to long jams and near-misses.',
    ],
  },
  stray_animals: {
    titles: ['Aggressive stray dog pack', 'Cattle blocking the road', 'Stray menace near school'],
    descs: [
      'A pack of stray dogs has become aggressive near the school gate, frightening children.',
      'Stray cattle frequently block traffic on the arterial road.',
    ],
  },
  illegal_dumping: {
    titles: ['Construction debris dumped', 'Illegal dumping on empty plot', 'Plastic waste burned openly'],
    descs: [
      'Someone dumped construction debris on the roadside overnight, narrowing the lane.',
      'Mixed waste including plastic is being burned, releasing toxic smoke.',
    ],
  },
  fallen_tree: {
    titles: ['Tree fell after storm', 'Large branch blocking lane', 'Uprooted tree on footpath'],
    descs: [
      'A large tree fell during last night’s storm and is completely blocking the road.',
      'A heavy branch is hanging dangerously over the footpath.',
    ],
  },
  electricity: {
    titles: ['Sagging live wire', 'Transformer sparking', 'Frequent power cuts'],
    descs: [
      'A low-hanging live electrical wire is within reach of pedestrians — extremely dangerous.',
      'The transformer keeps sparking and tripping, causing repeated outages.',
    ],
  },
  public_safety: {
    titles: ['Open manhole uncovered', 'Broken footpath slab', 'Exposed rebar on median'],
    descs: [
      'An uncovered manhole on a busy footpath is a serious hazard, especially after dark.',
      'A broken footpath slab has already caused a few people to trip and fall.',
    ],
  },
  other: {
    titles: ['Encroached footpath', 'Faded zebra crossing', 'Damaged public bench'],
    descs: [
      'Vendors have encroached the entire footpath, forcing pedestrians onto the road.',
      'The zebra crossing has faded completely, making it unsafe to cross.',
    ],
  },
};

const COMMENTS = [
  'I face this every single day on my commute. Please escalate!',
  'Confirmed — saw it this morning too. Getting worse.',
  'Reported this to the helpline weeks ago, no action yet.',
  'This is a serious safety issue, especially for kids and elderly.',
  'Thanks for raising this. Adding my confirmation.',
];

function synthAi(cat: Category, severity: number): AiAnalysis {
  const meta = CATEGORIES[cat];
  const risk = severity >= 4 ? 'high' : severity >= 3 ? 'medium' : 'low';
  return {
    // Most historical reports in a live deployment would have been AI-triaged;
    // a minority reflect offline/heuristic fallback.
    source: rnd() < 0.65 ? 'gemini' : 'fallback',
    confidence: +between(0.78, 0.97).toFixed(2),
    suggestedDepartment: meta.department,
    estimatedResolutionDays: Math.max(1, Math.round(meta.baseDays * (severity / 3))),
    tags: [cat, risk + '-risk', meta.label.split(' ')[0].toLowerCase()],
    summary: `${meta.label} reported with severity ${severity}/5. Routed to ${meta.department}.`,
    safetyRisk: risk as AiAnalysis['safetyRisk'],
    duplicateOf: null,
  };
}

export function buildSeed(): DB {
  const users: User[] = CITIZEN_NAMES.map((name, i) => ({
    id: uid(),
    name,
    role: 'citizen',
    points: 0,
    badges: [],
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
  }));

  // Authority/admin demo account
  const authority: User = {
    id: uid(),
    name: 'BBMP Control Room',
    role: 'authority',
    points: 0,
    badges: ['🛡️ Verified Authority'],
    avatarColor: '#0f766e',
    createdAt: new Date(Date.now() - 90 * 864e5).toISOString(),
  };
  users.push(authority);

  const issues: Issue[] = [];
  const COUNT = 52;
  const statusRoll = (): Status => {
    const r = rnd();
    if (r < 0.3) return 'resolved';
    if (r < 0.5) return 'in_progress';
    if (r < 0.75) return 'verified';
    if (r < 0.95) return 'reported';
    return 'rejected';
  };

  for (let n = 0; n < COUNT; n++) {
    const ward = pick(WARDS);
    const cat = pick(CATEGORY_KEYS);
    const tpl = TEMPLATES[cat];
    const severity = Math.max(1, Math.min(5, Math.round(between(1.5, 5))));
    const status = statusRoll();
    const reporter = pick(users.filter((u) => u.role === 'citizen'));
    const ageDays = between(0.2, 58);
    const createdAt = new Date(Date.now() - ageDays * 864e5).toISOString();

    const lat = ward.lat + between(-0.012, 0.012);
    const lng = ward.lng + between(-0.012, 0.012);

    // confirmations
    const voterPool = users.filter((u) => u.role === 'citizen' && u.id !== reporter.id);
    const nVotes = Math.floor(between(0, Math.min(9, voterPool.length)));
    const upvotes: string[] = [];
    for (let v = 0; v < nVotes; v++) {
      const u = pick(voterPool);
      if (!upvotes.includes(u.id)) upvotes.push(u.id);
    }

    // timeline
    const timeline = [{ status: 'reported' as Status, at: createdAt, note: 'Issue reported by citizen', by: reporter.name }];
    const progressSteps: Status[] = ['verified', 'in_progress', 'resolved'];
    if (status !== 'reported' && status !== 'rejected') {
      let t = new Date(createdAt).getTime();
      for (const st of progressSteps) {
        t += between(0.5, 6) * 864e5;
        if (t > Date.now()) break;
        timeline.push({ status: st, at: new Date(t).toISOString(), note: stepNote(st), by: 'BBMP Control Room' });
        if (st === status) break;
      }
    } else if (status === 'rejected') {
      const t = new Date(createdAt).getTime() + between(1, 4) * 864e5;
      timeline.push({ status: 'rejected', at: new Date(t).toISOString(), note: 'Could not be verified / duplicate of another report', by: 'BBMP Control Room' });
    }

    const comments = [];
    const nComments = Math.floor(between(0, 3.4));
    for (let c = 0; c < nComments; c++) {
      const u = pick(voterPool);
      comments.push({
        id: uid(),
        userId: u.id,
        userName: u.name,
        text: pick(COMMENTS),
        createdAt: new Date(new Date(createdAt).getTime() + between(0.1, ageDays) * 864e5).toISOString(),
      });
    }

    issues.push({
      id: uid(),
      title: pick(tpl.titles),
      description: pick(tpl.descs),
      category: cat,
      severity,
      status,
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      address: `${pick(['1st', '2nd', '3rd', '4th', '5th', '7th', '12th'])} Main, ${pick(['1st', '2nd', '3rd', '5th'])} Cross, ${ward.name}`,
      ward: ward.name,
      photoUrl: null,
      reporterId: reporter.id,
      reporterName: reporter.name,
      createdAt,
      updatedAt: timeline[timeline.length - 1].at,
      upvotes,
      comments,
      timeline,
      assignedTo: status === 'in_progress' || status === 'resolved' ? CATEGORIES[cat].department : null,
      ai: synthAi(cat, severity),
    });
  }

  // Award points based on seeded activity (gamification looks alive)
  const byId = new Map(users.map((u) => [u.id, u]));
  for (const it of issues) {
    const rep = byId.get(it.reporterId);
    if (rep) {
      rep.points += POINTS.report;
      if (it.status === 'resolved') rep.points += POINTS.resolvedBonus;
    }
    for (const v of it.upvotes) {
      const u = byId.get(v);
      if (u) u.points += POINTS.confirm;
    }
    for (const c of it.comments) {
      const u = byId.get(c.userId);
      if (u) u.points += POINTS.comment;
    }
  }
  // Badges
  for (const u of users) {
    if (u.role !== 'citizen') continue;
    const reports = issues.filter((i) => i.reporterId === u.id);
    if (reports.length >= 1) u.badges.push('📣 First Report');
    if (reports.length >= 5) u.badges.push('🔥 Prolific Reporter');
    if (reports.some((i) => i.status === 'resolved')) u.badges.push('✅ Problem Solver');
    if (u.points >= 80) u.badges.push('⭐ Local Champion');
  }

  return { issues, users };
}

function stepNote(st: Status): string {
  switch (st) {
    case 'verified': return 'Verified by community confirmations & authority review';
    case 'in_progress': return 'Work order issued — crew dispatched';
    case 'resolved': return 'Issue resolved and closed';
    default: return '';
  }
}
