# Home page

`GET /` is the storefront. The first response sets `hw_home_art_visual` to one homepage art id.

## Sub-features

- `home-html` returns the storefront HTML.
- `home-cookie` sets `hw_home_art_visual` on the first visit.
- `home-pin` repeats the same visual when that cookie comes back.

## How to get to it (user POV)

- Open `/`.

## Driving it with curl and scripts/verify.mjs

Preconditions:

- Launch has printed `{"ready":true`.
- Doctor has passed.

- **First visit.** Run `curl -si "$ORIGIN/"`. Status is 200 and `Content-Type` starts with `text/html`. A `Set-Cookie` header contains `hw_home_art_visual=`.
- **Pinned visit.** Send that cookie value back. Run `curl -si -H "Cookie: hw_home_art_visual=VISUAL_ID" "$ORIGIN/"`. The HTML `src` contains `VISUAL_ID`. The response does not set a new `hw_home_art_visual` value.
- **Proof.** Save both response headers under `$EVIDENCE`. `scripts/verify.mjs` does not assert the home page.

## Gotchas

- The first visit picks a random visual. Send the cookie back to pin it.
- Every response clears the old `hw_home_visual` cookie with `Max-Age=0`. That header is not the art visual.
- Use an `id` from `HOME_ART_VISUALS` in `_worker.js`. A made-up id is treated as a first visit.
