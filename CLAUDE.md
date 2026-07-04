# CLAUDE.md

This file provides agent guidance for the Hidden Walnuts website repository. Grok also reads this file through Claude-compatibility, so keep it current and concise.

## Current Project Snapshot

Hidden Walnuts is a Cloudflare Workers site for:

- `hiddenwalnuts.com` home/about storefront page.
- Portfolio/gallery at `/portfolio`.
- iOS game marketing page at `/game`.
- Support page at `/support`.
- App privacy policy at `/privacy`.
- Portfolio JSON API under `/api/portfolio`.
- Protected admin route at `/admin` for portfolio management.

The current architecture is still worker-first: `_worker.js` contains routing, page templates, embedded CSS/JS, API handlers, and asset references. There is no framework build step.

Recent Codex work focused on the homepage/App Store direction and fine-art homepage visual rotation. Treat `_worker.js` and `wrangler.toml` as the authoritative current state when older docs disagree.

## Important Current Caveats

- Do not repeat or expose admin credentials in chat, PR descriptions, logs, or generated docs. Existing files may contain old/plaintext credentials; avoid spreading them further.
- `/admin` is protected by HTTP Basic Auth and serves `ADMIN_HTML`. It supports add/edit/delete portfolio flows against the existing API.
- Public portfolio reads stay open. Portfolio API writes (`POST`, `PUT`, `DELETE`) require the same admin auth.
- `wrangler.toml` routes `/about`, but `_worker.js` currently serves the about/home page at `/` and does not explicitly handle `/about`. Verify this before relying on `/about`.
- `CUSTOM_DOMAIN_SETUP.md`, `DEPLOYMENT.md`, and `PORTFOLIO_GUIDE.md` are useful, but parts may describe older status or old absolute paths. Prefer current repo path `/Users/hiddenwalnutsdev/Developer/hiddenwalnuts/Website`.

## Key Files

```text
_worker.js              Cloudflare Worker app, page templates, API handlers
wrangler.toml           Worker name, KV binding, preview env, custom-domain routes
README.md               General project overview
DEPLOYMENT.md           Deployment and operational notes; may contain older status
CUSTOM_DOMAIN_SETUP.md  Domain/routing notes; verify against wrangler.toml
PORTFOLIO_GUIDE.md      Portfolio image/content workflow; old paths may need translation
gamecontent.md          Older game/help copy reference
images/                 GitHub-hosted image assets
```

## Current Worker Structure

Important constants near the top of `_worker.js`:

- `GITHUB_ROOT_BASE_URL`
- `GITHUB_BASE_URL`
- `APP_STORE_URL`
- `APP_STORE_ASSET_BASE`
- `SITE_BUILD_ID`
- `HOME_ART_VISUALS`

Server-rendered page templates:

- `LIVE_ABOUT_HTML` is used for the root homepage through `homeResponse()`.
- `LIVE_GAME_HTML` is used for `/game`.
- `LIVE_SUPPORT_HTML` is used for `/support`.
- `APP_PRIVACY_HTML` is used for `/privacy`.
- `MAIN_HTML` is used for `/portfolio`.
- `ADMIN_HTML` is used for `/admin`.

Important runtime helpers:

- `serveFavicon()`
- `selectHomeArtVisual()`
- `renderHomeHTML()`
- `homeResponse()`
- `handleAPI()`
- Portfolio CRUD helpers: `getPortfolioItems`, `getPortfolioItem`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`.

Image upload code exists as `handleImageUpload()`, but the `/api/upload` route is disabled. The active image workflow is still GitHub-hosted image URLs.

## Routes

Active route handling in `_worker.js`:

- `GET /` -> homepage/about storefront, with server-selected homepage art visual cookie.
- `/portfolio` -> portfolio grid page that fetches `/api/portfolio`.
- `/game` -> native iOS game marketing page and App Store links.
- `/support` -> support page.
- `/privacy` -> app privacy policy.
- `/admin` -> protected portfolio admin page.
- `/fav-walnuts.png`, `/favicon.ico`, `/apple-touch-icon.png` -> proxied from GitHub raw asset.
- `/api/portfolio` -> public GET portfolio collection; authenticated POST create.
- `/api/portfolio/:id` -> public GET portfolio item; authenticated PUT/DELETE update or delete.

Configured custom-domain routes in `wrangler.toml` include:

- `hiddenwalnuts.com`
- `hiddenwalnuts.com/`
- `hiddenwalnuts.com/admin`
- `hiddenwalnuts.com/admin/*`
- `hiddenwalnuts.com/api/*`
- `www.hiddenwalnuts.com/*`
- `hiddenwalnuts.com/about`
- `hiddenwalnuts.com/about/*`
- `hiddenwalnuts.com/support`
- `hiddenwalnuts.com/support/*`
- `hiddenwalnuts.com/privacy`
- `hiddenwalnuts.com/privacy/*`
- `hiddenwalnuts.com/portfolio`
- `hiddenwalnuts.com/portfolio/*`
- `hiddenwalnuts.com/game`
- `hiddenwalnuts.com/game/*`

Preserve separation from other subdomains such as `game.hiddenwalnuts.com` and `api.hiddenwalnuts.com`.

## Cloudflare And Data

- Worker name: `hidden-walnuts-portfolio`.
- Main script: `_worker.js`.
- KV binding: `PORTFOLIO_KV`.
- Preview env: `hidden-walnuts-portfolio-preview`.
- Portfolio metadata is stored in KV as JSON under `item:<id>` keys.
- Portfolio images are referenced by GitHub raw URLs from the `images/` directory.

## Development Commands

Local Worker:

```bash
wrangler dev
```

Deploy:

```bash
wrangler deploy
```

CI deploy:

- `.github/workflows/deploy.yml` deploys on pushes to `main` with `cloudflare/wrangler-action@v3`.
- Pull requests deploy with `wrangler deploy --env preview`.
- The workflow needs GitHub secrets `CF_API_TOKEN` and `CF_ACCOUNT_ID`.

Logs:

```bash
wrangler tail
```

KV inspection:

```bash
wrangler kv:key list --binding PORTFOLIO_KV
wrangler kv:key get --binding PORTFOLIO_KV "item:ID_HERE"
```

Syntax check:

```bash
node --check _worker.js
```

There is currently no `package.json` in this repo. Do not introduce a build tool or dependency manager unless the task explicitly requires it.

## Editing Rules

- Keep the worker-first architecture unless the user explicitly approves a structural change.
- Be careful with embedded template literals; a small quoting mistake can break the entire Worker.
- Do not add new plaintext secrets. Use Wrangler secrets or Cloudflare configuration for new sensitive values.
- Prefer narrowly scoped edits in `_worker.js` over broad rewrites.
- Keep App Store/game marketing content aligned with the live native iOS app direction.
- For UI changes, verify desktop and mobile layouts, nav links, accessibility basics, and `/api/portfolio` loading behavior.
- For Cloudflare changes, use the Cloudflare/Wrangler skills and verify routes against both `_worker.js` and `wrangler.toml`.

## Validation Checklist

Before calling website code work complete:

1. Run `node --check _worker.js`.
2. If practical, run `wrangler dev` and smoke:
   - `/`
   - `/portfolio`
   - `/game`
   - `/support`
   - `/privacy`
   - `/api/portfolio`
   - `/admin` if the task touches admin behavior.
3. For route/config changes, compare `_worker.js` routing with `wrangler.toml`.
4. For visual changes, check mobile and desktop widths.
5. For deploy-impacting work, use `wrangler deploy` only when the user asked for deployment or the repo workflow clearly expects it.
