import { FEATURED_CATALOG } from './featured-catalog.js';

const FEATURED_SLOTS = 8;
const RECENT_WINDOW_DAYS = 28;
const RECENT_SHARE = 4;
const CHICAGO_TIME_ZONE = 'America/Chicago';

export const ALLOWED_SEASONS = new Set([
    'evergreen',
    'winter',
    'spring',
    'summer',
    'autumn',
    'christmas',
    'easter',
    'good-friday',
    'pentecost',
    'all-saints',
    'halloween',
    'valentine',
]);

export const SEASON_WINDOWS = [
    {
        id: 'christmas',
        kind: 'occasion',
        start: { month: 11, day: 2 },
        end: { month: 1, day: 6 },
        direct: ['christmas'],
        also: ['winter'],
    },
    {
        id: 'winter',
        kind: 'season',
        start: { month: 12, day: 1 },
        end: { month: 3, day: 1 },
        endExclusive: true,
        direct: ['winter'],
    },
    {
        id: 'spring',
        kind: 'season',
        start: { month: 3, day: 1 },
        end: { month: 5, day: 31 },
        direct: ['spring'],
    },
    {
        id: 'summer',
        kind: 'season',
        start: { month: 6, day: 1 },
        end: { month: 8, day: 31 },
        direct: ['summer'],
    },
    {
        id: 'autumn',
        kind: 'season',
        start: { month: 9, day: 1 },
        end: { month: 11, day: 30 },
        direct: ['autumn'],
    },
    {
        id: 'valentine',
        kind: 'occasion',
        start: { month: 2, day: 1 },
        end: { month: 2, day: 14 },
        direct: ['valentine'],
    },
    {
        id: 'halloween',
        kind: 'occasion',
        start: { month: 10, day: 15 },
        end: { month: 10, day: 31 },
        direct: ['halloween'],
    },
    {
        id: 'all-saints',
        kind: 'occasion',
        start: { month: 10, day: 25 },
        end: { month: 11, day: 1 },
        direct: ['all-saints'],
    },
    {
        id: 'easter',
        kind: 'occasion',
        anchor: 'western-easter',
        startOffsetDays: -21,
        endOffsetDays: 0,
        direct: ['easter', 'good-friday'],
    },
    {
        id: 'pentecost',
        kind: 'occasion',
        anchor: 'western-easter',
        startOffsetDays: 43,
        endOffsetDays: 49,
        direct: ['pentecost'],
    },
];

const easterByYear = new Map();

function positiveMod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}

function computeWesternEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = positiveMod(19 * a + b - d - g + 15, 30);
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = positiveMod(32 + 2 * e + 2 * i - h - k, 7);
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = positiveMod(h + l - 7 * m + 114, 31) + 1;
    return { year, month, day };
}

export function westernEaster(year) {
    let cached = easterByYear.get(year);
    if (!cached) {
        cached = Object.freeze(computeWesternEaster(year));
        easterByYear.set(year, cached);
    }
    return cached;
}

export function chicagoCalendarDate(now) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: CHICAGO_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    let year = 0;
    let month = 0;
    let day = 0;
    for (const part of parts) {
        if (part.type === 'year') year = Number(part.value);
        if (part.type === 'month') month = Number(part.value);
        if (part.type === 'day') day = Number(part.value);
    }
    const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, key };
}

function dayNumber(date) {
    return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86400000);
}

function addDays(date, days) {
    const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
}

function compareDates(left, right) {
    if (left.year !== right.year) return left.year - right.year;
    if (left.month !== right.month) return left.month - right.month;
    return left.day - right.day;
}

function monthDayKey(month, day) {
    return month * 100 + day;
}

function fixedWindowContains(window, date) {
    const value = monthDayKey(date.month, date.day);
    const start = monthDayKey(window.start.month, window.start.day);
    const end = monthDayKey(window.end.month, window.end.day);
    const wraps = start > end;
    const onOrAfterStart = value >= start;
    const onOrBeforeEnd = window.endExclusive ? value < end : value <= end;
    if (wraps) return onOrAfterStart || onOrBeforeEnd;
    return onOrAfterStart && onOrBeforeEnd;
}

function anchoredWindowContains(window, date) {
    const anchor = westernEaster(date.year);
    const start = addDays(anchor, window.startOffsetDays);
    const end = addDays(anchor, window.endOffsetDays);
    return compareDates(date, start) >= 0 && compareDates(date, end) <= 0;
}

function windowContains(window, date) {
    if (window.anchor) return anchoredWindowContains(window, date);
    return fixedWindowContains(window, date);
}

function windowsActiveOn(date) {
    return SEASON_WINDOWS.filter((window) => windowContains(window, date));
}

function knownSeason(value) {
    if (typeof value !== 'string') return '';
    const season = value.trim();
    return ALLOWED_SEASONS.has(season) ? season : '';
}

function catalogEntry(catalog, id) {
    if (!catalog || id == null || typeof catalog !== 'object') return null;
    const entry = catalog[id];
    if (!entry || typeof entry !== 'object') return null;
    return entry;
}

function resolveDesign(item, catalog) {
    const source = item && typeof item === 'object' ? item : {};
    const entry = catalogEntry(catalog, source.id);
    const season = knownSeason(source.season) || knownSeason(entry && entry.season) || 'evergreen';
    let religious = false;
    if (typeof source.religious === 'boolean') religious = source.religious;
    else if (entry && typeof entry.religious === 'boolean') religious = entry.religious;
    return {
        season,
        religious,
        pin: source.pin === true,
        exclude: source.exclude === true,
    };
}

export function presentPortfolioItem(item, catalog = FEATURED_CATALOG) {
    if (!item || typeof item !== 'object') return item;
    const design = resolveDesign(item, catalog);
    const season = knownSeason(item.season) || design.season;
    const religious = typeof item.religious === 'boolean' ? item.religious : design.religious;
    if (item.season === season && item.religious === religious) return item;
    return { ...item, season, religious };
}

function bestBand(design, activeWindows) {
    let best = null;
    for (const window of activeWindows) {
        const direct = window.direct.includes(design.season);
        const also = Array.isArray(window.also) && window.also.includes(design.season);
        let band = null;
        if (window.kind === 'occasion' && direct && design.religious) band = 1;
        else if (window.kind === 'occasion' && direct) band = 2;
        else if (window.kind === 'occasion' && also) band = 3;
        else if (window.kind === 'season' && direct) band = 4;
        if (band !== null && (best === null || band < best)) best = band;
    }
    return best;
}

function addedCalendarDate(value) {
    if (typeof value !== 'string') return null;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
        const year = Number(dateOnly[1]);
        const month = Number(dateOnly[2]);
        const day = Number(dateOnly[3]);
        const check = new Date(Date.UTC(year, month - 1, day));
        if (
            check.getUTCFullYear() !== year
            || check.getUTCMonth() !== month - 1
            || check.getUTCDate() !== day
        ) {
            return null;
        }
        return { year, month, day };
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    const chicago = chicagoCalendarDate(new Date(parsed));
    return { year: chicago.year, month: chicago.month, day: chicago.day };
}

function recentWeight(dateAdded, todayNumber) {
    const added = addedCalendarDate(dateAdded);
    if (!added) return 0;
    const age = todayNumber - dayNumber(added);
    if (age >= 0 && age < RECENT_WINDOW_DAYS) return (RECENT_WINDOW_DAYS - age) / RECENT_WINDOW_DAYS;
    return 0;
}

function addedTimestamp(value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

function compareId(left, right) {
    return String(left.item && left.item.id).localeCompare(String(right.item && right.item.id));
}

function compareHash(left, right) {
    if (left.hash !== right.hash) return left.hash - right.hash;
    return compareId(left, right);
}

function compareBandHash(left, right) {
    if (left.band !== right.band) return left.band - right.band;
    return compareHash(left, right);
}

function compareBandWeightHash(left, right) {
    if (left.band !== right.band) return left.band - right.band;
    if (left.weight !== right.weight) return right.weight - left.weight;
    return compareHash(left, right);
}

function compareWeightHash(left, right) {
    if (left.weight !== right.weight) return right.weight - left.weight;
    return compareHash(left, right);
}

function comparePins(left, right) {
    if (left.addedTime !== right.addedTime) return right.addedTime - left.addedTime;
    return compareId(left, right);
}

function take(candidates, limit, picked, pickedItems) {
    const room = Math.min(limit, FEATURED_SLOTS - picked.length);
    if (room <= 0) return;
    let count = 0;
    for (const entry of candidates) {
        if (count >= room) break;
        if (pickedItems.has(entry.item)) continue;
        picked.push(entry);
        pickedItems.add(entry.item);
        count += 1;
    }
}

export function selectFeatured(items, now = new Date(), catalog = FEATURED_CATALOG) {
    const list = Array.isArray(items) ? items : [];
    const today = chicagoCalendarDate(now);
    const todayNumber = dayNumber(today);
    const activeWindows = windowsActiveOn(today);
    const ranked = list.map((item) => {
        const design = resolveDesign(item, catalog);
        return {
            item,
            design,
            weight: recentWeight(item && item.dateAdded, todayNumber),
            band: null,
            hash: fnv1a(`${today.key}:${item && item.id}`),
            addedTime: addedTimestamp(item && item.dateAdded),
        };
    });
    for (const entry of ranked) {
        if (!entry.design.exclude) entry.band = bestBand(entry.design, activeWindows);
    }

    const eligible = ranked.filter((entry) => !entry.design.exclude);
    const picked = [];
    const pickedItems = new Set();

    const pins = eligible.filter((entry) => entry.design.pin).sort(comparePins);
    take(pins, FEATURED_SLOTS, picked, pickedItems);

    const inSeasonRecent = eligible
        .filter((entry) => entry.band !== null && entry.weight > 0 && !pickedItems.has(entry.item))
        .sort(compareBandWeightHash);
    take(inSeasonRecent, FEATURED_SLOTS - picked.length, picked, pickedItems);

    const recentPicked = picked.filter((entry) => entry.weight > 0).length;
    const offSeasonRecent = eligible.filter((entry) => (
        entry.band === null && entry.weight > 0 && !pickedItems.has(entry.item)
    ));
    const offSeasonRecentNeeded = Math.min(
        offSeasonRecent.length,
        Math.max(0, RECENT_SHARE - recentPicked),
    );
    const seasonalRoom = Math.max(0, FEATURED_SLOTS - picked.length - offSeasonRecentNeeded);
    const inSeasonStale = eligible
        .filter((entry) => entry.band !== null && entry.weight === 0 && !pickedItems.has(entry.item))
        .sort(compareBandHash);
    take(inSeasonStale, seasonalRoom, picked, pickedItems);

    const offSeasonRecentOrdered = offSeasonRecent
        .filter((entry) => !pickedItems.has(entry.item))
        .sort(compareWeightHash);
    take(offSeasonRecentOrdered, offSeasonRecentNeeded, picked, pickedItems);

    if (picked.length < FEATURED_SLOTS) {
        const moreInSeason = eligible
            .filter((entry) => entry.band !== null && !pickedItems.has(entry.item))
            .sort(compareHash);
        take(moreInSeason, FEATURED_SLOTS - picked.length, picked, pickedItems);
        const outOfSeason = eligible
            .filter((entry) => entry.band === null && !pickedItems.has(entry.item))
            .sort(compareHash);
        take(outOfSeason, FEATURED_SLOTS - picked.length, picked, pickedItems);
    }

    return picked.map((entry) => entry.item);
}
