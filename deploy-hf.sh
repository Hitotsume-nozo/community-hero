#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Push Community Hero to a Hugging Face Space (free, no card).
#
# Prereqs:
#   1. Create a Docker Space at https://huggingface.co/new-space
#   2. Add GEMINI_API_KEY as a Space *secret* (Settings → Variables and secrets)
#   3. Authenticate once:  huggingface-cli login   (paste a WRITE token)
#
# Usage:
#   HF_SPACE=<user>/community-hero ./deploy-hf.sh
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${HF_SPACE:?Set HF_SPACE=<user>/space-name (e.g. sparsh/community-hero)}"

# Resolve a write token (from env, or the file huggingface-cli login wrote)
TOKEN="${HF_TOKEN:-}"
if [[ -z "$TOKEN" && -f "$HOME/.cache/huggingface/token" ]]; then
  TOKEN="$(cat "$HOME/.cache/huggingface/token")"
fi
if [[ -z "$TOKEN" ]]; then
  echo "❌ No HF token found. Run:  huggingface-cli login   (or export HF_TOKEN=hf_xxx)" >&2
  exit 1
fi

USER="${HF_SPACE%%/*}"
REMOTE="https://${USER}:${TOKEN}@huggingface.co/spaces/${HF_SPACE}"

echo "▸ Space   : https://huggingface.co/spaces/${HF_SPACE}"
echo "▸ Pushing source (HF will build the Dockerfile)…"

git init -q 2>/dev/null || true
git add -A
git -c user.email=deploy@local -c user.name=deploy commit -q -m "Deploy Community Hero" || echo "  (nothing new to commit)"
git branch -M main 2>/dev/null || true
git push --force "$REMOTE" main 2>&1 | sed "s/${TOKEN}/***/g"

echo ""
echo "✅ Pushed!  Watch the build at:  https://huggingface.co/spaces/${HF_SPACE}  (Logs tab)"
echo "   Live URL:  https://${USER}-${HF_SPACE#*/}.hf.space"
