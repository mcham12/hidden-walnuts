/**
 * Cloudflare Worker for Hidden Walnuts Portfolio Admin
 * Handles CRUD operations for portfolio items using KV storage and GitHub image hosting
 */

// Configuration
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'hidden2024!';

// Authentication middleware
function requireAuth(request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Interface"',
        'Content-Type': 'text/plain'
      }
    });
  }
  
  const [scheme, encoded] = authorization.split(' ');
  if (scheme !== 'Basic') {
    return new Response('Invalid authentication scheme', { 
      status: 401,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  const credentials = atob(encoded);
  const [username, password] = credentials.split(':');
  
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return new Response('Invalid credentials', { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Interface"',
        'Content-Type': 'text/plain'
      }
    });
  }
  
  return null; // Authentication successful
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers for admin interface
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // API Routes
      if (path.startsWith('/api/')) {
        const response = await handleAPI(request, env, path);
        return new Response(response.body, {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Admin interface route (protected)
      if (path === '/admin' || path === '/admin/') {
        const authResult = requireAuth(request);
        if (authResult) return authResult;
        
        return new Response(ADMIN_HTML, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Main portfolio site route
      if (path === '/' || path === '') {
        return new Response(MAIN_HTML, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Portfolio API route (this was duplicated, moved to handleAPI)
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleAPI(request, env, path) {
  const method = request.method;
  
  if (path === '/api/portfolio') {
    if (method === 'GET') {
      const items = await getPortfolioItems(env);
      return { status: 200, body: JSON.stringify(items) };
    }
    if (method === 'POST') {
      return await createPortfolioItem(request, env);
    }
  }
  
  if (path.startsWith('/api/portfolio/')) {
    const id = path.split('/').pop();
    
    if (method === 'GET') {
      return await getPortfolioItem(env, id);
    }
    if (method === 'PUT') {
      return await updatePortfolioItem(request, env, id);
    }
    if (method === 'DELETE') {
      return await deletePortfolioItem(env, id);
    }
  }
  
  // Image upload disabled - use external URLs instead
  // if (path === '/api/upload' && method === 'POST') {
  //   return await handleImageUpload(request, env);
  // }
  
  return { status: 404, body: JSON.stringify({ error: 'Not found' }) };
}

// CRUD Operations
async function getPortfolioItems(env) {
  try {
    const { keys } = await env.PORTFOLIO_KV.list({ prefix: 'item:' });
    const items = [];
    
    for (const key of keys) {
      const item = await env.PORTFOLIO_KV.get(key.name, { type: 'json' });
      if (item) items.push(item);
    }
    
    return items.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  } catch (error) {
    console.error('Error getting portfolio items:', error);
    return [];
  }
}

async function getPortfolioItem(env, id) {
  try {
    const item = await env.PORTFOLIO_KV.get(`item:${id}`, { type: 'json' });
    if (!item) {
      return { status: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    return { status: 200, body: JSON.stringify(item) };
  } catch (error) {
    return { status: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function createPortfolioItem(request, env) {
  try {
    const data = await request.json();
    const id = generateId();
    const item = {
      id,
      title: data.title,
      description: data.description || '',
      imageUrl: data.imageUrl,
      redbubbleUrl: data.redbubbleUrl,
      tags: data.tags || [],
      featured: data.featured || false,
      dateAdded: new Date().toISOString()
    };
    
    await env.PORTFOLIO_KV.put(`item:${id}`, JSON.stringify(item));
    return { status: 201, body: JSON.stringify(item) };
  } catch (error) {
    return { status: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function updatePortfolioItem(request, env, id) {
  try {
    const existingItem = await env.PORTFOLIO_KV.get(`item:${id}`, { type: 'json' });
    if (!existingItem) {
      return { status: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    
    const data = await request.json();
    const updatedItem = {
      ...existingItem,
      ...data,
      id, // Ensure ID doesn't change
      dateAdded: existingItem.dateAdded // Preserve creation date
    };
    
    await env.PORTFOLIO_KV.put(`item:${id}`, JSON.stringify(updatedItem));
    return { status: 200, body: JSON.stringify(updatedItem) };
  } catch (error) {
    return { status: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function deletePortfolioItem(env, id) {
  try {
    const item = await env.PORTFOLIO_KV.get(`item:${id}`, { type: 'json' });
    if (!item) {
      return { status: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    
    await env.PORTFOLIO_KV.delete(`item:${id}`);
    return { status: 200, body: JSON.stringify({ message: 'Item deleted successfully' }) };
  } catch (error) {
    return { status: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function handleImageUpload(request, env) {
  try {
    console.log('Upload request received');
    
    // Check if we have the required environment variables
    if (!env.CLOUDFLARE_ACCOUNT_ID) {
      console.error('Missing CLOUDFLARE_ACCOUNT_ID');
      return { status: 500, body: JSON.stringify({ error: 'Server configuration error: Missing account ID' }) };
    }
    
    if (!env.CLOUDFLARE_API_TOKEN) {
      console.error('Missing CLOUDFLARE_API_TOKEN');
      return { status: 500, body: JSON.stringify({ error: 'Server configuration error: Missing API token' }) };
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      console.error('No file provided in request');
      return { status: 400, body: JSON.stringify({ error: 'No file provided' }) };
    }
    
    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Upload to Cloudflare Images
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
    console.log('Uploading to:', apiUrl);
    
    const uploadResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
      },
      body: uploadFormData
    });
    
    console.log('Upload response status:', uploadResponse.status);
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', JSON.stringify(uploadResult));
    
    if (uploadResult.success) {
      return {
        status: 200,
        body: JSON.stringify({
          imageUrl: uploadResult.result.variants[0],
          imageId: uploadResult.result.id
        })
      };
    } else {
      console.error('Upload failed:', uploadResult);
      return {
        status: 400,
        body: JSON.stringify({ 
          error: 'Upload failed', 
          details: uploadResult.errors || uploadResult.messages || 'Unknown error',
          cloudflareResponse: uploadResult
        })
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return { status: 500, body: JSON.stringify({ error: error.message, stack: error.stack }) };
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Main Website HTML
const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts</title>
    <link rel="icon" type="image/png" sizes="32x32" href="fav-walnuts.png?v=3">
    <link rel="icon" type="image/png" sizes="16x16" href="fav-walnuts.png?v=3">
    <link rel="shortcut icon" type="image/x-icon" href="fav-walnuts.png?v=3">
    <link rel="apple-touch-icon" sizes="180x180" href="fav-walnuts.png?v=3">
    <meta name="msapplication-TileImage" content="fav-walnuts.png?v=3">
    <style>
:root {
    --primary-color: #2a5d31;
    --primary-light: #4a7c55;
    --primary-dark: #1e4022;
    --secondary-color: #7fad69;
    --accent-color: #f8faf6;
    --accent-warm: #f5f7f1;
    --text-light: #6c757d;
    --background-color: #ffffff;
    --card-shadow: 0 4px 20px rgba(42, 93, 49, 0.08);
    --card-shadow-hover: 0 8px 30px rgba(42, 93, 49, 0.15);
    --border-radius: 12px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #ffffff;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Navigation Styles */
.main-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

.logo-container {
    display: flex;
    align-items: center;
    gap: 15px;
}

.nav-logo {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
}

.logo-container h1 {
    font-size: 1.8rem;
    color: var(--primary-color);
    font-weight: 700;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.nav-link {
    text-decoration: none;
    color: #666;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: var(--transition);
}

.nav-link:hover,
.nav-link.active {
    color: var(--primary-color);
    background: var(--accent-color);
}

.store-link {
    background: var(--primary-color);
    color: white !important;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.store-link:hover {
    background: var(--primary-dark) !important;
    transform: translateY(-2px);
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--accent-color) 0%, #ffffff 100%);
    padding: 4rem 0;
    text-align: center;
}

.hero-content h2 {
    font-size: 3rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-weight: 700;
}

.hero-content p {
    font-size: 1.2rem;
    color: var(--text-light);
    max-width: 600px;
    margin: 0 auto;
}

/* Portfolio Section */
.portfolio-section {
    padding: 2rem 0;
}

/* Portfolio Grid - Masonry Style */
.portfolio-grid {
    columns: 4;
    column-gap: 15px;
    margin: 0;
}

.portfolio-item {
    display: inline-block;
    width: 100%;
    margin-bottom: 15px;
    break-inside: avoid;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.portfolio-item:hover {
    transform: scale(1.02);
}

.portfolio-item-image {
    width: 100%;
    height: auto;
    display: block;
    transition: var(--transition);
}

.portfolio-item:hover .portfolio-item-image {
    filter: brightness(0.9);
}

/* Title overlay for hover effect (like Maggie Carroll site) */
.portfolio-item-title {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: white;
    padding: 20px 15px 15px;
    font-size: 16px;
    font-weight: 600;
    opacity: 0;
    transition: var(--transition);
    pointer-events: none;
}

.portfolio-item:hover .portfolio-item-title {
    opacity: 1;
}

.portfolio-item:hover .portfolio-item-image {
    filter: brightness(0.7);
}

/* Remove card-style elements (except title which we need for hover) */
.portfolio-item-content,
.portfolio-item-description,
.portfolio-item-tags,
.portfolio-item-actions,
.btn-primary,
.featured-badge,
.tag {
    display: none;
}

/* Loading States */
.loading-state {
    text-align: center;
    padding: 4rem 0;
    color: var(--text-light);
}

.spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Lightbox Modal */
.lightbox {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.lightbox.active {
    display: flex;
}

.lightbox-content {
    background: white;
    border-radius: var(--border-radius);
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
}

.lightbox-close {
    position: absolute;
    top: 15px;
    right: 20px;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    z-index: 10;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.lightbox-image-container {
    position: relative;
}

.lightbox-image-container img {
    width: 100%;
    height: auto;
    display: block;
}

.lightbox-info {
    padding: 2rem;
}

.lightbox-info h3 {
    font-size: 1.5rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.lightbox-info p {
    color: var(--text-light);
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.lightbox-actions {
    text-align: center;
}

.lightbox-actions .btn-primary {
    display: inline-flex !important;
    background: var(--primary-color);
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    align-items: center;
    gap: 8px;
    transition: var(--transition);
}

.lightbox-actions .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

/* Footer */
footer {
    background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
    color: white;
    padding: 3rem 0 2rem;
}

.footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.footer-section h3 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
}

.social-links {
    display: flex;
    gap: 1rem;
}

.social-links a {
    color: white;
    font-size: 1.5rem;
    width: 50px;
    height: 50px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: var(--transition);
}

.social-links a:hover {
    background: white;
    color: var(--primary-color);
    transform: translateY(-3px);
}

.footer-store-link {
    color: white;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    transition: var(--transition);
}

.footer-store-link:hover {
    background: white;
    color: var(--primary-color);
}

.footer-bottom {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.copyright {
    opacity: 0.8;
    font-size: 0.9rem;
}

/* X Icon Style */
.x-icon {
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    font-size: 1.2rem;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .portfolio-grid {
        columns: 3;
        column-gap: 12px;
    }
    
    .portfolio-item {
        margin-bottom: 12px;
    }
}

@media (max-width: 768px) {
    .main-nav {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
    
    .nav-links {
        gap: 1rem;
    }
    
    .hero-content h2 {
        font-size: 2.5rem;
    }
    
    .portfolio-grid {
        columns: 2;
        column-gap: 10px;
    }
    
    .portfolio-item {
        margin-bottom: 10px;
    }
    
    .lightbox-content {
        max-width: 95%;
        margin: 20px;
    }
    
    .lightbox-info {
        padding: 1.5rem;
    }
}

@media (max-width: 480px) {
    .logo-container h1 {
        font-size: 1.5rem;
    }
    
    .hero-content h2 {
        font-size: 2rem;
    }
    
    .hero-content p {
        font-size: 1rem;
    }
    
    .portfolio-grid {
        columns: 1;
        column-gap: 0;
    }
    
    .portfolio-item {
        margin-bottom: 8px;
    }
    
    .social-links {
        justify-content: center;
    }
    
    .footer-content {
        grid-template-columns: 1fr;
        text-align: center;
    }
}
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <header>
        <nav class="main-nav">
            <div class="logo-container">
                <img src="${GITHUB_BASE_URL}LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </div>
            <div class="nav-links">
                <!-- Clean navigation - no links needed -->
            </div>
        </nav>
    </header>

    <main>
        <!-- Clean design - no hero section needed -->

        <section id="portfolio" class="portfolio-section">
            <div class="container">
                <div class="portfolio-grid" id="portfolioGrid">
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading portfolio...</p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>Follow Us</h3>
                    <div class="social-links">
                        <a href="https://instagram.com/hiddenwalnuts" target="_blank" aria-label="Instagram">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a href="https://pinterest.com/hiddenwalnuts" target="_blank" aria-label="Pinterest">
                            <i class="fab fa-pinterest"></i>
                        </a>
                        <a href="https://x.com/hiddenwalnuts" target="_blank" aria-label="X">
                            <span class="x-icon">𝕏</span>
                        </a>
                    </div>
                </div>
                
                <div class="footer-section">
                    <h3>Shop</h3>
                    <a href="https://www.teepublic.com/user/hidden-walnuts" target="_blank" class="footer-store-link">
                        Visit our TeePublic Store
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" class="footer-store-link" style="margin-top: 10px;">
                        Visit our Redbubble Store
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="copyright">
                    &copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.
                </div>
            </div>
        </div>
    </footer>

    <!-- Image Lightbox Modal -->
    <div id="lightbox" class="lightbox">
        <div class="lightbox-content">
            <button class="lightbox-close">&times;</button>
            <div class="lightbox-image-container">
                <img id="lightboxImage" src="" alt="">
            </div>
            <div class="lightbox-info">
                <h3 id="lightboxTitle"></h3>
                <p id="lightboxDescription"></p>
                <div class="lightbox-actions">
                    <a id="lightboxBuyLink" href="#" target="_blank" class="btn-primary">
                        <i class="fas fa-shopping-cart"></i> Buy on Redbubble
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
document.addEventListener('DOMContentLoaded', function() {
    initializePortfolio();
    initializeLightbox();
    updateCopyright();
});

let allPortfolioItems = [];

async function initializePortfolio() {
    try {
        await loadPortfolioItems();
        renderPortfolioItems();
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        showError('Failed to load portfolio items. Please try again later.');
    }
}

async function loadPortfolioItems() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    
    if (window.location.protocol === 'file:') {
        console.log('Running locally, using sample data');
        allPortfolioItems = getSampleData();
        return;
    }
    
    try {
        const response = await fetch('/api/portfolio');
        
        if (!response.ok) {
            console.log('API not available, using sample data');
            allPortfolioItems = getSampleData();
        } else {
            allPortfolioItems = await response.json();
            
            if (allPortfolioItems.length === 0) {
                console.log('No items from API, using sample data');
                allPortfolioItems = getSampleData();
            }
        }
        
    } catch (error) {
        console.error('Error loading portfolio items:', error);
        console.log('Using sample data as fallback');
        allPortfolioItems = getSampleData();
    }
}

function getSampleData() {
    return [
        {
            id: 'sample-1',
            title: 'Vintage Mountain Adventure',
            description: 'A beautiful vintage-style design featuring mountain landscapes and adventure themes.',
            imageUrl: 'hero-vintage-posters.png',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/123456789/1',
            tags: ['vintage', 'mountains', 'adventure'],
            featured: true,
            dateAdded: '2024-01-15'
        },
        {
            id: 'sample-2',
            title: 'Fun Pickleball Design',
            description: 'Playful and energetic pickleball-themed artwork perfect for sports enthusiasts.',
            imageUrl: 'hero-pickleball.png',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/123456790/1',
            tags: ['pickleball', 'sports', 'fun'],
            featured: false,
            dateAdded: '2024-01-10'
        },
        {
            id: 'sample-3',
            title: 'Abstract Fine Art',
            description: 'Sophisticated abstract art piece with flowing forms and beautiful color harmony.',
            imageUrl: 'hero-fineart.png',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/123456791/1',
            tags: ['abstract', 'fine art', 'modern'],
            featured: true,
            dateAdded: '2024-01-08'
        },
        {
            id: 'sample-4',
            title: 'Inspirational Poetry',
            description: 'Beautiful typography design featuring inspirational poetry and motivational quotes.',
            imageUrl: 'hero-poetry.png',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/123456792/1',
            tags: ['poetry', 'typography', 'inspiration'],
            featured: false,
            dateAdded: '2024-01-05'
        },
        {
            id: 'sample-5',
            title: 'Whimsical Fun Design',
            description: 'Bright and cheerful design with whimsical elements that bring joy and laughter.',
            imageUrl: 'hero-fun.png',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/123456793/1',
            tags: ['fun', 'whimsical', 'colorful'],
            featured: false,
            dateAdded: '2024-01-01'
        }
    ];
}

function renderPortfolioItems() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    
    portfolioGrid.innerHTML = '';
    
    if (allPortfolioItems.length === 0) {
        portfolioGrid.innerHTML = '<div class="no-items"><p>No portfolio items found.</p></div>';
        return;
    }
    
    allPortfolioItems.forEach(item => {
        const portfolioItem = createPortfolioItemElement(item);
        portfolioGrid.appendChild(portfolioItem);
    });
}

function createPortfolioItemElement(item) {
    const portfolioItem = document.createElement('div');
    portfolioItem.className = 'portfolio-item';
    portfolioItem.setAttribute('data-id', item.id);
    
    const imageUrl = item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI4MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNDAiIHk9IjEyNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
    
    portfolioItem.innerHTML = 
        '<img src="' + imageUrl + '" alt="' + item.title + '" class="portfolio-item-image" loading="lazy">' +
        '<div class="portfolio-item-title">' + item.title + '</div>';
    
    // Click directly to Redbubble (not lightbox)
    portfolioItem.addEventListener('click', () => {
        if (item.redbubbleUrl) {
            window.open(item.redbubbleUrl, '_blank');
        }
    });
    
    return portfolioItem;
}

function initializeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeButton = document.querySelector('.lightbox-close');
    
    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

function openLightbox(item) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDescription = document.getElementById('lightboxDescription');
    const lightboxBuyLink = document.getElementById('lightboxBuyLink');
    
    lightboxImage.src = item.imageUrl;
    lightboxImage.alt = item.title;
    lightboxTitle.textContent = item.title;
    lightboxDescription.textContent = item.description || 'No description available.';
    lightboxBuyLink.href = item.redbubbleUrl;
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function showError(message) {
    const portfolioGrid = document.getElementById('portfolioGrid');
    portfolioGrid.innerHTML = '<div class="error-state"><p style="color: #dc3545; text-align: center; padding: 2rem;"><i class="fas fa-exclamation-triangle"></i> ' + message + '</p></div>';
}

function updateCopyright() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});
    </script>
</body>
</html>`;

// Admin Interface HTML
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts - Admin</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 { color: #2c5530; margin-bottom: 10px; }
        
        .tabs {
            display: flex;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tab {
            flex: 1;
            padding: 15px 20px;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        .tab.active {
            background: #2c5530;
            color: white;
        }
        
        .tab-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #2c5530;
        }
        
        textarea {
            height: 100px;
            resize: vertical;
        }
        
        .file-upload {
            border: 2px dashed #ccc;
            border-radius: 6px;
            padding: 40px;
            text-align: center;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .file-upload:hover {
            border-color: #2c5530;
            background: #f0f8f0;
        }
        
        .file-upload.dragover {
            border-color: #2c5530;
            background: #e8f5e8;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
        }
        
        .btn-primary {
            background: #2c5530;
            color: white;
        }
        
        .btn-primary:hover {
            background: #1e3a21;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .item-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        
        .item-card:hover {
            transform: translateY(-2px);
        }
        
        .item-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: #f0f0f0;
        }
        
        .item-content {
            padding: 20px;
        }
        
        .item-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }
        
        .item-description {
            color: #666;
            margin-bottom: 15px;
            font-size: 14px;
        }
        
        .item-actions {
            display: flex;
            gap: 10px;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #2c5530;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .hidden { display: none; }
        
        .tags-input {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 8px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            min-height: 44px;
        }
        
        .tag {
            background: #2c5530;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .tag-remove {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        }
        
        #tagInput {
            border: none;
            outline: none;
            flex: 1;
            min-width: 120px;
            padding: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Hidden Walnuts Portfolio Admin</h1>
            <p>Manage your portfolio items and images</p>
        </header>

        <div class="tabs">
            <button class="tab active" onclick="showTab('add')">Add New Item</button>
            <button class="tab" onclick="showTab('manage')">Manage Items</button>
        </div>

        <!-- Add New Item Tab -->
        <div id="add-tab" class="tab-content">
            <h2>Add New Portfolio Item</h2>
            <div id="alert-container"></div>
            
            <form id="item-form">
                <div class="form-group">
                    <label for="title">Title *</label>
                    <input type="text" id="title" name="title" required>
                </div>
                
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" placeholder="Optional description of the artwork"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="imageUrl">Image URL *</label>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: #666; font-size: 14px; white-space: nowrap;">${GITHUB_BASE_URL}</span>
                        <input type="text" id="imageFilename" name="imageFilename" required placeholder="artwork.jpg" style="flex: 1;">
                    </div>
                    <input type="hidden" id="imageUrl" name="imageUrl">
                    <p style="font-size: 14px; color: #666; margin-top: 5px;">
                        Just add your filename! Upload images to your GitHub repo's <code>/images/</code> folder first.
                    </p>
                    <div id="image-preview" class="hidden" style="margin-top: 15px;">
                        <img id="preview-img" style="max-width: 200px; border-radius: 6px;">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="redbubbleUrl">Redbubble URL *</label>
                    <input type="url" id="redbubbleUrl" name="redbubbleUrl" required placeholder="https://www.redbubble.com/shop/ap/...">
                </div>
                
                <div class="form-group">
                    <label for="tags">Tags</label>
                    <div class="tags-input" id="tags-container">
                        <input type="text" id="tagInput" placeholder="Type and press Enter to add tags">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="featured" name="featured"> Featured item
                    </label>
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <span id="submit-text">Add Portfolio Item</span>
                    <span id="submit-loading" class="loading hidden"></span>
                </button>
                <button type="button" class="btn btn-secondary" onclick="resetForm()">Reset Form</button>
            </form>
        </div>

        <!-- Manage Items Tab -->
        <div id="manage-tab" class="tab-content hidden">
            <h2>Manage Portfolio Items</h2>
            <div id="items-container">
                <div class="loading"></div>
            </div>
        </div>
    </div>

    <script>
        let currentItems = [];
        let currentTags = [];
        let editingId = null;
        
        // Tab switching
        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            
            event.target.classList.add('active');
            document.getElementById(tabName + '-tab').classList.remove('hidden');
            
            if (tabName === 'manage') {
                loadItems();
            }
        }
        
        // Image URL preview handling
        const imageFilenameInput = document.getElementById('imageFilename');
        const imageUrlInput = document.getElementById('imageUrl');
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const baseGitHubUrl = '${GITHUB_BASE_URL}';
        
        let previewTimeout;
        imageFilenameInput.addEventListener('input', (e) => {
            const filename = e.target.value.trim();
            
            // Clear previous timeout
            clearTimeout(previewTimeout);
            
            if (filename) {
                const fullUrl = baseGitHubUrl + filename;
                imageUrlInput.value = fullUrl;
                
                // Only try to preview after user stops typing for 500ms
                previewTimeout = setTimeout(() => {
                    if (isValidImageUrl(fullUrl)) {
                        previewImg.src = fullUrl;
                        previewImg.onload = () => {
                            imagePreview.classList.remove('hidden');
                        };
                        previewImg.onerror = () => {
                            imagePreview.classList.add('hidden');
                        };
                    } else {
                        imagePreview.classList.add('hidden');
                    }
                }, 500);
            } else {
                imageUrlInput.value = '';
                imagePreview.classList.add('hidden');
            }
        });
        
        function isValidImageUrl(url) {
            return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('imgur.com') || url.includes('github');
        }
        
        // Tags handling
        const tagInput = document.getElementById('tagInput');
        const tagsContainer = document.getElementById('tags-container');
        
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
        
        function addTag() {
            const value = tagInput.value.trim();
            if (value && !currentTags.includes(value)) {
                currentTags.push(value);
                renderTags();
                tagInput.value = '';
            }
        }
        
        function removeTag(tag) {
            currentTags = currentTags.filter(t => t !== tag);
            renderTags();
        }
        
        function renderTags() {
            const tags = tagsContainer.querySelectorAll('.tag');
            tags.forEach(tag => tag.remove());
            
            currentTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.innerHTML = \`
                    \${tag}
                    <button type="button" class="tag-remove" onclick="removeTag('\${tag}')">&times;</button>
                \`;
                tagsContainer.insertBefore(tagElement, tagInput);
            });
        }
        
        // Form submission
        document.getElementById('item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.querySelector('button[type="submit"]');
            const submitText = document.getElementById('submit-text');
            const submitLoading = document.getElementById('submit-loading');
            
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');
            
            try {
                // Create portfolio item with image URL
                const itemData = {
                    title: document.getElementById('title').value,
                    description: document.getElementById('description').value,
                    imageUrl: document.getElementById('imageUrl').value,
                    redbubbleUrl: document.getElementById('redbubbleUrl').value,
                    tags: currentTags,
                    featured: document.getElementById('featured').checked
                };
                
                const method = editingId ? 'PUT' : 'POST';
                const url = editingId ? \`/api/portfolio/\${editingId}\` : '/api/portfolio';
                
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showAlert(\`Portfolio item \${editingId ? 'updated' : 'added'} successfully!\`, 'success');
                    resetForm();
                    if (editingId) {
                        editingId = null;
                        submitText.textContent = 'Add Portfolio Item';
                    }
                } else {
                    throw new Error(result.error || 'Failed to save item');
                }
                
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');
            }
        });
        
        // Load and display items
        async function loadItems() {
            const container = document.getElementById('items-container');
            container.innerHTML = '<div class="loading"></div>';
            
            try {
                const response = await fetch('/api/portfolio');
                currentItems = await response.json();
                renderItems();
            } catch (error) {
                container.innerHTML = \`<p style="color: red;">Error loading items: \${error.message}</p>\`;
            }
        }
        
        function renderItems() {
            const container = document.getElementById('items-container');
            
            if (currentItems.length === 0) {
                container.innerHTML = '<p>No portfolio items found. Add some items to get started!</p>';
                return;
            }
            
            const grid = document.createElement('div');
            grid.className = 'items-grid';
            
            currentItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = \`
                    <img src="\${item.imageUrl}" alt="\${item.title}" class="item-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSI+SW1hZ2U8L3RleHQ+PC9zdmc+'">
                    <div class="item-content">
                        <div class="item-title">\${item.title}</div>
                        <div class="item-description">\${item.description || 'No description'}</div>
                        <div style="margin-bottom: 10px;">
                            <small style="color: #666;">
                                Tags: \${item.tags?.length ? item.tags.join(', ') : 'None'}
                                \${item.featured ? ' • Featured' : ''}
                            </small>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-secondary" onclick="editItem('\${item.id}')">Edit</button>
                            <button class="btn btn-danger" onclick="deleteItem('\${item.id}', '\${item.title}')">Delete</button>
                            <a href="\${item.redbubbleUrl}" target="_blank" class="btn btn-primary">View Product</a>
                        </div>
                    </div>
                \`;
                grid.appendChild(card);
            });
            
            container.innerHTML = '';
            container.appendChild(grid);
        }
        
        // Edit item
        function editItem(id) {
            const item = currentItems.find(i => i.id === id);
            if (!item) return;
            
            editingId = id;
            
            document.getElementById('title').value = item.title;
            document.getElementById('description').value = item.description || '';
            document.getElementById('redbubbleUrl').value = item.redbubbleUrl;
            document.getElementById('featured').checked = item.featured || false;
            
            currentTags = item.tags || [];
            renderTags();
            
            // Show preview of existing image
            previewImg.src = item.imageUrl;
            previewName.textContent = 'Current image';
            imagePreview.classList.remove('hidden');
            
            // Remove required from file input for editing
            fileInput.removeAttribute('required');
            
            document.getElementById('submit-text').textContent = 'Update Portfolio Item';
            showTab('add');
        }
        
        // Delete item
        async function deleteItem(id, title) {
            if (!confirm(\`Are you sure you want to delete "\${title}"?\`)) return;
            
            try {
                const response = await fetch(\`/api/portfolio/\${id}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    showAlert('Item deleted successfully!', 'success');
                    loadItems();
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Delete failed');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'error');
            }
        }
        
        // Utility functions
        function resetForm() {
            document.getElementById('item-form').reset();
            currentTags = [];
            editingId = null;
            renderTags();
            imagePreview.classList.add('hidden');
            imageUrlInput.value = '';
            document.getElementById('submit-text').textContent = 'Add Portfolio Item';
            clearAlerts();
        }
        
        function showAlert(message, type) {
            const container = document.getElementById('alert-container');
            container.innerHTML = \`<div class="alert alert-\${type}">\${message}</div>\`;
            setTimeout(clearAlerts, 5000);
        }
        
        function clearAlerts() {
            document.getElementById('alert-container').innerHTML = '';
        }
    </script>
</body>
</html>`;