import { Category, Issue } from './types';
import { CATEGORIES, CATEGORY_KEYS } from './constants';

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ENDPOINT = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;

export const geminiEnabled = (): boolean => API_KEY.length > 10;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

// ── Low-level call with timeout + one retry; returns text or null ──────
async function callGemini(parts: Part[], jsonSchema?: object, timeoutMs = 20000): Promise<string | null> {
  if (!geminiEnabled()) return null;
  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      // Disable "thinking" tokens: faster, cheaper, and guarantees the full
      // JSON/text fits in the output budget for a snappy live demo.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (jsonSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = jsonSchema;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT(MODEL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        const err = await res.text();
        console.warn(`[gemini] HTTP ${res.status}: ${err.slice(0, 200)}`);
        if (res.status === 429 || res.status >= 500) { await sleep(600); continue; }
        return null;
      }
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
      return text || null;
    } catch (e: any) {
      clearTimeout(t);
      console.warn(`[gemini] call failed (attempt ${attempt + 1}):`, e?.message || e);
      await sleep(400);
    }
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseJSON(text: string | null): any | null {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// 1) Multimodal issue analysis (photo + optional text)
// ════════════════════════════════════════════════════════════════════
export interface AnalysisResult {
  source: 'gemini' | 'fallback';
  category: Category;
  title: string;
  description: string;
  severity: number;
  suggestedDepartment: string;
  estimatedResolutionDays: number;
  tags: string[];
  summary: string;
  safetyRisk: 'low' | 'medium' | 'high';
  confidence: number;
  isCivicIssue: boolean;
}

const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isCivicIssue: { type: 'BOOLEAN' },
    category: { type: 'STRING', enum: CATEGORY_KEYS as unknown as string[] },
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    severity: { type: 'INTEGER' },
    safetyRisk: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'NUMBER' },
  },
  required: ['isCivicIssue', 'category', 'title', 'description', 'severity', 'safetyRisk', 'tags', 'confidence'],
};

export async function analyzeIssue(opts: {
  base64?: string;
  mime?: string;
  text?: string;
}): Promise<AnalysisResult> {
  const { base64, mime, text } = opts;
  const catList = CATEGORY_KEYS.map((k) => `${k} (${CATEGORIES[k].label})`).join(', ');
  const prompt = `You are an expert municipal civic-issue triage assistant for an Indian city (Bengaluru).
Analyze the ${base64 ? 'photo' : 'description'} of a reported community problem and return STRICT JSON.

Rules:
- Choose the single best "category" from: ${catList}.
- "severity" is an integer 1-5 (1 = minor cosmetic, 5 = immediate danger to life/critical).
- "safetyRisk" reflects danger to the public.
- "title" = a short, specific headline (max 8 words).
- "description" = 1-2 factual sentences a citizen could submit to authorities.
- "isCivicIssue" = false if the image/text is NOT a public civic problem (e.g. a selfie, food, random object).
- "confidence" = 0..1 how sure you are.
${text ? `\nCitizen note: "${text}"` : ''}`;

  const parts: Part[] = [{ text: prompt }];
  if (base64 && mime) parts.push({ inline_data: { mime_type: mime, data: base64 } });

  const raw = await callGemini(parts, ANALYSIS_SCHEMA);
  const j = parseJSON(raw);
  if (j && j.category) {
    const category = (CATEGORY_KEYS.includes(j.category) ? j.category : 'other') as Category;
    const meta = CATEGORIES[category];
    const severity = clamp(Math.round(j.severity ?? 3), 1, 5);
    return {
      source: 'gemini',
      category,
      title: String(j.title || meta.label).slice(0, 90),
      description: String(j.description || '').slice(0, 400),
      severity,
      suggestedDepartment: meta.department,
      estimatedResolutionDays: Math.max(1, Math.round(meta.baseDays * (severity / 3))),
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6).map(String) : [category],
      summary: `${meta.label} • severity ${severity}/5 • routed to ${meta.department}`,
      safetyRisk: ['low', 'medium', 'high'].includes(j.safetyRisk) ? j.safetyRisk : severity >= 4 ? 'high' : 'medium',
      confidence: clamp(Number(j.confidence ?? 0.85), 0, 1),
      isCivicIssue: j.isCivicIssue !== false,
    };
  }
  return fallbackAnalyze(text);
}

// keyword heuristic when Gemini is unavailable
function fallbackAnalyze(text?: string): AnalysisResult {
  const t = (text || '').toLowerCase();
  const rules: [Category, string[]][] = [
    ['pothole', ['pothole', 'road', 'crater', 'asphalt', 'tar']],
    ['water_leakage', ['water', 'pipe', 'leak', 'bwssb', 'burst']],
    ['streetlight', ['streetlight', 'street light', 'lamp', 'dark', 'lighting']],
    ['garbage', ['garbage', 'trash', 'waste', 'dump', 'litter', 'stink']],
    ['drainage', ['drain', 'sewage', 'sewer', 'manhole', 'overflow']],
    ['traffic_signal', ['signal', 'traffic light', 'junction']],
    ['stray_animals', ['dog', 'cattle', 'stray', 'animal', 'cow']],
    ['illegal_dumping', ['debris', 'dumping', 'construction', 'rubble']],
    ['fallen_tree', ['tree', 'branch', 'uprooted']],
    ['electricity', ['wire', 'transformer', 'power', 'electric', 'bescom', 'spark']],
    ['public_safety', ['hazard', 'open manhole', 'rebar', 'unsafe', 'broken footpath']],
  ];
  let category: Category = 'other';
  for (const [cat, kws] of rules) if (kws.some((k) => t.includes(k))) { category = cat; break; }
  const meta = CATEGORIES[category];
  const severity = /danger|urgent|accident|injur|live wire|child|fire|gushing/.test(t) ? 4 : 3;
  return {
    source: 'fallback',
    category,
    title: meta.label,
    description: text?.trim() ? text.trim().slice(0, 400) : `${meta.label} reported by a citizen.`,
    severity,
    suggestedDepartment: meta.department,
    estimatedResolutionDays: Math.max(1, Math.round(meta.baseDays * (severity / 3))),
    tags: [category, `${meta.baseDays}d-typical`],
    summary: `${meta.label} • severity ${severity}/5 • routed to ${meta.department}`,
    safetyRisk: severity >= 4 ? 'high' : 'medium',
    confidence: 0.6,
    isCivicIssue: true,
  };
}

// ════════════════════════════════════════════════════════════════════
// 2) Predictive insights for authorities
// ════════════════════════════════════════════════════════════════════
export interface Insights {
  source: 'gemini' | 'fallback';
  headline: string;
  hotspots: { ward: string; category: string; risk: string; reason: string }[];
  recommendations: string[];
}

export async function predictiveInsights(issues: Issue[]): Promise<Insights> {
  // Build a compact aggregate so we never ship raw PII / huge payloads to the model
  const agg: Record<string, number> = {};
  const openByWard: Record<string, number> = {};
  for (const i of issues) {
    const key = `${i.ward}|${i.category}`;
    agg[key] = (agg[key] || 0) + 1;
    if (i.status !== 'resolved' && i.status !== 'rejected') openByWard[i.ward] = (openByWard[i.ward] || 0) + 1;
  }
  const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([k, v]) => { const [ward, category] = k.split('|'); return { ward, category, count: v }; });

  const SCHEMA = {
    type: 'OBJECT',
    properties: {
      headline: { type: 'STRING' },
      hotspots: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            ward: { type: 'STRING' }, category: { type: 'STRING' },
            risk: { type: 'STRING', enum: ['low', 'medium', 'high'] }, reason: { type: 'STRING' },
          },
          required: ['ward', 'category', 'risk', 'reason'],
        },
      },
      recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['headline', 'hotspots', 'recommendations'],
  };

  const prompt = `You are a smart-city operations analyst. Based on this aggregated civic-issue data (ward|category → count of reports) for Bengaluru, predict emerging hotspots and give the municipal body 3-4 concrete, prioritized resource-allocation recommendations.
Data: ${JSON.stringify(top)}
Open (unresolved) issues per ward: ${JSON.stringify(openByWard)}
Return strict JSON. Keep "reason" to one crisp sentence each. Identify up to 4 hotspots most likely to worsen.`;

  const raw = await callGemini([{ text: prompt }], SCHEMA);
  const j = parseJSON(raw);
  if (j && Array.isArray(j.hotspots)) {
    return { source: 'gemini', headline: j.headline || 'Predicted civic hotspots', hotspots: j.hotspots.slice(0, 4), recommendations: (j.recommendations || []).slice(0, 5) };
  }
  return fallbackInsights(top, openByWard);
}

function fallbackInsights(
  top: { ward: string; category: string; count: number }[],
  openByWard: Record<string, number>,
): Insights {
  const hotspots = top.slice(0, 4).map((t) => ({
    ward: t.ward,
    category: CATEGORIES[t.category as Category]?.label || t.category,
    risk: t.count >= 4 ? 'high' : t.count >= 2 ? 'medium' : 'low',
    reason: `${t.count} reports clustered here — recurring pattern suggests systemic neglect.`,
  }));
  const worstWard = Object.entries(openByWard).sort((a, b) => b[1] - a[1])[0];
  const recommendations = [
    worstWard ? `Prioritize ${worstWard[0]} — it has the highest count of open issues (${worstWard[1]}).` : 'Maintain current crew allocation.',
    hotspots[0] ? `Deploy a dedicated crew for "${hotspots[0].category}" in ${hotspots[0].ward} this week.` : '',
    'Schedule preventive inspections in wards with repeat reports before the monsoon.',
    'Publish weekly resolution stats to sustain citizen trust and participation.',
  ].filter(Boolean);
  return { source: 'fallback', headline: 'Predicted civic hotspots (heuristic)', hotspots, recommendations };
}

// ════════════════════════════════════════════════════════════════════
// 3) Civic assistant chat (grounded on live issue stats)
// ════════════════════════════════════════════════════════════════════
export async function assistantReply(question: string, issues: Issue[]): Promise<{ source: 'gemini' | 'fallback'; answer: string }> {
  const open = issues.filter((i) => i.status !== 'resolved' && i.status !== 'rejected');
  const resolved = issues.filter((i) => i.status === 'resolved');
  const byCat: Record<string, number> = {};
  const byWard: Record<string, number> = {};
  for (const i of open) { byCat[i.category] = (byCat[i.category] || 0) + 1; byWard[i.ward] = (byWard[i.ward] || 0) + 1; }
  const context = {
    totalIssues: issues.length,
    open: open.length,
    resolved: resolved.length,
    resolutionRate: issues.length ? Math.round((resolved.length / issues.length) * 100) : 0,
    openByCategory: byCat,
    openByWard: byWard,
  };

  const prompt = `You are "Civic Assistant", a friendly, concise helper inside a community issue-reporting app for Bengaluru.
Answer the citizen's question using ONLY the live data below. Be specific with numbers, keep it under 90 words, and be encouraging about civic participation. If they ask how to report, tell them to tap "Report Issue" and snap a photo — the app auto-detects the problem.
Live data (JSON): ${JSON.stringify(context)}
Citizen question: "${question}"`;

  const raw = await callGemini([{ text: prompt }]);
  if (raw && raw.trim()) return { source: 'gemini', answer: raw.trim() };

  // deterministic fallback
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const topWard = Object.entries(byWard).sort((a, b) => b[1] - a[1])[0];
  const answer = `Right now there are ${context.open} open issues and ${context.resolved} resolved (${context.resolutionRate}% resolution rate).` +
    (topCat ? ` The most common open problem is ${CATEGORIES[topCat[0] as Category]?.label || topCat[0]} (${topCat[1]}).` : '') +
    (topWard ? ` ${topWard[0]} has the most open reports (${topWard[1]}).` : '') +
    ` To report something, tap “Report Issue” and snap a photo — the AI auto-detects it. 💪`;
  return { source: 'fallback', answer };
}

// ════════════════════════════════════════════════════════════════════
// 4) Auto-drafted official complaint
// ════════════════════════════════════════════════════════════════════
export async function complaintDraft(issue: Issue): Promise<{ source: 'gemini' | 'fallback'; text: string }> {
  const meta = CATEGORIES[issue.category];
  const prompt = `Draft a polite but firm formal complaint email a citizen can send to the ${meta.department} of BBMP (Bengaluru) about the civic issue below. Include a subject line, reference the exact location, severity, and request a time-bound resolution citing public safety. Keep it under 160 words. Plain text.
Issue: ${issue.title}
Category: ${meta.label}
Severity: ${issue.severity}/5
Location: ${issue.address}, ${issue.ward}
Details: ${issue.description}
Community confirmations: ${issue.upvotes.length}`;

  const raw = await callGemini([{ text: prompt }]);
  if (raw && raw.trim()) return { source: 'gemini', text: raw.trim() };

  const text = `Subject: Urgent: ${meta.label} at ${issue.address}, ${issue.ward} (Severity ${issue.severity}/5)

To the ${meta.department}, BBMP,

I am writing to formally report a ${meta.label.toLowerCase()} at ${issue.address}, ${issue.ward}. ${issue.description} This has been independently confirmed by ${issue.upvotes.length} nearby residents and poses a ${issue.severity >= 4 ? 'serious' : 'growing'} risk to public safety.

I request that the concerned department inspect and resolve this within ${meta.baseDays} working days, and share an action-taken update. Reference ID: ${issue.id.slice(0, 8).toUpperCase()}.

Thank you for your prompt attention.

A concerned citizen of ${issue.ward}`;
  return { source: 'fallback', text };
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
