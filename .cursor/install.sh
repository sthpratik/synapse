#!/usr/bin/env bash
set -euo pipefail

K6_VERSION="${K6_VERSION:-v2.4.0}"

if ! command -v k6 >/dev/null 2>&1; then
  tmp_deb="$(mktemp --suffix=.deb)"
  curl -fsSL -o "$tmp_deb" \
    "https://github.com/grafana/k6/releases/download/${K6_VERSION}/k6-${K6_VERSION}-linux-amd64.deb"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$tmp_deb"
  rm -f "$tmp_deb"
fi

if ! dpkg -s libnss3 >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl \
    libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2t64 libpango-1.0-0 libcairo2 fonts-liberation
fi

npm ci

# MCP server lockfile pins a private registry; use `npm run mcp:build` after regenerating mcp-server/package-lock.json if needed.