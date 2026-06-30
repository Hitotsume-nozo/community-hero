// ── Domain types ─────────────────────────────────────────────────────
export type Category =
  | 'pothole'
  | 'water_leakage'
  | 'streetlight'
  | 'garbage'
  | 'drainage'
  | 'traffic_signal'
  | 'stray_animals'
  | 'illegal_dumping'
  | 'fallen_tree'
  | 'electricity'
  | 'public_safety'
  | 'other';

export type Status = 'reported' | 'verified' | 'in_progress' | 'resolved' | 'rejected';

export type Role = 'citizen' | 'authority';

export interface AiAnalysis {
  source: 'gemini' | 'fallback';
  confidence: number; // 0..1
  suggestedDepartment: string;
  estimatedResolutionDays: number;
  tags: string[];
  summary: string;
  safetyRisk: 'low' | 'medium' | 'high';
  duplicateOf?: string | null;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface TimelineEvent {
  status: Status;
  at: string;
  note: string;
  by: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: number; // 1..5
  status: Status;
  lat: number;
  lng: number;
  address: string;
  ward: string;
  photoUrl: string | null; // data URL or remote URL
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  upvotes: string[]; // userIds who confirmed ("I see this too")
  comments: Comment[];
  timeline: TimelineEvent[];
  assignedTo: string | null;
  ai: AiAnalysis;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  points: number;
  badges: string[];
  avatarColor: string;
  createdAt: string;
}

export interface Ward {
  name: string;
  lat: number;
  lng: number;
}

export interface DB {
  issues: Issue[];
  users: User[];
}
