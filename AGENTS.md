# Hidden Walnuts Website Grok Guide

This repo powers `hiddenwalnuts.com` with a single Cloudflare Worker. Keep the existing docs as the source of truth; this file only routes Grok to them.

## Required Context

Before changing code or deployment behavior, read:

1. `CLAUDE.md`
2. `README.md`
3. `DEPLOYMENT.md`
4. `CUSTOM_DOMAIN_SETUP.md` when routes, DNS, custom domains, or subdomain safety matter.
5. `PORTFOLIO_GUIDE.md` when working on portfolio content or image workflows.
6. `gamecontent.md` when changing game marketing/help copy.

`CLAUDE.md`, `_worker.js`, and `wrangler.toml` are the current starting point. The other docs are helpful references, but some may describe older status or old absolute paths. If they conflict with current code or `wrangler.toml`, call out the conflict before editing.

## Project Shape

- Main app: `_worker.js`, a single Cloudflare Worker containing routing, HTML, CSS, JS, admin UI, and API handlers.
- Cloudflare config: `wrangler.toml`.
- Portfolio images: `images/`, served through GitHub raw URLs.
- Data store: Cloudflare KV binding `PORTFOLIO_KV`.
- Portfolio API reads are public; create/update/delete requests require the admin Basic Auth used by `/admin`.
- Primary custom domain: `hiddenwalnuts.com`.
- Preserve route separation from other subdomains such as game/API services.

## Workflow

- Use the Cloudflare and Wrangler skills for Worker, KV, routing, deploy, and Cloudflare-specific changes.
- Use Chrome DevTools and `web-perf` skills for live-site debugging, accessibility, Core Web Vitals, LCP, and browser behavior.
- Use Firecrawl skills for external website/content research or scraping.
- For non-trivial Worker, admin, API, UI, route, or deploy changes, run the global `composer-review-loop` before committing, pushing, or deploying. Treat its reviewer output as advisory and verify findings against `_worker.js`, `wrangler.toml`, and the relevant docs before fixing.
- Use subagents for independent read-only checks such as route/doc comparison, Cloudflare config review, UI/accessibility review, or admin/API risk review. Keep implementation edits in the main session unless isolated worktrees are explicitly requested.
- Local run:
  ```bash
  wrangler dev
  ```
- Deploy:
  ```bash
  wrangler deploy
  ```
- CI deploy:
  - `.github/workflows/deploy.yml` deploys on pushes to `main` using `cloudflare/wrangler-action@v3`.
  - Pull requests deploy with `--env preview`.
  - Required GitHub secrets are `CF_API_TOKEN` and `CF_ACCOUNT_ID`.
- Logs:
  ```bash
  wrangler tail
  ```

## Editing Rules

- Respect the worker-first architecture: no build process, no framework migration, and no separate static app unless the user explicitly asks.
- Keep `_worker.js` self-contained unless a change clearly warrants a structural split and the user approves.
- Be careful with embedded template literals in `_worker.js`; validate syntax after editing.
- Do not expose, quote, or casually repeat admin credentials from docs or code in chat, PR text, or logs.
- Prefer secrets for any new sensitive value; do not add new plaintext credentials.
- When editing image/content workflows, remember that some docs contain old absolute paths. Use the current repo path on this machine: `/Users/hiddenwalnutsdev/Developer/hiddenwalnuts/Website`.

## Validation Defaults

- For code changes, run a local Worker check with `wrangler dev` when practical.
- For Cloudflare config changes, inspect `wrangler.toml` and use `wrangler deploy --dry-run` or equivalent safe checks if available before deploying.
- For UI changes, verify mobile and desktop behavior, accessibility basics, and that `/`, `/admin`, and `/api/portfolio` still route correctly.
- For custom-domain changes, follow `CUSTOM_DOMAIN_SETUP.md` and ensure `game.hiddenwalnuts.com` and `api.hiddenwalnuts.com` are not affected.
