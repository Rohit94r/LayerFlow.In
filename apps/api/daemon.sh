#!/usr/bin/env bash
# LayerFlow AutoSubmit form-filler — REAL daemon runner.
#
# This is the DAEMON, not a stub. It launches the Playwright agent
# (apps/api/scripts/form-filler.ts) which opens your REAL Google Forms URL in a
# PERSISTENT Chromium that carries YOUR already-logged-in LayerFlow Google
# profile, fills the REAL fields from the saved profile, submits for REAL, and
# only on REAL "Your response has been recorded" confirmation reports
# exit_code 0 back to the API. The API then (only then) marks the linked
# submission completed and sends the REAL Gmail confirmation.
#
# Env (all four, real, checked below):
#   LF_API_URL       default http://localhost:8787  (dev API)
#   LF_API_KEY       required — sync key, lf_live_*  (REAL auth)
#   LF_DEVICE_ID     default lf-form-filler
#   LF_PROFILE_DIR   default ~/.layerflow/chromium-profile — a PERSISTENT
#                    Chromium dir where you log into Google ONCE; every run
#                    reuses it, so you never log in again.
set -euo pipefail

LF_API_URL="${LF_API_URL:-http://localhost:8787}"
LF_API_KEY="${LF_API_KEY:-}"
LF_DEVICE_ID="${LF_DEVICE_ID:-lf-form-filler}"
LF_PROFILE_DIR="${LF_PROFILE_DIR:-$HOME/.layerflow/chromium-profile}"

# Fail fast and truthfully if the one thing that can't be invented is missing.
if [ -z "$LF_API_KEY" ]; then
  echo "LF_API_KEY is required (LayerFlow sync key, lf_live_*)." >&2
  echo "Get one: GET /api/v1/sync/keys with your browser session." >&2
  exit 2
fi

mkdir -p "$LF_PROFILE_DIR"
if [ ! -d "$LF_PROFILE_DIR/Default" ]; then
  echo "[layerflow] First run: log into Google in this Chromium profile."
  echo "[layerflow]   profile: $LF_PROFILE_DIR"
  echo "[layerflow] Every later fill reuses this login — one time only."
fi

LF_API_URL="$LF_API_URL" \
LF_API_KEY="$LF_API_KEY" \
LF_DEVICE_ID="$LF_DEVICE_ID" \
LF_PROFILE_DIR="$LF_PROFILE_DIR" \
  node apps/api/scripts/form-filler.ts
