#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

removed="$(git diff -U0 HEAD -- '*/INSIGHTS.md' 'INSIGHTS.md' \
  | grep -E '^(\+\+\+|---|-)' \
  | awk '/^\+\+\+ /{file=substr($0,7); next} /^--- /{next} /^-/{print file ": " substr($0,2)}' || true)"

if [[ -n "$removed" ]]; then
  echo "FAIL: INSIGHTS.md lines removed or changed (restore them verbatim):" >&2
  echo "$removed" >&2
  exit 1
fi

echo "OK"
