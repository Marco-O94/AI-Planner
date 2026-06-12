#!/usr/bin/env bash
#
# AI Planner — one-command deploy helper.
#
# Wraps docker compose so you don't have to remember flags. Ensures a .env
# exists, builds + starts the stack, waits for health, and prints the URLs.
#
#   ./deploy.sh                 # local: bring the whole stack up on localhost
#   ./deploy.sh up              # same as above
#   ./deploy.sh vps <host>      # public deploy: point the browser bundle + CORS
#                               #   at <host> (IP or domain) and harden secrets
#   ./deploy.sh down            # stop everything (named volumes persist)
#   ./deploy.sh restart [svc]   # restart one service (or all)
#   ./deploy.sh logs [svc]      # follow logs (all, or one service)
#   ./deploy.sh status          # docker compose ps
#   ./deploy.sh update          # git pull + rebuild + restart
#   ./deploy.sh help
#
set -euo pipefail

# ── Setup ────────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env"
ENV_EXAMPLE="$ROOT/.env.example"

# Colours (disabled when not a TTY).
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; DIM=""; RESET=""
fi

info()  { printf '%s\n' "${BOLD}▶ ${1}${RESET}"; }
ok()    { printf '%s\n' "${GREEN}✓ ${1}${RESET}"; }
warn()  { printf '%s\n' "${YELLOW}! ${1}${RESET}"; }
die()   { printf '%s\n' "${RED}✗ ${1}${RESET}" >&2; exit 1; }

# ── docker compose detection (v2 plugin vs legacy v1) ────────────────────────
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    die "Docker Compose not found. Install Docker (https://docs.docker.com/get-docker/) and retry."
  fi
  command -v docker >/dev/null 2>&1 || die "docker not found on PATH."
  docker info >/dev/null 2>&1 || die "Docker daemon not reachable. Is Docker running? (try: sudo systemctl start docker)"
}

# ── .env helpers ─────────────────────────────────────────────────────────────
ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    [ -f "$ENV_EXAMPLE" ] || die ".env.example missing — cannot bootstrap .env."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ok "Created .env from .env.example (localhost defaults)."
  fi
}

# Read a KEY from .env (falls back to .env.example, then the given default).
env_get() {
  local key="$1" def="${2:-}"
  local val
  val="$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2-)" || true
  if [ -z "$val" ]; then
    val="$(grep -E "^${key}=" "$ENV_EXAMPLE" 2>/dev/null | tail -n1 | cut -d= -f2-)" || true
  fi
  printf '%s' "${val:-$def}"
}

# Upsert KEY=VALUE in .env — replaced in place (position preserved), or
# appended when absent. awk keeps it portable across GNU/BSD (no sed -i quirks).
env_set() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="}
      $1==k{print k"="v; done=1; next}
      {print}
      END{if(!done) print k"="v}' "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# ── Health wait + URL banner ─────────────────────────────────────────────────
print_urls() {
  local host="${1:-localhost}"
  local scheme="${2:-http}"
  local fport bport mport qport
  fport="$(env_get FRONTEND_PORT 3000)"
  bport="$(env_get BACKEND_PORT 8000)"
  mport="$(env_get MCP_PORT 8050)"
  qport="$(env_get QDRANT_HTTP_PORT 6333)"
  printf '\n'
  ok "Stack is up."
  printf '  %sFrontend%s        %s://%s:%s\n'        "$BOLD" "$RESET" "$scheme" "$host" "$fport"
  printf '  %sBackend API%s     %s://%s:%s  %s(/docs)%s\n' "$BOLD" "$RESET" "$scheme" "$host" "$bport" "$DIM" "$RESET"
  printf '  %sMCP (SSE)%s       %s://%s:%s/sse\n'     "$BOLD" "$RESET" "$scheme" "$host" "$mport"
  printf '  %sQdrant%s          %s://%s:%s/dashboard\n' "$BOLD" "$RESET" "$scheme" "$host" "$qport"
  printf '\n%sLogs:%s ./deploy.sh logs   %sStop:%s ./deploy.sh down\n' "$DIM" "$RESET" "$DIM" "$RESET"
}

wait_for_health() {
  local bport timeout=180 elapsed=0
  bport="$(env_get BACKEND_PORT 8000)"
  info "Waiting for the backend to become healthy (up to ${timeout}s)…"
  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -fsS "http://localhost:${bport}/health" >/dev/null 2>&1; then
      ok "Backend healthy."
      return 0
    fi
    sleep 3; elapsed=$((elapsed + 3))
    printf '%s' "."
  done
  printf '\n'
  warn "Backend did not report healthy in ${timeout}s. Check: ./deploy.sh logs backend"
  return 0
}

# ── Commands ─────────────────────────────────────────────────────────────────
cmd_up() {
  ensure_env
  info "Building images and starting the stack…"
  "${COMPOSE[@]}" up --build -d
  wait_for_health
  print_urls "localhost" "http"
}

cmd_vps() {
  local host="${1:-}" scheme="http"
  shift || true
  for arg in "$@"; do
    case "$arg" in
      --tls|--https) scheme="https" ;;
    esac
  done
  [ -n "$host" ] || die "Usage: ./deploy.sh vps <ip-or-domain> [--tls]"

  ensure_env
  info "Configuring .env for a public deploy on ${BOLD}${host}${RESET}…"

  # Browser-reachable backend URL is baked into the Next.js bundle at build time,
  # so it must be the PUBLIC host, not the in-network backend:8000.
  local bport fport
  bport="$(env_get BACKEND_PORT 8000)"
  fport="$(env_get FRONTEND_PORT 3000)"

  if [ "$scheme" = "https" ]; then
    # Behind a TLS reverse proxy: address the API/UI by hostname (no :port).
    env_set NEXT_PUBLIC_API_URL "https://${host}"
    env_set CORS_ORIGINS "https://${host}"
    # Session cookie can carry the Secure flag only over HTTPS.
    env_set SESSION_COOKIE_SECURE "true"
  else
    env_set NEXT_PUBLIC_API_URL "http://${host}:${bport}"
    env_set CORS_ORIGINS "http://${host}:${fport}"
  fi

  # Harden the DB password if it's still the shipped default.
  if [ "$(env_get POSTGRES_PASSWORD)" = "projectnotes" ]; then
    local secret; secret="$(random_secret)"
    env_set POSTGRES_PASSWORD "$secret"
    env_set DATABASE_URL "postgresql+psycopg://$(env_get POSTGRES_USER projectnotes):${secret}@postgres:5432/$(env_get POSTGRES_DB projectnotes)"
    ok "Generated a random POSTGRES_PASSWORD (stored in .env)."
  fi

  # Rotate auth secrets if still the shipped insecure defaults.
  if [ "$(env_get SECRET_KEY)" = "dev-insecure-change-me" ]; then
    env_set SECRET_KEY "$(random_secret)"
    ok "Generated a random SECRET_KEY (stored in .env)."
  fi
  if [ "$(env_get SERVICE_API_KEY)" = "dev-service-key-change-me" ]; then
    env_set SERVICE_API_KEY "$(random_secret)"
    ok "Generated a random SERVICE_API_KEY shared by backend + mcp (stored in .env)."
  fi

  # Production mode: the backend refuses default secrets and hides /docs.
  env_set ENVIRONMENT production

  if [ "$scheme" != "https" ]; then
    warn "No --tls: session cookies are sent WITHOUT the Secure flag over plain HTTP."
    warn "Prefer ./deploy.sh vps ${host} --tls behind a TLS reverse proxy."
  fi
  warn "The MCP SSE port (${MCP_PORT:-8050}) has no auth of its own — keep it firewalled (access via SSH tunnel)."

  ok "Updated .env: NEXT_PUBLIC_API_URL=$(env_get NEXT_PUBLIC_API_URL), CORS_ORIGINS=$(env_get CORS_ORIGINS)"
  info "Building images and starting the stack…"
  "${COMPOSE[@]}" up --build -d
  wait_for_health

  if [ "$scheme" = "https" ]; then
    printf '\n'
    ok "Stack is up behind your reverse proxy."
    printf '  %sApp%s   https://%s   %s(proxy → frontend :%s, backend :%s)%s\n' \
      "$BOLD" "$RESET" "$host" "$DIM" "$fport" "$bport" "$RESET"
    printf '\n%sNext:%s point a TLS reverse proxy (Caddy/Nginx/Traefik) at the container ports above.\n' "$YELLOW" "$RESET"
  else
    print_urls "$host" "$scheme"
    printf '\n%sNote:%s open these host ports on the VPS firewall (Postgres/Qdrant should stay private):\n' "$YELLOW" "$RESET"
    printf '  frontend %s · backend %s · mcp %s\n' "$fport" "$bport" "$(env_get MCP_PORT 8050)"
  fi
}

cmd_down()    { "${COMPOSE[@]}" down; ok "Stopped (volumes persist; use 'docker compose down -v' to wipe data)."; }
cmd_restart() { local svc="${1:-}"; "${COMPOSE[@]}" restart ${svc:+"$svc"}; ok "Restarted ${svc:-all services}."; }
cmd_logs()    { local svc="${1:-}"; "${COMPOSE[@]}" logs -f --tail=100 ${svc:+"$svc"}; }
cmd_status()  { "${COMPOSE[@]}" ps; }

cmd_update() {
  info "Pulling latest changes…"
  git -C "$ROOT" pull --ff-only
  info "Rebuilding and restarting…"
  "${COMPOSE[@]}" up --build -d
  wait_for_health
  ok "Updated."
}

usage() {
  cat <<'EOF'
AI Planner — one-command deploy helper.

  ./deploy.sh                 local: bring the whole stack up on localhost
  ./deploy.sh up              same as above
  ./deploy.sh vps <host>      public deploy: point the browser bundle + CORS
                                at <host> (IP or domain); add --tls if behind
                                an HTTPS reverse proxy. Hardens the DB password.
  ./deploy.sh down            stop everything (named volumes persist)
  ./deploy.sh restart [svc]   restart one service (or all)
  ./deploy.sh logs [svc]      follow logs (all, or one service)
  ./deploy.sh status          docker compose ps
  ./deploy.sh update          git pull + rebuild + restart
  ./deploy.sh help            this message
EOF
}

# ── Dispatch ─────────────────────────────────────────────────────────────────
main() {
  local cmd="${1:-up}"
  case "$cmd" in
    -h|--help|help) usage; exit 0 ;;
  esac
  detect_compose
  shift || true
  case "$cmd" in
    up|local|start) cmd_up "$@" ;;
    vps|deploy)     cmd_vps "$@" ;;
    down|stop)      cmd_down "$@" ;;
    restart)        cmd_restart "$@" ;;
    logs)           cmd_logs "$@" ;;
    status|ps)      cmd_status "$@" ;;
    update|upgrade) cmd_update "$@" ;;
    *) die "Unknown command: $cmd  (run: ./deploy.sh help)" ;;
  esac
}

main "$@"
