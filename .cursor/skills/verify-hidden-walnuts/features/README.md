# Hidden Walnuts verification map

Read this index, then open the feature file for the route you are proving.

## Baseline preconditions

- Set `REPO` to the repository root.
- Launch with a new `SESSION` and `EVIDENCE` from the skill Launch section.
- Doctor must show the session up and a non-empty `GET /api/portfolio` array.
- Drive only the instance this run started.

## Features

- [Portfolio page](./portfolio-page.md) covers `/portfolio` and `/portfolio/`.
- [Portfolio feed](./portfolio-feed.md) covers `GET /api/portfolio` and `GET /api/portfolio/:id`.
- [Portfolio writes](./portfolio-writes.md) covers create, update, delete, and `/admin`.
- [Home page](./home-page.md) covers `/`.
- [Content pages](./content-pages.md) covers `/game`, `/support`, `/privacy`, and `/about`.
