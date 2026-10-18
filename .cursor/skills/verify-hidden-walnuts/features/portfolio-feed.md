# Portfolio feed

`GET /api/portfolio` returns the KV catalog as JSON. `GET /api/portfolio/:id` returns one item.

## Sub-features

- `feed-list` returns the catalog array.
- `feed-item` returns one item by id.
- `feed-shape` accepts only items `parsePortfolioItem` can build.
- `feed-seed` holds each seeded title once, with the same description, image URL, buy link, tags, and featured flag.

## How to get to it (user POV)

- The portfolio page requests `GET /api/portfolio` when it loads.
- An `id` from that array is `GET /api/portfolio/<id>`.

## Driving it with curl and scripts/verify.mjs

Preconditions:

- Launch has printed `{"ready":true`.
- Doctor has passed.

- **Catalog.** Run `curl -s "$ORIGIN/api/portfolio"`. The body is a JSON array with one object for each seeded title.
- **One item.** Copy an `id` from that array. Run `curl -s "$ORIGIN/api/portfolio/<id>"`. The object has the same `title` and `redbubbleUrl`.
- **Proof.** Run `node scripts/verify.mjs --url "$ORIGIN" --evidence "$EVIDENCE"`. Assertions 2 through 7 in `$EVIDENCE/report.json` have `ok` true.

## Gotchas

- A KV exception returns 200 with `[]`. An empty array fails the seed round-trip.
- The server sorts featured items first by truthiness. `featured` in a proof item is a boolean. Any other type is a parse failure.
- Sample items use relative `imageUrl` values. Seeded items use absolute `https` URLs. Compare `feed.json`, not the sample cards in the browser.
