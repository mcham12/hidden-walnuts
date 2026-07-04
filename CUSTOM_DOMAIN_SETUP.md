# Custom Domain Setup for hiddenwalnuts.com

## ✅ CORRECTED FOR MAIN DOMAIN

You want the main `hiddenwalnuts.com` domain to show the portfolio. I've configured specific routes to avoid conflicts with your existing services.

## Current Status ✅

The worker is configured with targeted main-domain routes:
- `hiddenwalnuts.com` ✅ (root domain)
- `hiddenwalnuts.com/` ✅ (main page)  
- `hiddenwalnuts.com/admin` ✅ (admin interface)
- `hiddenwalnuts.com/api/*` ✅ (portfolio API)
- `www.hiddenwalnuts.com/*` ✅ (www subdomain)
- `hiddenwalnuts.com/support` ✅
- `hiddenwalnuts.com/privacy` ✅
- `hiddenwalnuts.com/portfolio` ✅
- `hiddenwalnuts.com/game` ✅

**This WON'T affect**:
- `game.hiddenwalnuts.com` (different subdomain)
- `api.hiddenwalnuts.com` (different subdomain)  
- Other existing subdomains

## What I've Done ✅

1. **Updated wrangler.toml** with specific route patterns for main domain
2. **Deployed worker** with targeted routing (root + specific paths only)
3. **Confirmed deployment** - Routes active for main domain without affecting subdomains

## What You Need to Do 👤

### Step 1: Verify Your Existing DNS Setup

**Check Cloudflare Dashboard > DNS > Records for hiddenwalnuts.com**

You should already have these records for your main domain:

#### Root Domain (hiddenwalnuts.com)
- **Type**: `A` or `CNAME`
- **Name**: `@` (or blank for root)
- **Proxy Status**: 🟠 **Proxied** (MUST be orange cloud)

#### WWW Subdomain (www.hiddenwalnuts.com)
- **Type**: `CNAME`  
- **Name**: `www`
- **Target**: `hiddenwalnuts.com` (or your existing target)
- **Proxy Status**: 🟠 **Proxied** (MUST be orange cloud)

**If these don't exist or aren't proxied (🟠 orange cloud), update them.**

**This is safe because**:
- ✅ Uses specific route patterns, not wildcards
- ✅ Only affects root domain + /admin + /api paths
- ✅ Doesn't interfere with game.hiddenwalnuts.com
- ✅ Doesn't interfere with api.hiddenwalnuts.com
- ✅ Leaves all other subdomains alone

### Step 2: Verify Worker Routes

**Go to Cloudflare Dashboard > Workers & Pages > Your Worker**

Under "Triggers" tab, you should see:
- `hiddenwalnuts.com` - Zone: hiddenwalnuts.com ✅
- `hiddenwalnuts.com/` - Zone: hiddenwalnuts.com ✅  
- `hiddenwalnuts.com/admin` - Zone: hiddenwalnuts.com ✅
- `hiddenwalnuts.com/api/*` - Zone: hiddenwalnuts.com ✅
- `www.hiddenwalnuts.com/*` - Zone: hiddenwalnuts.com ✅

### Step 3: Test the Setup

After verifying DNS is proxied (may take a few minutes to propagate):

```bash
# Test main domain
curl -I https://hiddenwalnuts.com

# Test www subdomain
curl -I https://www.hiddenwalnuts.com

# Test admin interface  
curl -I https://hiddenwalnuts.com/admin

# Test API
curl https://hiddenwalnuts.com/api/portfolio

# Test current content routes
curl -I https://hiddenwalnuts.com/portfolio
curl -I https://hiddenwalnuts.com/game
curl -I https://hiddenwalnuts.com/support
curl -I https://hiddenwalnuts.com/privacy

# Test that subdomains still work
curl -I https://game.hiddenwalnuts.com  # Should still work
curl -I https://api.hiddenwalnuts.com   # Should still work
```

Expected responses:
- **200 OK** for main domain and www
- **401 Unauthorized** for admin (requires auth)
- **200 OK** with JSON for portfolio API
- **Your existing responses** for game and api subdomains

### Step 3: Browser Testing

Visit these URLs in your browser:
- **Portfolio**: https://hiddenwalnuts.com
- **Admin**: https://hiddenwalnuts.com/admin (uses current admin credentials from the password manager / deployment configuration)
- **API**: https://hiddenwalnuts.com/api/portfolio

## Troubleshooting

### Common Issues:

**1. 404 Not Found**
- Check DNS records are **Proxied** (🟠 orange cloud)
- Verify worker routes in Cloudflare Dashboard
- Wait for DNS propagation (up to 5 minutes)

**2. SSL Certificate Issues**
- Cloudflare should handle SSL automatically
- Check SSL/TLS settings in Cloudflare Dashboard
- Use "Full" or "Flexible" SSL mode

**3. Worker Not Responding** 
- Check worker logs: `wrangler tail`
- Verify KV namespace is bound correctly
- Test with .workers.dev URL first

### DNS Propagation Check
```bash
# Check DNS resolution
nslookup hiddenwalnuts.com
nslookup www.hiddenwalnuts.com

# Check if proxied through Cloudflare
dig hiddenwalnuts.com
# Should return Cloudflare IP addresses (104.x.x.x range)
```

## Current Working URLs

While setting up custom domain, these still work:
- **Portfolio**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev
- **Admin**: https://hidden-walnuts-portfolio.mattmcarroll.workers.dev/admin

## Architecture Notes

The new setup serves your **entire website** from the Worker:
- **No separate static hosting needed** (Pages, etc.)
- **Worker handles everything**: HTML, CSS, JS, API, admin
- **Custom domain points directly to worker**

This is different from typical setups where you might have:
- Static files on Pages + API on Workers ❌ (old approach)
- Everything on Workers ✅ (your current setup)

## Next Steps After Domain Works

1. **Update social media links** to use hiddenwalnuts.com
2. **Update any external references** to the old domain
3. **Set up Google Analytics** with new domain
4. **Update meta tags** for SEO with new domain
5. **Consider adding redirect** from .workers.dev to custom domain

Let me know when you've completed the DNS setup and I can help test and troubleshoot!
