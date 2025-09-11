# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Hidden Walnuts is a **portfolio website with admin interface** built entirely on **Cloudflare Workers**. The architecture uses a single worker file that serves the main portfolio site, admin interface, and API endpoints.

## Architecture

### Single Worker Architecture
- **Main Portfolio Site**: Masonry grid layout displaying artwork
- **Admin Interface**: Password-protected CRUD interface for managing portfolio items  
- **API Endpoints**: RESTful API for portfolio operations
- **Storage**: Cloudflare KV for metadata, GitHub raw URLs for images
- **Authentication**: HTTP Basic Auth for admin access

### Key Files Structure
```
/
├── _worker.js          # Complete application (HTML/CSS/JS/API)
├── wrangler.toml       # Cloudflare Workers configuration  
├── images/             # GitHub-hosted images directory
├── LogoForInsta.png    # Site logo
├── fav-walnuts.png     # Favicon
├── README.md           # Project documentation
├── DEPLOYMENT.md       # Deployment guide
└── CLAUDE.md          # This file
```

## Live URLs

- **Portfolio Site**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev
- **Admin Interface**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev/admin
  - Username: `admin`
  - Password: `hidden2024!`

## Development Commands

### Local Development
```bash
# Start local worker
wrangler dev

# Access locally:
# Portfolio: http://localhost:8787
# Admin: http://localhost:8787/admin
```

### Deployment
```bash
# Deploy to production
wrangler deploy

# View logs
wrangler tail
```

### KV Operations
```bash
# List portfolio items
wrangler kv:key list --binding PORTFOLIO_KV

# View specific item
wrangler kv:key get --binding PORTFOLIO_KV "item:ID_HERE"
```

## Architecture Principles

### Worker-First Design
- Single `_worker.js` file contains everything
- HTML, CSS, and JavaScript embedded as template literals
- No build process or static file serving required
- Self-contained and portable

### Content Management
- Portfolio items stored in Cloudflare KV as JSON
- Images hosted on GitHub raw URLs (free tier compatible)
- Admin interface provides full CRUD operations
- No external CMS or database required

### Security Model
- HTTP Basic Authentication protects admin routes
- CORS headers enable API access
- Input validation on all forms
- No sensitive data exposed in client code

## Image Workflow

1. **Add to GitHub**: Place images in `/images/` directory, commit and push
2. **Admin Interface**: Enter filename only (e.g., `artwork.jpg`)
3. **Auto-Generation**: System generates full GitHub raw URL
4. **Display**: Portfolio site loads images from GitHub URLs

## Making Changes

### Code Structure
The `_worker.js` file contains:
- **Configuration constants** at top
- **Authentication middleware** 
- **Main fetch handler** with routing
- **API functions** for CRUD operations
- **HTML templates** as template literals (MAIN_HTML, ADMIN_HTML)

### Adding Features
1. **New API endpoints**: Add to `handleAPI()` function
2. **UI changes**: Modify HTML templates in constants
3. **Styling**: Update CSS within HTML templates
4. **Authentication**: Modify `requireAuth()` function

### Testing Changes
```bash
# Always test locally first
wrangler dev

# Deploy when ready
wrangler deploy
```

## Common Tasks

### Adding New Portfolio Items
Use admin interface - no code changes needed:
1. Login to `/admin`
2. Click "Add New Item"
3. Fill form with image filename, title, description, Redbubble URL
4. System handles URL generation and storage

### Updating Styles
Edit CSS within the `MAIN_HTML` template literal in `_worker.js`:
```javascript
const MAIN_HTML = `<!DOCTYPE html>
<html>
<head>
    <style>
    /* CSS goes here */
    :root {
        --primary-color: #2a5d31;
        /* etc... */
    }
    </style>
</head>
...
`;
```

### Modifying Admin Interface  
Edit the `ADMIN_HTML` template literal in `_worker.js`.

### Changing Authentication
Update constants at top of `_worker.js`:
```javascript
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'your-password';
```

## Important Notes

### Architecture Decision
This project uses an **embedded worker architecture** rather than traditional static files + API. This means:
- ✅ No conflicting static files (`index.html`, `styles.css`, etc.)
- ✅ Single deployment target
- ✅ No build process required
- ✅ Self-contained and portable

### Image Hosting
Uses GitHub raw URLs instead of Cloudflare Images:
- ✅ Free tier compatible
- ✅ Version controlled with Git
- ✅ Reliable CDN distribution
- ❌ Manual upload process (via Git)

### Development Workflow
1. **Code changes**: Edit `_worker.js`
2. **Test locally**: `wrangler dev`
3. **Deploy**: `wrangler deploy`
4. **Content changes**: Use admin interface

## Troubleshooting

### Worker Issues
- Check `wrangler tail` for logs
- Verify KV namespace binding in `wrangler.toml`
- Test API endpoints directly: `/api/portfolio`

### Image Issues  
- Ensure images are pushed to GitHub
- Verify repository is public
- Check exact filename matching

### Authentication Issues
- Verify credentials in worker constants
- Check browser isn't caching old auth
- Test with incognito/private browsing

This architecture is production-ready and fully operational. The worker-first approach eliminates complexity while providing a complete portfolio management system.