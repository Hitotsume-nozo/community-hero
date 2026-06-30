# 🚀 Deploy Community Hero to a public link (Google Cloud Run)

You'll get a public HTTPS URL like `https://community-hero-xxxxx.a.run.app` to put in your submission.

We use **`gcloud run deploy --source .`** → Google **Cloud Build** builds the `Dockerfile` in the cloud and deploys to **Cloud Run**. **You do NOT need Docker installed locally.**

Total time: ~10 minutes. Free tier easily covers a hackathon demo.

---

## 0. One-time prerequisites

- A Google account.
- A Google Cloud **project with billing enabled** (Cloud Run has a generous always-free tier; a card is required to enable billing but you won't be charged for demo traffic).
- The `gcloud` CLI — **already installed** in this environment at `~/google-cloud-sdk/bin`. Verify:

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"   # add to ~/.zshrc to persist
gcloud --version
```

---

## 1. Log in (interactive — do this yourself)

In the Claude Code prompt, prefix with `!` so the login runs in your terminal:

```
! export PATH="$HOME/google-cloud-sdk/bin:$PATH" && gcloud auth login
```

This opens a browser. Pick your Google account and approve.

---

## 2. Select (or create) a project

**Use an existing project:**
```bash
gcloud config set project YOUR_PROJECT_ID
```

**…or create a fresh one** (id must be globally unique, lowercase):
```bash
gcloud projects create community-hero-2026 --name="Community Hero"
gcloud config set project community-hero-2026
```

**Enable billing** for the project (one-time, via console):
👉 https://console.cloud.google.com/billing — link a billing account to the project.

---

## 3. Deploy (one command)

From the `community-hero/` folder:

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
GEMINI_API_KEY=AIza...your_key  ./deploy.sh
```

`deploy.sh` will:
1. Enable the `run`, `cloudbuild` and `artifactregistry` APIs.
2. Build the container from source via Cloud Build.
3. Deploy to Cloud Run in **asia-south1 (Mumbai)**, publicly accessible.
4. Print your **public URL**.

> The script auto-reads `GEMINI_API_KEY` from `.env` if you don't pass it inline.
> Override region/service: `REGION=asia-south1 SERVICE=community-hero GEMINI_API_KEY=... ./deploy.sh`

### Manual equivalent (if you prefer not to use the script)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud run deploy community-hero \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 --port 8080 --max-instances 5 \
  --set-env-vars "GEMINI_API_KEY=AIza...,GEMINI_MODEL=gemini-2.5-flash"

# fetch the URL
gcloud run services describe community-hero --region asia-south1 --format='value(status.url)'
```

The first prompt may ask to create an Artifact Registry repo — answer **Y**.

---

## 4. (Recommended) Keep the key in Secret Manager

Instead of a plaintext env var:

```bash
echo -n "AIza...your_key" | gcloud secrets create gemini-key --data-file=-
gcloud run services update community-hero --region asia-south1 \
  --update-secrets=GEMINI_API_KEY=gemini-key:latest
```

---

## 5. Redeploy after changes

Just run `./deploy.sh` again (or the `gcloud run deploy` command). Cloud Run rolls out a new revision with zero downtime.

---

## Local Docker (optional alternative)

If you'd rather build the image yourself, you need Docker access (be in the `docker` group: `sudo usermod -aG docker $USER` then re-login).

```bash
docker build -t community-hero .
docker run -p 8080:8080 -e GEMINI_API_KEY=AIza... community-hero
# open http://localhost:8080
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `billing account ... not found` | Enable billing on the project (step 2). |
| `PERMISSION_DENIED` enabling APIs | Ensure you're owner/editor of the project; re-run `gcloud auth login`. |
| Build fails on `npm install` | Re-run — transient registry timeouts; Cloud Build retries cleanly. |
| App loads but AI says "Heuristic" | The `GEMINI_API_KEY` env var didn't reach the service — re-deploy with `--set-env-vars` or set the secret (step 4). |
| Cold start feels slow | Add `--min-instances 1` to keep one warm during judging. |

---

## What to submit

- **Public URL** from step 3 (drop it in the BlockseBlock submission form).
- This repo (GitHub) + the README.
- A 2–3 min demo video following the script in the README.
- Mention **Google AI Studio / Gemini** explicitly — it's the mandated core tool and it's central here.
