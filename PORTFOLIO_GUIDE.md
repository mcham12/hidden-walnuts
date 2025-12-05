# Portfolio Management Guide

Quick reference for adding new artwork to the Hidden Walnuts portfolio.

---

## Overview

- **Images**: Stored in `/images/` folder, hosted via GitHub raw URLs
- **Portfolio Data**: Stored in Cloudflare KV (managed via Admin interface)
- **Admin URL**: https://hiddenwalnuts.com/admin
- **Credentials**: `admin` / `hidden2024!`

---

## Adding New Portfolio Items

### Step 1: Prepare Web-Optimized Images

Create smaller web versions of your full-size images.

**Using macOS Terminal (sips):**

```bash
cd "/Users/mattcarroll/Library/Mobile Documents/com~apple~CloudDocs/Documents/hiddenwalnuts/Website"

# Convert PNG to optimized JPG (best for most artwork)
sips -Z 1200 images/MyArtwork.png --out images/MyArtwork_web.jpg

# Keep as PNG (if transparency needed)
sips -Z 1200 images/MyArtwork.png --out images/MyArtwork_web.png

# Batch convert all new PNGs to web JPGs
for file in images/*.png; do
  if [[ ! "$file" == *"_web"* ]]; then
    sips -Z 1200 "$file" --out "${file%.png}_web.jpg"
  fi
done
```

**Naming Convention:**
- Original: `ArtworkName.png` or `ArtworkName.jpg`
- Web version: `ArtworkName_web.jpg` or `ArtworkName_web.png`

### Step 2: Push Images to GitHub

```bash
cd "/Users/mattcarroll/Library/Mobile Documents/com~apple~CloudDocs/Documents/hiddenwalnuts/Website"

git add images/
git commit -m "Add web images for new portfolio items"
git push origin main
```

Wait ~30 seconds for GitHub to process before adding to admin.

### Step 3: Add Items via Admin Interface

1. Go to **https://hiddenwalnuts.com/admin**
2. Login: `admin` / `hidden2024!`
3. Click **"Add New Item"** tab
4. Fill in the form:

| Field | What to Enter |
|-------|---------------|
| **Title** | Artwork name (displayed on hover) |
| **Description** | Optional - shown in lightbox |
| **Image filename** | Just the filename: `MyArtwork_web.jpg` |
| **Redbubble URL** | Full product URL from Redbubble |
| **Tags** | Optional - press Enter after each tag |
| **Featured** | Check for priority display |

5. Click **"Add Portfolio Item"**

---

## Managing Existing Items

### View All Items
- Go to Admin > **"Manage Items"** tab
- Shows grid of all portfolio items

### Edit an Item
- Click **"Edit"** on any item card
- Modify fields and click **"Update Portfolio Item"**

### Delete an Item
- Click **"Delete"** on any item card
- Confirm deletion

---

## CLI Commands (Advanced)

```bash
# List all portfolio items
wrangler kv:key list --binding PORTFOLIO_KV

# View specific item details
wrangler kv:key get --binding PORTFOLIO_KV "item:ITEM_ID_HERE"

# Delete item via CLI
wrangler kv:key delete --binding PORTFOLIO_KV "item:ITEM_ID_HERE"
```

---

## Portfolio Item Data Structure

Each item is stored as JSON in Cloudflare KV:

```javascript
{
  "id": "auto-generated-id",
  "title": "Artwork Title",
  "description": "Optional description text",
  "imageUrl": "https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/artwork_web.jpg",
  "redbubbleUrl": "https://www.redbubble.com/shop/ap/123456789",
  "tags": ["nature", "vintage"],
  "featured": false,
  "dateAdded": "2024-01-15T10:30:00.000Z"
}
```

---

## Image URL Format

The admin form auto-generates the full URL:

```
Base: https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/
+ Your filename: MyArtwork_web.jpg
= Full URL: https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/MyArtwork_web.jpg
```

---

## Troubleshooting

**Image not showing?**
- Ensure you pushed to GitHub and waited ~30 seconds
- Check filename matches exactly (case-sensitive)
- Verify image exists: visit the raw GitHub URL directly

**Admin not loading?**
- Clear browser cache or try incognito mode
- Check credentials: `admin` / `hidden2024!`

**Need to redeploy?**
```bash
cd "/Users/mattcarroll/Library/Mobile Documents/com~apple~CloudDocs/Documents/hiddenwalnuts/Website"
wrangler deploy
```
