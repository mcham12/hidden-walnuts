# Custom Domain Setup for hiddenwalnuts.com

## ⚠️ UPDATED FOR MULTI-SERVICE DOMAIN

Since you have other workers and `game.hiddenwalnuts.com`, I've changed the setup to use a **subdomain** to avoid conflicts.

## Current Status ✅

The worker has been **successfully deployed with subdomain route**:
- `portfolio.hiddenwalnuts.com/*` ✅ (SAFE - won't affect your other services)

## What I've Done ✅

1. **Updated wrangler.toml** with safe subdomain route (avoiding root domain conflicts)
2. **Deployed worker** with portfolio subdomain routing
3. **Confirmed deployment** - Route active for portfolio subdomain only

## What You Need to Do 👤

### Step 1: Add DNS Record for Portfolio Subdomain

**Go to Cloudflare Dashboard > DNS > Records for hiddenwalnuts.com**

**Add this ONE record** (won't affect existing services):

#### Portfolio Subdomain (portfolio.hiddenwalnuts.com)
- **Type**: `CNAME` or `A`
- **Name**: `portfolio`
- **Target**: `100.96.0.1` (Cloudflare dummy IP) OR your existing target
- **Proxy Status**: 🟠 **Proxied** (MUST be orange cloud)

**This is safe because**:
- ✅ Doesn't touch your root domain (hiddenwalnuts.com)
- ✅ Doesn't affect game.hiddenwalnuts.com
- ✅ Doesn't interfere with other workers
- ✅ Only adds one specific subdomain

### Step 2: Verify Worker Routes

**Go to Cloudflare Dashboard > Workers & Pages > Your Worker**

Under "Triggers" tab, you should see:
- `portfolio.hiddenwalnuts.com/*` - Zone: hiddenwalnuts.com ✅

### Step 3: Test the Setup

After adding the DNS record (may take a few minutes to propagate):

```bash
# Test portfolio subdomain
curl -I https://portfolio.hiddenwalnuts.com

# Test admin interface  
curl -I https://portfolio.hiddenwalnuts.com/admin

# Test API
curl https://portfolio.hiddenwalnuts.com/api/portfolio
```

Expected responses:
- **200 OK** for portfolio subdomain
- **401 Unauthorized** for admin (requires auth)
- **200 OK** with JSON for API

### Step 4: Browser Testing

Visit these URLs in your browser:
- **Portfolio**: https://portfolio.hiddenwalnuts.com
- **Admin**: https://portfolio.hiddenwalnuts.com/admin (login: admin/hidden2024!)
- **API**: https://portfolio.hiddenwalnuts.com/api/portfolio

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