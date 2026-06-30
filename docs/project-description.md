---
title: "Community Hero"
subtitle: "Hyperlocal Problem Solver — An AI-Powered Civic Engagement Platform"
author: "VIBE2SHIP · Coding Ninjas × Google for Developers · Powered by Google Gemini"
date: "June 2026"
---

# Executive Summary

**Community Hero** turns every citizen with a smartphone into a sensor for their city. A resident snaps a photo of a pothole, water leak, broken streetlight or hazard; **Google Gemini** instantly identifies the problem, scores its severity and routes it to the right municipal department; neighbours **verify** it with a tap; authorities act on an **AI-prioritised queue**; and everyone tracks progress to resolution — transparently, in real time.

It is a complete, working, deployed product that directly answers the *Community Hero – Hyperlocal Problem Solver* brief, with **Google Gemini (Google AI Studio)** — the hackathon's mandated core tool — as its intelligence layer.

> **Live demo:** https://hitotsume-nozo-hephasteus.hf.space
> **Source code:** https://github.com/Hitotsume-nozo/community-hero

# The Problem

Communities everywhere face the same civic frustrations — potholes, water leakages, damaged streetlights, garbage, drainage failures and public-safety hazards. Yet reporting these issues today is:

- **Fragmented** — scattered across phone helplines, WhatsApp groups and paper complaints.
- **Opaque** — citizens rarely learn whether anyone received, prioritised or acted on a report.
- **Untracked** — there is no shared, verifiable record from report to resolution.
- **Low-trust** — without visible accountability, participation withers.

The result: problems linger, the same complaint is filed many times, and authorities lack the clean, prioritised data they need to allocate scarce crews efficiently.

# Our Solution

Community Hero is a single, mobile-first platform that closes the entire civic loop — **identify → report → validate → track → resolve** — and makes every step transparent and collaborative. Artificial intelligence removes the friction at each stage:

- **Reporting** takes seconds — point, shoot, submit. Gemini writes the title, description and category for you.
- **Validation** is crowdsourced — three neighbour confirmations auto-verify a report, filtering noise and surfacing what truly matters.
- **Tracking** is live — a real-time feed and a full status timeline keep citizens informed.
- **Resolution** is data-driven — authorities work a queue ranked by severity, community weight and SLA urgency, with Gemini forecasting where the next problems will emerge.

# Key Features (mapped to the evaluation criteria)

| Evaluation focus | How Community Hero delivers |
|---|---|
| Image / video reporting | One-tap photo capture; **Gemini Vision** auto-detects the issue and pre-fills the entire form. |
| AI-powered categorization | 12 civic categories, severity 1–5, safety-risk rating, department routing and an estimated resolution SLA — each with a confidence score. |
| Geo-location & mapping | Interactive clustered map of the city, a severity **heatmap**, GPS capture and a draggable location pin. |
| Community verification | "I see this too" confirmations; a report **auto-verifies** once three neighbours vouch for it. |
| Real-time issue tracking | Live updates via Server-Sent Events and a complete status lifecycle timeline (Reported → Verified → In Progress → Resolved). |
| Impact dashboards | KPIs, a 30-day trend chart, status breakdown, and category & ward leaderboards. |
| Predictive insights | **Gemini** forecasts emerging hotspots and gives authorities prioritised, actionable resource recommendations. |
| Gamification | Civic points, levels, badges and a city-wide "Community Heroes" leaderboard. |

# Going Beyond the Brief

- **Geo + category duplicate detection** — before a report is filed, the app checks for similar nearby issues and nudges the citizen to confirm the existing one, keeping data clean.
- **Gemini Civic Assistant** — a floating chat assistant that answers natural-language questions ("Which ward needs the most attention?") grounded on **live** city data.
- **AI complaint drafting** — one tap generates a formal, department-addressed complaint letter the citizen can copy into an official grievance portal.
- **Authority Console** — a dedicated triage workspace with an AI-prioritised queue, SLA / overdue tracking and one-click status updates.
- **Resilience by design** — every AI capability has a deterministic fallback, so the platform stays fully usable even if the AI service is unavailable.

# How Google Gemini Powers the Platform

All AI runs server-side via the Google AI Studio Gemini API (model `gemini-2.5-flash`, multimodal), using enforced structured (JSON-schema) output for reliability.

| Capability | What Gemini does |
|---|---|
| Multimodal triage | Analyses the uploaded photo (and any note) and returns category, title, description, severity, safety-risk, tags and a confidence score — including an "is this actually a civic issue?" guard. |
| Predictive insights | Reads aggregated ward × category data and forecasts the hotspots most likely to worsen, with prioritised recommendations for authorities. |
| Civic assistant | Answers citizen questions using live issue statistics as grounding context. |
| Complaint drafting | Writes a polite, firm, time-bound complaint letter addressed to the correct department. |

To keep the live experience fast and dependable, "thinking" tokens are disabled for these structured calls, and any API hiccup transparently falls back to a heuristic — clearly labelled in the interface so trust is never compromised.

# Architecture

Community Hero ships as a **single deployable container** for simplicity and reliability.

| Layer | Technology | Responsibility |
|---|---|---|
| Client | React + TypeScript + Vite | Map, AI report flow, dashboards, console and assistant UI |
| Server | Node + Express + TypeScript | REST API, real-time event stream, gamification, duplicate detection |
| Intelligence | Google Gemini (AI Studio) | Multimodal triage, prediction, assistant, drafting |
| Realtime | Server-Sent Events | Live issue and status updates across all clients |
| Persistence | JSON document store | Zero-provisioning storage of issues and users |
| Mapping | Leaflet + OpenStreetMap | Keyless, always-available maps, clustering and heat |

The Express server also serves the built React application, so the entire product runs from one origin with no external infrastructure to provision — making it inexpensive and trivial to host.

# Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React-Leaflet (clustering + heatmap), Recharts, Framer-Motion.
- **Backend:** Node 22, Express, TypeScript, Server-Sent Events.
- **AI:** Google Gemini via Google AI Studio (multimodal, structured output).
- **Maps:** Leaflet with OpenStreetMap / CARTO tiles (no API key required).
- **Deployment:** Docker container on Hugging Face Spaces (free); also one-command deployable to Google Cloud Run or Render.

# Impact, Transparency & Engagement

Community Hero is designed to build a virtuous civic cycle:

- **Transparency** — every report has a public status timeline; the impact dashboard exposes resolution rates and average fix times for the whole city.
- **Accountability** — issues are routed to named departments with visible SLAs; overdue items are flagged automatically.
- **Participation** — gamification (points, levels, badges, leaderboard) rewards citizens for reporting, verifying and following through, sustaining engagement over time.
- **Efficiency** — AI prioritisation and hotspot prediction help authorities deploy limited crews where they matter most.

# Live Demo Walkthrough

1. **Sign in** and land on a live map of the city seeded with realistic issues.
2. **Report** — upload a photo; watch Gemini auto-fill category, severity and department; place the pin (duplicate detection runs); submit and earn civic points.
3. **Issue detail** — confirm an issue, see it auto-verify, and generate an AI complaint letter.
4. **Impact dashboard** — explore KPIs, trends and Gemini's predicted hotspots.
5. **Authority console** — switch roles and work the AI-prioritised queue from In Progress to Resolved.
6. **Civic Assistant** — ask a question and get a data-grounded answer.

# Running & Deploying

The project runs locally with a single command set (`npm install` then `npm run build && npm start`) and deploys to a free public link on Hugging Face Spaces. Detailed, copy-paste instructions for Hugging Face, Render and Google Cloud Run are included in the repository's `START_HERE.md` and `DEPLOY.md`.

# Future Scope

- Native mobile apps with offline-first capture and background sync.
- Direct integration with municipal grievance systems and open-data portals.
- Multilingual reporting and assistant responses for wider inclusion.
- Verified authority workflows with audit logs and citizen satisfaction feedback at closure.
- Video and audio evidence with Gemini multimodal understanding.

# Submission Details

- **Track / Problem Statement:** Community Hero – Hyperlocal Problem Solver.
- **Event:** VIBE2SHIP — Coding Ninjas × Google for Developers.
- **Core tool:** Google AI Studio (Gemini) — central to triage, prediction, assistance and drafting.
- **Live application:** https://hitotsume-nozo-hephasteus.hf.space
- **Repository:** https://github.com/Hitotsume-nozo/community-hero
- **Participation:** Solo.
