# Server Rebuild Bootstrap (All Apps)

Use this when a server is gone and you need to recreate everything quickly on a new EC2 host:

- repo checkout for all 3 apps (`qurieus`, `myflatmate`, `vidhigya`)
- prod env file placement (`qurieus`/`myflatmate`: `/home/ubuntu/*.env`, `vidhigya`: app-local `apps/*/.env`)
- app deployments via existing deploy scripts
- nginx sites (`sites-available` + `sites-enabled`)
- optional certbot SSL
- PM2 + log rotation

## 1) Prepare config

```bash
cd ops/recovery
cp recovery.config.example.sh recovery.config.sh
```

Update `recovery.config.sh`:

- `SSH_HOST` (your SSH alias or user@host)
- domain values
- local absolute paths to prod env files for each app (for vidhigya these map to app-local `.env` files)
- optional GitLab token/user (if target server cannot clone via SSH key)
- set `ENABLE_CERTBOT=true` + `CERTBOT_EMAIL` when DNS is already pointed

## 2) Run bootstrap

```bash
chmod +x ops/recovery/bootstrap-all-apps.sh
ops/recovery/bootstrap-all-apps.sh ops/recovery/recovery.config.sh
```

## Notes

- This script is idempotent for normal rebuild usage: it resets repos to remote prod branch.
- SSL issuance succeeds only when DNS already points to the new server.
- Env files are copied from your local machine each run.
- Existing app deploy scripts remain the source of truth for app-specific startup behavior.
