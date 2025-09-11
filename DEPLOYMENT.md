# Hidden Walnuts Portfolio - Deployment Guide

This guide will help you deploy your new portfolio website with the admin interface to Cloudflare.

## Overview

Your new architecture includes:
- **Main Site**: Portfolio gallery inspired by Maggie Carroll's design
- **Admin Interface**: Password-protected CRUD interface for managing portfolio items
- **API**: Cloudflare Workers handling image uploads and data management
- **Storage**: Cloudflare KV for metadata, Cloudflare Images for file storage

## Prerequisites

1. **Cloudflare Account**: You'll need a Cloudflare account
2. **Domain**: Your domain should be managed through Cloudflare
3. **Wrangler CLI**: Install the Cloudflare Workers CLI tool

```bash
npm install -g wrangler
```

## Step 1: Set Up Cloudflare Services

### 1.1 Create KV Namespace

```bash
# Login to Cloudflare
wrangler login

# Create production KV namespace
wrangler kv:namespace create "PORTFOLIO_KV"

# Create preview KV namespace for development
wrangler kv:namespace create "PORTFOLIO_KV" --preview
```

Copy the namespace IDs and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PORTFOLIO_KV"
id = "your-production-kv-id-here"
preview_id = "your-preview-kv-id-here"
```

### 1.2 Set Up Cloudflare Images

1. Go to your Cloudflare Dashboard
2. Navigate to Images
3. Enable Cloudflare Images
4. Note your Account ID (found in the right sidebar)

### 1.3 Create API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Custom Token
3. Permissions:
   - Zone: Zone:Read (for your domain)
   - Account: Cloudflare Images:Edit
   - Account: Account:Read
4. Account Resources: Include → Your Account
5. Zone Resources: Include → Your Domain Zone
6. Copy the generated token

## Step 2: Configure Environment Variables

Set your environment variables:

```bash
# Set your account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Enter your account ID when prompted

# Set your API token
wrangler secret put CLOUDFLARE_API_TOKEN
# Enter your API token when prompted
```

## Step 3: Update Configuration

### 3.1 Update wrangler.toml

Edit `wrangler.toml` with your domain information:

```toml
name = "hidden-walnuts-portfolio"

# Replace with your domain
[[routes]]
pattern = "hiddenwalnuts.com/api/*"
zone_name = "hiddenwalnuts.com"

[[routes]]
pattern = "hiddenwalnuts.com/admin"
zone_name = "hiddenwalnuts.com"
```

### 3.2 Test Locally (Optional)

```bash
# Start local development server
wrangler dev

# Your site will be available at:
# http://localhost:8787 - Main portfolio
# http://localhost:8787/admin - Admin interface
# http://localhost:8787/api/portfolio - API endpoint
```

## Step 4: Deploy to Cloudflare

### 4.1 Deploy the Worker

```bash
# Deploy to production
wrangler deploy
```

### 4.2 Deploy Static Files to Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect your Git repository OR use Direct Upload
4. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
5. Deploy

## Step 5: Set Up Authentication for Admin

### Option A: Cloudflare Access (Recommended)

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Add an Application:
   - Application name: "Hidden Walnuts Admin"
   - Subdomain: your domain
   - Path: `/admin`
   - Application type: Self-hosted
3. Create Policy:
   - Policy name: "Admin Access"
   - Action: Allow
   - Rules: Configure based on your needs (email, IP, etc.)

### Option B: Basic HTTP Authentication

Add to your worker code in `_worker.js`:

```javascript
// Add this function before your fetch handler
function requireAuth(request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin"'
      }
    });
  }
  
  const [scheme, encoded] = authorization.split(' ');
  if (scheme !== 'Basic') {
    return new Response('Invalid authentication scheme', { status: 401 });
  }
  
  const credentials = atob(encoded);
  const [username, password] = credentials.split(':');
  
  // Replace with your admin credentials
  if (username !== 'admin' || password !== 'your-secure-password') {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  return null; // Authentication successful
}

// Then in your fetch handler, protect the admin route:
if (path === '/admin' || path === '/admin/') {
  const authResult = requireAuth(request);
  if (authResult) return authResult;
  
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

## Step 6: Verify Deployment

1. **Main Site**: Visit your domain to see the portfolio gallery
2. **Admin Interface**: Visit `yourdomain.com/admin` to access the admin panel
3. **API**: Test `yourdomain.com/api/portfolio` to see if data loads

## Step 7: Add Your First Portfolio Items

1. Go to your admin interface
2. Upload an image and fill in the details
3. Add your Redbubble product URL
4. Save the item
5. Verify it appears on your main site

## Troubleshooting

### Common Issues:

1. **404 on API routes**: Ensure your routes in `wrangler.toml` match your domain
2. **KV errors**: Double-check your namespace IDs in `wrangler.toml`
3. **Image upload fails**: Verify your API token has Cloudflare Images permissions
4. **Admin access blocked**: Check your Cloudflare Access policies

### Debug Commands:

```bash
# View logs
wrangler tail

# Check KV namespace
wrangler kv:key list --binding PORTFOLIO_KV

# Test a specific route
curl -X GET https://yourdomain.com/api/portfolio
```

## File Structure

Your deployed structure will be:

```
/
├── index.html          # Main portfolio gallery
├── styles.css          # Updated portfolio styles
├── script.js           # Portfolio functionality
├── _worker.js          # Cloudflare Worker (API + Admin)
├── wrangler.toml       # Worker configuration
└── [image files]       # Your existing images (optional)
```

## Security Notes

1. **Admin Access**: Always use strong authentication for your admin interface
2. **API Tokens**: Never commit API tokens to your repository
3. **Environment Variables**: Use Wrangler secrets for sensitive data
4. **CORS**: The worker includes CORS headers for API access

## Next Steps

1. **Custom Domain**: If using a custom domain, update DNS settings in Cloudflare
2. **SSL**: Ensure SSL is enabled (usually automatic with Cloudflare)
3. **Caching**: Configure caching rules in Cloudflare for optimal performance
4. **Monitoring**: Set up Cloudflare Analytics to monitor your site

## Support

If you encounter issues:
1. Check Cloudflare Dashboard logs
2. Use `wrangler tail` for real-time debugging
3. Verify all configuration files match your setup
4. Test locally with `wrangler dev` first

Your new portfolio site is now ready with a powerful admin interface for managing your artwork and Redbubble products!