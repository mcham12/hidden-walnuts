import assert from 'node:assert/strict';
import {
    designDocumentHtml,
    homeDiscoveryHtml,
    llmsText,
    portfolioDiscoveryHtml,
    portfolioGridHtml,
    readCatalog,
    robotsText,
    sitemapXml,
} from '../catalog-documents.js';

const site = {
    appStoreUrl: 'https://apps.apple.com/us/app/hidden-walnuts/id6760266796?uo=4',
    logoUrl: 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/LogoForInsta.png',
};

const items = [
    {
        id: 'aaa',
        title: 'Ovenbird by Louis Agassiz Fuertes',
        description: 'A study of an ovenbird.',
        imageUrl: 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/oven.webp',
        redbubbleUrl: 'https://www.redbubble.com/shop/ap/185560044',
        artist: 'Louis Agassiz Fuertes',
        tags: ['bird'],
        featured: true,
        dateAdded: '2026-11-01T00:00:00.000Z',
    },
    {
        id: 'bbb',
        title: 'Dog and Cat mailing a letter',
        description: 'A letter goes out.',
        imageUrl: 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/dog.webp',
        redbubbleUrl: 'https://www.teepublic.com/t-shirt/12345-dog',
        tags: [],
        featured: false,
        dateAdded: '2026-10-01T00:00:00.000Z',
    },
    {
        id: 'ccc',
        title: 'No shop page',
        description: 'The stored URL is not a shop.',
        imageUrl: 'http://insecure.example/x.jpg',
        redbubbleUrl: 'https://evil.example/shop',
        tags: [],
        featured: false,
        dateAdded: '2026-09-01T00:00:00.000Z',
    },
    {
        id: 'not an id',
        title: 'Skipped',
        description: '',
        imageUrl: '',
        redbubbleUrl: 'https://www.redbubble.com/shop/ap/1',
    },
    {
        id: 'ddd',
        title: '</script><script>alert(1)</script>',
        description: '<img src=x onerror=alert(1)>',
        imageUrl: 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/alert.webp',
        redbubbleUrl: 'https://www.redbubble.com/shop/ap/999',
        tags: [],
        featured: false,
        dateAdded: '2026-08-01T00:00:00.000Z',
    },
];

const designs = readCatalog(items);
const grid = portfolioGridHtml(designs);
const portfolioHead = portfolioDiscoveryHtml(designs, site);
const homeHead = homeDiscoveryHtml(site);
const first = designs[0];
const designPage = designDocumentHtml(first, site);
const sitemap = sitemapXml(designs);
const llms = llmsText(designs, site);
const robots = robotsText();

assert.deepEqual(designs.map((design) => design.id), ['aaa', 'bbb', 'ccc', 'ddd']);
assert.equal(designs[0].shop.href, 'https://www.redbubble.com/shop/ap/185560044');
assert.equal(designs[0].shop.name, 'Redbubble');
assert.equal(designs[1].shop.name, 'TeePublic');
assert.equal(designs[2].shop, null);
assert.equal(designs[2].imageUrl, '');
assert.equal(designs[1].artist, '');
assert.equal(designs[0].artist, 'Louis Agassiz Fuertes');

assert.match(grid, /alt="Ovenbird by Louis Agassiz Fuertes"/);
assert.match(grid, /href="\/portfolio\/aaa"/);
assert.match(grid, /href="https:\/\/www\.redbubble\.com\/shop\/ap\/185560044"/);
assert.match(grid, /Shop on Redbubble/);
assert.match(grid, /href="https:\/\/www\.teepublic\.com\/t-shirt\/12345-dog"/);
assert.match(grid, /Shop on TeePublic/);
assert.match(grid, /Louis Agassiz Fuertes/);
assert.doesNotMatch(grid, /evil\.example/);
assert.doesNotMatch(grid, /insecure\.example/);
assert.doesNotMatch(grid, /<script>alert\(1\)/);
assert.equal(grid.indexOf('id="design-aaa"') < grid.indexOf('id="design-bbb"'), true);
assert.equal(grid.indexOf('id="design-bbb"') < grid.indexOf('id="design-ccc"'), true);

const portfolioLd = parseJsonLd(portfolioHead);
assert.equal(portfolioLd['@type'], 'ItemList');
assert.equal(portfolioLd.numberOfItems, 4);
assert.equal(portfolioLd.itemListElement[0].position, 1);
assert.equal(portfolioLd.itemListElement[0].item.name, 'Ovenbird by Louis Agassiz Fuertes');
assert.equal(portfolioLd.itemListElement[0].item.offers.url, 'https://www.redbubble.com/shop/ap/185560044');
assert.equal(portfolioLd.itemListElement[1].item.offers.url, 'https://www.teepublic.com/t-shirt/12345-dog');
assert.equal(portfolioLd.itemListElement[2].item.offers, undefined);
assert.equal(portfolioLd.itemListElement[0].item.creator.name, 'Louis Agassiz Fuertes');
assert.equal(portfolioLd.itemListElement[1].item.creator, undefined);
assertBannedKeys(portfolioLd);
assert.match(portfolioHead, /<link rel="canonical" href="https:\/\/hiddenwalnuts\.com\/portfolio">/);
assert.match(portfolioHead, /<title>Portfolio \| Hidden Walnuts<\/title>/);

const homeLd = parseJsonLd(homeHead);
const homeTypes = homeLd['@graph'].map((node) => node['@type']);
assert.deepEqual(homeTypes, ['Organization', 'WebSite']);
assert.match(homeHead, /<link rel="canonical" href="https:\/\/hiddenwalnuts\.com\/">/);
assertBannedKeys(homeLd);

assert.match(designPage, /<h1>Ovenbird by Louis Agassiz Fuertes<\/h1>/);
assert.match(designPage, /Shop on Redbubble/);
assert.match(designPage, /href="https:\/\/www\.redbubble\.com\/shop\/ap\/185560044"/);
assert.match(designPage, /<link rel="canonical" href="https:\/\/hiddenwalnuts\.com\/portfolio\/aaa">/);
const designLd = parseJsonLd(designPage);
assert.equal(designLd['@type'], 'VisualArtwork');
assert.equal(designLd.offers.url, 'https://www.redbubble.com/shop/ap/185560044');
assertBannedKeys(designLd);

for (const id of ['aaa', 'bbb', 'ccc', 'ddd']) {
    assert.match(sitemap, new RegExp(`<loc>https://hiddenwalnuts.com/portfolio/${id}</loc>`));
}
assert.match(sitemap, /<loc>https:\/\/hiddenwalnuts\.com\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/hiddenwalnuts\.com\/portfolio<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/hiddenwalnuts\.com\/game<\/loc>/);
assert.doesNotMatch(sitemap, /evil\.example/);

assert.match(llms, /Vintage and public-domain art prints on Redbubble and TeePublic/);
assert.match(llms, /iPhone and iPad game/);
assert.match(llms, /https:\/\/hiddenwalnuts\.com\/portfolio\/aaa/);
assert.match(llms, /https:\/\/www\.redbubble\.com\/shop\/ap\/185560044/);
assert.match(llms, /id6760266796/);
assert.doesNotMatch(llms, /evil\.example/);

assert.equal(robots, [
    'User-agent: *',
    'Allow: /',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    '',
    'Sitemap: https://hiddenwalnuts.com/sitemap.xml',
    '',
].join('\n'));
assert.doesNotMatch(robots, /Disallow/);

const hostile = portfolioGridHtml(readCatalog([items[4]]));
const hostileHead = portfolioDiscoveryHtml(readCatalog([items[4]]), site);
assert.doesNotMatch(hostile, /<script>alert\(1\)/);
assert.doesNotMatch(hostile, /<img src=x/);
const hostileLd = parseJsonLd(hostileHead);
assert.equal(hostileLd.itemListElement[0].item.name, '</script><script>alert(1)</script>');
assert.equal(hostileLd.itemListElement[0].item.description, '<img src=x onerror=alert(1)>');

console.log('catalog-documents: ok');

/**
 * @param {string} html
 * @returns {any}
 */
function parseJsonLd(html) {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(match, 'JSON-LD script is present');
    return JSON.parse(match[1]);
}

/**
 * @param {unknown} value
 */
function assertBannedKeys(value) {
    const banned = new Set([
        'price',
        'pricecurrency',
        'aggregaterating',
        'ratingvalue',
        'reviewcount',
        'ratingcount',
        'availability',
    ]);
    const found = [];
    walk(value, (key) => {
        if (banned.has(key.toLowerCase())) found.push(key);
    });
    assert.deepEqual(found, []);
}

/**
 * @param {unknown} value
 * @param {(key: string) => void} visit
 */
function walk(value, visit) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        for (const entry of value) walk(entry, visit);
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        visit(key);
        walk(entry, visit);
    }
}
