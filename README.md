# Hidden Walnuts Portfolio Website

A modern portfolio website for Hidden Walnuts artwork with admin interface, built entirely on Cloudflare Workers.

## Architecture

**Single Cloudflare Worker Architecture:**
- Main portfolio site served from worker with embedded HTML/CSS/JS
- Admin interface with HTTP Basic authentication  
- API endpoints for CRUD operations on portfolio items
- Cloudflare KV storage for portfolio metadata
- GitHub raw URLs for image hosting (free tier)

## Live URLs

### Custom Domain (Preferred)
- **Portfolio Site**: https://portfolio.hiddenwalnuts.com  
- **Admin Interface**: https://portfolio.hiddenwalnuts.com/admin
  - Username: `admin`  
  - Password: `hidden2024!`

### Workers.dev Domain (Fallback)
- **Portfolio Site**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev
- **Admin Interface**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev/admin

> **Note**: Custom domain setup requires DNS configuration in Cloudflare Dashboard. See `CUSTOM_DOMAIN_SETUP.md` for instructions.

## Features

### Portfolio Site
- Masonry grid layout matching Maggie Carroll's design aesthetic
- Responsive design for all device sizes
- Lightbox modal for viewing artwork details
- Direct links to Redbubble product pages
- Clean, minimal interface focused on showcasing artwork

### Admin Interface  
- Password protected with HTTP Basic Auth
- Full CRUD operations (Create, Read, Update, Delete)
- Image preview functionality
- Form validation
- GitHub URL auto-generation for uploaded images

### API Endpoints
- `GET /api/portfolio` - List all portfolio items
- `POST /api/portfolio` - Create new portfolio item
- `GET /api/portfolio/:id` - Get specific portfolio item  
- `PUT /api/portfolio/:id` - Update portfolio item
- `DELETE /api/portfolio/:id` - Delete portfolio item

## File Structure

```
/
├── _worker.js                # Complete Cloudflare Worker (API + HTML + CSS + JS)
├── wrangler.toml             # Worker configuration with custom domain routes
├── images/                   # GitHub-hosted images directory
├── LogoForInsta.png          # Site logo
├── fav-walnuts.png           # Favicon
├── README.md                 # This file
├── DEPLOYMENT.md             # Deployment instructions  
├── CUSTOM_DOMAIN_SETUP.md    # Custom domain configuration guide
└── CLAUDE.md                # Claude Code instructions
```

## Local Development

```bash
# Install Wrangler CLI
npm install -g wrangler

# Start local development
wrangler dev
```

Access locally:
- Portfolio: http://localhost:8787
- Admin: http://localhost:8787/admin  

## Image Management

Images are hosted on GitHub for free tier compatibility:
1. Add images to `/images/` directory in your repository
2. Commit and push to GitHub
3. Use filename in admin interface (auto-generates GitHub URL)
4. GitHub raw URL format: `https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/filename.jpg`

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy
```

See DEPLOYMENT.md for detailed setup instructions.

## Security

- Admin interface protected with HTTP Basic Authentication
- CORS headers configured for API access
- Input validation on all forms
- No sensitive data in client-side code

## Technology Stack

- **Hosting**: Cloudflare Workers (serverless)
- **Storage**: Cloudflare KV (key-value store)  
- **Images**: GitHub raw URLs (free)
- **Authentication**: HTTP Basic Auth
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Architecture**: Single-file worker with embedded resources

## Development Notes

This is a worker-first architecture where everything is served from a single Cloudflare Worker file. The worker contains embedded HTML, CSS, and JavaScript for both the portfolio site and admin interface. This eliminates the need for build processes, static file hosting, or complex deployments.