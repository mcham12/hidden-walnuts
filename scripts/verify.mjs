#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { createServer } from 'node:net';
import { constants as osConstants, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = 'wrangler@4.62.0';
const WRANGLER_FETCH_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 250;
const STOP_GRACE_MS = 5_000;
const CLOUDFLARE_ENV_KEYS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CF_API_TOKEN', 'CF_ACCOUNT_ID'];
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);
const IMAGE_BASE = 'https://raw.githubusercontent.com/mcham12/hidden-walnuts/main/images/';

/** @typedef {'redbubble' | 'teepublic'} Shop */

/**
 * `href` is the stored string, unchanged, so round-trip comparison is exact.
 * @typedef {object} BuyLink
 * @property {Shop} shop
 * @property {string} href
 */

/**
 * Unknown wire keys are dropped, because PUT can add keys.
 * @typedef {object} PortfolioItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {BuyLink} buyLink
 * @property {string[]} tags
 * @property {boolean} featured     typeof boolean; a truthy string is a parse problem, not a featured item
 * @property {string} dateAdded
 */

/** @typedef {'item' | 'id' | 'title' | 'description' | 'imageUrl' | 'redbubbleUrl' | 'tags' | 'featured' | 'dateAdded'} WireField */

/** @typedef {{ field: WireField, reason: string }} ParseProblem */

/** @typedef {{ ok: true, item: PortfolioItem } | { ok: false, problems: ParseProblem[] }} ItemParse */

/**
 * The POST /api/portfolio body the admin form sends. It is wire-shaped on purpose,
 * because seeding drives the real create path.
 * @typedef {object} SeedItem
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} redbubbleUrl
 * @property {string[]} tags
 * @property {boolean} featured
 */

/** @typedef {{ status: number, contentType: string, body: string }} HttpObservation */

/**
 * @typedef {object} DesignObservation
 * @property {string} id
 * @property {string} title
 * @property {string} href
 * @property {HttpObservation} page
 */

/**
 * @typedef {object} Observation
 * @property {HttpObservation} page
 * @property {HttpObservation} pageSlash
 * @property {HttpObservation} feed
 * @property {HttpObservation} home
 * @property {HttpObservation} robots
 * @property {HttpObservation} sitemap
 * @property {HttpObservation} llms
 * @property {HttpObservation} gptbot
 * @property {HttpObservation} perplexity
 * @property {HttpObservation} missingDesign
 * @property {DesignObservation[]} designs
 */

/** @typedef {{ name: string, ok: boolean, detail: string }} Assertion */

/** @typedef {{ ok: boolean, wrangler: string, origin: string, assertions: Assertion[] }} Report */

/**
 * @typedef {object} LocalWorker
 * @property {string} origin
 * @property {number} pgid                  process group of npx, wrangler, and workerd
 * @property {string} runDir
 * @property {() => Promise<void>} stop
 */

/**
 * @typedef {{ mode: 'check', evidenceDir?: string }
 *         | { mode: 'serve', evidenceDir?: string }
 *         | { mode: 'url', origin: string, evidenceDir?: string }} Cli
 */

/** @type {ReadonlyMap<string, Shop>} */
const BUY_LINK_SHOPS = new Map([
    ['www.redbubble.com', 'redbubble'],
    ['redbubble.com', 'redbubble'],
    ['www.teepublic.com', 'teepublic'],
    ['teepublic.com', 'teepublic'],
]);

/** @type {readonly SeedItem[]} */
const SEED = [
    {
        title: 'Verify seed: Birches',
        description: 'Seeded by scripts/verify.mjs',
        imageUrl: `${IMAGE_BASE}Birches_web.jpg`,
        redbubbleUrl: 'https://www.redbubble.com/people/HiddenWalnuts/explore?page=1&sortOrder=recent',
        tags: ['verify'],
        featured: true,
    },
    {
        title: 'Verify seed: Barques',
        description: '',
        imageUrl: `${IMAGE_BASE}barques_web.webp`,
        redbubbleUrl: 'https://www.teepublic.com/user/hidden-walnuts',
        tags: [],
        featured: false,
    },
];

const spawnedWorkers = new Set();

/**
 * @param {string[]} argv
 * @returns {Cli}
 */
function parseCli(argv) {
    /** @type {string | undefined} */
    let evidenceDir;
    /** @type {string[]} */
    const rest = [];
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--evidence') {
            const dir = argv[index + 1];
            if (!dir || dir.startsWith('-')) usage();
            evidenceDir = dir;
            index += 1;
            continue;
        }
        rest.push(arg);
    }
    if (rest.length === 0) {
        return evidenceDir === undefined ? { mode: 'check' } : { mode: 'check', evidenceDir };
    }
    if (rest.length === 1 && rest[0] === 'serve') {
        return evidenceDir === undefined ? { mode: 'serve' } : { mode: 'serve', evidenceDir };
    }
    if (rest.length === 2 && rest[0] === '--url') {
        let url;
        try {
            url = new URL(rest[1]);
        } catch {
            usage();
        }
        if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)) usage();
        const origin = url.origin;
        return evidenceDir === undefined ? { mode: 'url', origin } : { mode: 'url', origin, evidenceDir };
    }
    usage();
}

function usage() {
    process.stderr.write('usage: node scripts/verify.mjs [--evidence <dir>] [serve | --url <http://127.0.0.1:port>]\n');
    process.exit(2);
}

/**
 * @returns {NodeJS.ProcessEnv}
 */
function childEnv() {
    const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
    for (const key of CLOUDFLARE_ENV_KEYS) delete env[key];
    return env;
}

/**
 * @param {string} runDir
 * @returns {boolean}
 */
function disposableRunDir(runDir) {
    // mkdtemp names are the only directories stop() may remove.
    if (typeof runDir !== 'string' || !isAbsolute(runDir)) return false;
    const root = resolve(tmpdir());
    const target = resolve(runDir);
    if (!basename(target).startsWith('hw-verify-')) return false;
    const rel = relative(root, target);
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * @param {number} pid
 * @param {NodeJS.Signals} signal
 */
function signalGroup(pid, signal) {
    if (!Number.isInteger(pid) || pid <= 0) {
        throw new Error('refusing to signal a process group without a pid');
    }
    try {
        process.kill(-pid, signal);
    } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH') throw error;
    }
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForExit(child, timeoutMs) {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    return new Promise((resolveExit) => {
        const timer = setTimeout(finish, timeoutMs);
        function finish() {
            clearTimeout(timer);
            child.removeListener('exit', finish);
            resolveExit();
        }
        child.once('exit', finish);
    });
}

/**
 * @param {() => Promise<void>} stop
 */
function installSignalHandlers(stop) {
    if (installSignalHandlers.installed) return;
    installSignalHandlers.installed = true;
    for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM', 'SIGHUP'])) {
        process.on(signal, () => {
            stop().finally(() => {
                process.exit(128 + osConstants.signals[signal]);
            });
        });
    }
}

/**
 * @param {string} logPath
 * @returns {string}
 */
function logTail(logPath) {
    try {
        const lines = readFileSync(logPath, 'utf8').split('\n');
        return lines.slice(-40).join('\n');
    } catch {
        return '(no wrangler log)';
    }
}

/** @returns {Promise<number>} */
function freePort() {
    return new Promise((resolvePort, rejectPort) => {
        const server = createServer();
        server.once('error', rejectPort);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => rejectPort(new Error('free port did not bind')));
                return;
            }
            const { port } = address;
            server.close((error) => {
                if (error) rejectPort(error);
                else resolvePort(port);
            });
        });
    });
}

/**
 * @param {() => Promise<void>} fn
 * @returns {() => Promise<void>}
 */
function once(fn) {
    /** @type {Promise<void> | null} */
    let pending = null;
    return () => {
        if (!pending) pending = Promise.resolve().then(fn);
        return pending;
    };
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolveSleep) => {
        setTimeout(resolveSleep, ms);
    });
}

/**
 * @param {string | undefined} evidenceDir
 * @returns {Promise<LocalWorker>}
 */
async function startWorker(evidenceDir) {
    const fetched = spawnSync('npx', ['--yes', WRANGLER, '--version'], {
        cwd: REPO_ROOT,
        env: childEnv(),
        encoding: 'utf8',
        timeout: WRANGLER_FETCH_TIMEOUT_MS,
    });
    if (fetched.error || fetched.status !== 0) {
        throw new Error(`could not fetch ${WRANGLER}`);
    }

    const port = await freePort();
    const runDir = mkdtempSync(join(tmpdir(), 'hw-verify-'));
    /** @type {import('node:child_process').ChildProcess | null} */
    let child = null;
    /** @type {LocalWorker | null} */
    let worker = null;

    const stop = once(async () => {
        if (worker) spawnedWorkers.delete(worker);
        if (child && child.pid) {
            await signalGroup(child.pid, 'SIGTERM');
            await waitForExit(child, STOP_GRACE_MS);
            if (child.exitCode === null && child.signalCode === null) {
                await signalGroup(child.pid, 'SIGKILL');
                await waitForExit(child, STOP_GRACE_MS);
            }
        }
        if (disposableRunDir(runDir)) {
            rmSync(runDir, { recursive: true, force: true });
        }
    });

    try {
        if (evidenceDir) mkdirSync(evidenceDir, { recursive: true });
        const envFile = join(runDir, 'empty.env');
        writeFileSync(envFile, '');
        const logPath = evidenceDir ? join(evidenceDir, 'wrangler.log') : join(runDir, 'wrangler.log');
        const logFd = openSync(logPath, 'a');
        const origin = `http://127.0.0.1:${port}`;
        try {
            child = spawn('npx', [
                '--yes',
                WRANGLER,
                'dev',
                '--local',
                '--ip', '127.0.0.1',
                '--port', String(port),
                '--persist-to', join(runDir, 'state'),
                '--env-file', envFile,
                '--show-interactive-dev-session=false',
            ], {
                cwd: REPO_ROOT,
                env: childEnv(),
                detached: true,
                stdio: ['ignore', logFd, logFd],
            });
        } finally {
            closeSync(logFd);
        }
        if (!child.pid) throw new Error('wrangler dev did not start');

        /** @type {Error | null} */
        let spawnError = null;
        child.once('error', (error) => {
            spawnError = error;
        });

        worker = Object.freeze({
            origin,
            pgid: child.pid,
            runDir,
            stop,
        });
        spawnedWorkers.add(worker);
        installSignalHandlers(stop);

        const started = Date.now();
        while (Date.now() - started < READY_TIMEOUT_MS) {
            if (spawnError || child.exitCode !== null || child.signalCode !== null) {
                await stop();
                throw new Error(`wrangler dev exited before the feed was ready\n${logTail(logPath)}`);
            }
            try {
                const response = await fetch(`${origin}/api/portfolio`);
                if (response.status === 200) {
                    const body = await response.json();
                    if (Array.isArray(body) && body.length === 0) return worker;
                    if (Array.isArray(body) && body.length > 0) {
                        await stop();
                        throw new Error('port answered with state this run did not create');
                    }
                }
            } catch (error) {
                if (error instanceof Error && error.message === 'port answered with state this run did not create') {
                    throw error;
                }
            }
            await sleep(READY_POLL_MS);
        }
        await stop();
        throw new Error(`timed out waiting for GET /api/portfolio to return []\n${logTail(logPath)}`);
    } catch (error) {
        await stop();
        throw error;
    }
}

/**
 * Takes a LocalWorker, not a URL, so it can only write to the instance this run spawned.
 * @param {LocalWorker} worker
 * @returns {Promise<void>}
 */
async function seedCatalog(worker) {
    if (!spawnedWorkers.has(worker)) {
        throw new Error('seedCatalog requires a LocalWorker from startWorker');
    }
    let hostname = '';
    try {
        hostname = new URL(worker.origin).hostname;
    } catch {
        hostname = '';
    }
    if (hostname !== '127.0.0.1') {
        throw new Error('seedCatalog requires origin host 127.0.0.1');
    }
    const authorization = readAdminAuthorization(readFileSync(join(REPO_ROOT, '_worker.js'), 'utf8'));
    for (const item of SEED) {
        const response = await fetch(`${worker.origin}/api/portfolio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authorization,
            },
            body: JSON.stringify(item),
        });
        /** @type {unknown} */
        let parsed = null;
        try {
            parsed = await response.json();
        } catch {
            parsed = null;
        }
        if (response.status !== 201 || !parsePortfolioItem(parsed).ok) {
            throw new Error(`seed failed for ${item.title}: status ${response.status}`);
        }
    }
}

/**
 * The result only ever goes into a request header. Never print, log, or write it.
 * @param {string} workerSource
 * @returns {string}
 */
function readAdminAuthorization(workerSource) {
    const username = readAdminConstant(workerSource, 'ADMIN_USERNAME');
    const password = readAdminConstant(workerSource, 'ADMIN_PASSWORD');
    const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    return `Basic ${token}`;
}

/**
 * @param {string} workerSource
 * @param {'ADMIN_USERNAME' | 'ADMIN_PASSWORD'} name
 * @returns {string}
 */
function readAdminConstant(workerSource, name) {
    const match = workerSource.match(new RegExp(`^const ${name} = '([^']*)';$`, 'm'));
    if (!match) throw new Error(`${name} not found in _worker.js`);
    if (match[1].includes(':')) throw new Error(`${name} contains ':'`);
    return match[1];
}

/**
 * @param {string} url
 * @returns {Promise<HttpObservation>}
 */
async function requestText(url, userAgent) {
    const response = await fetch(url, userAgent ? { headers: { 'User-Agent': userAgent } } : undefined);
    return {
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        body: await response.text(),
    };
}

/**
 * @param {string} origin
 * @returns {Promise<Observation>}
 */
async function observe(origin) {
    const page = await requestText(`${origin}/portfolio`);
    const pageSlash = await requestText(`${origin}/portfolio/`);
    const feed = await requestText(`${origin}/api/portfolio`);
    const home = await requestText(`${origin}/`);
    const robots = await requestText(`${origin}/robots.txt`);
    const sitemap = await requestText(`${origin}/sitemap.xml`);
    const llms = await requestText(`${origin}/llms.txt`);
    const gptbot = await requestText(`${origin}/portfolio`, 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot');
    const perplexity = await requestText(`${origin}/portfolio`, 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)');
    const missingDesign = await requestText(`${origin}/portfolio/zzzznotreal`);
    /** @type {DesignObservation[]} */
    const designs = [];
    try {
        const parsed = JSON.parse(feed.body);
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (!isPlainObject(item) || typeof item.id !== 'string' || !/^[a-z0-9]+$/.test(item.id)) continue;
                designs.push({
                    id: item.id,
                    title: typeof item.title === 'string' ? item.title : '',
                    href: typeof item.redbubbleUrl === 'string' ? item.redbubbleUrl : '',
                    page: await requestText(`${origin}/portfolio/${item.id}`),
                });
            }
        }
    } catch {
        designs.length = 0;
    }
    return { page, pageSlash, feed, home, robots, sitemap, llms, gptbot, perplexity, missingDesign, designs };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * @param {unknown} value
 * @returns {BuyLink | null}
 */
function parseBuyLink(value) {
    if (typeof value !== 'string') return null;
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    const shop = BUY_LINK_SHOPS.get(url.hostname);
    if (!shop) return null;
    if (url.pathname === '/') return null;
    return { shop, href: value };
}

/**
 * @param {unknown} raw
 * @returns {ItemParse}
 */
function parsePortfolioItem(raw) {
    if (!isPlainObject(raw)) {
        return { ok: false, problems: [{ field: 'item', reason: 'not a plain object' }] };
    }
    /** @type {ParseProblem[]} */
    const problems = [];
    if (typeof raw.id !== 'string' || raw.id.length === 0) {
        problems.push({ field: 'id', reason: 'expected a non-empty string' });
    }
    if (typeof raw.title !== 'string' || raw.title.length === 0) {
        problems.push({ field: 'title', reason: 'expected a non-empty string' });
    }
    if (typeof raw.description !== 'string') {
        problems.push({ field: 'description', reason: 'expected a string' });
    }
    if (typeof raw.imageUrl !== 'string') {
        problems.push({ field: 'imageUrl', reason: 'expected an absolute https URL' });
    } else {
        let imageUrl;
        try {
            imageUrl = new URL(raw.imageUrl);
        } catch {
            imageUrl = null;
        }
        if (!imageUrl || imageUrl.protocol !== 'https:') {
            problems.push({ field: 'imageUrl', reason: 'expected an absolute https URL' });
        }
    }
    const buyLink = parseBuyLink(raw.redbubbleUrl);
    if (!buyLink) {
        problems.push({
            field: 'redbubbleUrl',
            reason: 'expected an https teepublic.com or redbubble.com URL with a path',
        });
    }
    if (!Array.isArray(raw.tags) || raw.tags.some((tag) => typeof tag !== 'string')) {
        problems.push({ field: 'tags', reason: 'expected an array of strings' });
    }
    if (typeof raw.featured !== 'boolean') {
        problems.push({ field: 'featured', reason: 'expected a boolean' });
    }
    if (typeof raw.dateAdded !== 'string' || Number.isNaN(Date.parse(raw.dateAdded))) {
        problems.push({ field: 'dateAdded', reason: 'expected an ISO timestamp' });
    }
    if (problems.length > 0 || !buyLink) return { ok: false, problems };
    return {
        ok: true,
        item: {
            id: /** @type {string} */ (raw.id),
            title: /** @type {string} */ (raw.title),
            description: /** @type {string} */ (raw.description),
            imageUrl: /** @type {string} */ (raw.imageUrl),
            buyLink,
            tags: /** @type {string[]} */ (raw.tags),
            featured: /** @type {boolean} */ (raw.featured),
            dateAdded: /** @type {string} */ (raw.dateAdded),
        },
    };
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function rawId(raw) {
    if (isPlainObject(raw) && typeof raw.id === 'string' && raw.id.length > 0) return raw.id;
    return '?';
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function storedBuyLink(raw) {
    if (!isPlainObject(raw) || !Object.prototype.hasOwnProperty.call(raw, 'redbubbleUrl')) return '';
    const value = raw.redbubbleUrl;
    return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * @param {Observation} observation
 * @param {readonly SeedItem[]} seed
 * @returns {Assertion[]}
 */
function provePortfolio(observation, seed) {
    /**
     * @param {HttpObservation} page
     * @returns {boolean}
     */
    function pageOk(page) {
        return page.status === 200
            && page.contentType.startsWith('text/html')
            && page.body.includes('id="portfolioGrid"');
    }

    /**
     * @param {string} label
     * @param {HttpObservation} page
     * @returns {string}
     */
    function pageDetail(label, page) {
        const grid = page.body.includes('id="portfolioGrid"');
        const contentType = page.contentType || '(none)';
        return `${label} status ${page.status} content-type ${contentType} grid ${grid}`;
    }

    const portfolioOk = pageOk(observation.page) && pageOk(observation.pageSlash);
    /** @type {Assertion[]} */
    const assertions = [{
        name: 'GET /portfolio and GET /portfolio/ return 200 text/html with #portfolioGrid',
        ok: portfolioOk,
        detail: portfolioOk
            ? ''
            : `${pageDetail('GET /portfolio', observation.page)}\n${pageDetail('GET /portfolio/', observation.pageSlash)}`,
    }];

    /** @type {unknown} */
    let raw = null;
    let feedIsArray = false;
    if (observation.feed.status === 200 && observation.feed.contentType.startsWith('application/json')) {
        try {
            raw = JSON.parse(observation.feed.body);
            feedIsArray = Array.isArray(raw);
        } catch {
            feedIsArray = false;
        }
    }
    assertions.push({
        name: 'GET /api/portfolio returns 200 with a JSON array',
        ok: feedIsArray,
        detail: feedIsArray ? '' : `status ${observation.feed.status} content-type ${observation.feed.contentType || '(none)'}`,
    });

    const laterNames = [
        'every feed item has the PortfolioItem shape',
        'every buy link is an https teepublic.com or redbubble.com URL with a path',
        'the feed has more than zero items',
        'the feed has an item with featured === true',
        'the feed holds every seeded item exactly once, unchanged',
    ];
    if (!feedIsArray || !Array.isArray(raw)) {
        for (const name of laterNames) {
            assertions.push({ name, ok: false, detail: 'skipped: feed is not a JSON array' });
        }
        return assertions.concat(catalogSurfaceAssertions(observation, null));
    }

    const parsed = raw.map((entry) => parsePortfolioItem(entry));
    const items = parsed.flatMap((entry) => (entry.ok ? [entry.item] : []));
    const shapeLines = [];
    const buyLines = [];
    raw.forEach((entry, index) => {
        const result = parsed[index];
        if (result.ok) return;
        const id = rawId(entry);
        for (const problem of result.problems) {
            if (problem.field === 'redbubbleUrl') {
                buyLines.push(`item ${index} (${id}): ${storedBuyLink(entry)}`);
            } else {
                shapeLines.push(`item ${index} (${id}): ${problem.field} ${problem.reason}`);
            }
        }
    });
    assertions.push({
        name: laterNames[0],
        ok: shapeLines.length === 0,
        detail: shapeLines.join('\n'),
    });
    assertions.push({
        name: laterNames[1],
        ok: buyLines.length === 0,
        detail: buyLines.join('\n'),
    });
    assertions.push({
        name: laterNames[2],
        ok: raw.length > 0,
        detail: raw.length > 0 ? '' : `count ${raw.length}`,
    });
    const featured = items.some((item) => item.featured === true);
    assertions.push({
        name: laterNames[3],
        ok: featured,
        detail: featured ? '' : 'no parsed item has featured === true',
    });

    /** @type {string[]} */
    const seedProblems = [];
    for (const item of seed) {
        const hits = items.filter((candidate) => candidate.title === item.title);
        if (hits.length === 0) {
            seedProblems.push(`missing ${item.title}`);
            continue;
        }
        if (hits.length > 1) {
            seedProblems.push(`duplicated ${item.title}`);
            continue;
        }
        const actual = {
            description: hits[0].description,
            imageUrl: hits[0].imageUrl,
            href: hits[0].buyLink.href,
            tags: hits[0].tags,
            featured: hits[0].featured,
        };
        const expected = {
            description: item.description,
            imageUrl: item.imageUrl,
            href: item.redbubbleUrl,
            tags: item.tags,
            featured: item.featured,
        };
        if (!isDeepStrictEqual(actual, expected)) seedProblems.push(`changed ${item.title}`);
    }
    assertions.push({
        name: laterNames[4],
        ok: seedProblems.length === 0,
        detail: seedProblems.join('\n'),
    });
    return assertions.concat(catalogSurfaceAssertions(observation, raw));
}

/**
 * @param {Observation} observation
 * @param {unknown[] | null} raw
 * @returns {Assertion[]}
 */
function catalogSurfaceAssertions(observation, raw) {
    /** @type {Assertion[]} */
    const assertions = [];
    const documents = [
        ['GET /portfolio', observation.page],
        ['GET /portfolio/', observation.pageSlash],
        ['GET /portfolio as GPTBot', observation.gptbot],
        ['GET /portfolio as PerplexityBot', observation.perplexity],
    ];
    if (!Array.isArray(raw)) {
        for (const [label] of documents) {
            assertions.push({
                name: `${label} HTML includes each design title, image alt, and shop link`,
                ok: false,
                detail: 'skipped: feed is not a JSON array',
            });
        }
        assertions.push({
            name: 'portfolio JSON-LD is an ItemList of the same designs with shop offers and no price or rating',
            ok: false,
            detail: 'skipped: feed is not a JSON array',
        });
    } else {
        for (const [label, page] of documents) {
            /** @type {string[]} */
            const problems = [];
            if (page.status !== 200 || !page.contentType.startsWith('text/html')) {
                problems.push(`status ${page.status} content-type ${page.contentType || '(none)'}`);
            }
            if (page.body.includes('__PORTFOLIO_')) problems.push('discovery token was not replaced');
            let cursor = -1;
            for (const item of raw) {
                if (!isPlainObject(item)) {
                    problems.push('feed item is not an object');
                    continue;
                }
                const title = typeof item.title === 'string' ? item.title : '';
                const href = typeof item.redbubbleUrl === 'string' ? item.redbubbleUrl : '';
                const id = typeof item.id === 'string' ? item.id : '';
                const escapedTitle = escapeForAttribute(title);
                const escapedHref = escapeForAttribute(href);
                if (!page.body.includes(`<h2>${escapedTitle}</h2>`)) problems.push(`missing title ${title}`);
                if (!page.body.includes(`alt="${escapedTitle}"`)) problems.push(`missing alt for ${title}`);
                if (href && !page.body.includes(`href="${escapedHref}"`)) problems.push(`missing shop link ${href}`);
                const marker = `id="design-${id}"`;
                const at = page.body.indexOf(marker);
                if (at < 0) problems.push(`missing card ${id}`);
                else if (at <= cursor) problems.push(`card ${id} is out of feed order`);
                else cursor = at;
            }
            assertions.push({
                name: `${label} HTML includes each design title, image alt, and shop link`,
                ok: problems.length === 0,
                detail: problems.join('\n'),
            });
        }

        const ldProblems = portfolioJsonLdProblems(observation.page.body, raw);
        assertions.push({
            name: 'portfolio JSON-LD is an ItemList of the same designs with shop offers and no price or rating',
            ok: ldProblems.length === 0,
            detail: ldProblems.join('\n'),
        });
    }

    const robotsProblems = [];
    if (observation.robots.status !== 200 || !observation.robots.contentType.startsWith('text/plain')) {
        robotsProblems.push(`status ${observation.robots.status} content-type ${observation.robots.contentType || '(none)'}`);
    }
    const expectedRobots = [
        'User-agent: *',
        'Allow: /',
        'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
        '',
        'Sitemap: https://hiddenwalnuts.com/sitemap.xml',
        '',
    ].join('\n');
    if (observation.robots.body !== expectedRobots) robotsProblems.push(observation.robots.body);
    if (observation.robots.body.includes('Disallow')) robotsProblems.push('Disallow is present');
    assertions.push({
        name: 'GET /robots.txt allows search and AI use and points at the sitemap',
        ok: robotsProblems.length === 0,
        detail: robotsProblems.join('\n'),
    });

    /** @type {string[]} */
    const sitemapProblems = [];
    if (observation.sitemap.status !== 200 || !observation.sitemap.contentType.startsWith('application/xml')) {
        sitemapProblems.push(`status ${observation.sitemap.status} content-type ${observation.sitemap.contentType || '(none)'}`);
    }
    for (const loc of [
        'https://hiddenwalnuts.com/',
        'https://hiddenwalnuts.com/portfolio',
        'https://hiddenwalnuts.com/game',
    ]) {
        if (!observation.sitemap.body.includes(`<loc>${loc}</loc>`)) sitemapProblems.push(`missing ${loc}`);
    }
    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (!isPlainObject(item) || typeof item.id !== 'string') continue;
            const loc = `https://hiddenwalnuts.com/portfolio/${item.id}`;
            if (!observation.sitemap.body.includes(`<loc>${loc}</loc>`)) sitemapProblems.push(`missing ${loc}`);
        }
    }
    assertions.push({
        name: 'GET /sitemap.xml lists the home page, portfolio, game, and each design',
        ok: sitemapProblems.length === 0,
        detail: sitemapProblems.join('\n'),
    });

    /** @type {string[]} */
    const llmsProblems = [];
    if (observation.llms.status !== 200 || !observation.llms.contentType.startsWith('text/plain')) {
        llmsProblems.push(`status ${observation.llms.status} content-type ${observation.llms.contentType || '(none)'}`);
    }
    for (const phrase of [
        'Vintage and public-domain art prints on Redbubble and TeePublic',
        'iPhone and iPad game',
        'id6760266796',
    ]) {
        if (!observation.llms.body.includes(phrase)) llmsProblems.push(`missing ${phrase}`);
    }
    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (!isPlainObject(item)) continue;
            if (typeof item.title === 'string' && !observation.llms.body.includes(item.title)) {
                llmsProblems.push(`missing title ${item.title}`);
            }
            if (typeof item.redbubbleUrl === 'string' && !observation.llms.body.includes(item.redbubbleUrl)) {
                llmsProblems.push(`missing shop ${item.redbubbleUrl}`);
            }
        }
    }
    assertions.push({
        name: 'GET /llms.txt describes Hidden Walnuts and links each design to its shop',
        ok: llmsProblems.length === 0,
        detail: llmsProblems.join('\n'),
    });

    /** @type {string[]} */
    const designProblems = [];
    const seen = new Map((observation.designs || []).map((design) => [design.id, design]));
    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (!isPlainObject(item) || typeof item.id !== 'string') continue;
            const design = seen.get(item.id);
            if (!design) {
                designProblems.push(`missing observation for ${item.id}`);
                continue;
            }
            if (design.page.status !== 200 || !design.page.contentType.startsWith('text/html')) {
                designProblems.push(`${item.id} status ${design.page.status}`);
                continue;
            }
            if (typeof item.title === 'string' && !design.page.body.includes(`<h1>${escapeForAttribute(item.title)}</h1>`)) {
                designProblems.push(`${item.id} missing title`);
            }
            if (typeof item.redbubbleUrl === 'string' && !design.page.body.includes(`href="${escapeForAttribute(item.redbubbleUrl)}"`)) {
                designProblems.push(`${item.id} missing shop link`);
            }
            if (!design.page.body.includes(`https://hiddenwalnuts.com/portfolio/${item.id}`)) {
                designProblems.push(`${item.id} missing canonical`);
            }
        }
    }
    assertions.push({
        name: 'GET /portfolio/:id returns the design title, shop link, and canonical URL',
        ok: designProblems.length === 0 && Array.isArray(raw),
        detail: designProblems.join('\n'),
    });

    const missingOk = observation.missingDesign.status === 404;
    assertions.push({
        name: 'GET /portfolio/zzzznotreal returns 404',
        ok: missingOk,
        detail: missingOk ? '' : `status ${observation.missingDesign.status}`,
    });

    /** @type {string[]} */
    const homeProblems = [];
    if (observation.home.status !== 200 || !observation.home.contentType.startsWith('text/html')) {
        homeProblems.push(`status ${observation.home.status} content-type ${observation.home.contentType || '(none)'}`);
    }
    if (observation.home.body.includes('__HOME_DISCOVERY__')) homeProblems.push('discovery token was not replaced');
    if (!observation.home.body.includes('rel="canonical" href="https://hiddenwalnuts.com/"')) {
        homeProblems.push('missing canonical');
    }
    if (!observation.home.body.includes('"@type":"Organization"') || !observation.home.body.includes('"@type":"WebSite"')) {
        homeProblems.push('missing Organization or WebSite JSON-LD');
    }
    assertions.push({
        name: 'GET / includes a canonical URL and Organization and WebSite JSON-LD',
        ok: homeProblems.length === 0,
        detail: homeProblems.join('\n'),
    });

    return assertions;
}

/**
 * @param {string} html
 * @param {unknown[]} raw
 * @returns {string[]}
 */
function portfolioJsonLdProblems(html, raw) {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return ['missing JSON-LD'];
    /** @type {unknown} */
    let data;
    try {
        data = JSON.parse(match[1]);
    } catch {
        return ['JSON-LD does not parse'];
    }
    if (!isPlainObject(data) || data['@type'] !== 'ItemList') return ['JSON-LD is not an ItemList'];
    const elements = data.itemListElement;
    if (!Array.isArray(elements) || elements.length !== raw.length) {
        return [`ItemList length ${Array.isArray(elements) ? elements.length : 'not an array'} expected ${raw.length}`];
    }
    /** @type {string[]} */
    const problems = [];
    const banned = new Set(['price', 'pricecurrency', 'aggregaterating', 'ratingvalue', 'reviewcount', 'ratingcount', 'availability']);
    walkJson(data, (key) => {
        if (banned.has(key.toLowerCase())) problems.push(`forbidden ${key}`);
    });
    raw.forEach((item, index) => {
        const element = elements[index];
        if (!isPlainObject(element) || !isPlainObject(element.item)) {
            problems.push(`item ${index} is not a ListItem`);
            return;
        }
        const artwork = element.item;
        if (!isPlainObject(item) || artwork.name !== item.title) problems.push(`item ${index} name`);
        const offers = artwork.offers;
        if (!isPlainObject(item) || typeof item.redbubbleUrl !== 'string') return;
        if (!isPlainObject(offers) || offers.url !== item.redbubbleUrl) problems.push(`item ${index} offer url`);
    });
    return problems;
}

/**
 * @param {unknown} value
 * @param {(key: string) => void} visit
 */
function walkJson(value, visit) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        for (const entry of value) walkJson(entry, visit);
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        visit(key);
        walkJson(entry, visit);
    }
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeForAttribute(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[character]));
}

/**
 * @param {string} origin
 * @param {Observation} observation
 * @returns {Report}
 */
function buildReport(origin, observation) {
    const assertions = provePortfolio(observation, SEED);
    return {
        ok: assertions.every((assertion) => assertion.ok),
        wrangler: WRANGLER,
        origin,
        assertions,
    };
}

/**
 * @param {string} text
 * @param {string} label
 */
function refuseAdminPassword(text, label) {
    const source = readFileSync(join(REPO_ROOT, '_worker.js'), 'utf8');
    const match = source.match(/^const ADMIN_PASSWORD = '([^']*)';$/m);
    if (!match || match[1].length === 0) return;
    if (text.includes(match[1])) {
        throw new Error(`refusing to write ${label} because it contains ADMIN_PASSWORD`);
    }
}

/**
 * @param {string} dir
 * @param {Observation} observation
 * @param {Report} report
 */
function writeEvidence(dir, observation, report) {
    mkdirSync(dir, { recursive: true });
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    let feedText = observation.feed.body;
    try {
        feedText = `${JSON.stringify(JSON.parse(observation.feed.body), null, 2)}\n`;
    } catch {
        feedText = observation.feed.body;
    }
    refuseAdminPassword(reportText, 'report.json');
    refuseAdminPassword(feedText, 'feed.json');
    refuseAdminPassword(observation.page.body, 'portfolio.html');
    writeFileSync(join(dir, 'report.json'), reportText);
    writeFileSync(join(dir, 'feed.json'), feedText);
    writeFileSync(join(dir, 'portfolio.html'), observation.page.body);
}

/** @param {Report} report */
function printReport(report) {
    for (const assertion of report.assertions) {
        if (assertion.ok) {
            process.stdout.write(`ok    ${assertion.name}\n`);
            continue;
        }
        process.stdout.write(`FAIL  ${assertion.name}\n`);
        if (!assertion.detail) continue;
        for (const line of assertion.detail.split('\n')) {
            process.stdout.write(`      ${line}\n`);
        }
    }
    const passed = report.assertions.filter((assertion) => assertion.ok).length;
    process.stdout.write(`verify: ${passed}/${report.assertions.length} passed (${report.wrangler}, ${report.origin})\n`);
}

/** @param {string[]} argv */
async function main(argv) {
    const cli = parseCli(argv);
    if (cli.mode === 'url') {
        const observation = await observe(cli.origin);
        const report = buildReport(cli.origin, observation);
        if (cli.evidenceDir) writeEvidence(cli.evidenceDir, observation, report);
        printReport(report);
        process.exitCode = report.ok ? 0 : 1;
        return;
    }

    const worker = await startWorker(cli.evidenceDir);
    try {
        await seedCatalog(worker);
        if (cli.mode === 'serve') {
            writeSync(1, `${JSON.stringify({
                ready: true,
                origin: worker.origin,
                pid: process.pid,
                runDir: worker.runDir,
            })}\n`);
            await new Promise(() => {});
            return;
        }
        const observation = await observe(worker.origin);
        const report = buildReport(worker.origin, observation);
        if (cli.evidenceDir) writeEvidence(cli.evidenceDir, observation, report);
        printReport(report);
        process.exitCode = report.ok ? 0 : 1;
    } finally {
        await worker.stop();
    }
}

await main(process.argv.slice(2));
