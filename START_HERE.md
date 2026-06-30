# ▶️ START HERE — Community Hero (VIBE2SHIP submission)

Everything is built, wired to **Google Gemini**, and verified. This file has every command
you need. The app is a single Node container that serves the React UI + API.

> **Security:** the Gemini key is in `.env` (gitignored). It was shared in chat — **rotate it**
> at https://aistudio.google.com/apikey before final submission, and update `.env` / your host secret.

---

## 1) Run it locally (30 sec)

```bash
cd /home/sparsh/vibe/community-hero
npm install                 # installs root + server + client
npm run build && npm start  # → open http://localhost:8080
```
Dev mode with hot-reload instead: `npm run dev` (UI :5173, API :8080).
Sign in with any name, or tap **Enter as Authority** for the triage console.

---

## 2) Deploy a FREE public link — Hugging Face Spaces (recommended, no credit card)

### A. Create the Space (web, 1 min)
1. Free account: https://huggingface.co/join
2. https://huggingface.co/new-space → **SDK = Docker**, **Blank**, **CPU basic (free)**, **Public** → Create.
3. In the Space → **Settings → Variables and secrets → New secret**:
   `GEMINI_API_KEY` = `AIza…your_key`  (optional: `GEMINI_MODEL` = `gemini-2.5-flash`)
4. Create a **write token**: https://huggingface.co/settings/tokens (role: *Write*).

### B. Push the code (one command — no CLI install needed)
Replace `<user>` and `hf_xxx` with your username and write token:

```bash
cd /home/sparsh/vibe/community-hero
HF_SPACE=<user>/community-hero  HF_TOKEN=hf_xxx  ./deploy-hf.sh
```

HF builds the `Dockerfile` (~3-4 min, watch the **Logs** tab). Your public URL:
```
https://<user>-community-hero.hf.space
```
> Free Spaces sleep when idle and wake on visit — open the URL ~30s before you present.

#### Manual alternative (if you prefer raw git):
```bash
cd /home/sparsh/vibe/community-hero
git init && git add -A && git commit -m "Community Hero"
git remote add space https://<user>:hf_xxx@huggingface.co/spaces/<user>/community-hero
git push --force space HEAD:main
```

---

## 3) Alternative FREE host — Render (no card; slower cold start)

1. Push this folder to a **GitHub** repo.
2. https://render.com → **New → Blueprint** → select the repo (it reads `render.yaml`).
   - Or **New → Web Service** → Runtime **Docker** → Instance **Free**.
3. Add env var `GEMINI_API_KEY` (and optional `GEMINI_MODEL=gemini-2.5-flash`).
4. Deploy → URL like `https://community-hero.onrender.com`.
   *(Free tier sleeps after 15 min; open it ~1 min before demoing.)*

---

## 4) Google Cloud Run (only if you have a billing card)

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
GEMINI_API_KEY=AIza... ./deploy.sh        # builds via Cloud Build, prints URL
```

---

## 5) Cloudflare — not supported as-is
Workers/Pages are edge functions (no long-running Express server, SSE, or filesystem store).
Use **Hugging Face** or **Render** instead — both are free and need no card.

---

## 6) Submit (BlockseBlock)
- Paste your **public URL** (HF or Render) into the submission form.
- Include this repo (push to GitHub) + the `README.md`.
- Record a 2-3 min demo video using the **demo script in `README.md`**.
- Explicitly mention **Google AI Studio / Gemini** — it's the mandated core tool and is central
  (multimodal photo triage, predictive hotspots, civic assistant, complaint drafting).

---

## What's where
| File | Purpose |
|---|---|
| `README.md` | Full overview, features, demo script |
| `DEPLOY.md` | Detailed deployment guide (all platforms) |
| `deploy-hf.sh` | One-command Hugging Face push |
| `deploy.sh` | One-command Cloud Run deploy |
| `render.yaml` | Render blueprint |
| `Dockerfile` | Single-container build (verified) |
| `server/src/gemini.ts` | All Gemini calls + graceful fallbacks |
```
```

✅ Verified before handoff: real Gemini multimodal/insights/assistant/complaint, 0 UI console
errors, full report flow, community auto-verify, authority status flow, and the production
Docker runtime artifact serving the SPA + API.
