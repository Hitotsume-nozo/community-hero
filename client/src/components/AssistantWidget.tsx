import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send } from 'lucide-react';
import { api } from '../lib/api';
import { GeminiBadge, Spinner } from './atoms';

interface Msg { role: 'user' | 'bot'; text: string; source?: string; }

const SUGGESTIONS = [
  'Which area has the most open issues?',
  'How do I report a pothole?',
  'What % of issues are resolved?',
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: "Hi! I'm your Civic Assistant ✦ Ask me anything about issues in your city, or how to report one.", source: 'gemini' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api.assistant(q);
      setMsgs((m) => [...m, { role: 'bot', text: r.answer, source: r.source }]);
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: 'Sorry, I had trouble answering that. Please try again.', source: 'fallback' }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-[1200] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105 md:bottom-6"
        style={{ background: 'linear-gradient(135deg,#4285F4,#9b72cb,#d96570)' }}
        aria-label="Civic Assistant"
      >
        {open ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-4 z-[1200] flex h-[28rem] w-[min(92vw,23rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:bottom-24"
          >
            <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: 'linear-gradient(135deg,#4285F4,#9b72cb)' }}>
              <Sparkles size={18} /><div className="font-bold">Civic Assistant</div>
              <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">powered by Gemini</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={m.role === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm'}>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    {m.role === 'bot' && m.source && <div className="mt-1"><GeminiBadge source={m.source} /></div>}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><Spinner /></div></div>}
              {msgs.length <= 1 && (
                <div className="space-y-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 hover:border-brand-300 hover:text-brand-700">{s}</button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t border-slate-200 p-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your city…"
                className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
              <button type="submit" disabled={busy} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white disabled:opacity-50"><Send size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
