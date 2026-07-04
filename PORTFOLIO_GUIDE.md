# Portfolio Admin And Image Prep Guide

This is the working reference for adding artwork to the Hidden Walnuts portfolio at `hiddenwalnuts.com/portfolio`.

Current repo path on this machine:

```bash
cd /Users/hiddenwalnutsdev/Developer/hiddenwalnuts/Website
```

## Current Status

- Portfolio items are stored in Cloudflare KV through the `PORTFOLIO_KV` binding.
- Portfolio images live in `images/` and are served through GitHub raw URLs.
- The active public page is `/portfolio`.
- The admin page is `/admin`, protected by HTTP Basic Auth.
- `/admin` supports add, edit, manage, and delete flows for portfolio items.
- The portfolio API is present:
  - Public: `GET /api/portfolio`
  - Admin auth required: `POST /api/portfolio`
  - Public: `GET /api/portfolio/:id`
  - Admin auth required: `PUT /api/portfolio/:id`
  - Admin auth required: `DELETE /api/portfolio/:id`
- `/api/upload` is disabled. Use GitHub-hosted image files, not Cloudflare Images upload, unless upload support is intentionally rebuilt.

Do not add or repeat admin credentials in docs, PRs, chat, or logs. Use the current password manager / deployment configuration when logging in.

## Artwork Add Flow

1. Prepare a web-friendly image.
2. Put the web image under `images/`.
3. Commit and push the image to GitHub.
4. Add or update the portfolio item through `/admin`, or through the authenticated API/KV fallback.
5. Verify `/portfolio` loads the item and the Redbubble/TeePublic link is correct.

## Prepare Web-Friendly Images

Use `_web` suffixes for images shown in the portfolio grid.

Recommended naming:

```text
ArtworkName.png          original, if you keep it in the repo
ArtworkName_web.jpg      web display version for opaque artwork
ArtworkName_web.png      web display version if transparency is required
ArtworkName_web.webp     web display version when you intentionally choose WebP
```

Use `sips` on macOS for quick resizing. Keep the longest side around `1200px` for portfolio art unless the design needs a larger image.

Convert a PNG to an opaque JPEG:

```bash
sips -s format jpeg -Z 1200 images/MyArtwork.png --out images/MyArtwork_web.jpg
```

Resize and keep PNG transparency:

```bash
sips -Z 1200 images/MyArtwork.png --out images/MyArtwork_web.png
```

Convert a large JPEG to a web-sized JPEG:

```bash
sips -Z 1200 images/MyArtwork.jpg --out images/MyArtwork_web.jpg
```

Batch create JPEG web copies for PNG files that do not already have `_web` in the name:

```bash
for file in images/*.png; do
  case "$file" in
    *_web.*) continue ;;
  esac
  sips -s format jpeg -Z 1200 "$file" --out "${file%.*}_web.jpg"
done
```

After creating web images, inspect them before committing. Confirm:

- The image is not blurry at portfolio size.
- Text, if any, remains readable.
- Transparency was preserved only when needed.
- File names are exact and case-sensitive.
- Huge originals are not accidentally used as portfolio display images.

## Push Images

```bash
git add images/MyArtwork_web.jpg
git commit -m "Add web image for MyArtwork"
git push origin main
```

Wait briefly for GitHub raw URLs to update, then verify the URL directly:

```bash
curl -I https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/MyArtwork_web.jpg
```

Expected: a successful HTTP response. If it 404s, check file name case, branch, and whether the push finished.

## Portfolio Item Shape

Each KV item is JSON:

```json
{
  "id": "auto-generated-id",
  "title": "Artwork Title",
  "description": "Optional description text",
  "imageUrl": "https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/MyArtwork_web.jpg",
  "redbubbleUrl": "https://www.redbubble.com/shop/ap/123456789",
  "tags": ["nature", "vintage"],
  "featured": false,
  "dateAdded": "2026-07-04T10:30:00.000Z"
}
```

Sorting behavior in `_worker.js`:

1. `featured: true` items first.
2. Then newest `dateAdded` first.

The admin UI uses an image filename field and generates the GitHub raw URL. It also accepts a full `https://` image URL. The API stores the full `imageUrl`.

## Admin UI Flow

1. Open `https://hiddenwalnuts.com/admin` after the current Worker is deployed.
2. Sign in with the current admin credentials from the password manager / deployment configuration.
3. Use `Add/Edit`.
4. Fill:

| Field | Value |
| --- | --- |
| Title | Artwork name shown in the portfolio/lightbox |
| Description | Optional lightbox/metadata text |
| Image filename or URL | Use the web image filename, or paste a full image URL |
| Store URL | Full Redbubble/TeePublic product URL |
| Tags | Optional comma-separated metadata |
| Featured | Checked for priority sorting |

5. Save, then verify `/portfolio`.

Manage existing items from the admin `Manage` tab:

- Edit title, description, image, store URL, tags, and featured state.
- Delete stale items only after confirming the public portfolio no longer needs them.

## API Fallback

Use the API for automation or when the browser admin UI is not practical. Do not paste real credentials into docs, PRs, or chat. Load them from the password manager into environment variables for local commands:

```bash
export HW_ADMIN_USER='admin'
export HW_ADMIN_PASSWORD='use-password-manager-value'
```

List items:

```bash
curl https://hiddenwalnuts.com/api/portfolio
```

Create an item:

```bash
curl -X POST https://hiddenwalnuts.com/api/portfolio \
  -u "$HW_ADMIN_USER:$HW_ADMIN_PASSWORD" \
  -H 'Content-Type: application/json' \
  --data '{
    "title": "Artwork Title",
    "description": "Optional description",
    "imageUrl": "https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/MyArtwork_web.jpg",
    "redbubbleUrl": "https://www.redbubble.com/shop/ap/123456789",
    "tags": ["portfolio"],
    "featured": false
  }'
```

Update an item:

```bash
curl -X PUT https://hiddenwalnuts.com/api/portfolio/ITEM_ID \
  -u "$HW_ADMIN_USER:$HW_ADMIN_PASSWORD" \
  -H 'Content-Type: application/json' \
  --data '{
    "title": "Updated Artwork Title",
    "featured": true
  }'
```

Delete an item:

```bash
curl -X DELETE https://hiddenwalnuts.com/api/portfolio/ITEM_ID \
  -u "$HW_ADMIN_USER:$HW_ADMIN_PASSWORD"
```

## KV Fallback

Wrangler can inspect KV directly:

```bash
wrangler kv:key list --binding PORTFOLIO_KV
wrangler kv:key get --binding PORTFOLIO_KV "item:ITEM_ID"
```

Prefer API/admin writes over direct KV writes so item shape stays consistent.

## Troubleshooting

Image not showing:

- Confirm the image was pushed to GitHub.
- Verify the raw URL with `curl -I`.
- Check exact file name case.
- Confirm the portfolio item's `imageUrl` is the full raw URL.

Portfolio item not visible:

- Check `/api/portfolio` returns the item.
- Confirm the item is valid JSON in KV.
- Confirm `featured` is boolean, not the string `"true"`.
- Open browser dev tools and check network errors from `/portfolio`.

Admin not loading:

- Run `node --check _worker.js`.
- Confirm `_worker.js` defines `ADMIN_HTML`.
- Use `wrangler tail` or local `wrangler dev` logs.
- Test in a private browser window after credential changes.

Need to deploy:

```bash
wrangler deploy
```
