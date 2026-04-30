#!/usr/bin/env bash
set -euo pipefail

# Reorganize files from SOURCE_ROOT into the Zynx production layout under DEST_ROOT.
# Usage:
#   scripts/organise-kant.sh --dry-run
#   scripts/organise-kant.sh --execute

SOURCE_ROOT="/Users/kant"
DEST_ROOT="/Users/kant/zynx-mcp"
LOG_FILE="${DEST_ROOT}/reorg.log"

usage() {
  echo "usage: scripts/organise-kant.sh --dry-run | --execute"
}

timestamp() {
  date +"%Y-%m-%dT%H:%M:%S%z"
}

log_line() {
  local status="$1"
  local src="$2"
  local dst="$3"
  printf "%s\t%s\t%s\t%s\n" "$(timestamp)" "$status" "$src" "$dst" >> "$LOG_FILE"
}

# Detect hidden paths (dotfiles or files inside hidden directories).
is_hidden_relpath() {
  local rel="$1"
  local IFS="/"
  local part
  for part in $rel; do
    if [[ "$part" == .* ]]; then
      return 0
    fi
  done
  return 1
}

# Classify file into one destination bucket.
classify_bucket() {
  local file="$1"
  local name
  local lower
  name="$(basename "$file")"
  lower="$(printf "%s" "$name" | tr '[:upper:]' '[:lower:]')"

  case "$lower" in
    *.d.ts|*.js.map) echo "lib"; return 0 ;;
    *.ts|*.tsx|*.js) echo "src"; return 0 ;;
    *.png|*.jpg|*.jpeg|*.svg) echo "assets/img"; return 0 ;;
    *.ttf|*.otf|*.woff|*.woff2) echo "assets/fonts"; return 0 ;;
    *.json|*.yaml|*.yml) echo "config"; return 0 ;;
    *.md) echo "docs"; return 0 ;;
  esac

  case "$name" in
    LICENSE|LICENSE.*|licence|licence.*|LICENCE|LICENCE.*|CHANGELOG|CHANGELOG.*|changelog|changelog.*)
      echo "docs"
      return 0
      ;;
  esac

  return 1
}

if [[ "${1:-}" != "--dry-run" && "${1:-}" != "--execute" ]]; then
  usage
  exit 1
fi

MODE="$1"

if [[ ! -d "$SOURCE_ROOT" ]]; then
  echo "ERROR: source root not found: $SOURCE_ROOT"
  exit 1
fi

if [[ ! -d "$DEST_ROOT" ]]; then
  echo "ERROR: destination root not found: $DEST_ROOT"
  exit 1
fi

if [[ ! -w "$DEST_ROOT" ]]; then
  echo "ERROR: destination root is not writable: $DEST_ROOT"
  exit 1
fi

PLAN_FILE="$(mktemp)"
CONFLICT_FILE="$(mktemp)"
SCAN_ERR_FILE="$(mktemp)"
trap 'rm -f "$PLAN_FILE" "$CONFLICT_FILE" "$SCAN_ERR_FILE"' EXIT

src_count=0
lib_count=0
img_count=0
font_count=0
config_count=0
docs_count=0
skip_hidden_count=0
skip_unmatched_count=0
skip_same_count=0
conflict_count=0
scan_error_count=0

# Step 1: scan + classify + pre-check destination conflicts.
while IFS= read -r -d '' file; do
  # Prevent destination subtree from being re-ingested.
  if [[ "$file" == "$DEST_ROOT/"* ]]; then
    continue
  fi

  rel="${file#$SOURCE_ROOT/}"
  if [[ "$rel" == "$file" ]]; then
    continue
  fi

  if ! bucket="$(classify_bucket "$file")"; then
    skip_unmatched_count=$((skip_unmatched_count + 1))
    continue
  fi

  if is_hidden_relpath "$rel" && [[ "$bucket" != "config" ]]; then
    skip_hidden_count=$((skip_hidden_count + 1))
    continue
  fi

  dest="${DEST_ROOT}/${bucket}/${rel}"

  if [[ -e "$dest" ]]; then
    src_hash="$(shasum -a 256 "$file" | awk '{print $1}')"
    dst_hash="$(shasum -a 256 "$dest" | awk '{print $1}')"
    if [[ "$src_hash" != "$dst_hash" ]]; then
      conflict_count=$((conflict_count + 1))
      printf "%s\t%s\n" "$file" "$dest" >> "$CONFLICT_FILE"
      continue
    fi
    skip_same_count=$((skip_same_count + 1))
    printf "SKIP_SAME\t%s\t%s\n" "$file" "$dest" >> "$PLAN_FILE"
    continue
  fi

  case "$bucket" in
    src) src_count=$((src_count + 1)) ;;
    lib) lib_count=$((lib_count + 1)) ;;
    assets/img) img_count=$((img_count + 1)) ;;
    assets/fonts) font_count=$((font_count + 1)) ;;
    config) config_count=$((config_count + 1)) ;;
    docs) docs_count=$((docs_count + 1)) ;;
  esac

  printf "MOVE\t%s\t%s\n" "$file" "$dest" >> "$PLAN_FILE"
done < <(find "$SOURCE_ROOT" -type f -print0 2> "$SCAN_ERR_FILE" || true)

if [[ -s "$SCAN_ERR_FILE" ]]; then
  scan_error_count="$(wc -l < "$SCAN_ERR_FILE" | tr -d '[:space:]')"
fi

total_moves=$((src_count + lib_count + img_count + font_count + config_count + docs_count))

echo "=== Reorganization Plan (${MODE}) ==="
echo "Source: $SOURCE_ROOT"
echo "Destination: $DEST_ROOT"
echo ""
echo "Planned moves:"
echo "  src/:          $src_count"
echo "  lib/:          $lib_count"
echo "  assets/img/:   $img_count"
echo "  assets/fonts/: $font_count"
echo "  config/:       $config_count"
echo "  docs/:         $docs_count"
echo "  TOTAL:         $total_moves"
echo ""
echo "Skipped:"
echo "  hidden (non-config): $skip_hidden_count"
echo "  unmatched extension: $skip_unmatched_count"
echo "  same checksum exists: $skip_same_count"
echo "  scan errors (permissions): $scan_error_count"
echo ""

if [[ "$scan_error_count" -gt 0 ]]; then
  echo "Scan warnings:"
  while IFS= read -r err_line; do
    echo "  $err_line"
    if [[ "$MODE" == "--execute" ]]; then
      log_line "SKIP_SCAN_ERROR" "$err_line" "-"
    fi
  done < "$SCAN_ERR_FILE"
  echo ""
fi

if [[ "$conflict_count" -gt 0 ]]; then
  echo "ABORT: found $conflict_count destination conflicts (different checksum):"
  while IFS=$'\t' read -r src dst; do
    echo "  CONFLICT: $src -> $dst"
    if [[ "$MODE" == "--execute" ]]; then
      log_line "ABORT_CONFLICT" "$src" "$dst"
    fi
  done < "$CONFLICT_FILE"
  exit 1
fi

echo "Status: READY (no checksum conflicts)"
echo ""

echo "Detailed actions:"
while IFS=$'\t' read -r action src dst; do
  echo "  $action: $src -> $dst"
done < "$PLAN_FILE"

if [[ "$MODE" == "--dry-run" ]]; then
  echo ""
  echo "Dry run complete. No files were moved."
  exit 0
fi

# Step 2: execute move plan after all validations have passed.
while IFS=$'\t' read -r action src dst; do
  if [[ "$action" == "SKIP_SAME" ]]; then
    log_line "SKIP_SAME" "$src" "$dst"
    continue
  fi
  mkdir -p "$(dirname "$dst")"
  mv "$src" "$dst"
  log_line "MOVE" "$src" "$dst"
done < "$PLAN_FILE"

echo ""
echo "Execution complete. Moved $total_moves files."
echo "Log written to: $LOG_FILE"
