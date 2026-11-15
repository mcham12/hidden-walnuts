# Portfolio page

`/portfolio` and `/portfolio/` both return the public grid shell.

## Sub-features

- `portfolio-page` returns the grid shell at `/portfolio`.
- `portfolio-page-slash` returns the same shell at `/portfolio/`.

## How to get to it (user POV)

- Open `/portfolio`.
- Open `/portfolio/`.

## Driving it with curl and scripts/verify.mjs

Preconditions:

- Launch has printed `{"ready":true`.
- Doctor has passed.

- **Grid shell.** Run `curl -si "$ORIGIN/portfolio"`. Status is 200, `Content-Type` starts with `text/html`, and the body contains `id="portfolioGrid"`.
- **Trailing slash.** Run `curl -si "$ORIGIN/portfolio/"`. The same three checks pass.
- **Proof.** Run `node scripts/verify.mjs --url "$ORIGIN" --evidence "$EVIDENCE"`. In `$EVIDENCE/report.json`, `GET /portfolio and GET /portfolio/ return 200 text/html with #portfolioGrid` has `ok` true.

## Gotchas

- The first HTML response already contains each design title, image alt text, and shop link. The page script still replaces `#portfolioGrid` from `/api/portfolio`.
- An empty or failing feed still renders five sample items in the browser.
- The curl checks do not replace the report assertion. Finish with `scripts/verify.mjs`.
