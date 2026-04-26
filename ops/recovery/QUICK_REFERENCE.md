# Quick Recovery Reference

Use this when recreating the server from scratch.

## 1) Prepare config (one time per rebuild)

```bash
cd /path/to/vidhigya
cp ops/recovery/recovery.config.example.sh ops/recovery/recovery.config.sh
```

Edit `ops/recovery/recovery.config.sh` and set:

- `SSH_HOST`
- domains
- local absolute paths to all prod env files
- optional `GITLAB_DEPLOY_USER` / `GITLAB_DEPLOY_TOKEN`
- `ENABLE_CERTBOT=true` only after DNS points to new server

## 2) Run full bootstrap

```bash
chmod +x ops/recovery/bootstrap-all-apps.sh
ops/recovery/bootstrap-all-apps.sh ops/recovery/recovery.config.sh
```

## 3) DNS requirements before SSL

Point these A records to the new server IP:

- `qurieus.com`
- `www.qurieus.com`
- `myflatmate.in`
- `www.myflatmate.in`
- `vidhigya.qurieus.com`

Then re-run bootstrap with `ENABLE_CERTBOT=true` (or run certbot manually).

## 4) Manual SSL fallback (if needed)

```bash
ssh <SSH_HOST>
sudo certbot --nginx -d qurieus.com -d www.qurieus.com
sudo certbot --nginx -d myflatmate.in -d www.myflatmate.in
sudo certbot --nginx -d vidhigya.qurieus.com
```

## 5) Post-check commands

```bash
ssh <SSH_HOST>
export HOME=/home/ubuntu PM2_HOME=/home/ubuntu/.pm2
pm2 list
sudo nginx -t
df -h /
curl -I https://qurieus.com
curl -I https://myflatmate.in
curl -I https://vidhigya.qurieus.com
```

## 6) Useful re-run scenarios

- Redeploy only from latest prod branches:
  - re-run `bootstrap-all-apps.sh` (safe for rebuild workflow)
- Refresh only env files + deploy:
  - update env files locally and re-run bootstrap
- Rotate PM2 logs immediately:
  - `pm2 flush`
