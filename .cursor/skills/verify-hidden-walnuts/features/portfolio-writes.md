# Portfolio writes

Create, update, and delete go through `/api/portfolio`. `/admin` is the browser for those writes. Writes require HTTP Basic auth.

## Sub-features

- `write-unauth` rejects `POST /api/portfolio` with 401.
- `write-create` is the authorized create path Launch already ran.
- `admin-page` is `/admin`.

## How to get to it (user POV)

- Open `/admin` and sign in when the browser asks.
- Submit the portfolio form. The page posts to `/api/portfolio`.

## Driving it with curl and scripts/verify.mjs

Preconditions:

- Launch has printed `{"ready":true`.
- Doctor has passed.

- **Unauthenticated create.** Run `curl -s -o /dev/null -w '%{http_code}' -X POST "$ORIGIN/api/portfolio"`. The code is 401.
- **Authorized create.** Launch already posted the seed catalog. Do not build an Authorization header by hand.
- **Proof.** Run `node scripts/verify.mjs --url "$ORIGIN" --evidence "$EVIDENCE"`. The seed round-trip assertion stays ok only while those items are unchanged.

## Gotchas

- `scripts/verify.mjs` reads the admin constants from `_worker.js` at runtime and does not print them. Do not type them into a command.
- Editing or deleting a seeded item makes the seed round-trip fail until you launch a new session.
- `POST` without a body still requires auth. The 401 is returned before JSON parsing.
