# JuniorIgnite Website — Deployment Guide (AWS EC2 free tier)

Everything runs on **one EC2 instance**: nginx serves the built site and the
installer, and proxies `/api` to the Node backend running under systemd.

Current release: **v1.1.2**

> **Why one box works here.** JuniorIgnite is offline-first — schools' data lives
> on their own machines. The website only serves a brochure, a download, and a
> small founder console, so a single t3.micro is comfortably enough. It also
> keeps the JSON-file database working as-is (no rewrite for a cloud database).

---

## 0. What the free tier actually gives you

| Resource | Free allowance | After that |
|---|---|---|
| t3.micro / t2.micro | 750 hrs/month — enough for one instance 24/7 — **for 12 months** | ~$7–9/month |
| EBS storage | 30 GB | ~$0.08/GB/month |
| Data transfer out | **100 GB/month** | $0.09/GB |

**The installer is the thing to watch.** At 96 MB per download, 100 GB/month is
about **1,000 downloads/month** free. Past that you pay roughly **$9 per extra
1,000 downloads**. If downloads ever take off, put CloudFront in front of
`/downloads/` — its 1 TB/month free tier raises the ceiling to ~11,000/month.

---

## 1. Launch the instance

- **AMI:** Ubuntu Server 24.04 LTS
- **Type:** t3.micro (or t2.micro — whichever is free-tier in your region)
- **Storage:** 30 GB gp3
- **Security group inbound:** `22` (SSH, your IP only), `80` (HTTP), `443` (HTTPS)
- Allocate an **Elastic IP** and associate it, so the address survives reboots.

Point your domain's `A` record at that Elastic IP.

## 2. Prepare the server

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# 1 GB of RAM is tight during npm install — add swap so it can't OOM.
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo mkdir -p /var/www/juniorignite /opt/juniorignite
sudo chown -R ubuntu:ubuntu /var/www/juniorignite /opt/juniorignite
```

## 3. Build locally and upload

```bash
# On your machine, from the website repo:
npm install && npm run build            # -> dist/ (site + installer)
cd server && npm install && npm run build && cd ..

# Site + installer
rsync -avz --delete dist/ ubuntu@YOUR_ELASTIC_IP:/var/www/juniorignite/

# API (build output + manifests; deps are installed on the server)
rsync -avz --delete server/dist/ ubuntu@YOUR_ELASTIC_IP:/opt/juniorignite/server/dist/
rsync -avz server/package.json server/package-lock.json ubuntu@YOUR_ELASTIC_IP:/opt/juniorignite/server/
```

> The 96 MB installer only re-uploads when it changes — `rsync` skips identical
> files, so routine redeploys are fast.

## 4. Configure and start the API

```bash
ssh ubuntu@YOUR_ELASTIC_IP
cd /opt/juniorignite/server
npm ci --omit=dev

cp /path/to/.env.example .env   # or paste it in
nano .env
```

Fill in `.env` — **the server refuses to start in production until you do**:

```bash
NODE_ENV=production
TOKEN_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
FOUNDER_PASSWORD=<a strong password>
FOUNDER_EMAIL=you@yourdomain
DATA_DIR=/var/lib/juniorignite
CORS_ORIGIN=https://your-domain
TELEMETRY_KEY=<random string, if you use telemetry>
```

Then install the service:

```bash
sudo cp /opt/juniorignite/deploy/juniorignite-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now juniorignite-api
sudo systemctl status juniorignite-api          # should be "active (running)"
journalctl -u juniorignite-api -f               # live logs
```

## 5. nginx

```bash
sudo cp /opt/juniorignite/deploy/nginx.conf /etc/nginx/conf.d/juniorignite.conf
sudo nano /etc/nginx/conf.d/juniorignite.conf   # set server_name to your domain
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS (free, required)

Founder login sends a bearer token — it must not travel over plain HTTP.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain -d www.your-domain
```

Certbot installs a renewal timer automatically. Verify with
`sudo certbot renew --dry-run`.

## 7. Verify

```bash
curl https://your-domain/api/health                      # {"ok":true}
curl -I https://your-domain/downloads/JuniorIgnite-Setup-1.1.2.exe   # 200
curl -I https://your-domain/founder                      # 200 (SPA fallback)
```

Then open the site, click **Download**, and log in at `/founder`.

---

## Redeploying a new version

```bash
# locally
npm run build && (cd server && npm run build)
rsync -avz --delete dist/ ubuntu@IP:/var/www/juniorignite/
rsync -avz --delete server/dist/ ubuntu@IP:/opt/juniorignite/server/dist/
# on the server
sudo systemctl restart juniorignite-api
```

`DATA_DIR` is `/var/lib/juniorignite`, **outside** the deploy folder, so the
founder account, contact messages and download counts survive redeploys.

## Backups

The whole database is one small file:

```bash
# copy it down periodically
scp ubuntu@IP:/var/lib/juniorignite/db.json ./backup-$(date +%F).json
```

## Shipping a new desktop release
1. `cd ../JUNIORIGGNITE && npm run package:win`
2. `cp "release/JuniorIgnite Setup X.Y.Z.exe" ../JUNIORIGGNITE-OFFICIAL-WEBSITE/public/downloads/JuniorIgnite-Setup-X.Y.Z.exe`
3. Bump `version` + `installerPath` in `src/lib/config.ts`, and `INSTALLER_URL` /
   `APP_VERSION` in the server `.env`
4. Rebuild and redeploy as above

---

## Security checklist before going public
- [ ] `TOKEN_SECRET` set to a strong random value (server won't boot otherwise)
- [ ] `FOUNDER_PASSWORD` changed from the default (server won't boot otherwise)
- [ ] HTTPS enabled via certbot
- [ ] SSH restricted to your IP in the security group
- [ ] `TELEMETRY_KEY` set if you enable desktop telemetry
- [ ] `CORS_ORIGIN` set to your domain rather than `*`
- [ ] `db.json` backed up somewhere off the instance
