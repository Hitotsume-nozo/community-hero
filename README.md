---
title: Community Hero
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 8080
pinned: true
license: mit
short_description: AI civic issue solver powered by Google Gemini
---

<div align="center">

#  Community Hero — Hyperlocal Problem Solver

**AI-powered civic issue reporting, verification, tracking & resolution.**
Built for **VIBE2SHIP · Coding Ninjas × Google for Developers** · Powered by **Google Gemini**

</div>

---

## The problem

Potholes, water leaks, broken streetlights, garbage, drainage and safety hazards are everywhere — but reporting them is fragmented, opaque and rarely tracked to resolution. Community Hero turns every citizen with a phone into a sensor, uses **Google Gemini** to triage what they see, lets neighbours **verify** it, and gives authorities an **AI-prioritised** queue to resolve it — transparently.

## What makes it win

| Evaluation focus | How Community Hero delivers |
|---|---|
| **Image/video reporting** | Snap a photo → **Gemini Vision** auto-detects the problem, writes the title & description, scores severity 1–5, and flags safety risk. |
| **AI categorization** | 12 civic categories, auto-routed to the correct department (BBMP/BWSSB/BESCOM…) with an estimated resolution SLA. |
| **Geo-location & mapping** | Live **Leaflet** map with marker clustering, a severity **heatmap**, GPS capture and draggable pin. |
| **Community verification** | "I see this too" confirmations; **auto-verifies** once ≥3 neighbours vouch. |
| **Real-time tracking** | Full status lifecycle + timeline, **live SSE updates** across all clients. |
| **Impact dashboards** | KPIs, 30-day trend, status donut, category & ward breakdowns. |
| **Predictive insights** | **Gemini** forecasts emerging hotspots and gives authorities prioritized resource-allocation actions. |
| **Gamification** | Points, levels, badges and a city-wide hero leaderboard. |
| **Beyond the brief** | Geo **duplicate detection**, an **AI Civic Assistant** chat grounded on live data, one-tap **AI-drafted official complaint** letters, and a full **Authority Console** with SLA tracking. |

> **Resilience by design:** every AI feature has a deterministic fallback, so the live demo works even if the API key is missing or rate-limited. The server is hardened against crashes (`unhandledRejection`/`uncaughtException` guards + global error handler).

## Tech stack

- **AI:** Google **Gemini** (`gemini-2.5-flash`, multimodal) via Google AI Studio — structured JSON output, thinking disabled for snappy latency.
- **Frontend:** React 18 + TypeScript + Vite + Tailwind v4 + React-Leaflet (+ clustering & heat) + Recharts + Framer Motion.
- **Backend:** Node + Express + TypeScript, JSON-persisted store (zero native deps), Server-Sent Events for realtime.
- **Deploy:** Single container → **Google Cloud Run** (`gcloud run deploy --source .`).

## Run it locally

```bash
# 1. Install (root installs both server & client)
npm install

# 2. Add your free Gemini key (https://aistudio.google.com/apikey)
cp .env.example .env   # then paste GEMINI_API_KEY=...

# 3a. Dev (hot reload, client on :5173 proxying API on :8080)
npm run dev

# 3b. — or — production build + serve on one port (:8080)
npm run build && npm start
```

Open **http://localhost:8080**. Enter any name to start as a citizen, or tap **"Enter as Authority"** for the triage console.

> Runs **without** a key too — AI features fall back to deterministic heuristics.

## Demo script (for the live pitch)

1. **Report** → snap/upload a photo → watch Gemini auto-fill category, severity & department → drop the pin → submit.
2. **Map** → see it appear live; switch to **Heatmap**.
3. **Issue page** → "I see this too" to verify → **Generate AI complaint letter** → copy.
4. **Impact dashboard** → KPIs + **AI Predictive Insights** (hotspots & recommendations).
5. **Authority Console** → act on the AI-prioritised queue → mark *In Progress* → *Resolved* (citizen earns bonus points).
6. **Civic Assistant** (✦ bottom-right) → "Which area has the most open issues?"

## Deploy to a public link (free, no credit card)

**Recommended: Hugging Face Spaces (Docker)** — this repo is already configured for it
(`sdk: docker`, `app_port: 8080`, `/tmp` storage). Create a free Docker Space, add
`GEMINI_API_KEY` as a secret, then:

```bash
huggingface-cli login                          # paste a write token (one-time)
HF_SPACE=<user>/community-hero ./deploy-hf.sh  # pushes; HF builds & hosts it
```

Full guide + **Render** (also free) and **Cloud Run** options in **[DEPLOY.md](./DEPLOY.md)**.

## Project layout

```
community-hero/
├── server/   Express + TS API, Gemini service, SSE, seed data
├── client/   React + TS SPA (map, report, dashboard, console, assistant)
├── Dockerfile        multi-stage build → Cloud Run
├── deploy.sh         one-command Cloud Run deploy
└── DEPLOY.md         step-by-step deployment guide
```
