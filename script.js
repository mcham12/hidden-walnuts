/**
 * Hidden Walnuts Portfolio Site JavaScript
 * Handles dynamic loading and display of portfolio items
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the portfolio
    initializePortfolio();
    initializeLightbox();
    initializeFilters();
    initializeSearch();
    updateCopyright();
});

let allPortfolioItems = [];
let filteredItems = [];
let currentFilter = 'all';
let currentPage = 1;
const itemsPerPage = 12;

// Portfolio initialization
async function initializePortfolio() {
    try {
        await loadPortfolioItems();
        renderPortfolioItems();
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        showError('Failed to load portfolio items. Please try again later.');
    }
}

// Load portfolio items from API
async function loadPortfolioItems() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    
    try {
        // Check if we're in development (no worker) and show sample data
        const response = await fetch('/api/portfolio');
        
        if (!response.ok) {
            // Fallback to sample data if API is not available
            allPortfolioItems = getSampleData();
        } else {
            allPortfolioItems = await response.json();
        }
        
        // If no items, show sample data for demo
        if (allPortfolioItems.length === 0) {
            allPortfolioItems = getSampleData();
        }
        
        filteredItems = [...allPortfolioItems];
        
    } catch (error) {
        console.error('Error loading portfolio items:', error);
        // Use sample data as fallback
        allPortfolioItems = getSampleData();
        filteredItems = [...allPortfolioItems];
    }
}

// Sample data for development/demo
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

// Render portfolio items
function renderPortfolioItems() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    // Clear existing content
    portfolioGrid.innerHTML = '';
    
    if (filteredItems.length === 0) {
        portfolioGrid.innerHTML = `
            <div class="no-items">
                <p>No portfolio items found. ${currentFilter !== 'all' || document.getElementById('searchInput').value ? 'Try adjusting your filters or search terms.' : ''}</p>
            </div>
        `;
        loadMoreBtn.style.display = 'none';
        return;
    }
    
    // Calculate items to show
    const startIndex = 0;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredItems.length);
    const itemsToShow = filteredItems.slice(startIndex, endIndex);
    
    // Create portfolio items
    itemsToShow.forEach(item => {
        const portfolioItem = createPortfolioItemElement(item);
        portfolioGrid.appendChild(portfolioItem);
    });
    
    // Show/hide load more button
    if (endIndex < filteredItems.length) {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.onclick = loadMore;
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Create portfolio item element
function createPortfolioItemElement(item) {
    const portfolioItem = document.createElement('div');
    portfolioItem.className = 'portfolio-item';
    portfolioItem.setAttribute('data-id', item.id);
    
    // Handle missing images gracefully
    const imageUrl = item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI4MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNDAiIHk9IjEyNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5JbWFnZTwvdGV4dD48L3N2Zz4=';
    
    portfolioItem.innerHTML = `
        <img src="${imageUrl}" alt="${item.title}" class="portfolio-item-image" loading="lazy">
        <div class="portfolio-item-content">
            <h3 class="portfolio-item-title">${item.title}</h3>
            ${item.description ? `<p class="portfolio-item-description">${item.description}</p>` : ''}
            ${item.tags && item.tags.length > 0 ? `
                <div class="portfolio-item-tags">
                    ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="portfolio-item-actions">
                <a href="${item.redbubbleUrl}" target="_blank" class="btn-primary">
                    <i class="fas fa-shopping-cart"></i> Buy on Redbubble
                </a>
                ${item.featured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
        </div>
    `;
    
    // Add click handler for lightbox
    portfolioItem.addEventListener('click', (e) => {
        // Don't open lightbox if user clicked on a link
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
        openLightbox(item);
    });
    
    return portfolioItem;
}

// Load more items
function loadMore() {
    currentPage++;
    renderPortfolioItems();
}

// Filter functionality
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Apply filter
            currentFilter = button.getAttribute('data-filter');
            applyFilters();
        });
    });
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
}

// Apply filters and search
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredItems = allPortfolioItems.filter(item => {
        // Apply category filter
        const matchesFilter = currentFilter === 'all' || 
                             (currentFilter === 'featured' && item.featured) ||
                             (item.tags && item.tags.includes(currentFilter));
        
        // Apply search filter
        const matchesSearch = !searchTerm || 
                             item.title.toLowerCase().includes(searchTerm) ||
                             (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                             (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        return matchesFilter && matchesSearch;
    });
    
    // Reset pagination
    currentPage = 1;
    renderPortfolioItems();
}

// Lightbox functionality
function initializeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeButton = document.querySelector('.lightbox-close');
    
    // Close lightbox handlers
    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // ESC key handler
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

// Error handling
function showError(message) {
    const portfolioGrid = document.getElementById('portfolioGrid');
    portfolioGrid.innerHTML = `
        <div class="error-state">
            <p style="color: #dc3545; text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </p>
        </div>
    `;
}

// Update copyright year
function updateCopyright() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

// Smooth scrolling for navigation links
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

// Performance optimization: debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 