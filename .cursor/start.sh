#!/usr/bin/env bash
set -euo pipefail

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 not found on PATH; run install first" >&2
  exit 1
fi

if ! tmux has-session -t synapse_docs 2>/dev/null; then
  tmux new-session -d -s synapse_docs \
    "npx --yes docsify-cli@latest serve docs --port 3999 --host 0.0.0.0 2>&1 | tee /tmp/synapse-docs.log"
fi

echo "Synapse dev environment ready (k6 $(k6 version | head -1), docs http://127.0.0.1:3999)"