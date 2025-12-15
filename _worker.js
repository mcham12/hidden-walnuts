/**
 * Cloudflare Worker for Hidden Walnuts Portfolio Admin
 * Last Deployed: 2025-12-15
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

            // Game landing page route
            if (path === '/game' || path === '/game/') {
                return new Response(GAME_HTML, {
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

        // Sort: featured checkbox items first, then by dateAdded (newest first)
        return items.sort((a, b) => {
            const aFeatured = a.featured ? 1 : 0;
            const bFeatured = b.featured ? 1 : 0;
            if (bFeatured !== aFeatured) return bFeatured - aFeatured;
            return new Date(b.dateAdded) - new Date(a.dateAdded);
        });
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

/* Portfolio Grid - Grid Style (Row-Major) */
.portfolio-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    margin: 0;
}

.portfolio-item {
    width: 100%;
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


/* Title overlay for hover effect (exactly like Maggie Carroll site) */
.portfolio-item-title {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 500;
    opacity: 0;
    transition: var(--transition);
    pointer-events: none;
    text-align: center;
    padding: 20px;
}

.portfolio-item:hover .portfolio-item-title {
    opacity: 1;
}

.portfolio-item:hover .portfolio-item-image {
    filter: brightness(1.1) contrast(0.8);
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
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
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
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
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
        grid-template-columns: 1fr;
        gap: 8px;
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
                <a href="/" class="nav-link active">Portfolio</a>
                <a href="/game" class="nav-link store-link">Play the Game</a>
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

// Game Landing Page HTML
const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts - The Game</title>
    <link rel="icon" type="image/png" href="fav-walnuts.png?v=3">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
:root {
    --forest-green: #2d6b3a;
    --forest-dark: #1a3d20;
    --autumn-orange: #e67e22;
    --autumn-gold: #f39c12;
    --bark-brown: #8b5a2b;
    --cream: #faf8f0;
    --leaf-green: #4a9c5d;
    --shadow: rgba(26, 61, 32, 0.2);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(180deg, #1a3d20 0%, #2d5a3a 50%, #3d7a4a 100%);
    min-height: 100vh;
    color: #333;
    overflow-x: hidden;
}

/* Floating Leaves Animation */
.leaves-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
}

.leaf {
    position: absolute;
    top: -50px;
    opacity: 0.6;
    font-size: 20px;
    animation: fall linear infinite;
}

@keyframes fall {
    0% {
        transform: translateY(-50px) rotate(0deg) translateX(0);
        opacity: 0;
    }
    10% {
        opacity: 0.6;
    }
    90% {
        opacity: 0.6;
    }
    100% {
        transform: translateY(100vh) rotate(360deg) translateX(100px);
        opacity: 0;
    }
}

/* Header */
.game-header {
    background: rgba(26, 61, 32, 0.95);
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    border-bottom: 2px solid var(--leaf-green);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: white;
}

.logo-icon {
    font-size: 2rem;
}

.logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--cream);
}

.nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
}

.nav-link {
    color: var(--cream);
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.3s;
}

.nav-link:hover {
    background: rgba(255,255,255,0.1);
}

.play-btn-nav {
    background: var(--autumn-orange);
    color: white !important;
    font-weight: 600;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    transition: all 0.3s;
}

.play-btn-nav:hover {
    background: var(--autumn-gold);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(230, 126, 34, 0.4);
}

/* Hero Section */
.hero {
    position: relative;
    padding: 6rem 2rem;
    text-align: center;
    z-index: 1;
}

.hero-content {
    max-width: 800px;
    margin: 0 auto;
}

.hero-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
}

.hero h1 {
    font-size: 3.5rem;
    color: var(--cream);
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.hero-subtitle {
    font-size: 1.3rem;
    color: rgba(255,255,255,0.9);
    margin-bottom: 2.5rem;
    line-height: 1.6;
}

.play-now-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, var(--autumn-orange), var(--autumn-gold));
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    padding: 1.2rem 3rem;
    border-radius: 50px;
    text-decoration: none;
    box-shadow: 0 6px 30px rgba(230, 126, 34, 0.5);
    transition: all 0.3s;
    animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
    from { box-shadow: 0 6px 30px rgba(230, 126, 34, 0.5); }
    to { box-shadow: 0 6px 40px rgba(230, 126, 34, 0.8); }
}

.play-now-btn:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 10px 40px rgba(230, 126, 34, 0.7);
}

.play-options {
    margin-top: 1.5rem;
    color: rgba(255,255,255,0.8);
    font-size: 0.95rem;
}

.hero-screenshot {
    margin-top: 3rem;
    position: relative;
}

.hero-screenshot img {
    max-width: 100%;
    width: 700px;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    border: 3px solid rgba(255, 255, 255, 0.2);
}

.hero-screenshot::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 6px;
    background: var(--autumn-orange);
    border-radius: 3px;
}

/* Content Sections */
.content-section {
    position: relative;
    z-index: 1;
    padding: 4rem 2rem;
}

.section-container {
    max-width: 1100px;
    margin: 0 auto;
    background: var(--cream);
    border-radius: 20px;
    padding: 3rem;
    box-shadow: 0 10px 40px var(--shadow);
}

.section-title {
    font-size: 2rem;
    color: var(--forest-dark);
    margin-bottom: 2rem;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

/* How to Play Grid */
.objective-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.objective-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    border: 2px solid transparent;
    transition: all 0.3s;
    cursor: default;
}

.objective-card:hover {
    border-color: var(--leaf-green);
    transform: translateY(-4px);
    box-shadow: 0 8px 25px var(--shadow);
}

.objective-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
}

.objective-card h4 {
    color: var(--forest-dark);
    margin-bottom: 0.5rem;
}

.objective-card p {
    font-size: 0.9rem;
    color: #666;
}

/* Controls Section */
.controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

@media (max-width: 768px) {
    .controls-grid {
        grid-template-columns: 1fr;
    }
}

.controls-panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
}

.controls-panel h4 {
    color: var(--forest-dark);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
}

.control-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0.6rem 0;
    border-bottom: 1px solid #eee;
}

.control-item:last-child {
    border-bottom: none;
}

.control-key {
    background: var(--forest-dark);
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    min-width: 60px;
    text-align: center;
}

.control-action {
    color: #555;
    font-size: 0.95rem;
}

/* Pro Tips - Carousel */
.tips-carousel-wrapper {
    position: relative;
    overflow: hidden;
    padding: 0 50px;
}

.tips-carousel {
    display: flex;
    transition: transform 0.4s ease;
    gap: 1.5rem;
}

.tip-card {
    background: linear-gradient(135deg, var(--forest-green), var(--leaf-green));
    border-radius: 12px;
    padding: 1.25rem;
    color: white;
    min-width: 200px;
    max-width: 200px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
}

.tip-card::before {
    content: '🍂';
    position: absolute;
    top: -20px;
    right: -20px;
    font-size: 4rem;
    opacity: 0.2;
}

.tip-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.75rem;
}

.tip-icon {
    font-size: 1.5rem;
}

.tip-title {
    font-weight: 600;
    font-size: 1.1rem;
}

.tip-content {
    font-size: 0.95rem;
    opacity: 0.95;
    line-height: 1.5;
}

.carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: var(--forest-dark);
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    z-index: 10;
}

.carousel-btn:hover {
    background: var(--autumn-orange);
    transform: translateY(-50%) scale(1.1);
}

.carousel-btn.prev {
    left: 0;
}

.carousel-btn.next {
    right: 0;
}

.carousel-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.carousel-btn:disabled:hover {
    background: var(--forest-dark);
    transform: translateY(-50%);
}

.carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 1.5rem;
}

.carousel-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ccc;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
}

.carousel-dot.active {
    background: var(--forest-green);
    transform: scale(1.2);
}

.carousel-dot:hover {
    background: var(--leaf-green);
}

/* Rank Progression */
.rank-journey {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 2rem 0;
    position: relative;
}

.rank-journey::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 5%;
    right: 5%;
    height: 4px;
    background: linear-gradient(90deg, var(--leaf-green), var(--autumn-orange));
    border-radius: 2px;
    z-index: 0;
}

.rank-badge {
    background: white;
    padding: 0.75rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--forest-dark);
    box-shadow: 0 3px 10px var(--shadow);
    position: relative;
    z-index: 1;
    transition: all 0.3s;
}

.rank-badge:hover {
    transform: scale(1.1);
    box-shadow: 0 5px 15px var(--shadow);
}

.rank-badge.legend {
    background: linear-gradient(135deg, var(--autumn-gold), var(--autumn-orange));
    color: white;
}

/* Benefits Comparison */
.benefits-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1.5rem;
}

.benefits-table th,
.benefits-table td {
    padding: 1rem;
    text-align: center;
    border-bottom: 1px solid #eee;
}

.benefits-table th {
    background: var(--forest-dark);
    color: white;
    font-weight: 600;
}

.benefits-table th:first-child {
    border-radius: 8px 0 0 0;
    text-align: left;
}

.benefits-table th:last-child {
    border-radius: 0 8px 0 0;
}

.benefits-table td:first-child {
    text-align: left;
    color: #555;
}

.benefits-table tr:hover {
    background: rgba(74, 156, 93, 0.05);
}

.check {
    color: var(--leaf-green);
    font-size: 1.2rem;
}

.cross {
    color: #ccc;
    font-size: 1.2rem;
}

/* Final CTA */
.final-cta {
    text-align: center;
    padding: 4rem 2rem;
    position: relative;
    z-index: 1;
}

.final-cta h2 {
    color: var(--cream);
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.final-cta p {
    color: rgba(255,255,255,0.85);
    font-size: 1.1rem;
    margin-bottom: 2rem;
}

/* Footer */
.game-footer {
    background: var(--forest-dark);
    color: var(--cream);
    padding: 2rem;
    text-align: center;
    position: relative;
    z-index: 1;
}

.footer-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.footer-links a {
    color: rgba(255,255,255,0.8);
    text-decoration: none;
    transition: color 0.3s;
}

.footer-links a:hover {
    color: var(--autumn-orange);
}

.copyright {
    opacity: 0.7;
    font-size: 0.9rem;
}

/* Responsive - Tablet Landscape */
@media (max-width: 1024px) {
    .tips-carousel-wrapper {
        padding: 0 45px;
    }

    .tip-card {
        min-width: 180px;
        max-width: 180px;
    }
}

/* Responsive - Tablet Portrait & Large Phones */
@media (max-width: 768px) {
    .hero h1 {
        font-size: 2.5rem;
    }

    .hero-subtitle {
        font-size: 1.1rem;
    }

    .play-now-btn {
        font-size: 1.2rem;
        padding: 1rem 2rem;
    }

    .section-container {
        padding: 2rem 1.5rem;
    }

    .rank-journey {
        justify-content: center;
        gap: 0.75rem;
    }

    .rank-journey::before {
        display: none;
    }

    .rank-badge {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
    }

    .benefits-table {
        font-size: 0.85rem;
    }

    .benefits-table th,
    .benefits-table td {
        padding: 0.75rem 0.5rem;
    }

    .header-content {
        flex-direction: column;
        gap: 1rem;
    }

    .tips-carousel-wrapper {
        padding: 0 40px;
    }

    .tip-card {
        min-width: 170px;
        max-width: 170px;
    }

    .carousel-btn {
        width: 35px;
        height: 35px;
        font-size: 1rem;
    }

    .objective-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Responsive - Phone Landscape */
@media (max-width: 667px) and (orientation: landscape) {
    .hero {
        padding: 3rem 2rem;
    }

    .hero-icon {
        font-size: 3rem;
    }

    .hero h1 {
        font-size: 2rem;
    }

    .content-section {
        padding: 2rem 1rem;
    }

    .section-container {
        padding: 1.5rem;
    }

    .controls-grid {
        grid-template-columns: 1fr 1fr;
    }
}

/* Responsive - Phone Portrait */
@media (max-width: 480px) {
    .hero {
        padding: 4rem 1.5rem;
    }

    .hero-icon {
        font-size: 4rem;
    }

    .hero h1 {
        font-size: 2rem;
    }

    .hero-subtitle {
        font-size: 1rem;
    }

    .play-now-btn {
        font-size: 1.1rem;
        padding: 0.9rem 1.8rem;
        gap: 8px;
    }

    .play-options {
        font-size: 0.85rem;
    }

    .hero-screenshot {
        margin-top: 2rem;
    }

    .hero-screenshot img {
        width: 100%;
        border-radius: 8px;
    }

    .content-section {
        padding: 2rem 1rem;
    }

    .section-container {
        padding: 1.5rem 1rem;
        border-radius: 12px;
    }

    .section-title {
        font-size: 1.5rem;
    }

    .objective-grid {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .objective-card {
        padding: 1rem;
    }

    .objective-icon {
        font-size: 2rem;
    }

    .objective-card h4 {
        font-size: 0.95rem;
    }

    .objective-card p {
        font-size: 0.8rem;
    }

    .controls-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .controls-panel {
        padding: 1rem;
    }

    .control-key {
        min-width: 50px;
        font-size: 0.75rem;
        padding: 0.25rem 0.4rem;
    }

    .control-action {
        font-size: 0.85rem;
    }

    .tips-carousel-wrapper {
        padding: 0 35px;
    }

    .tip-card {
        min-width: 160px;
        max-width: 160px;
        padding: 1rem;
    }

    .tip-title {
        font-size: 1rem;
    }

    .tip-content {
        font-size: 0.9rem;
    }

    .carousel-btn {
        width: 30px;
        height: 30px;
        font-size: 0.9rem;
    }

    .carousel-dots {
        gap: 6px;
    }

    .carousel-dot {
        width: 8px;
        height: 8px;
    }

    .rank-journey {
        gap: 0.5rem;
    }

    .rank-badge {
        padding: 0.4rem 0.6rem;
        font-size: 0.7rem;
    }

    .benefits-table {
        font-size: 0.75rem;
    }

    .benefits-table th,
    .benefits-table td {
        padding: 0.6rem 0.3rem;
    }

    .final-cta h2 {
        font-size: 1.8rem;
    }

    .final-cta p {
        font-size: 1rem;
    }

    .footer-links {
        flex-direction: column;
        gap: 1rem;
    }

    .game-footer {
        padding: 1.5rem 1rem;
    }
}

/* Small phones */
@media (max-width: 375px) {
    .hero h1 {
        font-size: 1.75rem;
    }

    .objective-grid {
        grid-template-columns: 1fr;
    }

    .tip-card {
        min-width: 150px;
        max-width: 150px;
    }

    .rank-badge {
        padding: 0.35rem 0.5rem;
        font-size: 0.65rem;
    }
}
    </style>
</head>
<body>
    <!-- Floating Leaves -->
    <div class="leaves-container" id="leavesContainer"></div>

    <!-- Header -->
    <header class="game-header">
        <div class="header-content">
            <a href="/" class="logo">
                <span class="logo-icon">🐿️</span>
                <span class="logo-text">Hidden Walnuts</span>
            </a>
            <nav class="nav-links">
                <a href="/" class="nav-link">Portfolio</a>
                <a href="https://game.hiddenwalnuts.com" class="nav-link play-btn-nav active">Play the Game</a>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <div class="hero-icon">🐿️</div>
            <h1>Hidden Walnuts</h1>
            <p class="hero-subtitle">
                A casual real-time multiplayer game where you play as a cute animal competing to find hidden walnuts,
                grow trees for bonus points, and survive in a dynamic forest ecosystem!
            </p>
            <a href="https://game.hiddenwalnuts.com" class="play-now-btn">
                <i class="fas fa-play"></i> Play Now
            </a>
            <p class="play-options">
                Free to play • No download required • Desktop & Mobile
            </p>
            <div class="hero-screenshot">
                <img src="${GITHUB_BASE_URL}screengrab1.png" alt="Hidden Walnuts gameplay screenshot">
            </div>
        </div>
    </section>

    <!-- How to Play -->
    <section class="content-section">
        <div class="section-container">
            <h2 class="section-title"><i class="fas fa-gamepad"></i> How to Play</h2>

            <div class="objective-grid">
                <div class="objective-card">
                    <div class="objective-icon">🔍</div>
                    <h4>Find</h4>
                    <p>Search for walnuts scattered throughout the forest</p>
                </div>
                <div class="objective-card">
                    <div class="objective-icon">🌱</div>
                    <h4>Hide & Grow</h4>
                    <p>Bury walnuts - if unfound for 60s, they grow into trees for 20 bonus points!</p>
                </div>
                <div class="objective-card">
                    <div class="objective-icon">⚔️</div>
                    <h4>Survive</h4>
                    <p>Battle AI predators and compete with other players</p>
                </div>
                <div class="objective-card">
                    <div class="objective-icon">🏆</div>
                    <h4>Rank Up</h4>
                    <p>Climb from Rookie to Legend on the leaderboard</p>
                </div>
            </div>

            <!-- Rank Journey -->
            <h3 style="text-align: center; color: var(--forest-dark); margin: 2rem 0 1rem;">Your Journey to Legend</h3>
            <div class="rank-journey">
                <span class="rank-badge">Rookie</span>
                <span class="rank-badge">Apprentice</span>
                <span class="rank-badge">Dabbler</span>
                <span class="rank-badge">Slick</span>
                <span class="rank-badge">Maestro</span>
                <span class="rank-badge">Ninja</span>
                <span class="rank-badge legend">Legend</span>
            </div>

            <!-- Controls -->
            <div class="controls-grid">
                <div class="controls-panel">
                    <h4><i class="fas fa-desktop"></i> Desktop Controls</h4>
                    <div class="control-item">
                        <span class="control-key">WASD</span>
                        <span class="control-action">Move your character <span style="opacity: 0.7; font-size: 0.85em;">(or Arrow Keys)</span></span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Click</span>
                        <span class="control-action">Pick up walnuts</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">H</span>
                        <span class="control-action">Hide a walnut</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Space</span>
                        <span class="control-action">Throw walnut <span style="opacity: 0.7; font-size: 0.85em;">(or T)</span></span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">E</span>
                        <span class="control-action">Eat walnut (+10 HP)</span>
                    </div>
                </div>
                <div class="controls-panel">
                    <h4><i class="fas fa-mobile-alt"></i> Mobile Controls</h4>
                    <div class="control-item">
                        <span class="control-key">Drag</span>
                        <span class="control-action">Virtual joystick to move</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Tap</span>
                        <span class="control-action">Pick up walnuts</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Hide Btn</span>
                        <span class="control-action">Hide a walnut</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Throw Btn</span>
                        <span class="control-action">Throw walnut</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Eat Btn</span>
                        <span class="control-action">Eat walnut to heal</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Pro Tips -->
    <section class="content-section">
        <div class="section-container">
            <h2 class="section-title"><i class="fas fa-lightbulb"></i> Pro Tips</h2>

            <div class="tips-carousel-wrapper">
                <button class="carousel-btn prev" id="prevBtn"><i class="fas fa-chevron-left"></i></button>
                <div class="tips-carousel" id="tipsCarousel">
                    <!-- Combat & Survival -->
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">⚠️</span>
                            <span class="tip-title">Danger Scales</span>
                        </div>
                        <p class="tip-content">NPCs and predators get more aggressive as your score increases - stay alert!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🦅</span>
                            <span class="tip-title">Distract Birds</span>
                        </div>
                        <p class="tip-content">Throw a walnut at bird predators (cardinals, toucans) to distract them and avoid an attack!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🦌</span>
                            <span class="tip-title">Wildebeest</span>
                        </div>
                        <p class="tip-content">Hit a Wildebeest with 4 walnuts to annoy it and make it flee. Don't waste more!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">❤️</span>
                            <span class="tip-title">Heal Up</span>
                        </div>
                        <p class="tip-content">Eat walnuts to restore 10 HP each. You can carry up to 10 walnuts - save some for healing!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">💀</span>
                            <span class="tip-title">Death Penalty</span>
                        </div>
                        <p class="tip-content">If you die, you drop ALL your walnuts and lose 5 points. Respawn is instant though!</p>
                    </div>
                    <!-- Tree Growing -->
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🌱</span>
                            <span class="tip-title">Grow Trees</span>
                        </div>
                        <p class="tip-content">Hide a walnut and protect it for 60 seconds - it grows into a tree for 20 bonus points!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🌳</span>
                            <span class="tip-title">Tree Bonus</span>
                        </div>
                        <p class="tip-content">Growing trees is efficient: earn 20 points AND the new tree immediately drops walnuts to collect!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🗺️</span>
                            <span class="tip-title">Minimap Trees</span>
                        </div>
                        <p class="tip-content">After growing a tree, a tree icon appears on the minimap for 30 seconds showing its location!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🏆</span>
                            <span class="tip-title">Tree Master</span>
                        </div>
                        <p class="tip-content">Grow 20 trees total to earn a special tree growing bonus! Track your progress.</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">👀</span>
                            <span class="tip-title">Protect Your Stash</span>
                        </div>
                        <p class="tip-content">Other players can steal your hidden walnuts before they grow - choose hiding spots wisely!</p>
                    </div>
                    <!-- Strategy & Resources -->
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">⭐</span>
                            <span class="tip-title">Point Values</span>
                        </div>
                        <p class="tip-content">Regular walnuts = 1pt, Buried walnuts = 3pts, Golden walnuts = 5pts! Prioritize buried ones.</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">✨</span>
                            <span class="tip-title">Golden Walnuts</span>
                        </div>
                        <p class="tip-content">Golden walnuts are rare bonuses worth 5 points - grab them quickly before others do!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🍂</span>
                            <span class="tip-title">Falling Walnuts</span>
                        </div>
                        <p class="tip-content">Trees drop walnuts periodically - watch for falling walnuts in the forest and catch them!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">🐿️</span>
                            <span class="tip-title">NPC Competition</span>
                        </div>
                        <p class="tip-content">NPCs collect and hide walnuts too - compete to find them first or steal their hidden stashes!</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">📊</span>
                            <span class="tip-title">Leaderboard</span>
                        </div>
                        <p class="tip-content">Check the leaderboard to see how you rank against others - it resets weekly for fresh competition!</p>
                    </div>
                    <!-- Basics -->
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">⚙️</span>
                            <span class="tip-title">Settings</span>
                        </div>
                        <p class="tip-content">Adjust volume, graphics quality, and control settings in the settings menu (gear icon).</p>
                    </div>
                    <div class="tip-card">
                        <div class="tip-header">
                            <span class="tip-icon">💬</span>
                            <span class="tip-title">Quick Chat</span>
                        </div>
                        <p class="tip-content">Use quick chat to communicate with other players - tap the chat bubble icon to send messages!</p>
                    </div>
                </div>
                <button class="carousel-btn next" id="nextBtn"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="carousel-dots" id="carouselDots"></div>
        </div>
    </section>

    <!-- Why Sign In -->
    <section class="content-section">
        <div class="section-container">
            <h2 class="section-title"><i class="fas fa-user-plus"></i> Why Sign In?</h2>

            <p style="text-align: center; color: #666; margin-bottom: 1.5rem;">
                Playing as a guest is fun, but signing in unlocks the full experience!
            </p>

            <table class="benefits-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Guest</th>
                        <th>Signed In</th>
                        <th>Verified Email</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Play the Game</td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>Squirrel Character</td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>5 More Characters</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>Goat Character</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>Cross-Device Progress</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>Weekly Leaderboard</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>All-Time Hall of Fame</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                    <tr>
                        <td>Verified Badge</td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="cross">✗</span></td>
                        <td><span class="check">✓</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta">
        <h2>Ready to Play? 🐿️</h2>
        <p>Jump into the forest and start your journey from Rookie to Legend!</p>
        <a href="https://game.hiddenwalnuts.com" class="play-now-btn">
            <i class="fas fa-play"></i> Play Now - It's Free!
        </a>
    </section>

    <!-- Footer -->
    <footer class="game-footer">
        <div class="footer-links">
            <a href="/">Portfolio</a>
            <a href="https://www.redbubble.com/people/HiddenWalnuts/explore" target="_blank">Redbubble Store</a>
            <a href="https://www.teepublic.com/user/hidden-walnuts" target="_blank">TeePublic Store</a>
            <a href="https://instagram.com/hiddenwalnuts" target="_blank">Instagram</a>
        </div>
        <p class="copyright">&copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.</p>
    </footer>

    <script>
    // Floating leaves animation
    function createLeaves() {
        const container = document.getElementById('leavesContainer');
        const leafEmojis = ['🍂', '🍃', '🌿'];
        const leafCount = 15;

        for (let i = 0; i < leafCount; i++) {
            setTimeout(() => {
                const leaf = document.createElement('div');
                leaf.className = 'leaf';
                leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
                leaf.style.left = Math.random() * 100 + '%';
                leaf.style.animationDuration = (8 + Math.random() * 7) + 's';
                leaf.style.animationDelay = Math.random() * 5 + 's';
                leaf.style.fontSize = (16 + Math.random() * 12) + 'px';
                container.appendChild(leaf);

                setTimeout(() => {
                    leaf.remove();
                }, 20000);
            }, i * 1000);
        }

        setInterval(() => {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
            leaf.style.left = Math.random() * 100 + '%';
            leaf.style.animationDuration = (8 + Math.random() * 7) + 's';
            leaf.style.fontSize = (16 + Math.random() * 12) + 'px';
            container.appendChild(leaf);

            setTimeout(() => {
                leaf.remove();
            }, 20000);
        }, 2000);
    }

    // Tips Carousel
    function initCarousel() {
        const carousel = document.getElementById('tipsCarousel');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dotsContainer = document.getElementById('carouselDots');
        const cards = carousel.querySelectorAll('.tip-card');

        let currentIndex = 0;
        let cardsPerView = getCardsPerView();
        const totalCards = cards.length;
        const maxIndex = Math.max(0, totalCards - cardsPerView);

        function getCardsPerView() {
            const width = window.innerWidth;
            if (width <= 375) return 2;
            if (width <= 480) return 2;
            if (width <= 768) return 3;
            if (width <= 1024) return 4;
            return 4;
        }

        function getCardWidth() {
            const card = cards[0];
            const style = window.getComputedStyle(card);
            const width = card.offsetWidth;
            const gap = parseInt(style.marginRight) || 24;
            return width + gap;
        }

        function updateCarousel() {
            const cardWidth = getCardWidth();
            carousel.style.transform = 'translateX(-' + (currentIndex * cardWidth) + 'px)';
            updateButtons();
            updateDots();
        }

        function updateButtons() {
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= maxIndex;
        }

        function createDots() {
            dotsContainer.innerHTML = '';
            const numDots = Math.ceil(totalCards / cardsPerView);
            for (let i = 0; i < numDots; i++) {
                const dot = document.createElement('button');
                dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', () => {
                    currentIndex = Math.min(i * cardsPerView, maxIndex);
                    updateCarousel();
                });
                dotsContainer.appendChild(dot);
            }
        }

        function updateDots() {
            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            const activeDotIndex = Math.floor(currentIndex / cardsPerView);
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeDotIndex);
            });
        }

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex = Math.max(0, currentIndex - cardsPerView);
                updateCarousel();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < maxIndex) {
                currentIndex = Math.min(maxIndex, currentIndex + cardsPerView);
                updateCarousel();
            }
        });

        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0 && currentIndex < maxIndex) {
                    currentIndex = Math.min(maxIndex, currentIndex + 1);
                } else if (diff < 0 && currentIndex > 0) {
                    currentIndex = Math.max(0, currentIndex - 1);
                }
                updateCarousel();
            }
        }

        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                cardsPerView = getCardsPerView();
                currentIndex = Math.min(currentIndex, Math.max(0, totalCards - cardsPerView));
                createDots();
                updateCarousel();
            }, 150);
        });

        // Auto-rotate
        let autoRotateInterval;
        const autoRotateDelay = 4000;

        function startAutoRotate() {
            autoRotateInterval = setInterval(() => {
                if (currentIndex >= maxIndex) {
                    currentIndex = 0;
                } else {
                    currentIndex++;
                }
                updateCarousel();
            }, autoRotateDelay);
        }

        function stopAutoRotate() {
            clearInterval(autoRotateInterval);
        }

        // Pause on hover/touch
        const wrapper = document.querySelector('.tips-carousel-wrapper');
        wrapper.addEventListener('mouseenter', stopAutoRotate);
        wrapper.addEventListener('mouseleave', startAutoRotate);
        wrapper.addEventListener('touchstart', stopAutoRotate, { passive: true });
        wrapper.addEventListener('touchend', () => {
            setTimeout(startAutoRotate, 2000);
        }, { passive: true });

        createDots();
        updateCarousel();
        startAutoRotate();
    }

    // Update copyright year
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Start animations and carousel
    createLeaves();
    initCarousel();
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
            <button class="tab active" onclick="showTab('add', event)">Add New Item</button>
            <button class="tab" onclick="showTab('manage', event)">Manage Items</button>
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
                        <div id="preview-name" style="font-size: 14px; color: #666; margin-bottom: 8px;">Current image</div>
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
        function showTab(tabName, event) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            
            // If called from onclick, event.target is the clicked button
            if (event && event.target) {
                event.target.classList.add('active');
            } else {
                // If called programmatically, find the right tab by content
                const tabs = document.querySelectorAll('.tab');
                if (tabName === 'add') {
                    tabs[0].classList.add('active');
                } else if (tabName === 'manage') {
                    tabs[1].classList.add('active');
                }
            }
            
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
        const previewName = document.getElementById('preview-name');
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
                    const wasEditing = editingId;
                    showAlert(\`Portfolio item \${editingId ? 'updated' : 'added'} successfully!\`, 'success');
                    resetForm();
                    if (wasEditing) {
                        // Go back to manage tab after editing
                        showTab('manage');
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
            
            // Set the hidden imageUrl field with existing URL
            imageUrlInput.value = item.imageUrl;

            // Extract and show the filename from the URL
            const filename = item.imageUrl.split('/').pop();
            imageFilenameInput.value = filename;

            // Show preview of existing image
            previewImg.src = item.imageUrl;
            previewName.textContent = 'Current image: ' + filename;
            imagePreview.classList.remove('hidden');

            // Remove required from image filename input for editing
            imageFilenameInput.removeAttribute('required');
            
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