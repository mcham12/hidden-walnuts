# Custom Domain Setup for hiddenwalnuts.com

## Current Status ✅

The worker has been **successfully deployed with custom domain routes**:
- `hiddenwalnuts.com/*` ✅
- `www.hiddenwalnuts.com/*` ✅

## What I've Done ✅

1. **Updated wrangler.toml** with custom domain routes
2. **Deployed worker** with the new routing configuration
3. **Confirmed deployment** - Cloudflare shows the routes are active

## What You Need to Do 👤

### Step 1: DNS Configuration in Cloudflare Dashboard

**Go to Cloudflare Dashboard > DNS > Records for hiddenwalnuts.com**

You need to ensure the following DNS records exist:

#### Root Domain (hiddenwalnuts.com)
- **Type**: `A` or `CNAME` 
- **Name**: `@` (or leave blank for root)
- **Target**: Your current target OR `100.96.0.1` (Cloudflare dummy IP)
- **Proxy Status**: 🟠 **Proxied** (MUST be orange cloud, not gray)

#### WWW Subdomain (www.hiddenwalnuts.com)  
- **Type**: `CNAME`
- **Name**: `www`
- **Target**: `hiddenwalnuts.com` OR `100.96.0.1`
- **Proxy Status**: 🟠 **Proxied** (MUST be orange cloud, not gray)

**Important**: The 🟠 **Proxied status** (orange cloud) is **REQUIRED** for Workers to intercept requests.

### Step 2: Verify Worker Routes

**Go to Cloudflare Dashboard > Workers & Pages > Your Worker**

Under "Triggers" tab, you should see:
- `hiddenwalnuts.com/*` - Zone: hiddenwalnuts.com ✅
- `www.hiddenwalnuts.com/*` - Zone: hiddenwalnuts.com ✅

If these are missing, the deployment didn't work correctly.

### Step 3: Test the Setup

After DNS changes (may take a few minutes to propagate):

```bash
# Test main domain
curl -I https://hiddenwalnuts.com

# Test www subdomain  
curl -I https://www.hiddenwalnuts.com

# Test admin interface
curl -I https://hiddenwalnuts.com/admin

# Test API
curl https://hiddenwalnuts.com/api/portfolio
```

Expected responses:
- **200 OK** for main domain and www
- **401 Unauthorized** for admin (requires auth)
- **200 OK** with JSON for API

### Step 4: Browser Testing

Visit these URLs in your browser:
- **Portfolio**: https://hiddenwalnuts.com
- **Admin**: https://hiddenwalnuts.com/admin (login: admin/hidden2024!)
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