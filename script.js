/**
 * Hidden Walnuts Website Scripts
 */

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Log the config
    console.log('Config loaded:', siteConfig);
    console.log('Categories:', siteConfig.categories);
    
    // Update tagline from config
    document.querySelector('.tagline').textContent = siteConfig.tagline;

    // Update or remove announcement
    const announcementDiv = document.querySelector('.announcement');
    if (siteConfig.announcement) {
        announcementDiv.textContent = siteConfig.announcement;
        announcementDiv.style.display = '';
    } else {
        announcementDiv.style.display = 'none';
    }
    
    // Populate category cards
    const categoriesContainer = document.getElementById('categoriesContainer');
    
    if (siteConfig.categories && siteConfig.categories.length > 0) {
        siteConfig.categories.forEach(category => {
            console.log('Creating card for category:', category);
            const categoryCard = createCategoryCard(category);
            categoriesContainer.appendChild(categoryCard);
        });
    } else {
        // If no categories, add a placeholder or message
        categoriesContainer.innerHTML = '<p class="no-categories">Check back soon for new collections!</p>';
    }
    
    // Update copyright year
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});

/**
 * Create a category card element
 * @param {Object} category - Category data
 * @returns {HTMLElement} - The category card element
 */
function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.id = category.id;
    
    const cardLink = document.createElement('a');
    cardLink.href = category.url;
    cardLink.className = 'category-link';
    
    const image = document.createElement('img');
    image.src = category.image;
    image.alt = category.title;
    image.className = 'category-image';
    
    const content = document.createElement('div');
    content.className = 'category-content';
    
    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = category.title;
    
    content.appendChild(title);
    cardLink.appendChild(image);
    cardLink.appendChild(content);
    card.appendChild(cardLink);
    
    return card;
} 