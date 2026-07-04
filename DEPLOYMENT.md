# Hidden Walnuts Website Deployment Guide

This site is deployed as a single Cloudflare Worker.

## Deployment Paths

Preferred CI path:

- `.github/workflows/deploy.yml` deploys on pushes to `main`.
- The workflow uses `cloudflare/wrangler-action@v3`.
- Required GitHub repository secrets:
  - `CF_API_TOKEN`
  - `CF_ACCOUNT_ID`
- Pull requests run the same workflow with `wrangler deploy --env preview`.

Direct local path:

```bash
wrangler whoami
wrangler deploy
```

Local deploy requires a valid Wrangler login or Cloudflare API token in the environment.

## Worker Configuration

- Config: `wrangler.toml`
- Worker name: `hidden-walnuts-portfolio`
- Main script: `_worker.js`
- Production KV binding: `PORTFOLIO_KV`
- Preview env: `hidden-walnuts-portfolio-preview`

Production routes include:

- `hiddenwalnuts.com`
- `hiddenwalnuts.com/`
- `hiddenwalnuts.com/admin`
- `hiddenwalnuts.com/admin/*`
- `hiddenwalnuts.com/api/*`
- `www.hiddenwalnuts.com/*`
- `hiddenwalnuts.com/support`
- `hiddenwalnuts.com/privacy`
- `hiddenwalnuts.com/portfolio`
- `hiddenwalnuts.com/game`

Keep route changes narrow so `game.hiddenwalnuts.com`, `api.hiddenwalnuts.com`, and other subdomains are not affected.

## Pre-Deploy Validation

Run these before deploying when practical:

```bash
node --check _worker.js
wrangler deploy --dry-run
```

For admin/API changes, also smoke test:

- unauthenticated `/admin` returns `401`
- authenticated `/admin` returns HTML
- `GET /api/portfolio` remains public
- `POST`, `PUT`, and `DELETE` under `/api/portfolio` require admin auth
- authenticated create/update/delete succeeds against `PORTFOLIO_KV`

## Post-Deploy Checks

```bash
curl -I https://hiddenwalnuts.com
curl -I https://hiddenwalnuts.com/admin
curl https://hiddenwalnuts.com/api/portfolio
```

Expected:

- `/` returns HTML
- `/admin` returns `401` without credentials
- `/api/portfolio` returns JSON

Use a browser/private window to verify authenticated `/admin` after credential or admin UI changes.

## Logs And KV

```bash
wrangler tail
wrangler kv:key list --binding PORTFOLIO_KV
wrangler kv:key get --binding PORTFOLIO_KV "item:ITEM_ID"
```

## Security Notes

- Do not add or repeat admin credentials in docs, PR text, issue text, logs, or chat.
- New sensitive values should use Wrangler secrets or Cloudflare/GitHub secret storage.
- The admin page and write API routes use HTTP Basic Auth.
- Public portfolio reads are intentionally unauthenticated so `/portfolio` can load.
