/**
 * Hidden Walnuts Website Scripts
 */

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Log the config
    console.log('Script loaded successfully');
    console.log('Config loaded:', siteConfig);
    console.log('Categories:', siteConfig.categories);
    console.log('Tagline:', siteConfig.tagline);
    console.log('Announcement:', siteConfig.announcement);
    
    // Update tagline from config
    try {
        const taglineElement = document.querySelector('.tagline');
        if (taglineElement) {
            taglineElement.textContent = siteConfig.tagline;
            console.log('Tagline updated successfully');
        } else {
            console.error('Tagline element not found');
        }
    } catch (error) {
        console.error('Error updating tagline:', error);
    }

    // Update or remove announcement
    try {
        const announcementDiv = document.querySelector('.announcement');
        if (announcementDiv) {
            if (siteConfig.announcement) {
                announcementDiv.textContent = siteConfig.announcement;
                announcementDiv.style.display = '';
                console.log('Announcement updated successfully');
            } else {
                announcementDiv.style.display = 'none';
                console.log('Announcement hidden');
            }
        } else {
            console.error('Announcement element not found');
        }
    } catch (error) {
        console.error('Error updating announcement:', error);
    }
    
    // Populate category cards
    try {
        const categoriesContainer = document.getElementById('categoriesContainer');
        if (categoriesContainer) {
            if (siteConfig.categories && siteConfig.categories.length > 0) {
                console.log('Creating category cards...');
                siteConfig.categories.forEach(category => {
                    console.log('Creating card for category:', category);
                    const categoryCard = createCategoryCard(category);
                    categoriesContainer.appendChild(categoryCard);
                });
                console.log('Category cards created successfully');
            } else {
                // If no categories, add a placeholder or message
                categoriesContainer.innerHTML = '<p class="no-categories">Check back soon for new collections!</p>';
                console.log('No categories found, showing placeholder');
            }
        } else {
            console.error('Categories container not found');
        }
    } catch (error) {
        console.error('Error creating category cards:', error);
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