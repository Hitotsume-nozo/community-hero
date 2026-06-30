#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# One-command deploy of Community Hero to Google Cloud Run.
# Cloud Build builds the Dockerfile in the cloud — no local Docker needed.
#
# Prereqs (one-time, see DEPLOY.md):
#   gcloud auth login
#   gcloud config set project <YOUR_PROJECT_ID>
#
# Usage:
#   GEMINI_API_KEY=xxxx ./deploy.sh
#   (or it will read GEMINI_API_KEY from .env automatically)
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${REGION:-asia-south1}"          # Mumbai — closest to India/judges
SERVICE="${SERVICE:-community-hero}"
MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

# Load GEMINI_API_KEY from .env if not already set
if [[ -z "${GEMINI_API_KEY:-}" && -f .env ]]; then
  export "$(grep -E '^GEMINI_API_KEY=' .env | head -1)"
fi
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "❌ GEMINI_API_KEY not set. Run:  GEMINI_API_KEY=xxxx ./deploy.sh" >&2; exit 1
fi

PROJECT="$(gcloud config get-value project 2>/dev/null)"
if [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]]; then
  echo "❌ No GCP project set. Run:  gcloud config set project <YOUR_PROJECT_ID>" >&2; exit 1
fi

echo "▸ Project : $PROJECT"
echo "▸ Region  : $REGION"
echo "▸ Service : $SERVICE"
echo "▸ Model   : $MODEL"

echo "▸ Enabling required APIs (run, cloudbuild, artifactregistry)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

echo "▸ Deploying from source (Cloud Build → Artifact Registry → Cloud Run)…"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --max-instances 5 \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_MODEL=${MODEL}"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo ""
echo "✅ Deployed!  Your public link:"
echo "   $URL"
