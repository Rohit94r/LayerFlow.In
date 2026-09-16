#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
LOG="$(pwd)/.tmp-batch-14.log"; : > "$LOG"

commit() {
  local msg="$1"; shift
  local want got
  want=$(printf '%s\n' "$@")
  git add -- "$@"
  got=$(git diff --cached --name-only)
  if [ "$got" != "$want" ]; then
    echo "MISMATCH [$msg]" | tee -a "$LOG"
    echo "want:$want" | tee -a "$LOG"; echo "got:$got" | tee -a "$LOG"
    exit 1
  fi
  git commit -q -m "$msg"
  echo "ok: $msg @ $(git rev-parse --short HEAD)" | tee -a "$LOG"
}

commit "teardown: remove 14-commit runner + its temp log" .tmp-batch-14.sh .tmp-batch-14.log
true