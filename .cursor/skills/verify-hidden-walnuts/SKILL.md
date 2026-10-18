---
name: verify-hidden-walnuts
description: Drive the hidden-walnuts Cloudflare Worker locally with wrangler dev and an isolated temp KV, and prove the portfolio page, portfolio feed, admin write auth, home page, and content routes. Use before claiming a change to _worker.js works, or when the PR Verify check fails.
---

# Verify Hidden Walnuts

Read `features/README.md`, then the feature file for the route you are proving.

## Launch

Set `REPO` to the repository root. Use a new evidence directory and a new tmux session on every run.

```bash
EVIDENCE=/tmp/hw-verify-evidence-$(date +%s)
SESSION=hw-verify-$(date +%s)
tmux new-session -d -s "$SESSION" -c "$REPO" "node scripts/verify.mjs serve --evidence $EVIDENCE > $EVIDENCE.serve.log 2>&1"
```

`serve` seeds the catalog from an empty KV directory and waits. Ready is this line.

```bash
grep -m1 '^{"ready":true' "$EVIDENCE.serve.log"
```

Read the origin from that line.

```bash
ORIGIN=$(grep -m1 '^{"ready":true' "$EVIDENCE.serve.log" | node -p 'JSON.parse(require("fs").readFileSync(0,"utf8")).origin')
```

Keep `SESSION` for Doctor and Cleanup. A second run uses its own suffix.

## Doctor

Run Doctor before Drive. Both commands must exit 0. Doctor does not run the seven portfolio assertions.

```bash
tmux has-session -t "$SESSION"
curl -sf "$ORIGIN/api/portfolio" | node -e 'let raw="";process.stdin.on("data",chunk=>raw+=chunk);process.stdin.on("end",()=>{const items=JSON.parse(raw);if(!Array.isArray(items)||items.length===0)process.exit(1)})'
```

The session is up, and `GET /api/portfolio` returned 200 with a non-empty JSON array. On failure, read `tmux capture-pane -pt "$SESSION"` and `$EVIDENCE/wrangler.log`.

## Drive

Follow the feature file. Finish a running instance with this command. It sends GET requests and does not seed.

```bash
node scripts/verify.mjs --url "$ORIGIN" --evidence "$EVIDENCE"
```

For a proof that starts its own Worker, run this instead.

```bash
node scripts/verify.mjs --evidence "$EVIDENCE"
```

## Evidence

The check writes `$EVIDENCE/report.json`, `feed.json`, `portfolio.html`, and `wrangler.log`. `report.json` `ok` is the portfolio proof. `feed.json` is the catalog.

Read those files. The portfolio grid renders `getSampleData()` when the feed is empty or the request fails.

Do not type the admin constants into a command, a log, or an evidence file. The seed path reads them from `_worker.js` and does not print them.

## Cleanup

```bash
tmux kill-session -t "$SESSION"
```

The serve process traps SIGHUP, stops the Worker process group it spawned, and removes that run's temp directory. `$EVIDENCE` stays.

Confirm the Worker is gone. This command must fail to connect.

```bash
curl -s "$ORIGIN/api/portfolio"
```

## Helpers

- `node scripts/lint.mjs` checks git `.js` and `.mjs` files.
- `node scripts/lint.mjs path` checks that path even when it is untracked.
- `node scripts/lint-rule-check.mjs` runs the `handleImageUpload` rule through `lint.mjs`.
- `node scripts/verify.mjs` starts a Worker, seeds it, and runs the seven assertions.
- `node scripts/verify.mjs serve --evidence "$EVIDENCE"` is Launch.
- `node scripts/verify.mjs --url "$ORIGIN" --evidence "$EVIDENCE"` is the Drive proof.
