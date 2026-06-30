import { Router } from 'express';
import { issues as store } from '../store';
import { analyzeIssue, assistantReply, predictiveInsights, geminiEnabled } from '../gemini';

const router = Router();

router.get('/ai/status', (_req, res) => res.json({ geminiEnabled: geminiEnabled(), model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }));

// Multimodal analysis of a photo and/or text
router.post('/ai/analyze', async (req, res) => {
  try {
    const { base64, mime, text } = req.body as { base64?: string; mime?: string; text?: string };
    if (!base64 && !text) return res.status(400).json({ error: 'photo or text required' });
    const result = await analyzeIssue({ base64, mime, text });
    res.json(result);
  } catch (e) { console.error('[ai/analyze]', e); res.status(502).json({ error: 'analysis failed' }); }
});

// Grounded civic assistant
router.post('/ai/assistant', async (req, res) => {
  try {
    const question = String(req.body.question || '').trim().slice(0, 400);
    if (!question) return res.status(400).json({ error: 'question required' });
    const result = await assistantReply(question, store.all());
    res.json(result);
  } catch (e) { console.error('[ai/assistant]', e); res.status(502).json({ error: 'assistant failed' }); }
});

// Predictive insights (cached briefly to limit token spend during a live demo)
let cache: { at: number; data: any } | null = null;
router.get('/ai/insights', async (_req, res) => {
  try {
    if (cache && Date.now() - cache.at < 60_000) return res.json(cache.data);
    const data = await predictiveInsights(store.all());
    cache = { at: Date.now(), data };
    res.json(data);
  } catch (e) { console.error('[ai/insights]', e); res.status(502).json({ error: 'insights failed' }); }
});

export default router;
