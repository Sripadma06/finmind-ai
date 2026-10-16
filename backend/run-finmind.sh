#!/usr/bin/env bash
# FinMind backend launcher: finds Gemini models with capacity, then starts Spring Boot.
# Usage (Git Bash):  bash run-finmind.sh      (place this file in the project root or backend/)

set -u

# --- locate backend folder ---------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/backend/pom.xml" ]; then
  BACKEND_DIR="$SCRIPT_DIR/backend"
elif [ -f "$SCRIPT_DIR/pom.xml" ]; then
  BACKEND_DIR="$SCRIPT_DIR"
else
  echo "ERROR: could not find backend/pom.xml next to this script."
  exit 1
fi

# --- prerequisites -----------------------------------------------------------
if ! command -v java >/dev/null 2>&1; then
  echo "ERROR: Java not found. Install JDK 21:  winget install EclipseAdoptium.Temurin.21.JDK"
  echo "Then close and reopen Git Bash."
  exit 1
fi
if ! command -v mvn >/dev/null 2>&1; then
  echo "ERROR: Maven not found. Install it:  winget install Apache.Maven"
  echo "Then close and reopen Git Bash. (Or run the backend from IntelliJ instead.)"
  exit 1
fi

# --- API key (never stored in a file) ---------------------------------------
if [ -z "${GEMINI_API_KEY:-}" ]; then
  read -r -s -p "Paste your NEW Gemini API key (input hidden): " GEMINI_API_KEY
  echo
fi
if [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: no API key entered."
  exit 1
fi
export GEMINI_API_KEY

# --- probe models ------------------------------------------------------------
CANDIDATES="gemini-3.8-flash gemini-3.7-flash gemini-3.6-flash gemini-3.5-flash gemini-3.5-flash-lite gemini-3.1-flash-lite gemini-flash-latest gemini-flash-lite-latest"
WORKING=()

echo
echo "Checking which Gemini models have capacity right now..."
for m in $CANDIDATES; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 \
    -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"ping"}]}]}' \
    "https://generativelanguage.googleapis.com/v1beta/models/$m:generateContent")
  case "$code" in
    200) echo "  OK    $m";                      WORKING+=("$m") ;;
    503) echo "  BUSY  $m  (503, overloaded)" ;;
    429) echo "  LIMIT $m  (429, rate limited)" ;;
    404) echo "  GONE  $m  (404, not available to this key)" ;;
    400|401|403) echo "  AUTH  $m  ($code)"
                 echo "ERROR: the API key was rejected. Check that you pasted the right key."
                 exit 1 ;;
    *)   echo "  ???   $m  ($code)" ;;
  esac
done

# --- choose models -----------------------------------------------------------
if [ "${#WORKING[@]}" -eq 0 ]; then
  echo
  echo "No model answered with 200 right now (Google is likely overloaded)."
  read -r -p "Start the backend anyway with default models? It will retry automatically. [y/N] " ans
  case "$ans" in
    y|Y) ;;
    *)   echo "Stopped. Try again in a few minutes."; exit 1 ;;
  esac
else
  export GEMINI_MODEL="${WORKING[0]}"
  if [ "${#WORKING[@]}" -gt 1 ]; then
    FALLBACKS=$(IFS=,; echo "${WORKING[*]:1}")
    export GEMINI_FALLBACK_MODELS="$FALLBACKS"
  fi
  echo
  echo "Primary model:   $GEMINI_MODEL"
  echo "Fallback models: ${GEMINI_FALLBACK_MODELS:-none}"
fi

# --- start backend -----------------------------------------------------------
echo
echo "Reminder: PostgreSQL must be running (e.g. 'docker compose up -d' in the project root)."
echo "Starting backend from: $BACKEND_DIR"
echo "Look for the log line:  GeminiService model chain: [...]"
echo
cd "$BACKEND_DIR" && mvn spring-boot:run