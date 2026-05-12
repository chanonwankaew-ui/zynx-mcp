#!/usr/bin/env bash
# codex-run-workflow.sh
# Codex CLI entry point: discover, dry-run, or execute a Zynx workflow.
#
# Usage:
#   ./scripts/codex-run-workflow.sh [--workflow <id>] [--execute] [--list]
#
# Examples:
#   ./scripts/codex-run-workflow.sh --list
#   ./scripts/codex-run-workflow.sh --workflow nightly-governance-validation
#   ./scripts/codex-run-workflow.sh --workflow zynx-developer-mode-build --execute

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOWS_DIR="$REPO_ROOT/workflows"
BACKEND_URL="${ZYNX_API_BASE_URL:-http://localhost:8790}"

# ── colour helpers ──────────────────────────────────────────────────────────
bold=$'\e[1m'; reset=$'\e[0m'; green=$'\e[32m'; yellow=$'\e[33m'
red=$'\e[31m'; cyan=$'\e[36m'; dim=$'\e[2m'

info()    { echo "${cyan}ℹ${reset}  $*"; }
ok()      { echo "${green}✔${reset}  $*"; }
warn()    { echo "${yellow}⚠${reset}  $*"; }
fail()    { echo "${red}✖${reset}  $*" >&2; }
section() { echo ""; echo "${bold}$*${reset}"; echo "${dim}$(printf '─%.0s' {1..60})${reset}"; }

# ── argument parsing ─────────────────────────────────────────────────────────
WORKFLOW_ID=""
EXECUTE_FLAG=""
LIST_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workflow|-w)   WORKFLOW_ID="$2"; shift 2 ;;
    --execute|-e)    EXECUTE_FLAG="--execute"; shift ;;
    --list|-l)       LIST_MODE=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--workflow <id>] [--execute] [--list]"
      exit 0 ;;
    *)
      fail "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── list mode ────────────────────────────────────────────────────────────────
if $LIST_MODE; then
  section "Available Zynx Workflows"
  found=0
  for f in "$WORKFLOWS_DIR"/*.json; do
    [[ -f "$f" ]] || continue
    id=$(basename "$f" .json)
    name=$(node -e "const d=require('$f');console.log(d.workflow?.name??'$id')" 2>/dev/null || echo "$id")
    goal=$(node -e "const d=require('$f');console.log((d.workflow?.goal??'').slice(0,80))" 2>/dev/null || echo "")
    printf "  ${bold}%-45s${reset} %s\n" "$id" "$name"
    [[ -n "$goal" ]] && printf "  ${dim}%-45s${reset} %s\n" "" "$goal"
    ((found++))
  done
  echo ""
  info "$found workflow(s) found in $WORKFLOWS_DIR"
  exit 0
fi

# ── resolve workflow path ────────────────────────────────────────────────────
if [[ -z "$WORKFLOW_ID" ]]; then
  # default to nightly governance if nothing specified
  WORKFLOW_ID="nightly-governance-validation"
  warn "No --workflow specified. Defaulting to: $WORKFLOW_ID"
fi

WORKFLOW_FILE="$WORKFLOWS_DIR/${WORKFLOW_ID}.json"
if [[ ! -f "$WORKFLOW_FILE" ]]; then
  fail "Workflow file not found: $WORKFLOW_FILE"
  echo ""
  echo "Run with --list to see available workflows."
  exit 1
fi

# ── mode banner ───────────────────────────────────────────────────────────────
MODE="dry-run"
[[ -n "$EXECUTE_FLAG" ]] && MODE="execute"

section "Zynx Workflow Runner"
info "Workflow : ${bold}${WORKFLOW_ID}${reset}"
info "File     : $WORKFLOW_FILE"
info "Mode     : ${bold}${MODE}${reset}"
info "Backend  : $BACKEND_URL"
echo ""

# ── backend health check (only in execute mode) ───────────────────────────────
if [[ -n "$EXECUTE_FLAG" ]]; then
  info "Checking backend health..."
  if curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
    ok "Backend is reachable at $BACKEND_URL"
  else
    fail "Backend not reachable at $BACKEND_URL"
    echo ""
    echo "  Start it first:  npm run dev:backend"
    echo "  Or set:          ZYNX_API_BASE_URL=http://localhost:<port>"
    exit 1
  fi
  echo ""
fi

# ── run the TypeScript executor ───────────────────────────────────────────────
cd "$REPO_ROOT"

node --import tsx/esm scripts/run-workflow.ts "$WORKFLOW_FILE" $EXECUTE_FLAG

STATUS=$?
echo ""
if [[ $STATUS -eq 0 ]]; then
  ok "Workflow ${MODE} completed. Reports: reports/workflow-runs/"
else
  fail "Workflow ${MODE} failed (exit $STATUS)."
  exit $STATUS
fi
