# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hidden Walnuts is a static website built with vanilla HTML, CSS, and JavaScript. It serves as a showcase for Hidden Walnuts' TeePublic store collections, featuring category cards for different product lines (Fun, Pickleball, Fine Art, Poetry). The site is designed for deployment on Cloudflare Pages with no build process required.

## Architecture

### Configuration-Driven Design
The entire site is configured through `config.js`, which contains:
- Site metadata (name, tagline, announcement)
- Category definitions with images and TeePublic URLs
- Social media links

### Key Files Structure
- `index.html` - Main HTML template with placeholders populated by JavaScript
- `config.js` - Central configuration file containing all site content
- `script.js` - JavaScript that populates the DOM from configuration
- `styles.css` - CSS with CSS custom properties for theming
- Image assets stored in root and `public/` directories

### Dynamic Content Loading
The `script.js` file reads from `siteConfig` and:
1. Updates the tagline (with optional URL linking)
2. Shows/hides announcement text
3. Dynamically creates category cards from the categories array
4. Updates copyright year

## Development Commands

### Local Development
```bash
# No build process needed - simply open in browser
open index.html
```

### Deployment
The site is designed for Cloudflare Pages deployment:
- Build command: (leave empty)
- Build output directory: `/`

## Customization Guidelines

### Adding New Categories
Edit `config.js` and add to the `categories` array:
```javascript
{
    id: 'NewCategory',
    title: 'Display Name',
    image: 'hero-image.png',
    url: 'https://www.teepublic.com/user/hidden-walnuts/albums/...'
}
```

### Theming
All colors are defined as CSS custom properties in `:root` of `styles.css`:
- `--primary-color`: Main green theme color
- `--secondary-color`: Lighter green accent
- `--accent-color`: Light background accent
- `--dark-color`: Text color

### Cache Busting
Scripts and config use version parameters (`?v=X`) for cache invalidation when updating content.