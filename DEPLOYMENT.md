# Hidden Walnuts Portfolio - Deployment Guide

## Architecture Overview

This project uses a **single Cloudflare Worker** architecture:
- Worker serves portfolio site, admin interface, and API endpoints
- Cloudflare KV stores portfolio metadata  
- GitHub raw URLs for free image hosting
- HTTP Basic Auth for admin protection

## Current Status ✅

The site is **already deployed and working**:
- **Portfolio**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev
- **Admin**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev/admin
  - Username: `admin`
  - Password: `hidden2024!`

## Prerequisites

1. **Cloudflare Account** (free tier works)
2. **Wrangler CLI** installed:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. **GitHub repository** for image hosting

## Initial Setup (Already Complete)

### 1. KV Namespace Setup ✅
```bash
# These are already created:
# Production KV: 6f7bb7f0d8064c7d8d3dbc7ba320ad6b
# Preview KV: 9da2c6a1d97543c9b5edfbc084e68203
```

### 2. Configuration Files ✅
- `wrangler.toml` - Worker configuration with KV bindings
- `_worker.js` - Complete application code

## Making Changes

### Deploy Updates
```bash
# Deploy changes to production
wrangler deploy

# View live logs
wrangler tail
```

### Local Development
```bash
# Run locally for testing
wrangler dev

# Access locally:
# Portfolio: http://localhost:8787
# Admin: http://localhost:8787/admin
```

### Adding Images

1. **Add to GitHub**:
   ```bash
   # Add image files to /images/ directory
   git add images/new-artwork.jpg
   git commit -m "Add new artwork"
   git push
   ```

2. **Add via Admin Interface**:
   - Go to admin interface (login required)
   - Enter just the filename: `new-artwork.jpg`
   - System auto-generates GitHub URL
   - Fill in title, description, Redbubble URL
   - Save

### Updating Authentication

Edit credentials in `_worker.js`:
```javascript
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'your-new-password';
```

Then deploy:
```bash
wrangler deploy
```

## File Structure

```
/
├── _worker.js          # Complete application (HTML/CSS/JS/API)
├── wrangler.toml       # Cloudflare configuration
├── images/             # Image files for GitHub hosting
│   └── *.jpg/png       # Artwork files
├── LogoForInsta.png    # Site logo
├── fav-walnuts.png     # Favicon
└── docs/               # Documentation
    ├── README.md
    ├── DEPLOYMENT.md
    └── CLAUDE.md
```

## Environment Variables

Currently using constants in worker code:
- `GITHUB_BASE_URL` - GitHub raw URL base
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Auth credentials

For production, consider using Wrangler secrets:
```bash
wrangler secret put ADMIN_PASSWORD
# Enter password when prompted
```

## Monitoring & Debugging

```bash
# View real-time logs
wrangler tail

# Pretty formatted logs  
wrangler tail --format=pretty

# View KV data
wrangler kv:key list --binding PORTFOLIO_KV

# Test specific endpoint
curl https://hidden-walnuts-portfolio.mattmcarroll.workers.dev/api/portfolio
```

## Security Features

- ✅ HTTP Basic Auth on admin interface
- ✅ CORS headers for API access
- ✅ Input validation on forms
- ✅ No sensitive data in client code
- ✅ GitHub URLs prevent hotlinking issues

## Troubleshooting

### Common Issues:

**404 on routes**: 
- Check `wrangler.toml` route configuration
- Verify worker is deployed: `wrangler deploy`

**KV errors**:
- Confirm namespace IDs in `wrangler.toml`
- Check KV binding: `PORTFOLIO_KV`

**Admin login fails**:
- Verify credentials in `_worker.js`
- Check browser isn't caching old auth

**Images don't load**:
- Ensure images are pushed to GitHub
- Verify filename matches exactly
- Check GitHub repository is public

### Debug Commands:
```bash
# Check worker status
wrangler status

# View deployment logs
wrangler tail

# Test locally
wrangler dev
```

## Production Checklist

- [x] Worker deployed successfully
- [x] KV namespace configured
- [x] Admin authentication working
- [x] GitHub image hosting operational
- [x] Portfolio site loading correctly
- [x] Admin interface functional
- [x] API endpoints responding
- [x] Documentation updated

## Scaling Considerations

Current free tier limits:
- **Workers**: 100,000 requests/day
- **KV**: 100,000 read operations/day
- **KV Storage**: 1 GB total
- **GitHub**: Unlimited public repository hosting

For higher traffic, consider:
- Cloudflare paid plans
- Image CDN (Cloudflare Images)  
- Additional caching headers

## Backup & Recovery

**Data Backup**:
```bash
# Export all KV data
wrangler kv:key list --binding PORTFOLIO_KV > kv-backup.json
```

**Image Backup**:
- Images stored in Git repository
- Automatically backed up with Git history

## Next Steps

1. **Add Real Content**: Use admin interface to add your artwork
2. **Customize Styling**: Edit CSS in `_worker.js` MAIN_HTML section  
3. **Domain Setup**: Configure custom domain in Cloudflare
4. **Analytics**: Add Cloudflare Analytics or Google Analytics
5. **SEO**: Add meta tags and structured data

The system is production-ready and fully operational!