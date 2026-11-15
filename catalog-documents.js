const ORIGIN = 'https://hiddenwalnuts.com';

const HOME_TITLE = 'Hidden Walnuts | Artful Merch And Playful Products';
const HOME_DESCRIPTION = 'Hidden Walnuts makes print-on-demand merchandise on TeePublic and Redbubble, plus a playful iPhone and iPad game now live on the App Store.';
const PORTFOLIO_TITLE = 'Portfolio | Hidden Walnuts';
const PORTFOLIO_DESCRIPTION = 'Vintage and public-domain art prints from Hidden Walnuts, with a shop link for each design on Redbubble or TeePublic.';

const SHOP_HOSTS = new Map([
    ['www.redbubble.com', 'Redbubble'],
    ['redbubble.com', 'Redbubble'],
    ['www.teepublic.com', 'TeePublic'],
    ['teepublic.com', 'TeePublic'],
]);

const PAGES = [
    {
        path: '/',
        name: 'Home',
        blurb: 'Artful merch on TeePublic and Redbubble, and the Hidden Walnuts iPhone and iPad game.',
    },
    {
        path: '/portfolio',
        name: 'Portfolio',
        blurb: 'Every Hidden Walnuts design, with the image, description, and shop link.',
    },
    {
        path: '/game',
        name: 'iPhone and iPad game',
        blurb: 'Walnuts, oddball animals, quick mini-games, and a jetpack. Hidden Walnuts is live on the App Store.',
    },
];

const SOCIAL_URLS = [
    'https://instagram.com/hiddenwalnuts',
    'https://pinterest.com/hiddenwalnuts',
    'https://x.com/hiddenwalnuts',
    'https://www.teepublic.com/user/hidden-walnuts',
    'https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent',
];

/**
 * @param {unknown} items
 * @returns {Design[]}
 */
export function readCatalog(items) {
    if (!Array.isArray(items)) return [];
    const designs = [];
    for (const item of items) {
        const design = readDesign(item);
        if (design) designs.push(design);
    }
    return designs;
}

/**
 * @param {SiteFacts} site
 * @returns {string}
 */
export function homeDiscoveryHtml(site) {
    return `${metaTags({
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        canonical: `${ORIGIN}/`,
        image: site.logoUrl,
    })}
    ${jsonLdScript(homeJsonLd(site))}`;
}

/**
 * @param {Design[]} designs
 * @param {SiteFacts} site
 * @returns {string}
 */
export function portfolioDiscoveryHtml(designs, site) {
    return `${metaTags({
        title: PORTFOLIO_TITLE,
        description: PORTFOLIO_DESCRIPTION,
        canonical: `${ORIGIN}/portfolio`,
        image: site.logoUrl,
    })}
    ${jsonLdScript(portfolioJsonLd(designs))}`;
}

/**
 * @param {Design[]} designs
 * @returns {string}
 */
export function portfolioGridHtml(designs) {
    if (designs.length === 0) {
        return '<p class="portfolio-static-empty">No designs yet.</p>';
    }
    return designs.map(designCardHtml).join('\n');
}

/**
 * @param {Design} design
 * @param {SiteFacts} site
 * @returns {string}
 */
export function designDocumentHtml(design, site) {
    const canonical = `${ORIGIN}${design.pagePath}`;
    const description = design.description || design.title;
    const image = design.imageUrl || site.logoUrl;
    const artist = design.artist
        ? `<p class="design-artist">${escapeHtml(design.artist)}</p>`
        : '';
    const copy = design.description
        ? `<p class="design-description">${escapeHtml(design.description)}</p>`
        : '';
    const picture = design.imageUrl
        ? `<img src="${escapeHtml(design.imageUrl)}" alt="${escapeHtml(design.title)}">`
        : '';
    const shop = design.shop
        ? `<a class="design-shop" href="${escapeHtml(design.shop.href)}" target="_blank" rel="noopener noreferrer">Shop on ${escapeHtml(design.shop.name)}</a>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaTags({
        title: `${design.title} | Hidden Walnuts`,
        description,
        canonical,
        image,
    })}
    ${jsonLdScript(designJsonLd(design))}
    <link rel="icon" type="image/png" href="/favicon.ico?v=5">
    <style>
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #223026;
            background: #fff;
            line-height: 1.5;
        }
        a { color: #1e4022; }
        header {
            display: flex;
            gap: 1rem;
            align-items: center;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid rgba(42, 93, 49, 0.16);
        }
        header a { font-weight: 700; text-decoration: none; }
        main { width: min(880px, calc(100% - 2rem)); margin: 1.5rem auto 3rem; }
        img { width: 100%; height: auto; display: block; }
        h1 { font-size: clamp(1.6rem, 3vw, 2.2rem); line-height: 1.2; margin: 1rem 0 0.4rem; }
        .design-shop {
            display: inline-block;
            margin-top: 1rem;
            background: #2a5d31;
            color: #fff;
            text-decoration: none;
            font-weight: 700;
            padding: 0.7rem 1rem;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <header>
        <a href="/">Hidden Walnuts</a>
        <a href="/portfolio">Portfolio</a>
        <a href="/game">iPhone and iPad game</a>
    </header>
    <main>
        ${picture}
        <h1>${escapeHtml(design.title)}</h1>
        ${artist}
        ${copy}
        ${shop}
    </main>
</body>
</html>`;
}

/**
 * @param {Design[]} designs
 * @returns {string}
 */
export function sitemapXml(designs) {
    const locs = [
        ...PAGES.map((page) => pageUrl(page.path)),
        ...designs.map((design) => `${ORIGIN}${design.pagePath}`),
    ];
    const body = locs.map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * @param {Design[]} designs
 * @param {SiteFacts} site
 * @returns {string}
 */
export function llmsText(designs, site) {
    const lines = [
        '# Hidden Walnuts',
        '',
        '> Vintage and public-domain art prints on Redbubble and TeePublic, plus an iPhone and iPad game.',
        '',
        'Hidden Walnuts publishes print-on-demand merchandise from vintage and public-domain art. Each design has a page on this site and a product page on Redbubble or TeePublic.',
        '',
        '## Site',
        ...PAGES.map((page) => `- [${page.name}](${pageUrl(page.path)}): ${page.blurb}`),
        `- [App Store](${site.appStoreUrl}): Hidden Walnuts for iPhone and iPad.`,
        '',
        '## Designs',
    ];
    for (const design of designs) {
        const label = design.title.replace(/[\[\]]/g, '');
        const description = oneLine(design.description);
        const shop = design.shop ? ` Shop: ${design.shop.href}` : '';
        const sentence = description ? ` ${description}` : '';
        lines.push(`- [${label}](${ORIGIN}${design.pagePath}):${sentence}${shop}`);
    }
    lines.push('');
    return lines.join('\n');
}

/**
 * @returns {string}
 */
export function robotsText() {
    return [
        'User-agent: *',
        'Allow: /',
        'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
        '',
        `Sitemap: ${ORIGIN}/sitemap.xml`,
        '',
    ].join('\n');
}

/**
 * @param {unknown} raw
 * @returns {Design | null}
 */
function readDesign(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const source = /** @type {Record<string, unknown>} */ (raw);
    if (typeof source.id !== 'string' || !/^[a-z0-9]+$/.test(source.id)) return null;
    if (typeof source.title !== 'string' || source.title.trim() === '') return null;
    const description = typeof source.description === 'string' ? source.description : '';
    const artist = typeof source.artist === 'string' ? source.artist.trim() : '';
    return {
        id: source.id,
        title: source.title,
        description,
        imageUrl: httpsUrl(source.imageUrl),
        shop: readShop(source.redbubbleUrl),
        artist,
        pagePath: `/portfolio/${source.id}`,
    };
}

/**
 * @param {unknown} value
 * @returns {ShopLink | null}
 */
function readShop(value) {
    if (typeof value !== 'string') return null;
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    const name = SHOP_HOSTS.get(url.hostname);
    if (!name) return null;
    if (url.pathname === '/') return null;
    return { name, href: value };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function httpsUrl(value) {
    if (typeof value !== 'string' || value === '') return '';
    let url;
    try {
        url = new URL(value);
    } catch {
        return '';
    }
    if (url.protocol !== 'https:') return '';
    if (url.username !== '' || url.password !== '') return '';
    return value;
}

/**
 * @param {string} path
 * @returns {string}
 */
function pageUrl(path) {
    return path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}

/**
 * @param {SiteFacts} site
 * @returns {object}
 */
function homeJsonLd(site) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${ORIGIN}/#organization`,
                name: 'Hidden Walnuts',
                url: `${ORIGIN}/`,
                description: HOME_DESCRIPTION,
                logo: site.logoUrl,
                sameAs: [...SOCIAL_URLS, site.appStoreUrl],
            },
            {
                '@type': 'WebSite',
                '@id': `${ORIGIN}/#website`,
                name: 'Hidden Walnuts',
                url: `${ORIGIN}/`,
                description: HOME_DESCRIPTION,
                publisher: { '@id': `${ORIGIN}/#organization` },
            },
        ],
    };
}

/**
 * @param {Design[]} designs
 * @returns {object}
 */
function portfolioJsonLd(designs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Hidden Walnuts portfolio',
        url: `${ORIGIN}/portfolio`,
        numberOfItems: designs.length,
        itemListElement: designs.map((design, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${ORIGIN}${design.pagePath}`,
            item: visualArtwork(design),
        })),
    };
}

/**
 * @param {Design} design
 * @returns {object}
 */
function designJsonLd(design) {
    return {
        '@context': 'https://schema.org',
        ...visualArtwork(design),
    };
}

/**
 * @param {Design} design
 * @returns {object}
 */
function visualArtwork(design) {
    const node = {
        '@type': 'VisualArtwork',
        name: design.title,
        url: `${ORIGIN}${design.pagePath}`,
        artform: 'Print',
    };
    if (design.description) node.description = design.description;
    if (design.imageUrl) node.image = design.imageUrl;
    if (design.artist) node.creator = { '@type': 'Person', name: design.artist };
    if (design.shop) {
        node.offers = {
            '@type': 'Offer',
            url: design.shop.href,
            seller: { '@type': 'Organization', name: design.shop.name },
        };
    }
    return node;
}

/**
 * @param {Design} design
 * @returns {string}
 */
function designCardHtml(design) {
    const title = escapeHtml(design.title);
    const image = design.imageUrl
        ? `<img class="portfolio-static-image" src="${escapeHtml(design.imageUrl)}" alt="${title}">`
        : '';
    const artist = design.artist
        ? `<p class="portfolio-static-artist">${escapeHtml(design.artist)}</p>`
        : '';
    const description = design.description
        ? `<p class="portfolio-static-description">${escapeHtml(design.description)}</p>`
        : '';
    const shop = design.shop
        ? `<a class="portfolio-static-shop" href="${escapeHtml(design.shop.href)}" target="_blank" rel="noopener noreferrer">Shop on ${escapeHtml(design.shop.name)}</a>`
        : '';
    return `<article class="portfolio-static" id="design-${escapeHtml(design.id)}">
    <a class="portfolio-static-page" href="${escapeHtml(design.pagePath)}">${image}<h2>${title}</h2></a>
    ${artist}${description}${shop}
</article>`;
}

/**
 * @param {{ title: string, description: string, canonical: string, image: string }} tags
 * @returns {string}
 */
function metaTags(tags) {
    const image = tags.image
        ? `<meta property="og:image" content="${escapeHtml(tags.image)}">
    <meta name="twitter:image" content="${escapeHtml(tags.image)}">`
        : '';
    const card = tags.image ? 'summary_large_image' : 'summary';
    return `<title>${escapeHtml(tags.title)}</title>
    <meta name="description" content="${escapeHtml(tags.description)}">
    <link rel="canonical" href="${escapeHtml(tags.canonical)}">
    <meta property="og:site_name" content="Hidden Walnuts">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(tags.title)}">
    <meta property="og:description" content="${escapeHtml(tags.description)}">
    <meta property="og:url" content="${escapeHtml(tags.canonical)}">
    ${image}
    <meta name="twitter:card" content="${card}">
    <meta name="twitter:title" content="${escapeHtml(tags.title)}">
    <meta name="twitter:description" content="${escapeHtml(tags.description)}">`;
}

/**
 * @param {object} data
 * @returns {string}
 */
function jsonLdScript(data) {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[character]));
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
    }[character]));
}

/**
 * @param {string} value
 * @returns {string}
 */
function oneLine(value) {
    return value.replace(/\s+/g, ' ').trim();
}

/**
 * @typedef {object} SiteFacts
 * @property {string} appStoreUrl
 * @property {string} logoUrl
 */

/**
 * @typedef {object} ShopLink
 * @property {string} name
 * @property {string} href
 */

/**
 * @typedef {object} Design
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {ShopLink | null} shop
 * @property {string} artist
 * @property {string} pagePath
 */
