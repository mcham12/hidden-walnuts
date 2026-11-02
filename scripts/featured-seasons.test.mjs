import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURED_CATALOG } from '../featured-catalog.js';
import { PORTFOLIO_SNAPSHOT } from '../portfolio-snapshot.js';
import { ALLOWED_SEASONS, presentPortfolioItem, selectFeatured, westernEaster } from '../featured-seasons.js';
import worker from '../_worker.js';

const failures = [];

function check(name, fn) {
    try {
        fn();
        process.stdout.write(`ok ${name}\n`);
    } catch (error) {
        failures.push(name);
        process.stderr.write(`not ok ${name}\n`);
        process.stderr.write(`${error.stack || error}\n`);
    }
}

function at(iso) {
    return new Date(iso);
}

function design(id, fields = {}) {
    return { id, dateAdded: '2020-01-01', ...fields };
}

function many(season, count, prefix) {
    return Array.from({ length: count }, (_, index) => design(`${prefix}-${index}`, { season }));
}

function ids(items) {
    return items.map((item) => item.id);
}

function assertAlwaysAhead(nowIso, winnerSeason, loserSeason) {
    const now = at(nowIso);
    for (let trial = 0; trial < 8; trial += 1) {
        const winner = design(`w-${trial}`, { season: winnerSeason, religious: true });
        const losers = Array.from({ length: 8 }, (_, index) => (
            design(`l-${trial}-${index}`, { season: loserSeason })
        ));
        const selected = selectFeatured([winner, ...losers], now);
        assert.equal(
            selected[0].id,
            winner.id,
            `${nowIso} ${winnerSeason} ahead of ${loserSeason} trial ${trial}`,
        );
    }
}

check('western easter dates', () => {
    assert.deepEqual(westernEaster(2024), { year: 2024, month: 3, day: 31 });
    assert.deepEqual(westernEaster(2025), { year: 2025, month: 4, day: 20 });
    assert.deepEqual(westernEaster(2026), { year: 2026, month: 4, day: 5 });
    assert.deepEqual(westernEaster(2027), { year: 2027, month: 3, day: 28 });
    assert.deepEqual(westernEaster(2028), { year: 2028, month: 4, day: 16 });
    assert.deepEqual(westernEaster(2026), { year: 2026, month: 4, day: 5 });
});

check('chicago midnight keeps christmas behind a full autumn set', () => {
    const christmas = design('christmas', { season: 'christmas', religious: true });
    const autumn = many('autumn', 8, 'autumn');
    const selected = selectFeatured([christmas, ...autumn], at('2026-11-02T05:00:00.000Z'));
    assert.equal(selected.length, 8);
    assert.equal(selected.some((item) => item.id === 'christmas'), false);
    assert.equal(selected.every((item) => item.season === 'autumn'), true);
});

check('november 2 selects a religious christmas design over autumn', () => {
    const christmas = design('christmas', { season: 'christmas', religious: true });
    const autumn = many('autumn', 8, 'autumn');
    const selected = selectFeatured([christmas, ...autumn], at('2026-11-02T18:00:00.000Z'));
    assert.equal(selected[0].id, 'christmas');
    assert.equal(selected.filter((item) => item.season === 'autumn').length, 7);
});

check('november 20 keeps newcomers and religious christmas in the eight', () => {
    const christmas = [0, 1, 2].map((index) => design(`xmas-${index}`, {
        season: 'christmas',
        religious: true,
    }));
    const winter = many('winter', 10, 'winter');
    const newcomers = [
        design('new-a', { season: 'evergreen', dateAdded: '2026-11-19' }),
        design('new-b', { season: 'evergreen', dateAdded: '2026-11-18' }),
    ];
    const fixture = [...christmas, ...winter, ...newcomers];
    const now = at('2026-11-20T18:00:00.000Z');
    const selected = selectFeatured(fixture, now);
    assert.equal(selected.length, 8);
    assert.equal(christmas.every((item) => selected.includes(item)), true);
    assert.equal(newcomers.every((item) => selected.includes(item)), true);
    const seasonal = selected.filter((item) => item.season === 'christmas' || item.season === 'winter');
    assert.equal(seasonal.length >= 6, true);

    const extra = design('xmas-new', {
        season: 'christmas',
        religious: true,
        dateAdded: '2026-11-19',
    });
    const expanded = [...fixture, extra];
    const again = selectFeatured(expanded, now);
    assert.equal(again.length <= 8, true);
    assert.equal(again.includes(extra), true);
});

check('april 20 spring designs fill at least six of eight', () => {
    const christmas = [0, 1, 2].map((index) => design(`xmas-${index}`, {
        season: 'christmas',
        religious: true,
    }));
    const winter = many('winter', 10, 'winter');
    const spring = many('spring', 10, 'spring');
    const evergreen = design('yesterday', { season: 'evergreen', dateAdded: '2026-04-19' });
    const selected = selectFeatured(
        [...spring, ...winter, ...christmas, evergreen],
        at('2026-04-20T18:00:00.000Z'),
    );
    assert.equal(selected.length, 8);
    assert.equal(selected.filter((item) => item.season === 'spring').length >= 6, true);
});

check('easter window ranks religious easter and good friday ahead of spring', () => {
    const easter = design('easter', { season: 'easter', religious: true });
    const goodFriday = design('good-friday', { season: 'good-friday', religious: true });
    const spring = many('spring', 8, 'spring');
    const summer = design('summer', { season: 'summer' });
    const selected = selectFeatured(
        [summer, ...spring, goodFriday, easter],
        at('2026-04-01T18:00:00.000Z'),
    );
    assert.equal(selected.length, 8);
    assert.equal(selected.includes(easter), true);
    assert.equal(selected.includes(goodFriday), true);
    assert.equal(selected.includes(summer), false);
    const firstSpring = selected.findIndex((item) => item.season === 'spring');
    assert.equal(selected.indexOf(easter) < firstSpring, true);
    assert.equal(selected.indexOf(goodFriday) < firstSpring, true);
});

check('the same chicago date keeps order and the next date changes it', () => {
    const winter = Array.from({ length: 12 }, (_, index) => (
        design(`winter-${String(index).padStart(2, '0')}`, { season: 'winter' })
    ));
    const firstDay = at('2026-12-15T18:00:00.000Z');
    const secondDay = at('2026-12-16T18:00:00.000Z');
    const first = ids(selectFeatured(winter, firstDay));
    const repeat = ids(selectFeatured(winter, firstDay));
    const reversed = ids(selectFeatured([...winter].reverse(), firstDay));
    const next = ids(selectFeatured(winter, secondDay));
    assert.deepEqual(first, repeat);
    assert.deepEqual(first, reversed);
    assert.equal(first.length, 8);
    assert.equal(next.length, 8);
    assert.notDeepEqual(first, next);
});

check('a one-day-old evergreen is featured and a sixty-day evergreen is not', () => {
    const yesterday = design('yesterday', {
        season: 'evergreen',
        dateAdded: '2026-07-31T18:00:00.000Z',
    });
    const older = design('older', {
        season: 'evergreen',
        dateAdded: '2026-06-02T18:00:00.000Z',
    });
    const unparseable = design('bad-date', {
        season: 'evergreen',
        dateAdded: 'not-a-date',
    });
    const day27 = design('day-27', {
        season: 'evergreen',
        dateAdded: '2026-07-05T18:00:00.000Z',
    });
    const day28 = design('day-28', {
        season: 'evergreen',
        dateAdded: '2026-07-04T18:00:00.000Z',
    });
    const summer = many('summer', 10, 'summer');
    const selected = selectFeatured(
        [...summer, older, unparseable, day28, day27, yesterday],
        at('2026-08-01T18:00:00.000Z'),
    );
    assert.equal(selected.length, 8);
    assert.equal(selected.includes(yesterday), true);
    assert.equal(selected.includes(day27), true);
    assert.equal(selected.includes(day28), false);
    assert.equal(selected.includes(older), false);
    assert.equal(selected.includes(unparseable), false);
});

check('catalog pin and exclude do not override the item', () => {
    const evergreen = design('catalog-pin', { season: 'evergreen' });
    const summer = many('summer', 10, 'summer');
    const pinnedByCatalog = selectFeatured(
        [evergreen, ...summer],
        at('2026-07-04T18:00:00.000Z'),
        { 'catalog-pin': { pin: true, season: 'summer', exclude: true } },
    );
    assert.equal(pinnedByCatalog.includes(evergreen), false);
    const kept = design('kept', { season: 'summer' });
    const selected = selectFeatured(
        [kept],
        at('2026-07-04T18:00:00.000Z'),
        { kept: { exclude: true, pin: false, season: 'winter' } },
    );
    assert.deepEqual(ids(selected), ['kept']);
});

check('pin is featured in summer and exclude removes a religious christmas design', () => {
    const pin = design('pinned', { season: 'evergreen', pin: true });
    const summer = many('summer', 10, 'summer');
    const summerSet = selectFeatured([pin, ...summer], at('2026-07-04T18:00:00.000Z'));
    assert.equal(summerSet.length, 8);
    assert.equal(summerSet[0], pin);

    const hidden = design('hidden-christmas', {
        season: 'christmas',
        religious: true,
        exclude: true,
        pin: true,
    });
    const shown = design('shown-christmas', { season: 'christmas', religious: true });
    const hiddenWinter = design('hidden-winter', { season: 'winter', exclude: true });
    const december = selectFeatured(
        [hidden, shown, hiddenWinter, ...many('spring', 8, 'spring')],
        at('2026-12-20T18:00:00.000Z'),
    );
    assert.equal(december.includes(hidden), false);
    assert.equal(december.includes(hiddenWinter), false);
    assert.equal(december.includes(shown), true);
    assert.equal(december[0], shown);
});

check('pins sort newest first and then by id', () => {
    const older = design('b-pin', { pin: true, dateAdded: '2026-07-01T18:00:00.000Z' });
    const newer = design('a-pin', { pin: true, dateAdded: '2026-07-03T18:00:00.000Z' });
    const sameDayLaterId = design('m-pin', { pin: true, dateAdded: '2026-07-02T18:00:00.000Z' });
    const sameDayEarlierId = design('c-pin', { pin: true, dateAdded: '2026-07-02T18:00:00.000Z' });
    const selected = selectFeatured(
        [older, sameDayLaterId, newer, sameDayEarlierId],
        at('2026-07-04T18:00:00.000Z'),
    );
    assert.deepEqual(ids(selected), ['a-pin', 'c-pin', 'm-pin', 'b-pin']);
});

check('missing season is evergreen and loses to eight spring designs', () => {
    const spring = many('spring', 8, 'spring');
    for (let trial = 0; trial < 8; trial += 1) {
        const missing = { id: `missing-${trial}`, dateAdded: '2020-01-01' };
        const selected = selectFeatured([missing, ...spring], at('2026-04-20T18:00:00.000Z'));
        assert.equal(selected.some((item) => item.id === missing.id), false);
        assert.equal(selected.every((item) => item.season === 'spring'), true);
    }
});

check('item season winter overrides catalog season spring', () => {
    const spring = many('spring', 8, 'spring');
    const april = at('2026-04-20T18:00:00.000Z');
    const december = at('2026-12-15T18:00:00.000Z');
    for (let trial = 0; trial < 8; trial += 1) {
        const id = `override-${trial}`;
        const item = design(id, { season: 'winter' });
        const catalog = { [id]: { season: 'spring', religious: true } };
        const inSpring = selectFeatured([item, ...spring], april, catalog);
        assert.equal(inSpring.some((entry) => entry.id === id), false);
        const partner = design(`partner-${trial}`, { season: 'spring' });
        const inWinter = selectFeatured([partner, item], december, catalog);
        assert.deepEqual(ids(inWinter), [id, partner.id]);
    }
});

check('item religious false overrides a catalog true', () => {
    const now = at('2026-11-20T18:00:00.000Z');
    for (let trial = 0; trial < 8; trial += 1) {
        const id = `secular-${trial}`;
        const secular = design(id, { season: 'christmas', religious: false });
        const religious = Array.from({ length: 8 }, (_, index) => (
            design(`sacred-${trial}-${index}`, { season: 'christmas', religious: true })
        ));
        const selected = selectFeatured([secular, ...religious], now, { [id]: { religious: true } });
        assert.equal(selected.some((item) => item.id === id), false);
    }
});

check('catalog religious true ranks a christmas design first', () => {
    const now = at('2026-11-20T18:00:00.000Z');
    for (let trial = 0; trial < 8; trial += 1) {
        const id = `catalog-${trial}`;
        const item = design(id, { season: 'christmas' });
        const secular = Array.from({ length: 8 }, (_, index) => (
            design(`plain-${trial}-${index}`, { season: 'christmas', religious: false })
        ));
        const selected = selectFeatured([item, ...secular], now, {
            [id]: { season: 'spring', religious: true },
        });
        assert.equal(selected[0], item);
    }
});

check('featured catalog values stay inside the season contract', () => {
    const snapshotIds = new Set(PORTFOLIO_SNAPSHOT.map((item) => item.id));
    assert.equal(snapshotIds.size, PORTFOLIO_SNAPSHOT.length);
    assert.equal(Object.keys(FEATURED_CATALOG).length, PORTFOLIO_SNAPSHOT.length);
    for (const item of PORTFOLIO_SNAPSHOT) {
        const entry = FEATURED_CATALOG[item.id];
        assert.equal(typeof entry, 'object', item.id);
        assert.equal(ALLOWED_SEASONS.has(entry.season), true, item.id);
        assert.equal(typeof entry.religious, 'boolean', item.id);
        assert.equal(typeof item.dateAdded, 'string', item.id);
        assert.equal(Number.isNaN(Date.parse(item.dateAdded)), false, item.id);
    }
});

function catalogSeason(item) {
    return FEATURED_CATALOG[item.id].season;
}

check('the current catalog on 2 Nov 2026 leads with winter and christmas', () => {
    const now = at('2026-11-02T18:00:00.000Z');
    const selected = selectFeatured(PORTFOLIO_SNAPSHOT, now);
    assert.equal(selected.length, 8);
    const holiday = selected.filter((item) => {
        const season = catalogSeason(item);
        return season === 'winter' || season === 'christmas';
    });
    assert.equal(holiday.length >= 6, true);
    const nativities = PORTFOLIO_SNAPSHOT.filter((item) => (
        catalogSeason(item) === 'christmas' && FEATURED_CATALOG[item.id].religious === true
    ));
    assert.equal(nativities.length > 0, true);
    for (const item of nativities) {
        assert.equal(selected.some((entry) => entry.id === item.id), true, item.title);
    }
    const again = selectFeatured(PORTFOLIO_SNAPSHOT, now);
    assert.deepEqual(ids(again), ids(selected));
});

check('the current catalog on 20 Apr 2026 leads with every spring design', () => {
    const selected = selectFeatured(PORTFOLIO_SNAPSHOT, at('2026-04-20T18:00:00.000Z'));
    assert.equal(selected.length, 8);
    const spring = PORTFOLIO_SNAPSHOT.filter((item) => catalogSeason(item) === 'spring');
    assert.equal(spring.length > 0, true);
    for (const item of spring) {
        assert.equal(selected.some((entry) => entry.id === item.id), true, item.title);
    }
    assert.equal(selected.filter((item) => catalogSeason(item) === 'spring').length, spring.length);
});

check('july and october do not feature christmas, easter, or winter', () => {
    const blocked = new Set(['christmas', 'easter', 'winter', 'good-friday']);
    const dates = [
        '2027-07-04T18:00:00.000Z',
        '2027-10-10T18:00:00.000Z',
        '2027-10-31T17:00:00.000Z',
    ];
    for (const iso of dates) {
        const selected = selectFeatured(PORTFOLIO_SNAPSHOT, at(iso));
        assert.equal(selected.length, 8, iso);
        for (const item of selected) {
            const season = catalogSeason(item);
            assert.equal(blocked.has(season), false, `${iso} ${item.title} ${season}`);
        }
    }
    const july = selectFeatured(PORTFOLIO_SNAPSHOT, at(dates[0]));
    for (const item of july) {
        const season = catalogSeason(item);
        assert.equal(season === 'summer' || season === 'evergreen', true, item.title);
    }
    const october = selectFeatured(PORTFOLIO_SNAPSHOT, at(dates[1]));
    for (const item of october) {
        const season = catalogSeason(item);
        assert.equal(season === 'autumn' || season === 'evergreen', true, item.title);
    }
});

check('leftover slots use evergreen before a design from another season', () => {
    const summer = design('only-summer', { season: 'summer' });
    const evergreen = many('evergreen', 10, 'green');
    const nativity = design('july-nativity', {
        season: 'christmas',
        religious: true,
        dateAdded: '2027-07-03T18:00:00.000Z',
    });
    const winter = many('winter', 4, 'snow');
    const easter = many('easter', 2, 'risen');
    const selected = selectFeatured(
        [nativity, ...winter, ...easter, summer, ...evergreen],
        at('2027-07-04T18:00:00.000Z'),
    );
    assert.equal(selected.length, 8);
    assert.equal(selected.includes(summer), true);
    assert.equal(selected.includes(nativity), false);
    for (const item of selected) {
        assert.equal(item.season === 'summer' || item.season === 'evergreen', true, item.id);
    }

    const onlySeasonal = selectFeatured(
        [summer, nativity],
        at('2027-07-04T18:00:00.000Z'),
    );
    assert.deepEqual(ids(onlySeasonal), ['only-summer', 'july-nativity']);
});

check('the current catalog features Easter designs on 1 Apr 2026', () => {
    const selected = selectFeatured(PORTFOLIO_SNAPSHOT, at('2026-04-01T18:00:00.000Z'));
    const easter = PORTFOLIO_SNAPSHOT.filter((item) => {
        const season = catalogSeason(item);
        return season === 'easter' || season === 'good-friday';
    });
    assert.equal(easter.length > 0, true);
    for (const item of easter) {
        assert.equal(selected.some((entry) => entry.id === item.id), true, item.title);
    }
});

check('a new in-season design joins the current catalog without shrinking the set', () => {
    const added = {
        id: 'new-nativity',
        title: 'New nativity',
        dateAdded: '2026-11-01T18:00:00.000Z',
        season: 'christmas',
        religious: true,
    };
    const selected = selectFeatured([...PORTFOLIO_SNAPSHOT, added], at('2026-11-02T18:00:00.000Z'));
    assert.equal(selected.length, 8);
    assert.equal(selected.some((item) => item.id === 'new-nativity'), true);
});

check('catalog season is visible on read and does not rewrite the stored item', () => {
    const stored = { id: PORTFOLIO_SNAPSHOT[0].id, title: 'Stored', featured: false };
    const before = JSON.stringify(stored);
    const shown = presentPortfolioItem(stored);
    assert.equal(JSON.stringify(stored), before);
    assert.equal(shown.season, FEATURED_CATALOG[stored.id].season);
    assert.equal(shown.religious, FEATURED_CATALOG[stored.id].religious);
    assert.equal(shown.featured, false);
});

check('fixed and computed windows include their edges', () => {
    const edges = [
        ['2026-02-01T18:00:00.000Z', 'valentine', 'winter'],
        ['2026-02-14T18:00:00.000Z', 'valentine', 'winter'],
        ['2026-02-15T18:00:00.000Z', 'winter', 'valentine'],
        ['2026-10-14T18:00:00.000Z', 'autumn', 'halloween'],
        ['2026-10-15T18:00:00.000Z', 'halloween', 'autumn'],
        ['2026-10-24T18:00:00.000Z', 'halloween', 'all-saints'],
        ['2026-10-25T18:00:00.000Z', 'all-saints', 'autumn'],
        ['2026-10-31T18:00:00.000Z', 'halloween', 'autumn'],
        ['2026-11-01T18:00:00.000Z', 'all-saints', 'christmas'],
        ['2026-11-01T18:00:00.000Z', 'autumn', 'halloween'],
        ['2026-11-02T18:00:00.000Z', 'christmas', 'all-saints'],
        ['2026-11-30T18:00:00.000Z', 'winter', 'spring'],
        ['2026-12-01T18:00:00.000Z', 'winter', 'spring'],
        ['2027-01-06T18:00:00.000Z', 'christmas', 'winter'],
        ['2027-01-07T18:00:00.000Z', 'winter', 'christmas'],
        ['2027-02-28T18:00:00.000Z', 'winter', 'spring'],
        ['2027-03-01T18:00:00.000Z', 'spring', 'winter'],
        ['2028-02-29T18:00:00.000Z', 'winter', 'spring'],
        ['2028-03-01T18:00:00.000Z', 'spring', 'winter'],
        ['2026-05-31T18:00:00.000Z', 'spring', 'summer'],
        ['2026-06-01T18:00:00.000Z', 'summer', 'spring'],
        ['2026-08-31T18:00:00.000Z', 'summer', 'autumn'],
        ['2026-09-01T18:00:00.000Z', 'autumn', 'summer'],
        ['2026-03-14T18:00:00.000Z', 'spring', 'easter'],
        ['2026-03-15T18:00:00.000Z', 'easter', 'spring'],
        ['2026-04-05T18:00:00.000Z', 'easter', 'spring'],
        ['2026-04-06T18:00:00.000Z', 'spring', 'easter'],
        ['2026-04-01T18:00:00.000Z', 'good-friday', 'spring'],
        ['2026-05-17T18:00:00.000Z', 'spring', 'pentecost'],
        ['2026-05-18T18:00:00.000Z', 'pentecost', 'spring'],
        ['2026-05-24T18:00:00.000Z', 'pentecost', 'spring'],
        ['2026-05-25T18:00:00.000Z', 'spring', 'pentecost'],
    ];
    for (const [nowIso, winnerSeason, loserSeason] of edges) {
        assertAlwaysAhead(nowIso, winnerSeason, loserSeason);
    }
});

check('selection does not mutate the input and caps the length', () => {
    const items = [
        ...many('summer', 10, 'summer'),
        design('exclude-me', { season: 'summer', exclude: true }),
        design('short-a', { season: 'evergreen' }),
    ];
    const snapshot = JSON.stringify(items);
    const order = ids(items);
    const now = at('2026-07-04T18:00:00.000Z');
    const selected = selectFeatured(items, now);
    assert.equal(JSON.stringify(items), snapshot);
    assert.deepEqual(ids(items), order);
    assert.equal(selected.length, 8);
    assert.equal(selected.includes(items.find((item) => item.id === 'exclude-me')), false);
    const few = [design('one', { season: 'summer' }), design('two', { season: 'summer', exclude: true })];
    assert.deepEqual(ids(selectFeatured(few, now)), ['one']);
    assert.deepEqual(selectFeatured([], now), []);
});

const workerSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../_worker.js'), 'utf8');

check('worker wires the selector, allowlist, and admin fields', () => {
    assert.equal(workerSource.includes("import { ALLOWED_SEASONS, presentPortfolioItem, selectFeatured } from './featured-seasons.js';"), true);
    assert.equal(workerSource.includes('presentPortfolioItem(item)'), true);
    assert.equal(workerSource.includes('selectFeatured(items, new Date())'), true);
    assert.equal(workerSource.includes('Christian subject'), true);
    assert.equal(workerSource.includes('id="pin"'), true);
    assert.equal(workerSource.includes('id="exclude"'), true);
    assert.equal(workerSource.includes('id="religious"'), true);
    assert.equal(workerSource.includes('id="season"'), true);
    assert.equal(workerSource.includes('id="featured"'), true);
    for (const season of ALLOWED_SEASONS) {
        assert.equal(workerSource.includes(`value="${season}"`), true, season);
    }
    assert.equal(/function requireAuth\(/.test(workerSource), true);
    assert.equal(/const ADMIN_USERNAME = /.test(workerSource), true);
    assert.equal(/const ADMIN_PASSWORD = /.test(workerSource), true);
});

function memoryKv() {
    const store = new Map();
    return {
        async list({ prefix }) {
            const keys = [...store.keys()]
                .filter((name) => name.startsWith(prefix || ''))
                .map((name) => ({ name }));
            return { keys, list_complete: true };
        },
        async get(key, options) {
            const value = store.get(key);
            if (value === undefined) return null;
            if (options && options.type === 'json') return JSON.parse(value);
            return value;
        },
        async put(key, value) {
            store.set(key, value);
        },
        async delete(key) {
            store.delete(key);
        },
    };
}

function adminAuthorization(source) {
    const username = source.match(/^const ADMIN_USERNAME = '([^']*)';$/m);
    const password = source.match(/^const ADMIN_PASSWORD = '([^']*)';$/m);
    assert.equal(Boolean(username && username[1] && password && password[1]), true);
    return `Basic ${Buffer.from(`${username[1]}:${password[1]}`).toString('base64')}`;
}

async function fetchWorker(kv, path, { method = 'GET', auth, body } = {}) {
    const headers = {};
    if (auth) headers.authorization = auth;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const request = new Request(`https://hiddenwalnuts.com${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return worker.fetch(request, { PORTFOLIO_KV: kv });
}

function feedOrder(items, now) {
    const chosen = selectFeatured(items, now);
    const chosenIds = new Set(chosen.map((item) => item.id));
    const rest = items.filter((item) => !chosenIds.has(item.id));
    rest.sort((left, right) => new Date(right.dateAdded) - new Date(left.dateAdded));
    return [...chosen, ...rest].map((item) => item.id);
}

await checkAsync('worker stores season fields and serves seasonal portfolio order', async () => {
    const kv = memoryKv();
    const denied = await fetchWorker(kv, '/api/portfolio', {
        method: 'POST',
        body: { title: 'Nope' },
    });
    assert.equal(denied.status, 401);
    const adminDenied = await fetchWorker(kv, '/admin');
    assert.equal(adminDenied.status, 401);

    const auth = adminAuthorization(workerSource);
    const admin = await fetchWorker(kv, '/admin', { auth });
    assert.equal(admin.status, 200);
    const adminHtml = await admin.text();
    assert.equal(adminHtml.includes('Christian subject'), true);
    assert.equal(adminHtml.includes('id="season"'), true);
    assert.equal(adminHtml.includes('id="featured"'), true);
    assert.equal(adminHtml.includes('season: document.getElementById(\'season\').value'), true);
    assert.equal(adminHtml.includes('ADMIN_PASSWORD'), false);
    for (const season of ALLOWED_SEASONS) {
        assert.equal(adminHtml.includes(`value="${season}"`), true, season);
    }
    const scripts = [...adminHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length > 0, true);
    for (const script of scripts) {
        const parsed = spawnSync(process.execPath, ['--check'], {
            input: script[1],
            encoding: 'utf8',
        });
        assert.equal(parsed.status, 0, parsed.stderr);
    }

    const portfolio = await fetchWorker(kv, '/portfolio');
    assert.equal(portfolio.status, 200);
    const portfolioHtml = await portfolio.text();
    assert.equal(portfolioHtml.includes('id="portfolioGrid"'), true);
    assert.equal(portfolioHtml.includes('id="season"'), false);

    const created = await fetchWorker(kv, '/api/portfolio', {
        method: 'POST',
        auth,
        body: {
            title: 'Nativity',
            description: 'A christmas design',
            imageUrl: 'https://example.com/nativity.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/nativity',
            tags: ['christmas'],
            season: 'christmas',
            religious: true,
            pin: false,
            exclude: false,
            featured: true,
            internalNote: 'do not store',
        },
    });
    assert.equal(created.status, 201);
    const createdItem = await created.json();
    assert.equal(createdItem.season, 'christmas');
    assert.equal(createdItem.religious, true);
    assert.equal(createdItem.pin, false);
    assert.equal(createdItem.exclude, false);
    assert.equal(createdItem.featured, true);
    assert.equal(Object.hasOwn(createdItem, 'internalNote'), false);
    assert.equal(typeof createdItem.dateAdded, 'string');

    const unknown = await fetchWorker(kv, '/api/portfolio', {
        method: 'POST',
        auth,
        body: {
            title: 'Unknown season',
            description: '',
            imageUrl: 'https://example.com/unknown.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/unknown',
            tags: [],
            season: 'yuletide',
            religious: 'yes',
            pin: 1,
            exclude: null,
            featured: false,
        },
    });
    assert.equal(unknown.status, 201);
    const unknownItem = await unknown.json();
    assert.equal(unknownItem.season, 'evergreen');
    assert.equal(unknownItem.featured, false);
    assert.equal(Object.hasOwn(unknownItem, 'religious'), false);
    assert.equal(Object.hasOwn(unknownItem, 'pin'), false);
    assert.equal(Object.hasOwn(unknownItem, 'exclude'), false);

    const blank = await fetchWorker(kv, '/api/portfolio', {
        method: 'POST',
        auth,
        body: {
            title: 'Blank season',
            description: '',
            imageUrl: 'https://example.com/blank.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/blank',
            tags: [],
            season: '   ',
            featured: false,
        },
    });
    const blankItem = await blank.json();
    assert.equal(blank.status, 201);
    assert.equal(Object.hasOwn(blankItem, 'season'), false);

    const updated = await fetchWorker(kv, `/api/portfolio/${createdItem.id}`, {
        method: 'PUT',
        auth,
        body: { season: 'winter', religious: false, pin: true, keeper: 'stay' },
    });
    assert.equal(updated.status, 200);
    const updatedItem = await updated.json();
    assert.equal(updatedItem.season, 'winter');
    assert.equal(updatedItem.religious, false);
    assert.equal(updatedItem.pin, true);
    assert.equal(updatedItem.keeper, 'stay');
    assert.equal(updatedItem.featured, true);
    assert.equal(updatedItem.title, 'Nativity');
    assert.equal(updatedItem.dateAdded, createdItem.dateAdded);

    const orderKv = memoryKv();
    const stored = [
        {
            id: 'stored-christmas',
            title: 'Stored christmas',
            description: '',
            imageUrl: 'https://example.com/stored-christmas.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/stored-christmas',
            tags: [],
            featured: false,
            season: 'christmas',
            religious: true,
            dateAdded: '2020-01-02T00:00:00.000Z',
        },
        {
            id: 'stored-spring',
            title: 'Stored spring',
            description: '',
            imageUrl: 'https://example.com/stored-spring.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/stored-spring',
            tags: [],
            featured: true,
            season: 'spring',
            dateAdded: '2020-01-03T00:00:00.000Z',
        },
        {
            id: 'stored-excluded',
            title: 'Stored excluded',
            description: '',
            imageUrl: 'https://example.com/stored-excluded.jpg',
            redbubbleUrl: 'https://www.redbubble.com/shop/ap/stored-excluded',
            tags: [],
            featured: true,
            season: 'christmas',
            religious: true,
            exclude: true,
            dateAdded: '2024-01-04T00:00:00.000Z',
        },
    ];
    for (const item of stored) {
        await orderKv.put(`item:${item.id}`, JSON.stringify(item));
    }
    const now = new Date();
    const feedResponse = await fetchWorker(orderKv, '/api/portfolio');
    assert.equal(feedResponse.status, 200);
    const feed = await feedResponse.json();
    const feedById = new Map(feed.map((item) => [item.id, item]));
    for (const item of stored) {
        assert.equal(feedById.get(item.id).featured, item.featured);
    }
    assert.deepEqual(feed.map((item) => item.id), feedOrder(stored, now));
    assert.equal(feedById.get('stored-excluded').exclude, true);
    assert.equal(feed.some((item) => item.id === 'stored-excluded'), true);
});

async function checkAsync(name, fn) {
    try {
        await fn();
        process.stdout.write(`ok ${name}\n`);
    } catch (error) {
        failures.push(name);
        process.stderr.write(`not ok ${name}\n`);
        process.stderr.write(`${error.stack || error}\n`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`${failures.length} failed\n`);
    process.exitCode = 1;
}
