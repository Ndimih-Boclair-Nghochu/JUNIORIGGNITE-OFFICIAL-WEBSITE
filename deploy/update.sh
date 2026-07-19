#!/usr/bin/env bash
#
# JuniorIgnite — one-command deploy.
#
#   bash /opt/juniorignite/src/deploy/update.sh
#
# Pulls the latest code, builds the site and API, deploys both, restarts the
# service and verifies it. If the new build fails its health check the previous
# version is automatically restored, so a bad deploy cannot leave the site down.
#
# Safe to run repeatedly. It never touches:
#   * the installer in  /var/www/juniorignite/downloads
#   * the database in   /var/lib/juniorignite
#   * your secrets in   /opt/juniorignite/server/.env
#
set -euo pipefail

REPO_URL="https://github.com/Ndimih-Boclair-Nghochu/JUNIORIGGNITE-OFFICIAL-WEBSITE.git"
BRANCH="${BRANCH:-main}"
SRC_DIR="/opt/juniorignite/src"
API_DIR="/opt/juniorignite/server"
WEB_ROOT="/var/www/juniorignite"
BACKUP_DIR="/opt/juniorignite/backups"
SERVICE="juniorignite-api"
HEALTH_URL="http://127.0.0.1/api/health"

BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${RESET}"; }
ok()   { echo "  ${GREEN}✓${RESET} $*"; }
warn() { echo "  ${YELLOW}!${RESET} $*"; }
die()  { echo; echo "${RED}✗ $*${RESET}" >&2; exit 1; }

# ---------------------------------------------------------------- preflight --
step "Checking the machine"
command -v git  >/dev/null || die "git is not installed:  sudo apt install -y git"
command -v node >/dev/null || die "node is not installed: see DEPLOYMENT.md §2"
command -v npm  >/dev/null || die "npm is not installed:  see DEPLOYMENT.md §2"
command -v nginx >/dev/null || die "nginx is not installed: sudo apt install -y nginx"
sudo -n true 2>/dev/null || warn "sudo may prompt for your password"
ok "node $(node -v), npm $(npm -v)"

# 1 GB of RAM is not enough to run a Vite build without swap; it gets OOM-killed
# half way through and leaves a broken dist/.
if [ "$(free -m | awk '/^Swap:/{print $2}')" -lt 512 ]; then
  warn "No swap found — adding 2 GB so the build cannot be OOM-killed"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  ok "swap enabled"
else
  ok "swap present ($(free -m | awk '/^Swap:/{print $2}') MB)"
fi

sudo mkdir -p "$WEB_ROOT" "$API_DIR" "$BACKUP_DIR" /opt/juniorignite
sudo chown -R "$USER":"$USER" /opt/juniorignite "$WEB_ROOT"

# ------------------------------------------------------------------- source --
step "Fetching the latest code"
if [ -d "$SRC_DIR/.git" ]; then
  git -C "$SRC_DIR" fetch --quiet origin "$BRANCH"
  BEFORE=$(git -C "$SRC_DIR" rev-parse HEAD)
  git -C "$SRC_DIR" reset --hard --quiet "origin/$BRANCH"
  AFTER=$(git -C "$SRC_DIR" rev-parse HEAD)
  if [ "$BEFORE" = "$AFTER" ]; then ok "already up to date ($(git -C "$SRC_DIR" log -1 --format=%s | cut -c1-60))"
  else ok "updated $(git -C "$SRC_DIR" log -1 --format='%h %s' | cut -c1-70)"; fi
else
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
  ok "cloned into $SRC_DIR"
fi

# If this script itself changed in that pull, re-run the NEW version once so the
# deploy always uses the newest logic rather than the copy already in memory.
if [ "${JI_REEXEC:-}" != "1" ] && ! diff -q "$0" "$SRC_DIR/deploy/update.sh" >/dev/null 2>&1; then
  warn "deploy script changed — re-running the updated version"
  JI_REEXEC=1 exec bash "$SRC_DIR/deploy/update.sh" "$@"
fi

cd "$SRC_DIR"
# Production builds must call /api on their own origin. (src/lib/config.ts already
# defaults to this, but being explicit means a future default change can't bite.)
echo 'VITE_API_BASE_URL=' > .env

# -------------------------------------------------------------------- build --
step "Building the website"
npm ci --no-audit --no-fund --silent 2>/dev/null || npm install --no-audit --no-fund --silent
npm run build --silent
[ -f dist/index.html ] || die "the site build produced no dist/index.html"
ok "site built ($(du -sh dist | cut -f1))"

step "Building the API"
cd "$SRC_DIR/server"
npm ci --no-audit --no-fund --silent 2>/dev/null || npm install --no-audit --no-fund --silent
npm run build --silent
[ -f dist/index.js ] || die "the API build produced no dist/index.js"
ok "API built"

# ------------------------------------------------------------------- backup --
step "Backing up the current version"
STAMP=$(date +%Y%m%d-%H%M%S)
ROLLBACK="$BACKUP_DIR/$STAMP"
mkdir -p "$ROLLBACK"
if [ -f "$WEB_ROOT/index.html" ]; then
  # Exclude the 96 MB installer — it is untouched by a deploy.
  tar czf "$ROLLBACK/site.tgz" -C "$WEB_ROOT" --exclude=downloads . && ok "site backed up"
fi
if [ -d "$API_DIR/dist" ]; then
  tar czf "$ROLLBACK/api.tgz" -C "$API_DIR" dist && ok "API backed up"
fi
# Keep the five most recent backups.
ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf

# ------------------------------------------------------------------- deploy --
step "Deploying"
# Replace the site but preserve downloads/ (the installer lives there).
find "$WEB_ROOT" -maxdepth 1 -mindepth 1 ! -name downloads -exec rm -rf {} +
cp -r "$SRC_DIR/dist/." "$WEB_ROOT/"
ok "site deployed"

rm -rf "$API_DIR/dist"
mkdir -p "$API_DIR/dist"
cp -r "$SRC_DIR/server/dist/." "$API_DIR/dist/"
cp "$SRC_DIR/server/package.json" "$SRC_DIR/server/package-lock.json" "$API_DIR/" 2>/dev/null || true
(cd "$API_DIR" && npm ci --omit=dev --no-audit --no-fund --silent 2>/dev/null || npm install --omit=dev --no-audit --no-fund --silent)
ok "API deployed"

# ------------------------------------------------------------------ configs --
step "Checking service and nginx config"
if [ ! -f "$API_DIR/.env" ]; then
  warn "No .env found — creating one with freshly generated secrets"
  cat > "$API_DIR/.env" <<EOF
NODE_ENV=production
PORT=4000
FOUNDER_EMAIL=juniorignitecmr@gmail.com
FOUNDER_PASSWORD=$(openssl rand -base64 18)
TOKEN_SECRET=$(openssl rand -hex 48)
DATA_DIR=/var/lib/juniorignite
CORS_ORIGIN=*
INSTALLER_URL=/downloads/JuniorIgnite-Setup-1.1.2.exe
APP_VERSION=1.1.2
EOF
  echo
  echo "  ${BOLD}${YELLOW}SAVE THESE — the password is hashed on first boot and cannot be recovered:${RESET}"
  grep -E 'FOUNDER_EMAIL|FOUNDER_PASSWORD' "$API_DIR/.env" | sed 's/^/    /'
  echo
fi

sudo cp "$SRC_DIR/deploy/juniorignite-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --quiet "$SERVICE" 2>/dev/null || true

if ! sudo test -f /etc/nginx/conf.d/juniorignite.conf; then
  sudo cp "$SRC_DIR/deploy/nginx.conf" /etc/nginx/conf.d/juniorignite.conf
  sudo sed -i 's/server_name .*/server_name _;/' /etc/nginx/conf.d/juniorignite.conf
  sudo rm -f /etc/nginx/sites-enabled/default
  ok "nginx configured"
fi
sudo nginx -t >/dev/null 2>&1 || die "nginx config is invalid — run: sudo nginx -t"
sudo systemctl reload nginx
ok "nginx reloaded"

# ------------------------------------------------------------------ restart --
step "Restarting the API"
sudo systemctl restart "$SERVICE"

# ------------------------------------------------------------------- verify --
step "Verifying"
HEALTHY=0
for i in $(seq 1 15); do
  if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 1
done

if [ "$HEALTHY" != "1" ]; then
  echo
  echo "${RED}Health check failed — rolling back${RESET}"
  journalctl -u "$SERVICE" -n 20 --no-pager | sed 's/^/    /' || true
  if [ -f "$ROLLBACK/site.tgz" ]; then
    find "$WEB_ROOT" -maxdepth 1 -mindepth 1 ! -name downloads -exec rm -rf {} +
    tar xzf "$ROLLBACK/site.tgz" -C "$WEB_ROOT"
  fi
  if [ -f "$ROLLBACK/api.tgz" ]; then
    rm -rf "$API_DIR/dist"
    tar xzf "$ROLLBACK/api.tgz" -C "$API_DIR"
  fi
  sudo systemctl restart "$SERVICE" || true
  die "Deploy rolled back to the previous version. The site should still be up."
fi
ok "API healthy"

curl -fsS --max-time 5 -o /dev/null -w '' http://127.0.0.1/ && ok "site responding"
curl -fsS --max-time 5 -o /dev/null http://127.0.0.1/founder && ok "SPA routing works"

INSTALLER=$(ls -1 "$WEB_ROOT/downloads/"*.exe 2>/dev/null | head -1 || true)
if [ -n "$INSTALLER" ]; then
  ok "installer present ($(du -h "$INSTALLER" | cut -f1)) — $(basename "$INSTALLER")"
else
  warn "No installer in $WEB_ROOT/downloads — the Download button will 404."
  warn "Upload it from your PC:  scp -i key.pem \"JuniorIgnite Setup X.Y.Z.exe\" ubuntu@THIS_SERVER:/var/www/juniorignite/downloads/"
fi

IP=$(curl -fsS --max-time 3 -H "X-aws-ec2-metadata-token: $(curl -fsS -X PUT --max-time 3 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null)" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")

echo
echo "${GREEN}${BOLD}Deploy complete.${RESET}"
[ -n "$IP" ] && echo "  Site:    http://$IP"
[ -n "$IP" ] && echo "  Console: http://$IP/founder"
echo "  ${DIM}Rollback available at $ROLLBACK${RESET}"
echo "  ${DIM}Logs: journalctl -u $SERVICE -f${RESET}"
echo
