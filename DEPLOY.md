# 🚀 Deploy Community Hero to a public link

You need a long-running Node server (API + live SSE + server-side Gemini key), so a
**static host won't do** — but you have great **free, no-credit-card** options.

| Platform | Free? | Card? | Cold start | Fit | 
|---|---|---|---|---|
| **🥇 Hugging Face Spaces (Docker)** | ✅ | ❌ none | wakes in ~10s | **Best** — repo already configured |
| 🥈 Render (Web Service) | ✅ | ❌ none | ~50s after idle | Good (ping before demo) |
| 🥉 Google Cloud Run | ✅ tier | ⚠️ card to enable billing | ~3s | Great, but needs billing card |
| ❌ Cloudflare Workers/Pages | – | – | – | **Doesn't fit** — edge funcs, no Express/SSE/fs without a rewrite |

---

# 🥇 Option A — Hugging Face Spaces (recommended, 100% free)

The repo is **already set up** for this: `README.md` has the `sdk: docker` / `app_port: 8080`
header, and the data layer writes to `/tmp` (HF's writable path).

### 1. Create the Space (web, 1 min)
1. Sign up free at https://huggingface.co (no card).
2. Go to https://huggingface.co/new-space →
   - **Owner**: you · **Space name**: `community-hero`
   - **SDK**: **Docker** → **Blank**
   - **Hardware**: *CPU basic (free)* · **Visibility**: Public
   - Create.

### 2. Add your Gemini key as a secret
In the new Space → **Settings → Variables and secrets → New secret**:
- Name: `GEMINI_API_KEY` · Value: `AIza…your_key`
- (optional) `GEMINI_MODEL` = `gemini-2.5-flash`

### 3. Push the code
HF gives you a git URL like `https://huggingface.co/spaces/<user>/community-hero`.

**Authenticate once** (stores a token locally — paste a *write* token from
https://huggingface.co/settings/tokens):
```bash
pip install -U huggingface_hub          # if not installed
huggingface-cli login
```

**Then push** (helper script does it for you):
```bash
HF_SPACE=<user>/community-hero ./deploy-hf.sh
```
…or manually:
```bash
git init && git add -A && git commit -m "Community Hero"
git remote add space https://huggingface.co/spaces/<user>/community-hero
git push --force space HEAD:main
```

HF builds the `Dockerfile` and gives you a public URL:
**`https://<user>-community-hero.hf.space`** → put that in your BlockseBlock submission.

> Build takes ~3-4 min the first time. Watch the **Logs** tab. The Space sleeps when idle
> and wakes on the next visit (open it ~30s before you present).

---

# 🥈 Option B — Render (free Web Service, no card)

1. Push this repo to **GitHub** (public or private).
2. https://render.com → **New → Web Service** → connect the repo.
3. Settings:
   - **Runtime**: Docker (it auto-detects the `Dockerfile`)
   - **Instance type**: **Free**
   - **Environment** → add `GEMINI_API_KEY` (and optional `GEMINI_MODEL`).
4. Create → Render builds & deploys → you get `https://community-hero.onrender.com`.

> Free instances spin down after 15 min idle and take ~50s to wake. **Open the URL once a
> minute before your live demo** so it's warm.

A `render.yaml` blueprint is included — you can instead use **New → Blueprint** and point it
at the repo for one-click setup (just add the secret).

---

# 🥉 Option C — Google Cloud Run (needs a billing card)

Only if you have a billing-enabled GCP project. Full steps:

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
GEMINI_API_KEY=AIza... ./deploy.sh          # builds via Cloud Build, prints URL
```
`deploy.sh` enables the APIs and runs `gcloud run deploy --source .` (no local Docker needed).

---

## 🖥️ Run locally (no deploy needed)
```bash
npm install
cp .env.example .env   # paste GEMINI_API_KEY
npm run build && npm start      # → http://localhost:8080
```

## 🔧 Local Docker (optional)
Requires Docker group access (`sudo usermod -aG docker $USER`, then re-login):
```bash
docker build -t community-hero .
docker run -p 8080:8080 -e GEMINI_API_KEY=AIza... community-hero
```

---

## 🩺 Troubleshooting
| Symptom | Fix |
|---|---|
| HF build fails | Check the **Logs** tab; ensure `README.md` frontmatter (`app_port: 8080`) is at repo root. |
| App loads but AI shows "Heuristic" | The `GEMINI_API_KEY` secret/env var didn't reach the service — re-check it's set, then restart/redeploy. |
| Render very slow first hit | Free tier cold start — open the URL ~1 min before presenting. |
| Data resets after restart | Expected on free tiers (ephemeral FS) — the app reseeds realistic demo data automatically. |

## ✅ What to submit (BlockseBlock)
- The **public URL** (HF/Render).
- This repo + `README.md`.
- A 2–3 min demo video (script is in the README).
- Explicitly mention **Google AI Studio / Gemini** — the mandated core tool, central here.
