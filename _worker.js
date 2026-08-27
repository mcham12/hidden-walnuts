/**
 * Cloudflare Worker for Hidden Walnuts Portfolio Admin
 * Last Deployed: 2025-12-15
 * Handles CRUD operations for portfolio items using KV storage and GitHub image hosting
 */

// Configuration
const GITHUB_ROOT_BASE_URL = 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/';
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/';
const APP_STORE_URL = 'https://apps.apple.com/us/app/hidden-walnuts/id6760266796?uo=4';
const APP_STORE_ASSET_BASE = `${GITHUB_BASE_URL}app-store/`;
const SITE_BUILD_ID = 'home-storefront-hero-2026-07-03-v2';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'hidden2024!';
const HOME_VISUAL_SRC_TOKEN = '__HOME_VISUAL_SRC__';
const HOME_VISUAL_ALT_TOKEN = '__HOME_VISUAL_ALT__';
const HOME_VISUAL_POSITION_TOKEN = '__HOME_VISUAL_POSITION__';
const LEGACY_HOME_VISUAL_COOKIE = 'hw_home_visual';
const HOME_ART_VISUAL_COOKIE = 'hw_home_art_visual';
const HOME_ART_VISUALS = [
    {
        id: 'burchfield-late-afternoon',
        src: `${GITHUB_BASE_URL}home-rotator/burchfield-late-afternoon.webp`,
        alt: 'Fine art landscape with trees and a house',
        position: 'center center'
    },
    {
        id: 'sekka-farming-village',
        src: `${GITHUB_BASE_URL}home-rotator/sekka-farming-village.webp`,
        alt: 'Fine art village landscape with flowering trees',
        position: 'center center'
    },
    {
        id: 'burchfield-sunlight-rain',
        src: `${GITHUB_BASE_URL}home-rotator/burchfield-sunlight-rain.webp`,
        alt: 'Fine art landscape with sunlight breaking through clouds',
        position: 'center 38%'
    },
    {
        id: 'burchfield-sunset',
        src: `${GITHUB_BASE_URL}home-rotator/burchfield-sunset.webp`,
        alt: 'Fine art landscape with colorful trees at sunset',
        position: 'center 36%'
    },
    {
        id: 'schellbach-frog-prince',
        src: `${GITHUB_BASE_URL}home-rotator/schellbach-frog-prince.webp`,
        alt: 'Fine art illustration of a stork and frog near water',
        position: 'center center'
    }
];

const APP_PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts Privacy Policy</title>
    <meta name="description" content="Privacy policy for Hidden Walnuts on iPhone and iPad.">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=5">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=5">
    <link rel="shortcut icon" type="image/png" href="/favicon.ico?v=5">
    <style>
        :root {
            --primary-color: #2a5d31;
            --primary-dark: #1e4022;
            --accent-color: #f8faf6;
            --accent-warm: #f5f7f1;
            --text-light: #5f6f63;
            --border-color: rgba(42, 93, 49, 0.18);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.65;
            color: #243026;
            background: #ffffff;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .main-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
            padding: 1rem 2rem;
            background: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 15px;
            color: var(--primary-color);
            text-decoration: none;
        }

        .nav-logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }

        .brand-link h1 {
            font-size: 1.8rem;
            color: var(--primary-color);
            font-weight: 700;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
        }

        .nav-link {
            color: #56635a;
            text-decoration: none;
            font-weight: 700;
            padding: 0.58rem 0.82rem;
            border-radius: 8px;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--primary-color);
            background: var(--accent-color);
        }

        .store-link {
            background: var(--primary-color);
            color: white;
        }

        .store-link:hover {
            color: white;
            background: var(--primary-dark);
        }

        .policy-hero {
            background: linear-gradient(135deg, var(--accent-color), #ffffff);
            border-bottom: 1px solid var(--border-color);
        }

        .policy-hero-inner,
        .content-page,
        .footer-inner {
            max-width: 880px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        .policy-hero-inner {
            padding-top: 4rem;
            padding-bottom: 3rem;
        }

        .eyebrow {
            color: var(--primary-color);
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            font-size: 0.8rem;
            margin-bottom: 0.75rem;
        }

        h2 {
            color: var(--primary-dark);
            font-size: clamp(2.1rem, 4vw, 3.4rem);
            line-height: 1.1;
            margin-bottom: 1rem;
        }

        .summary {
            color: #3f4d43;
            font-size: 1.2rem;
            max-width: 720px;
        }

        .content-page {
            padding-top: 3rem;
            padding-bottom: 4rem;
        }

        .last-updated {
            color: var(--text-light);
            font-size: 0.96rem;
            margin-bottom: 2rem;
        }

        .quick-summary {
            background: var(--accent-warm);
            border: 1px solid var(--border-color);
            border-left: 5px solid var(--primary-color);
            border-radius: 12px;
            padding: 1.4rem;
            margin-bottom: 2.5rem;
        }

        h3 {
            color: var(--primary-dark);
            font-size: 1.35rem;
            margin: 2.2rem 0 0.75rem;
        }

        p,
        li {
            font-size: 1.05rem;
            color: #344039;
        }

        p {
            margin-bottom: 1rem;
        }

        ul {
            padding-left: 1.4rem;
            margin: 0.8rem 0 1.3rem;
        }

        li {
            margin-bottom: 0.55rem;
        }

        a {
            color: var(--primary-color);
            font-weight: 700;
        }

        footer {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            color: white;
            padding: 2.5rem 0;
        }

        .footer-inner {
            display: flex;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
            color: rgba(255, 255, 255, 0.86);
        }

        .footer-inner a {
            color: white;
            text-decoration: none;
            opacity: 0.9;
        }

        .footer-links {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        @media (max-width: 720px) {
            .main-nav {
                align-items: flex-start;
                flex-direction: column;
                padding: 1rem;
            }

            .brand-link h1 {
                font-size: 1.45rem;
            }

            .nav-links {
                gap: 0.5rem;
            }

            .policy-hero-inner,
            .content-page,
            .footer-inner {
                padding-left: 1.25rem;
                padding-right: 1.25rem;
            }

            .policy-hero-inner {
                padding-top: 3rem;
                padding-bottom: 2.25rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav class="main-nav" aria-label="Primary navigation">
            <a href="/" class="brand-link">
                <img src="https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </a>
            <div class="nav-links">
                <a href="/" class="nav-link">About</a>
                <a href="/portfolio" class="nav-link">Portfolio</a>
                <a href="/support" class="nav-link">Support</a>
                <a href="/privacy" class="nav-link active">Privacy</a>
                <a href="/game" class="nav-link">iOS Game</a>
            </div>
        </nav>
    </header>

    <section class="policy-hero">
        <div class="policy-hero-inner">
            <p class="eyebrow">Privacy Policy</p>
            <h2>Simple privacy for Hidden Walnuts.</h2>
            <p class="summary">Hidden Walnuts does not require an account, email address, phone number, payment information, ads, or tracking. The game only uses the information needed to let you play and to keep the game working.</p>
        </div>
    </section>

    <main class="content-page">
        <p class="last-updated">Last updated: June 27, 2026</p>

        <div class="quick-summary">
            <p><strong>Short version:</strong> choose a player name, play the game, and keep your progress on your device and in the game service. We do not sell personal information, show ads, track you across apps or websites, or use third-party advertising or attribution SDKs.</p>
        </div>

        <h3>Information Hidden Walnuts Uses</h3>
        <p>Hidden Walnuts creates a game player record so the app can run multiplayer rooms, remember progress, show leaderboards, support friends and private rooms, and recover your game state when you reconnect. This can include:</p>
        <ul>
            <li>the player name you type in the app;</li>
            <li>a generated player code and internal player identifiers;</li>
            <li>gameplay state such as room membership, walnut counts, scores, progress, loadout choices, friends, and private-room invites;</li>
            <li>safety or support information if you use report, block, delete-data, or support features;</li>
            <li>basic performance and reliability information used to keep the game service running.</li>
        </ul>

        <h3>Information Hidden Walnuts Does Not Ask For</h3>
        <p>Hidden Walnuts does not ask for an account, email address, password, phone number, real name, payment information, location, contacts, photos, microphone access, or camera access.</p>

        <h3>How Information Is Used</h3>
        <p>We use game information only for app functionality: running rooms, saving progress, supporting leaderboards, helping friends connect, handling safety features, responding to support requests, and improving reliability.</p>

        <h3>No Ads Or Tracking</h3>
        <p>Hidden Walnuts does not contain ads, does not use data brokers, does not use third-party advertising SDKs, and does not track you across other companies' apps or websites.</p>

        <h3>Sharing</h3>
        <p>We do not sell personal information. Some game information is visible to other players as part of normal play, such as your chosen player name, leaderboard standing, character presence in a room, and friend/private-room interactions. Service providers such as Cloudflare help host the game and website.</p>

        <h3>Player Data Controls</h3>
        <p>The app includes player-data controls in Settings. You can reset local game data on your device or request deletion of your player data from the game service using the in-app delete-data flow.</p>

        <h3>Website, Storefronts, And Support</h3>
        <p>If you email support, we use your message and email address to respond. Merchandise links may take you to third-party storefronts such as TeePublic or Redbubble; their privacy policies apply to purchases made there.</p>

        <h3>Children</h3>
        <p>Hidden Walnuts is not intended to collect personal information from children beyond the limited game information needed to play. If you believe a child provided information that should be deleted, contact us.</p>

        <h3>Changes</h3>
        <p>We may update this policy when the game or website changes. The latest version will remain available at <a href="https://hiddenwalnuts.com/privacy">https://hiddenwalnuts.com/privacy</a>.</p>

        <h3>Contact</h3>
        <p>Questions or privacy requests can be sent to <a href="mailto:support@hiddenwalnuts.com">support@hiddenwalnuts.com</a>.</p>
    </main>

    <footer>
        <div class="footer-inner">
            <div>&copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.</div>
            <div class="footer-links">
                <a href="/">About</a>
                <a href="/support">Support</a>
                <a href="/privacy">Privacy Policy</a>
            </div>
        </div>
    </footer>
    <script>document.getElementById("currentYear").textContent = new Date().getFullYear();</script>
</body>
</html>`;

const LIVE_ABOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts | Artful Merch And Playful Products</title>
    <meta name="description" content="Hidden Walnuts makes print-on-demand merchandise on TeePublic and Redbubble, plus a playful iPhone and iPad game now live on the App Store.">
    <meta name="hw-site-version" content="${SITE_BUILD_ID}">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=5">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=5">
    <link rel="shortcut icon" type="image/png" href="/favicon.ico?v=5">
    <style>
        :root {
            --primary-color: #2a5d31;
            --primary-dark: #1e4022;
            --primary-light: #4a7c55;
            --walnut: #b97836;
            --sky: #6ba8cf;
            --accent-color: #f8faf6;
            --accent-warm: #f7f0e4;
            --ink: #223026;
            --muted: #5f6f63;
            --border: rgba(42, 93, 49, 0.16);
            --shadow: 0 18px 48px rgba(22, 39, 26, 0.14);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: var(--ink);
            background: white;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        a {
            color: inherit;
        }

        .container {
            width: min(1120px, calc(100% - 40px));
            margin: 0 auto;
        }

        .main-nav {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            padding: 0.95rem 2rem;
            background: rgba(255, 255, 255, 0.96);
            border-bottom: 1px solid rgba(42, 93, 49, 0.12);
            backdrop-filter: blur(14px);
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 14px;
            color: var(--primary-color);
            text-decoration: none;
        }

        .nav-logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }

        .brand-link h1 {
            font-size: 1.75rem;
            line-height: 1;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
        }

        .nav-link {
            color: #526357;
            text-decoration: none;
            font-weight: 700;
            padding: 0.58rem 0.82rem;
            border-radius: 8px;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--primary-color);
            background: var(--accent-color);
        }

        .hero {
            position: relative;
            min-height: 520px;
            display: flex;
            align-items: flex-end;
            overflow: hidden;
            color: white;
            background:
                linear-gradient(90deg, rgba(18, 34, 22, 0.88), rgba(18, 34, 22, 0.46) 52%, rgba(18, 34, 22, 0.12)),
                url("${GITHUB_BASE_URL}home-rotator/burchfield-late-afternoon.webp") center/cover no-repeat;
        }

        .hero::after {
            content: "";
            position: absolute;
            inset: auto 0 0;
            height: 36%;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0), white);
        }

        .hero-inner {
            position: relative;
            z-index: 1;
            width: min(1120px, calc(100% - 40px));
            margin: 0 auto;
            padding: 6rem 0 6.5rem;
        }

        .eyebrow {
            color: #f6d68c;
            font-size: 0.82rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            margin-bottom: 0.8rem;
            text-transform: uppercase;
        }

        h2 {
            font-size: clamp(2.5rem, 6vw, 5.4rem);
            line-height: 0.95;
            max-width: 760px;
            margin-bottom: 1rem;
        }

        .hero-copy {
            max-width: 650px;
            color: rgba(255, 255, 255, 0.9);
            font-size: clamp(1.08rem, 2vw, 1.32rem);
            margin-bottom: 1.6rem;
        }

        .actions {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
        }

        .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 46px;
            padding: 0.78rem 1.1rem;
            border-radius: 8px;
            font-weight: 850;
            text-decoration: none;
            border: 1px solid transparent;
        }

        .button.primary {
            background: white;
            color: var(--primary-dark);
        }

        .button.secondary {
            color: white;
            border-color: rgba(255, 255, 255, 0.55);
            background: rgba(255, 255, 255, 0.12);
        }

        .section {
            padding: 4rem 0;
        }

        .section.alt {
            background: var(--accent-color);
        }

        .section-heading {
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .section-heading h3 {
            color: var(--primary-dark);
            font-size: clamp(1.8rem, 4vw, 2.7rem);
            line-height: 1.05;
        }

        .section-heading p {
            max-width: 440px;
            color: var(--muted);
            font-size: 1.05rem;
        }

        .product-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }

        .product-card {
            min-height: 240px;
            padding: 1.35rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: white;
            box-shadow: 0 8px 26px rgba(42, 93, 49, 0.08);
        }

        .product-card h4 {
            color: var(--primary-dark);
            font-size: 1.28rem;
            margin-bottom: 0.7rem;
        }

        .product-card p {
            color: #3e4d43;
            margin-bottom: 1rem;
        }

        .text-link {
            color: var(--primary-color);
            font-weight: 850;
            text-decoration: none;
        }

        .text-link:hover {
            text-decoration: underline;
        }

        .portfolio-showcase {
            display: grid;
            grid-template-columns: 390px minmax(0, 1fr);
            gap: 1.5rem;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 1.3rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: linear-gradient(135deg, #ffffff, #f8faf6);
            box-shadow: 0 10px 32px rgba(42, 93, 49, 0.08);
        }

        .portfolio-art-frame,
        .game-media-frame {
            width: 100%;
            aspect-ratio: 4 / 3;
            margin: 0;
            overflow: hidden;
            border-radius: 8px;
            background: #e7efe4;
            box-shadow: var(--shadow);
        }

        .portfolio-art-frame img,
        .game-media-frame img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            object-position: center center;
        }

        .portfolio-showcase-copy h4 {
            color: var(--primary-dark);
            font-size: clamp(1.55rem, 3vw, 2.25rem);
            line-height: 1.05;
            margin-bottom: 0.75rem;
        }

        .portfolio-showcase-copy p {
            max-width: 560px;
            color: #3e4d43;
            margin-bottom: 1.15rem;
        }

        .game-strip {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 390px;
            gap: 2rem;
            align-items: center;
            padding: 2rem;
            border: 1px solid rgba(42, 93, 49, 0.16);
            border-radius: 8px;
            background: linear-gradient(135deg, #f7f0e4, #f8faf6);
        }

        .game-strip h3 {
            color: var(--primary-dark);
            font-size: clamp(1.7rem, 4vw, 2.4rem);
            line-height: 1.05;
            margin-bottom: 0.8rem;
        }

        .game-strip p {
            color: #3e4d43;
            margin-bottom: 1.2rem;
            max-width: 640px;
        }

        footer {
            color: white;
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            padding: 3rem 0 2rem;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        .footer-content h3 {
            margin-bottom: 0.8rem;
        }

        .footer-content a {
            color: rgba(255, 255, 255, 0.88);
            text-decoration: none;
        }

        .footer-content a:hover {
            color: white;
            text-decoration: underline;
        }

        .footer-links {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .footer-bottom {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.22);
            color: rgba(255, 255, 255, 0.76);
        }

        @media (max-width: 860px) {
            .main-nav,
            .section-heading {
                align-items: flex-start;
                flex-direction: column;
            }

            .product-grid,
            .portfolio-showcase,
            .game-strip,
            .footer-content {
                grid-template-columns: 1fr;
            }

            .game-strip {
                padding: 1.2rem;
            }

            .portfolio-art-frame,
            .game-media-frame {
                max-width: 480px;
            }
        }

        @media (max-width: 560px) {
            .main-nav {
                padding: 0.9rem 1rem;
            }

            .brand-link h1 {
                font-size: 1.45rem;
            }

            .hero {
                min-height: 480px;
            }

            .hero-inner {
                padding: 4rem 0 5.5rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav class="main-nav" aria-label="Primary navigation">
            <a href="/" class="brand-link">
                <img src="${GITHUB_BASE_URL}LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </a>
            <div class="nav-links">
                <a href="/" class="nav-link active">About</a>
                <a href="/portfolio" class="nav-link">Portfolio</a>
                <a href="/support" class="nav-link">Support</a>
                <a href="/privacy" class="nav-link">Privacy</a>
                <a href="/game" class="nav-link">iOS Game</a>
            </div>
        </nav>
    </header>

    <main>
        <section class="hero">
            <div class="hero-inner">
                <p class="eyebrow">Art, merch, and playful projects</p>
                <h2>Hidden Walnuts makes things worth wearing and sharing.</h2>
                <p class="hero-copy">Browse print-on-demand designs on apparel, accessories, and home goods through our Redbubble and TeePublic storefronts. Also try the Hidden Walnuts iOS game.</p>
                <div class="actions">
                    <a class="button primary" href="/portfolio">Browse Portfolio</a>
                    <a class="button secondary" href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" rel="noopener">Shop Redbubble</a>
                    <a class="button secondary" href="https://www.teepublic.com/user/hidden-walnuts" target="_blank" rel="noopener">Shop TeePublic</a>
                    <a class="button secondary" href="/game">iOS Game</a>
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section-heading">
                    <h3>What We Make</h3>
                </div>
                <div class="portfolio-showcase">
                    <figure class="portfolio-art-frame">
                        <img id="homeArtVisual" src="${HOME_VISUAL_SRC_TOKEN}" alt="${HOME_VISUAL_ALT_TOKEN}" style="object-position: ${HOME_VISUAL_POSITION_TOKEN}">
                    </figure>
                    <div class="portfolio-showcase-copy">
                        <h4>Artwork for prints, products, and odd little ideas.</h4>
                        <p>Browse designs that work naturally on shirts, stickers, accessories, and home goods through our Redbubble and TeePublic shops.</p>
                        <div class="actions">
                            <a class="button primary" style="background: var(--primary-dark); color: white;" href="/portfolio">Browse Portfolio</a>
                            <a class="button secondary" style="color: var(--primary-dark); border-color: rgba(42, 93, 49, 0.28);" href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" rel="noopener">Shop Redbubble</a>
                        </div>
                    </div>
                </div>
                <div class="product-grid">
                    <article class="product-card">
                        <h4>Print-on-demand merchandise</h4>
                        <p>Original and curated designs for shirts, stickers, accessories, and home goods through TeePublic and Redbubble.</p>
                        <a class="text-link" href="/portfolio">View the portfolio</a>
                    </article>
                    <article class="product-card">
                        <h4>Art and design experiments</h4>
                        <p>Visual riffs on animals, poems, pickleball, old illustrations, and the things that make us smile.</p>
                        <a class="text-link" href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" rel="noopener">Shop Redbubble</a>
                    </article>
                    <article class="product-card">
                        <h4>A walnut game on iPhone and iPad</h4>
                        <p>Hidden Walnuts is now live on the App Store: walnuts, oddball playable animals, quick mini-games, and a jetpack.</p>
                        <a class="text-link" href="/game">See the game</a>
                    </article>
                </div>
            </div>
        </section>

        <section class="section alt">
            <div class="container">
                <div class="game-strip">
                    <div>
                        <p class="eyebrow">Also live on the App Store</p>
                        <h3>Hidden Walnuts for iPhone and iPad</h3>
                        <p>Play as a squirrel, goat, hare, moose, skunk, mallard, and more. Stash walnuts at Home Base, throw walnuts when things get strange, grow some trees and grab their fresh walnuts, and launch into the air with your jetpack.</p>
                        <div class="actions">
                            <a class="button primary" href="${APP_STORE_URL}" target="_blank" rel="noopener">Download on the App Store</a>
                            <a class="button secondary" style="color: var(--primary-dark); border-color: rgba(42, 93, 49, 0.28);" href="/game">View Game Page</a>
                        </div>
                    </div>
                    <figure class="game-media-frame">
                        <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-jetpack.webp" alt="Hidden Walnuts iPad gameplay showing a character flying with a jetpack">
                    </figure>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div>
                    <h3>Company</h3>
                    <div class="footer-links">
                        <a href="/">About</a>
                        <a href="/portfolio">Portfolio</a>
                        <a href="/support">Support</a>
                        <a href="/privacy">Privacy Policy</a>
                    </div>
                </div>
                <div>
                    <h3>Shop</h3>
                    <div class="footer-links">
                        <a href="https://www.teepublic.com/user/hidden-walnuts" target="_blank" rel="noopener">TeePublic</a>
                        <a href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" rel="noopener">Redbubble</a>
                    </div>
                </div>
                <div>
                    <h3>Follow</h3>
                    <div class="footer-links">
                        <a href="https://instagram.com/hiddenwalnuts" target="_blank" rel="noopener">Instagram</a>
                        <a href="https://pinterest.com/hiddenwalnuts" target="_blank" rel="noopener">Pinterest</a>
                        <a href="https://x.com/hiddenwalnuts" target="_blank" rel="noopener">X</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">&copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.</div>
        </div>
    </footer>
    <script>
        (() => {
            const currentYear = document.getElementById("currentYear");
            if (currentYear) {
                currentYear.textContent = new Date().getFullYear();
            }
        })();
    </script>
</body>
</html>`;

const LIVE_GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts for iPhone and iPad</title>
    <meta name="description" content="Hidden Walnuts is live on the App Store: a playful multiplayer walnut game with oddball animals, quick mini-games, and a jetpack.">
    <meta property="og:title" content="Hidden Walnuts for iPhone and iPad">
    <meta property="og:description" content="Walnuts, oddball animals, quick mini-games, and a jetpack. Hidden Walnuts is live on the App Store.">
    <meta property="og:image" content="${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-jetpack.webp">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=5">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=5">
    <link rel="shortcut icon" type="image/png" href="/favicon.ico?v=5">
    <style>
        :root {
            --primary-color: #2a5d31;
            --primary-dark: #1e4022;
            --walnut: #b97836;
            --sky: #6ba8cf;
            --cream: #f8faf6;
            --warm: #f7f0e4;
            --ink: #213026;
            --muted: #5b6b60;
            --border: rgba(42, 93, 49, 0.16);
            --shadow: 0 18px 48px rgba(22, 39, 26, 0.14);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: var(--ink);
            background: white;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
            width: min(1120px, calc(100% - 40px));
            margin: 0 auto;
        }

        .main-nav {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            padding: 0.95rem 2rem;
            background: rgba(255, 255, 255, 0.96);
            border-bottom: 1px solid rgba(42, 93, 49, 0.12);
            backdrop-filter: blur(14px);
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 14px;
            color: var(--primary-color);
            text-decoration: none;
        }

        .nav-logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }

        .brand-link h1 {
            font-size: 1.75rem;
            line-height: 1;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
        }

        .nav-link {
            color: #526357;
            text-decoration: none;
            font-weight: 700;
            padding: 0.58rem 0.82rem;
            border-radius: 8px;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--primary-color);
            background: var(--cream);
        }

        .hero {
            position: relative;
            min-height: min(74vh, 720px);
            display: flex;
            align-items: flex-end;
            color: white;
            overflow: hidden;
            background:
                linear-gradient(90deg, rgba(13, 28, 19, 0.9), rgba(13, 28, 19, 0.48) 50%, rgba(13, 28, 19, 0.16)),
                url("${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-jetpack.webp") center/cover no-repeat;
        }

        .hero::after {
            content: "";
            position: absolute;
            inset: auto 0 0;
            height: 30%;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0), white);
        }

        .hero-inner {
            position: relative;
            z-index: 1;
            width: min(1120px, calc(100% - 40px));
            margin: 0 auto;
            padding: 6rem 0 6.2rem;
        }

        .eyebrow {
            color: #f6d68c;
            font-size: 0.82rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            margin-bottom: 0.8rem;
            text-transform: uppercase;
        }

        h2 {
            font-size: clamp(2.6rem, 6.6vw, 5.8rem);
            line-height: 0.94;
            max-width: 760px;
            margin-bottom: 1rem;
        }

        .hero-copy {
            max-width: 650px;
            color: rgba(255, 255, 255, 0.9);
            font-size: clamp(1.08rem, 2vw, 1.32rem);
            margin-bottom: 1.6rem;
        }

        .actions {
            display: flex;
            gap: 0.8rem;
            flex-wrap: wrap;
        }

        .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 46px;
            padding: 0.78rem 1.1rem;
            border-radius: 8px;
            font-weight: 850;
            text-decoration: none;
            border: 1px solid transparent;
        }

        .button.primary {
            color: var(--primary-dark);
            background: white;
        }

        .button.secondary {
            color: white;
            border-color: rgba(255, 255, 255, 0.56);
            background: rgba(255, 255, 255, 0.12);
        }

        .section {
            padding: 4.2rem 0;
        }

        .section.alt {
            background: var(--cream);
        }

        .section-heading {
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 1.5rem;
            margin-bottom: 1.6rem;
        }

        .section-heading h3 {
            color: var(--primary-dark);
            font-size: clamp(1.9rem, 4vw, 2.8rem);
            line-height: 1.04;
        }

        .section-heading p {
            max-width: 500px;
            color: var(--muted);
            font-size: 1.05rem;
        }

        .preview-grid {
            display: grid;
            grid-template-columns: 360px minmax(0, 1fr);
            gap: 2rem;
            align-items: center;
        }

        .phone-frame {
            width: min(100%, 360px);
            margin: 0 auto;
            padding: 10px;
            border-radius: 8px;
            background: #121712;
            box-shadow: var(--shadow);
        }

        .phone-frame video {
            display: block;
            width: 100%;
            border-radius: 6px;
            background: #111;
        }

        .feature-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.9rem;
        }

        .feature {
            padding: 1.15rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: white;
        }

        .feature h4 {
            color: var(--primary-dark);
            font-size: 1.12rem;
            margin-bottom: 0.4rem;
        }

        .feature p {
            color: #3e4d43;
        }

        .media-grid {
            display: grid;
            gap: 1.1rem;
        }

        .ipad-showcase {
            display: grid;
            grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr);
            gap: 1.1rem;
            align-items: start;
        }

        .landscape-stack {
            display: grid;
            gap: 1.1rem;
        }

        .phone-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(240px, 360px));
            justify-content: center;
            gap: 1.1rem;
            margin-top: 0.2rem;
        }

        .media-item {
            overflow: hidden;
            border-radius: 8px;
            background: #e7efe4;
            box-shadow: 0 8px 26px rgba(42, 93, 49, 0.08);
        }

        .media-item img {
            display: block;
            width: 100%;
            height: auto;
            object-fit: contain;
        }

        .media-item.landscape img {
            aspect-ratio: 4 / 3;
        }

        .download-band {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            padding: 1.8rem;
            border: 1px solid rgba(42, 93, 49, 0.16);
            border-radius: 8px;
            background: linear-gradient(135deg, var(--warm), white);
        }

        .download-band h3 {
            color: var(--primary-dark);
            font-size: clamp(1.7rem, 3.8vw, 2.5rem);
            line-height: 1.05;
            margin-bottom: 0.45rem;
        }

        .download-band p {
            color: var(--muted);
        }

        .download-band .button.primary {
            color: white;
            background: var(--primary-color);
        }

        footer {
            color: white;
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            padding: 3rem 0 2rem;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        .footer-content h3 {
            margin-bottom: 0.8rem;
        }

        .footer-links {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .footer-content a {
            color: rgba(255, 255, 255, 0.88);
            text-decoration: none;
        }

        .footer-content a:hover {
            color: white;
            text-decoration: underline;
        }

        .footer-bottom {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.22);
            color: rgba(255, 255, 255, 0.76);
        }

        @media (max-width: 900px) {
            .main-nav,
            .section-heading,
            .download-band {
                align-items: flex-start;
                flex-direction: column;
            }

            .preview-grid,
            .feature-list,
            .ipad-showcase,
            .phone-row,
            .footer-content {
                grid-template-columns: 1fr;
            }

            .phone-row {
                justify-items: center;
            }

            .media-item.phone {
                max-width: 360px;
            }
        }

        @media (max-width: 560px) {
            .main-nav {
                padding: 0.9rem 1rem;
            }

            .brand-link h1 {
                font-size: 1.45rem;
            }

            .hero {
                min-height: 560px;
            }

            .hero-inner {
                padding: 4.5rem 0 5.2rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav class="main-nav" aria-label="Primary navigation">
            <a href="/" class="brand-link">
                <img src="${GITHUB_BASE_URL}LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </a>
            <div class="nav-links">
                <a href="/" class="nav-link">About</a>
                <a href="/portfolio" class="nav-link">Portfolio</a>
                <a href="/support" class="nav-link">Support</a>
                <a href="/privacy" class="nav-link">Privacy</a>
                <a href="/game" class="nav-link active">iOS Game</a>
            </div>
        </nav>
    </header>

    <main>
        <section class="hero">
            <div class="hero-inner">
                <p class="eyebrow">Live on the App Store</p>
                <h2>Hidden Walnuts for iPhone and iPad</h2>
                <p class="hero-copy">A silly multiplayer walnut game with oddball animals, quick mini-games, and a jetpack that makes ordinary wandering ridiculous.</p>
                <div class="actions">
                    <a class="button primary" href="${APP_STORE_URL}" target="_blank" rel="noopener">Download on the App Store</a>
                    <a class="button secondary" href="/portfolio">Shop Hidden Walnuts merch</a>
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container preview-grid">
                <div class="phone-frame">
                    <video autoplay muted loop playsinline controls poster="${APP_STORE_ASSET_BASE}hidden-walnuts-preview-poster.webp">
                        <source src="${APP_STORE_ASSET_BASE}hidden-walnuts-preview-portrait.mp4" type="video/mp4">
                    </video>
                </div>
                <div>
                    <div class="section-heading">
                        <div>
                            <p class="eyebrow">Walnuts, animals, and lift-off</p>
                            <h3>Collect, hide, eat, throw, and stash walnuts.</h3>
                        </div>
                    </div>
                    <div class="feature-list">
                        <article class="feature">
                            <h4>Fly with the jetpack</h4>
                            <p>Launch into the air, chase rings, and make the world feel larger than it first appears.</p>
                        </article>
                        <article class="feature">
                            <h4>Play as oddball species</h4>
                            <p>Choose a squirrel, goat, hare, moose, skunk, mallard, and more.</p>
                        </article>
                        <article class="feature">
                            <h4>Jump into quick mini-games</h4>
                            <p>Paint targets, scramble through rings, and try short activities that change the rhythm.</p>
                        </article>
                        <article class="feature">
                            <h4>Plant, stash, and return</h4>
                            <p>Hide walnuts, grow some trees and grab their fresh walnuts, or bring your stash back to Home Base.</p>
                        </article>
                    </div>
                </div>
            </div>
        </section>

        <section class="section alt">
            <div class="container">
                <div class="section-heading">
                    <h3>A Look Inside</h3>
                    <p>Fly with the jetpack, stash walnuts near Home Base, and jump into quick activities like paintball and ring chasing.</p>
                </div>
                <div class="media-grid">
                    <div class="ipad-showcase">
                        <div class="media-item landscape featured">
                            <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-explore.webp" alt="Hidden Walnuts iPad gameplay from a high tree perch">
                        </div>
                        <div class="landscape-stack">
                            <div class="media-item landscape">
                                <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-jetpack.webp" alt="Hidden Walnuts iPad gameplay showing a character flying with a jetpack">
                            </div>
                            <div class="media-item landscape">
                                <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-ipad-plan-stash.webp" alt="Hidden Walnuts iPad gameplay near Home Base and stash area">
                            </div>
                        </div>
                    </div>
                    <div class="phone-row">
                        <div class="media-item phone">
                            <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-iphone-jetpack.webp" alt="Hidden Walnuts iPhone gameplay showing Jetpack Scramble">
                        </div>
                        <div class="media-item phone">
                            <img src="${APP_STORE_ASSET_BASE}hidden-walnuts-iphone-paintball.webp" alt="Hidden Walnuts iPhone gameplay showing Paintball Fun">
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="download-band">
                    <div>
                        <h3>Play free on iPhone and iPad.</h3>
                        <p>No account required. Pick a guest name, choose a character, and start collecting walnuts.</p>
                    </div>
                    <a class="button primary" href="${APP_STORE_URL}" target="_blank" rel="noopener">Open App Store</a>
                </div>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <div class="footer-content">
                <div>
                    <h3>Company</h3>
                    <div class="footer-links">
                        <a href="/">About</a>
                        <a href="/portfolio">Portfolio</a>
                        <a href="/support">Support</a>
                        <a href="/privacy">Privacy Policy</a>
                    </div>
                </div>
                <div>
                    <h3>Shop</h3>
                    <div class="footer-links">
                        <a href="https://www.teepublic.com/user/hidden-walnuts" target="_blank" rel="noopener">TeePublic</a>
                        <a href="https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent" target="_blank" rel="noopener">Redbubble</a>
                    </div>
                </div>
                <div>
                    <h3>Game</h3>
                    <div class="footer-links">
                        <a href="${APP_STORE_URL}" target="_blank" rel="noopener">Download on the App Store</a>
                        <a href="/support">Game support</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">&copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.</div>
        </div>
    </footer>
    <script>document.getElementById("currentYear").textContent = new Date().getFullYear();</script>
</body>
</html>`;

const LIVE_SUPPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts Support</title>
    <meta name="description" content="Support for Hidden Walnuts merchandise and the Hidden Walnuts iPhone and iPad game.">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=5">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=5">
    <link rel="shortcut icon" type="image/png" href="/favicon.ico?v=5">
    <style>
        :root {
            --primary-color: #2a5d31;
            --primary-dark: #1e4022;
            --accent-color: #f8faf6;
            --accent-warm: #f7f0e4;
            --ink: #223026;
            --muted: #5f6f63;
            --border: rgba(42, 93, 49, 0.16);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: var(--ink);
            background: white;
            line-height: 1.65;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
            width: min(960px, calc(100% - 40px));
            margin: 0 auto;
        }

        .main-nav {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            padding: 0.95rem 2rem;
            background: rgba(255, 255, 255, 0.96);
            border-bottom: 1px solid rgba(42, 93, 49, 0.12);
            backdrop-filter: blur(14px);
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 14px;
            color: var(--primary-color);
            text-decoration: none;
        }

        .nav-logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
        }

        .brand-link h1 {
            font-size: 1.75rem;
            line-height: 1;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
        }

        .nav-link {
            color: #526357;
            text-decoration: none;
            font-weight: 700;
            padding: 0.58rem 0.82rem;
            border-radius: 8px;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--primary-color);
            background: var(--accent-color);
        }

        .hero {
            background: linear-gradient(135deg, var(--accent-color), white);
            border-bottom: 1px solid var(--border);
        }

        .hero-inner {
            padding: 4.5rem 0 3.5rem;
        }

        .eyebrow {
            color: var(--primary-color);
            font-size: 0.82rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            margin-bottom: 0.8rem;
            text-transform: uppercase;
        }

        h2 {
            color: var(--primary-dark);
            font-size: clamp(2.3rem, 5vw, 4rem);
            line-height: 1;
            margin-bottom: 1rem;
        }

        .summary {
            max-width: 720px;
            color: var(--muted);
            font-size: 1.18rem;
        }

        main {
            padding: 3.5rem 0 4rem;
        }

        .contact-box {
            padding: 1.4rem;
            border: 1px solid var(--border);
            border-left: 5px solid var(--primary-color);
            border-radius: 8px;
            background: var(--accent-warm);
            margin-bottom: 2.4rem;
        }

        .contact-box h3,
        .faq h3 {
            color: var(--primary-dark);
            font-size: 1.45rem;
            margin-bottom: 0.8rem;
        }

        .contact-box a,
        .faq a {
            color: var(--primary-color);
            font-weight: 850;
            text-decoration: none;
        }

        .contact-box a:hover,
        .faq a:hover {
            text-decoration: underline;
        }

        .faq {
            display: grid;
            gap: 1rem;
        }

        .faq-item {
            padding: 1.2rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: white;
        }

        .faq-item h4 {
            color: var(--primary-dark);
            font-size: 1.1rem;
            margin-bottom: 0.45rem;
        }

        .faq-item p {
            color: #3e4d43;
        }

        footer {
            color: white;
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            padding: 2.5rem 0;
        }

        .footer-inner {
            display: flex;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
            color: rgba(255, 255, 255, 0.84);
        }

        .footer-links {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .footer-inner a {
            color: white;
            text-decoration: none;
        }

        @media (max-width: 760px) {
            .main-nav {
                align-items: flex-start;
                flex-direction: column;
                padding: 0.9rem 1rem;
            }

            .brand-link h1 {
                font-size: 1.45rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <nav class="main-nav" aria-label="Primary navigation">
            <a href="/" class="brand-link">
                <img src="${GITHUB_BASE_URL}LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </a>
            <div class="nav-links">
                <a href="/" class="nav-link">About</a>
                <a href="/portfolio" class="nav-link">Portfolio</a>
                <a href="/support" class="nav-link active">Support</a>
                <a href="/privacy" class="nav-link">Privacy</a>
                <a href="/game" class="nav-link">iOS Game</a>
            </div>
        </nav>
    </header>

    <section class="hero">
        <div class="container hero-inner">
            <p class="eyebrow">Support</p>
            <h2>How can we help?</h2>
            <p class="summary">For merchandise questions, start with the TeePublic or Redbubble storefront handling the order. For the Hidden Walnuts iPhone and iPad game, email us with your device and what happened.</p>
        </div>
    </section>

    <main>
        <div class="container">
            <div class="contact-box">
                <h3>Contact Us</h3>
                <p><strong>Email Support:</strong> <a href="mailto:support@hiddenwalnuts.com">support@hiddenwalnuts.com</a></p>
                <p><strong>Response Time:</strong> We aim to respond within 24-48 business hours.</p>
            </div>

            <section class="faq" aria-label="Frequently asked questions">
                <h3>Frequently Asked Questions</h3>
                <article class="faq-item">
                    <h4>I have an issue with a merchandise order.</h4>
                    <p>For returns, exchanges, or shipping issues related to TeePublic or Redbubble, use that storefront's customer service portal first because they handle fulfillment directly. You can also email us with your order number.</p>
                </article>
                <article class="faq-item">
                    <h4>I found a bug in Hidden Walnuts on iPhone or iPad.</h4>
                    <p>Email <a href="mailto:support@hiddenwalnuts.com">support@hiddenwalnuts.com</a> with your device, iOS or iPadOS version, what you were doing, and what went wrong.</p>
                </article>
                <article class="faq-item">
                    <h4>Where do I get the game?</h4>
                    <p>Hidden Walnuts is live on the App Store for iPhone and iPad. <a href="${APP_STORE_URL}" target="_blank" rel="noopener">Open Hidden Walnuts on the App Store</a>.</p>
                </article>
                <article class="faq-item">
                    <h4>How do I manage player data?</h4>
                    <p>The game includes player-data controls in Settings. You can reset local data or use the delete-data flow if you want player data removed from the game service.</p>
                </article>
            </section>
        </div>
    </main>

    <footer>
        <div class="container footer-inner">
            <div>&copy; <span id="currentYear"></span> Hidden Walnuts. All rights reserved.</div>
            <div class="footer-links">
                <a href="/">About</a>
                <a href="/portfolio">Portfolio</a>
                <a href="/privacy">Privacy Policy</a>
            </div>
        </div>
    </footer>
    <script>document.getElementById("currentYear").textContent = new Date().getFullYear();</script>
</body>
</html>`;

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

async function serveFavicon(request) {
    const upstream = await fetch(`${GITHUB_ROOT_BASE_URL}fav-walnuts.png`);
    if (!upstream.ok) {
        return new Response('Favicon not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', 'public, max-age=86400');

    if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
    }

    return new Response(upstream.body, { status: 200, headers });
}

function escapeHtmlAttribute(value) {
    return String(value).replace(/[&"<>]/g, (character) => ({
        '&': '&amp;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;'
    }[character]));
}

function getCookieValue(request, name) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const target = `${name}=`;
    return cookieHeader
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(target))
        ?.slice(target.length) || null;
}

function randomHomeArtVisual() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return HOME_ART_VISUALS[values[0] % HOME_ART_VISUALS.length];
}

function selectHomeArtVisual(request) {
    const selectedId = getCookieValue(request, HOME_ART_VISUAL_COOKIE);
    const selectedVisual = HOME_ART_VISUALS.find((visual) => visual.id === selectedId);
    if (selectedVisual) {
        return { visual: selectedVisual, shouldSetCookie: false };
    }

    return { visual: randomHomeArtVisual(), shouldSetCookie: true };
}

function renderHomeHTML(visual) {
    return ABOUT_HTML
        .split(HOME_VISUAL_SRC_TOKEN).join(escapeHtmlAttribute(visual.src))
        .split(HOME_VISUAL_ALT_TOKEN).join(escapeHtmlAttribute(visual.alt))
        .split(HOME_VISUAL_POSITION_TOKEN).join(escapeHtmlAttribute(visual.position));
}

function homeResponse(request) {
    const { visual, shouldSetCookie } = selectHomeArtVisual(request);
    const headers = new Headers({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });

    headers.append('Set-Cookie', `${LEGACY_HOME_VISUAL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);

    if (shouldSetCookie) {
        headers.append('Set-Cookie', `${HOME_ART_VISUAL_COOKIE}=${visual.id}; Path=/; SameSite=Lax`);
    }

    return new Response(renderHomeHTML(visual), { headers });
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
            // Root static assets are hosted from GitHub raw because this Worker serves HTML/API only.
            if (path === '/fav-walnuts.png' || path === '/favicon.ico' || path === '/apple-touch-icon.png') {
                return serveFavicon(request);
            }

            // API Routes
            if (path.startsWith('/api/')) {
                const response = await handleAPI(request, env, path);
                return new Response(response.body, {
                    status: response.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(response.headers || {}) }
                });
            }

            // Admin interface route (protected)
            if (path === '/admin' || path === '/admin/') {
                const authResult = requireAuth(request);
                if (authResult) return authResult;

                return new Response(ADMIN_HTML, {
                    headers: {
                        'Content-Type': 'text/html',
                        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
                    }
                });
            }

            // New Content Pages
            if (path === '/support' || path === '/support/') {
                return new Response(SUPPORT_HTML, {
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
                });
            }
            if (path === '/privacy' || path === '/privacy/') {
                return new Response(APP_PRIVACY_HTML, {
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
                });
            }
            if (path === '/portfolio' || path === '/portfolio/') {
                return new Response(MAIN_HTML, {
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
                });
            }

            // Game landing page route
            if (path === '/game' || path === '/game/') {
                return new Response(GAME_HTML, {
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
                });
            }

            // Default landing page (About) route
            if (path === '/' || path === '') {
                return homeResponse(request);
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
    if (method !== 'GET') {
        const authResult = requireAuth(request);
        if (authResult) {
            const headers = {};
            const challenge = authResult.headers.get('WWW-Authenticate');
            if (challenge) headers['WWW-Authenticate'] = challenge;
            return {
                status: authResult.status,
                headers,
                body: JSON.stringify({ error: 'Authentication required' })
            };
        }
    }

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
        const keys = [];
        let cursor;
        do {
            const page = await env.PORTFOLIO_KV.list({ prefix: 'item:', cursor });
            keys.push(...page.keys);
            cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);

        const fetched = await Promise.all(
            keys.map((key) => env.PORTFOLIO_KV.get(key.name, { type: 'json' }))
        );
        const items = fetched.filter(Boolean);

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

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts Admin</title>
    <style>
        :root {
            --green: #2a5d31;
            --green-dark: #1d3d22;
            --ink: #233026;
            --muted: #647064;
            --line: #d8e0d6;
            --bg: #f5f7f1;
            --danger: #b42318;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: var(--ink);
            background: var(--bg);
            line-height: 1.5;
        }

        button,
        input,
        textarea {
            font: inherit;
        }

        .page {
            max-width: 1180px;
            margin: 0 auto;
            padding: 24px;
        }

        .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
        }

        h1 {
            margin: 0 0 6px;
            color: var(--green-dark);
            font-size: clamp(1.8rem, 4vw, 2.6rem);
        }

        .lede {
            margin: 0;
            color: var(--muted);
            max-width: 740px;
        }

        .tabs {
            display: inline-flex;
            gap: 6px;
            padding: 5px;
            background: #ffffff;
            border: 1px solid var(--line);
            border-radius: 8px;
        }

        .tab {
            border: 0;
            border-radius: 6px;
            padding: 10px 14px;
            background: transparent;
            color: var(--green-dark);
            cursor: pointer;
            font-weight: 700;
        }

        .tab[aria-selected="true"] {
            background: var(--green);
            color: #ffffff;
        }

        .layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 22px;
            align-items: start;
        }

        .panel,
        .side-panel {
            background: #ffffff;
            border: 1px solid var(--line);
            border-radius: 8px;
            box-shadow: 0 10px 28px rgba(31, 49, 31, 0.08);
        }

        .panel {
            padding: 24px;
        }

        .side-panel {
            padding: 18px;
        }

        .panel[hidden] {
            display: none;
        }

        .field {
            margin-bottom: 18px;
        }

        label {
            display: block;
            margin-bottom: 7px;
            color: var(--green-dark);
            font-weight: 700;
        }

        input[type="text"],
        input[type="url"],
        textarea {
            width: 100%;
            border: 1px solid #c8d3c4;
            border-radius: 7px;
            padding: 11px 12px;
            background: #ffffff;
            color: var(--ink);
        }

        textarea {
            min-height: 110px;
            resize: vertical;
        }

        input:focus,
        textarea:focus {
            outline: 2px solid rgba(42, 93, 49, 0.24);
            border-color: var(--green);
        }

        .filename-row {
            display: grid;
            grid-template-columns: minmax(210px, auto) minmax(0, 1fr);
            border: 1px solid #c8d3c4;
            border-radius: 7px;
            overflow: hidden;
            background: #ffffff;
        }

        .filename-prefix {
            padding: 11px 12px;
            background: #edf2e8;
            color: var(--muted);
            border-right: 1px solid #c8d3c4;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .filename-row input {
            border: 0;
            border-radius: 0;
        }

        .hint {
            margin-top: 7px;
            color: var(--muted);
            font-size: 0.92rem;
        }

        .check-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            font-weight: 700;
            color: var(--green-dark);
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
        }

        .btn {
            border: 0;
            border-radius: 7px;
            padding: 11px 15px;
            cursor: pointer;
            font-weight: 800;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
        }

        .btn-primary {
            background: var(--green);
            color: #ffffff;
        }

        .btn-primary:hover {
            background: var(--green-dark);
        }

        .btn-secondary {
            background: #e7ede3;
            color: var(--green-dark);
        }

        .btn-danger {
            background: var(--danger);
            color: #ffffff;
        }

        .btn[disabled] {
            cursor: wait;
            opacity: 0.65;
        }

        .notice {
            margin-bottom: 18px;
            padding: 12px 14px;
            border-radius: 7px;
            border: 1px solid var(--line);
            background: #f6faf2;
            color: var(--green-dark);
        }

        .notice.error {
            border-color: #f3b6b1;
            background: #fff5f4;
            color: var(--danger);
        }

        .preview {
            display: grid;
            gap: 10px;
        }

        .preview img {
            width: 100%;
            max-height: 240px;
            object-fit: contain;
            border: 1px solid var(--line);
            border-radius: 7px;
            background: #f8faf6;
        }

        .preview a {
            color: var(--green-dark);
            overflow-wrap: anywhere;
        }

        .manage-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
        }

        .item-card {
            border: 1px solid var(--line);
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
            display: grid;
        }

        .item-card img {
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: cover;
            background: #edf2e8;
        }

        .item-body {
            padding: 14px;
            display: grid;
            gap: 9px;
        }

        .item-title {
            margin: 0;
            font-size: 1.05rem;
            color: var(--green-dark);
        }

        .item-meta {
            margin: 0;
            color: var(--muted);
            font-size: 0.92rem;
        }

        .item-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .empty {
            color: var(--muted);
            padding: 20px;
            border: 1px dashed var(--line);
            border-radius: 8px;
            background: #fbfcfa;
        }

        @media (max-width: 820px) {
            .page {
                padding: 16px;
            }

            .topbar,
            .layout,
            .manage-head {
                display: grid;
            }

            .layout {
                grid-template-columns: 1fr;
            }

            .filename-row {
                grid-template-columns: 1fr;
            }

            .filename-prefix {
                border-right: 0;
                border-bottom: 1px solid #c8d3c4;
            }
        }
    </style>
</head>
<body>
    <main class="page">
        <header class="topbar">
            <div>
                <h1>Hidden Walnuts Admin</h1>
                <p class="lede">Manage portfolio items stored in Cloudflare KV. Prepare web images in the GitHub <code>images/</code> folder first, then enter the filename here.</p>
            </div>
            <nav class="tabs" aria-label="Admin sections">
                <button class="tab" id="edit-tab" type="button" aria-selected="true">Add/Edit</button>
                <button class="tab" id="manage-tab" type="button" aria-selected="false">Manage</button>
            </nav>
        </header>

        <div id="alert" aria-live="polite"></div>

        <section id="edit-panel" class="layout">
            <form id="item-form" class="panel">
                <input type="hidden" id="itemId">
                <div class="field">
                    <label for="title">Title</label>
                    <input id="title" name="title" type="text" required autocomplete="off">
                </div>

                <div class="field">
                    <label for="description">Description</label>
                    <textarea id="description" name="description"></textarea>
                </div>

                <div class="field">
                    <label for="imageFilename">Image filename or full image URL</label>
                    <div class="filename-row">
                        <span class="filename-prefix">${GITHUB_BASE_URL}</span>
                        <input id="imageFilename" name="imageFilename" type="text" required placeholder="ArtworkName_web.jpg">
                    </div>
                    <input id="imageUrl" name="imageUrl" type="hidden">
                    <div class="hint">Enter a filename from <code>images/</code>, or paste a full <code>https://</code> image URL.</div>
                </div>

                <div class="field">
                    <label for="redbubbleUrl">Store URL</label>
                    <input id="redbubbleUrl" name="redbubbleUrl" type="url" required placeholder="https://www.redbubble.com/shop/ap/...">
                </div>

                <div class="field">
                    <label for="tags">Tags</label>
                    <input id="tags" name="tags" type="text" placeholder="nature, vintage, woodland">
                    <div class="hint">Comma-separated. Used as portfolio metadata.</div>
                </div>

                <label class="check-row">
                    <input id="featured" name="featured" type="checkbox">
                    Featured item
                </label>

                <div class="actions">
                    <button id="submitButton" class="btn btn-primary" type="submit">Add Portfolio Item</button>
                    <button id="resetButton" class="btn btn-secondary" type="button">Reset</button>
                </div>
            </form>

            <aside class="side-panel">
                <h2>Image Preview</h2>
                <div id="previewEmpty" class="empty">Enter an image filename to preview it.</div>
                <div id="preview" class="preview" hidden>
                    <img id="previewImage" alt="">
                    <a id="previewLink" href="#" target="_blank" rel="noopener">Open image URL</a>
                </div>
            </aside>
        </section>

        <section id="manage-panel" class="panel" hidden>
            <div class="manage-head">
                <div>
                    <h2>Portfolio Items</h2>
                    <p id="itemsSummary" class="item-meta">Loading items...</p>
                </div>
                <button id="refreshButton" class="btn btn-secondary" type="button">Refresh</button>
            </div>
            <div id="itemsContainer"></div>
        </section>
    </main>

    <script>
        (function () {
            var imageBaseUrl = '${GITHUB_BASE_URL}';
            var currentItems = [];
            var editingId = null;
            var editPanel = document.getElementById('edit-panel');
            var managePanel = document.getElementById('manage-panel');
            var editTab = document.getElementById('edit-tab');
            var manageTab = document.getElementById('manage-tab');
            var itemForm = document.getElementById('item-form');
            var imageFilenameInput = document.getElementById('imageFilename');
            var imageUrlInput = document.getElementById('imageUrl');
            var preview = document.getElementById('preview');
            var previewEmpty = document.getElementById('previewEmpty');
            var previewImage = document.getElementById('previewImage');
            var previewLink = document.getElementById('previewLink');
            var submitButton = document.getElementById('submitButton');
            var itemsContainer = document.getElementById('itemsContainer');
            var itemsSummary = document.getElementById('itemsSummary');

            function showAlert(message, isError) {
                var alert = document.getElementById('alert');
                alert.className = 'notice' + (isError ? ' error' : '');
                alert.textContent = message;
                window.clearTimeout(showAlert.timeout);
                showAlert.timeout = window.setTimeout(function () {
                    alert.className = '';
                    alert.textContent = '';
                }, 6000);
            }

            function showPanel(name) {
                var showingManage = name === 'manage';
                editPanel.hidden = showingManage;
                managePanel.hidden = !showingManage;
                editTab.setAttribute('aria-selected', String(!showingManage));
                manageTab.setAttribute('aria-selected', String(showingManage));
                if (showingManage) loadItems();
            }

            function normalizeFilename(value) {
                return String(value || '').trim().replace(/^\\/+/, '');
            }

            function imageUrlFromInput(value) {
                var trimmed = String(value || '').trim();
                if (!trimmed) return '';
                if (/^https?:\\/\\//i.test(trimmed)) return trimmed;
                return imageBaseUrl + normalizeFilename(trimmed);
            }

            function imageInputFromUrl(url) {
                var value = String(url || '');
                if (value.indexOf(imageBaseUrl) === 0) {
                    return value.slice(imageBaseUrl.length);
                }
                return value;
            }

            function updatePreview() {
                var url = imageUrlFromInput(imageFilenameInput.value);
                imageUrlInput.value = url;
                if (!url) {
                    preview.hidden = true;
                    previewEmpty.hidden = false;
                    return;
                }
                previewImage.src = url;
                previewImage.alt = document.getElementById('title').value || 'Portfolio image preview';
                previewLink.href = url;
                preview.hidden = false;
                previewEmpty.hidden = true;
            }

            function parseTags(value) {
                var seen = {};
                return String(value || '')
                    .split(',')
                    .map(function (tag) { return tag.trim(); })
                    .filter(function (tag) {
                        if (!tag || seen[tag]) return false;
                        seen[tag] = true;
                        return true;
                    });
            }

            async function requestJson(path, options) {
                var requestOptions = options || {};
                var headers = Object.assign(
                    { 'Accept': 'application/json' },
                    requestOptions.headers || {}
                );
                var response = await fetch(path, Object.assign({}, requestOptions, {
                    credentials: 'same-origin',
                    headers: headers
                }));
                var text = await response.text();
                var data = null;
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch (error) {
                        throw new Error(text);
                    }
                }
                if (!response.ok) {
                    throw new Error((data && data.error) || 'Request failed with status ' + response.status);
                }
                return data;
            }

            function setSubmitting(isSubmitting) {
                submitButton.disabled = isSubmitting;
                submitButton.textContent = isSubmitting
                    ? 'Saving...'
                    : (editingId ? 'Update Portfolio Item' : 'Add Portfolio Item');
            }

            function resetForm() {
                editingId = null;
                itemForm.reset();
                imageUrlInput.value = '';
                submitButton.textContent = 'Add Portfolio Item';
                updatePreview();
            }

            async function handleSubmit(event) {
                event.preventDefault();
                updatePreview();

                var payload = {
                    title: document.getElementById('title').value.trim(),
                    description: document.getElementById('description').value.trim(),
                    imageUrl: imageUrlInput.value,
                    redbubbleUrl: document.getElementById('redbubbleUrl').value.trim(),
                    tags: parseTags(document.getElementById('tags').value),
                    featured: document.getElementById('featured').checked
                };

                if (!payload.title || !payload.imageUrl || !payload.redbubbleUrl) {
                    showAlert('Title, image, and store URL are required.', true);
                    return;
                }

                setSubmitting(true);
                try {
                    var path = editingId ? '/api/portfolio/' + encodeURIComponent(editingId) : '/api/portfolio';
                    var method = editingId ? 'PUT' : 'POST';
                    await requestJson(path, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    showAlert(editingId ? 'Portfolio item updated.' : 'Portfolio item added.', false);
                    resetForm();
                    await loadItems();
                    showPanel('manage');
                } catch (error) {
                    showAlert(error.message, true);
                } finally {
                    setSubmitting(false);
                }
            }

            async function loadItems() {
                itemsSummary.textContent = 'Loading items...';
                itemsContainer.innerHTML = '<div class="empty">Loading portfolio items...</div>';
                try {
                    currentItems = await requestJson('/api/portfolio');
                    renderItems();
                } catch (error) {
                    itemsSummary.textContent = 'Could not load portfolio items.';
                    itemsContainer.innerHTML = '';
                    showAlert(error.message, true);
                }
            }

            function renderItems() {
                itemsContainer.innerHTML = '';
                itemsSummary.textContent = currentItems.length + ' item' + (currentItems.length === 1 ? '' : 's');
                if (!currentItems.length) {
                    itemsContainer.innerHTML = '<div class="empty">No portfolio items yet.</div>';
                    return;
                }

                var grid = document.createElement('div');
                grid.className = 'items-grid';

                currentItems.forEach(function (item) {
                    var card = document.createElement('article');
                    card.className = 'item-card';

                    var image = document.createElement('img');
                    image.src = item.imageUrl || '';
                    image.alt = item.title || 'Portfolio image';
                    image.loading = 'lazy';
                    card.appendChild(image);

                    var body = document.createElement('div');
                    body.className = 'item-body';

                    var title = document.createElement('h3');
                    title.className = 'item-title';
                    title.textContent = item.title || 'Untitled';
                    body.appendChild(title);

                    var meta = document.createElement('p');
                    meta.className = 'item-meta';
                    var tags = Array.isArray(item.tags) && item.tags.length ? item.tags.join(', ') : 'No tags';
                    meta.textContent = tags + (item.featured ? ' | Featured' : '');
                    body.appendChild(meta);

                    var description = document.createElement('p');
                    description.className = 'item-meta';
                    description.textContent = item.description || 'No description';
                    body.appendChild(description);

                    var actions = document.createElement('div');
                    actions.className = 'item-actions';

                    var edit = document.createElement('button');
                    edit.className = 'btn btn-secondary';
                    edit.type = 'button';
                    edit.textContent = 'Edit';
                    edit.addEventListener('click', function () { editItem(item); });
                    actions.appendChild(edit);

                    var remove = document.createElement('button');
                    remove.className = 'btn btn-danger';
                    remove.type = 'button';
                    remove.textContent = 'Delete';
                    remove.addEventListener('click', function () { deleteItem(item); });
                    actions.appendChild(remove);

                    if (item.redbubbleUrl) {
                        var open = document.createElement('a');
                        open.className = 'btn btn-primary';
                        open.href = item.redbubbleUrl;
                        open.target = '_blank';
                        open.rel = 'noopener';
                        open.textContent = 'Open';
                        actions.appendChild(open);
                    }

                    body.appendChild(actions);
                    card.appendChild(body);
                    grid.appendChild(card);
                });

                itemsContainer.appendChild(grid);
            }

            function editItem(item) {
                editingId = item.id;
                document.getElementById('title').value = item.title || '';
                document.getElementById('description').value = item.description || '';
                imageFilenameInput.value = imageInputFromUrl(item.imageUrl);
                imageUrlInput.value = item.imageUrl || '';
                document.getElementById('redbubbleUrl').value = item.redbubbleUrl || '';
                document.getElementById('tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : '';
                document.getElementById('featured').checked = Boolean(item.featured);
                submitButton.textContent = 'Update Portfolio Item';
                updatePreview();
                showPanel('edit');
            }

            async function deleteItem(item) {
                if (!window.confirm('Delete "' + (item.title || 'this item') + '" from the portfolio?')) return;
                try {
                    await requestJson('/api/portfolio/' + encodeURIComponent(item.id), { method: 'DELETE' });
                    showAlert('Portfolio item deleted.', false);
                    if (editingId === item.id) resetForm();
                    await loadItems();
                } catch (error) {
                    showAlert(error.message, true);
                }
            }

            previewImage.addEventListener('error', function () {
                preview.hidden = true;
                previewEmpty.hidden = false;
            });
            imageFilenameInput.addEventListener('input', updatePreview);
            document.getElementById('title').addEventListener('input', updatePreview);
            itemForm.addEventListener('submit', handleSubmit);
            document.getElementById('resetButton').addEventListener('click', resetForm);
            document.getElementById('refreshButton').addEventListener('click', loadItems);
            editTab.addEventListener('click', function () { showPanel('edit'); });
            manageTab.addEventListener('click', function () { showPanel('manage'); });
            updatePreview();
        }());
    </script>
</body>
</html>`;

// Main Website HTML
const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hidden Walnuts</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico?v=5">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico?v=5">
    <link rel="shortcut icon" type="image/png" href="/favicon.ico?v=5">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5">
    <meta name="msapplication-TileImage" content="/favicon.ico?v=5">
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
    gap: 1.5rem;
    padding: 0.95rem 2rem;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid rgba(42, 93, 49, 0.12);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(14px);
    position: sticky;
    top: 0;
    z-index: 100;
}

.brand-link {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--primary-color);
    text-decoration: none;
}

.nav-logo {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
}

.brand-link h1 {
    font-size: 1.75rem;
    color: var(--primary-color);
    font-weight: 700;
    line-height: 1;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.nav-link {
    text-decoration: none;
    color: #526357;
    font-weight: 700;
    padding: 0.58rem 0.82rem;
    border-radius: 8px;
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
    .brand-link h1 {
        font-size: 1.45rem;
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
        <nav class="main-nav" aria-label="Primary navigation">
            <a href="/" class="brand-link">
                <img src="${GITHUB_BASE_URL}LogoForInsta.png" alt="Hidden Walnuts" class="nav-logo">
                <h1>Hidden Walnuts</h1>
            </a>
            <div class="nav-links">
                <a href="/" class="nav-link">About</a>
                <a href="/portfolio" class="nav-link active">Portfolio</a>
                <a href="/support" class="nav-link">Support</a>
                <a href="/privacy" class="nav-link">Privacy</a>
                <a href="/game" class="nav-link">iOS Game</a>
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
                    <h3>Company</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <a href="/" style="color: white; text-decoration: none; opacity: 0.8;">About Us</a>
                        <a href="/portfolio" style="color: white; text-decoration: none; opacity: 0.8;">Portfolio</a>
                        <a href="/support" style="color: white; text-decoration: none; opacity: 0.8;">Support</a>
                        <a href="/privacy" style="color: white; text-decoration: none; opacity: 0.8;">Privacy Policy</a>
                    </div>
                </div>

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
const GAME_HTML = LIVE_GAME_HTML;

const ABOUT_HTML = LIVE_ABOUT_HTML;



const SUPPORT_HTML = LIVE_SUPPORT_HTML;



const PRIVACY_HTML = APP_PRIVACY_HTML;
