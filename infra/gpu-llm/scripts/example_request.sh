#!/usr/bin/env bash
# Использование: API_URL=https://203.0.113.10 API_KEY=... ./example_request.sh [-k]
# -k нужен только для самоподписанного сертификата (в проде используйте нормальный cert).
set -euo pipefail
: "${API_URL:?задайте API_URL}" "${API_KEY:?задайте API_KEY}"
curl -sS ${1:-} "$API_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-7b-instruct","messages":[{"role":"user","content":"Привет! Назови три столицы."}],"max_tokens":64}'
echo
