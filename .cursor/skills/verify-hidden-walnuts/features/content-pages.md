# Content pages

`/game`, `/support`, and `/privacy` return HTML. `/about` returns 404.

## Sub-features

- `game-page` is `/game`.
- `support-page` is `/support`.
- `privacy-page` is `/privacy`.
- `about-missing` is `/about`.

## How to get to it (user POV)

- Open `/game`, `/support`, or `/privacy` from the nav.
- `/about` has no page handler.

## Driving it with curl and scripts/verify.mjs

Preconditions:

- Launch has printed `{"ready":true`.

- **Game.** Run `curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/game"`. The code is 200.
- **Support.** Run `curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/support"`. The code is 200.
- **Privacy.** Run `curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/privacy"`. The code is 200.
- **About.** Run `curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/about"`. The code is 404.
- **Proof.** Save the four status codes. `scripts/verify.mjs` does not assert these routes.

## Gotchas

- `/about` returns 404. The `wrangler.toml` route does not add a page.
- The same status codes hold for `/game/`, `/support/`, `/privacy/`, and `/about/`.
- Favicon routes proxy GitHub raw and need network. A failed favicon fetch is separate from these pages.
