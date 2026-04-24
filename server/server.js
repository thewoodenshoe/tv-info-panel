import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';
import ical from 'node-ical';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const defaultConfigPath = path.join(rootDir, 'data', 'dashboard-config.json');
const localConfigPath = path.join(rootDir, 'data', 'dashboard-config.local.json');
const defaultTelegramStorePath = path.join(rootDir, 'data', 'telegram-panel.local.json');
const legacyTelegramStorePath = path.join(rootDir, 'data', 'telegram-panel.json');

const PORT = Number.parseInt(process.env.PORT || '3030', 10);
const TELEGRAM_POLL_INTERVAL_MS = 250;
const TELEGRAM_LONG_POLL_TIMEOUT_SECONDS = 10;
const TELEGRAM_FETCH_TIMEOUT_MS = 12_000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
const TELEGRAM_POLLING_ENABLED = process.env.TELEGRAM_POLLING_ENABLED !== 'false';
const TELEGRAM_ALLOWED_CHAT_IDS = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const STOCK_SAMPLE = {
  MSTR: { price: 1712.5, previousClose: 1688.2 },
  'BTC-USD': { price: 93450, previousClose: 92110 },
  'ETH-USD': { price: 1798, previousClose: 1765 },
  MSTR270617C00200000: { price: 94.2, previousClose: 90.4 },
};

const WEATHER_CODE_LABELS = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Strong showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
};

const DAILY_QUOTES = [
  { category: 'Funny', text: 'The trouble with the rat race is that even if you win, you are still a rat.', author: 'Lily Tomlin' },
  { category: 'Build', text: 'Make it simple enough to run every day, then make it beautiful enough to enjoy every day.', author: 'Office wallboard rule' },
  { category: 'Funny', text: 'I am not superstitious, but I am a little stitious.', author: 'Michael Scott' },
  { category: 'Focus', text: 'The main thing is to keep the main thing the main thing.', author: 'Stephen Covey' },
  { category: 'Funny', text: 'If at first you do not succeed, then skydiving definitely is not for you.', author: 'Steven Wright' },
  { category: 'Craft', text: 'Boring systems win because they can survive real life.', author: 'Engineering proverb' },
  { category: 'Funny', text: 'My ability to turn good news into anxiety is rivaled only by my ability to turn anxiety into chin acne.', author: 'Tina Fey' },
  { category: 'Drive', text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln, attributed' },
  { category: 'Funny', text: 'People say nothing is impossible, but I do nothing every day.', author: 'A. A. Milne' },
  { category: 'Perspective', text: 'Do not confuse motion with progress.', author: 'Denzel Washington' },
];

const DAILY_BIBLE_QUOTES = [
  { reference: 'Proverbs 16:3', text: 'Commit your work to the Lord, and your plans will be established.' },
  { reference: 'Colossians 3:23', text: 'Whatever you do, work heartily, as for the Lord and not for men.' },
  { reference: 'Psalm 90:17', text: 'Establish the work of our hands upon us; yes, establish the work of our hands.' },
  { reference: 'James 1:5', text: 'If any of you lacks wisdom, let him ask God, who gives generously to all.' },
  { reference: 'Galatians 6:9', text: 'Let us not grow weary of doing good, for in due season we will reap, if we do not give up.' },
  { reference: 'Isaiah 40:31', text: 'They who wait for the Lord shall renew their strength.' },
  { reference: 'Micah 6:8', text: 'What does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?' },
  { reference: 'Philippians 4:6-7', text: 'Do not be anxious about anything, but in everything by prayer and supplication let your requests be made known to God.' },
  { reference: 'Ecclesiastes 3:1', text: 'For everything there is a season, and a time for every matter under heaven.' },
  { reference: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
];

const CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;
const CALENDAR_LOOKBACK_DAYS = 7;
const CALENDAR_LOOKAHEAD_DAYS = 7;
const CALENDAR_MAX_EVENTS = 60;

let telegramState = null;
let telegramPollStarted = false;
let telegramPollInFlight = false;
let calendarCache = {
  key: '',
  expiresAt: 0,
  value: null,
};

function resolveProjectPath(value, fallback) {
  if (!value?.trim()) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveConfigPath() {
  const configuredPath = resolveProjectPath(process.env.DASHBOARD_CONFIG_PATH, localConfigPath);
  if (process.env.DASHBOARD_CONFIG_PATH) {
    if (!(await fileExists(configuredPath))) {
      throw new Error(`Configured dashboard config was not found at ${configuredPath}`);
    }
    return configuredPath;
  }

  if (await fileExists(localConfigPath)) return localConfigPath;
  return defaultConfigPath;
}

function resolveTelegramStorePath() {
  return resolveProjectPath(process.env.TELEGRAM_STORE_PATH, defaultTelegramStorePath);
}

async function readConfig() {
  const raw = await fs.readFile(await resolveConfigPath(), 'utf8');
  return JSON.parse(raw);
}

async function ensureTelegramState() {
  if (telegramState) return telegramState;
  const storePath = resolveTelegramStorePath();
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    telegramState = JSON.parse(raw);
  } catch {
    if (storePath !== legacyTelegramStorePath && await fileExists(legacyTelegramStorePath)) {
      const raw = await fs.readFile(legacyTelegramStorePath, 'utf8');
      telegramState = JSON.parse(raw);
      await fs.writeFile(storePath, JSON.stringify(telegramState, null, 2), 'utf8');
    } else {
      telegramState = { nextId: 1, items: [], lastUpdateId: 0 };
      await fs.writeFile(storePath, JSON.stringify(telegramState, null, 2), 'utf8');
    }
  }
  if (!Number.isInteger(telegramState.lastUpdateId)) telegramState.lastUpdateId = 0;
  return telegramState;
}

async function persistTelegramState() {
  if (!telegramState) return;
  await fs.writeFile(resolveTelegramStorePath(), JSON.stringify(telegramState, null, 2), 'utf8');
}

function formatErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function eventIntersectsRange(start, end, from, to) {
  return start.getTime() <= to.getTime() && end.getTime() >= from.getTime();
}

function getSafeCalendars(config = {}) {
  return (config.calendars || [])
    .filter((calendar) => typeof calendar?.label === 'string' && calendar.label.trim())
    .map((calendar) => ({
      label: calendar.label.trim(),
      color: calendar.color || null,
      hasServerFeed: Boolean(calendar.icsUrl?.trim()),
    }));
}

function buildCalendarCacheKey(config = {}) {
  return JSON.stringify({
    timezone: config.timezone || 'UTC',
    calendars: (config.calendars || []).map((calendar) => ({
      label: calendar.label || '',
      color: calendar.color || '',
      icsUrl: calendar.icsUrl || '',
    })),
    fallbackCalendarEvents: config.fallbackCalendarEvents || [],
  });
}

function normalizeParsedCalendarEvent(instance, calendar, ordinal) {
  if (!(instance?.start instanceof Date) || Number.isNaN(instance.start.getTime())) return null;
  const rawEnd = instance.end instanceof Date && !Number.isNaN(instance.end.getTime())
    ? instance.end
    : instance.start;

  return {
    id: `${calendar.label || 'calendar'}:${instance.uid || 'event'}:${ordinal}:${instance.start.toISOString()}`,
    title: String(instance.summary || 'Untitled event').trim() || 'Untitled event',
    location: typeof instance.location === 'string' ? instance.location.trim() : '',
    start: instance.start.toISOString(),
    end: rawEnd.toISOString(),
    isAllDay: Boolean(instance.start?.dateOnly || rawEnd?.dateOnly || instance.isFullDay),
    calendarLabel: calendar.label || 'Calendar',
    color: calendar.color || null,
    source: 'live',
  };
}

async function fetchCalendarFeedEvents(calendar, from, to) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const parsed = await ical.async.fromURL(calendar.icsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'tv-info-panel/0.1' },
    });

    const events = [];
    let ordinal = 0;

    for (const item of Object.values(parsed)) {
      if (item?.type !== 'VEVENT' || !item.start || item.recurrenceid) continue;
      const instances = ical.expandRecurringEvent(item, {
        from,
        to,
        expandOngoing: true,
      });

      for (const instance of instances) {
        const normalized = normalizeParsedCalendarEvent(instance, calendar, ordinal);
        ordinal += 1;
        if (!normalized) continue;

        const start = new Date(normalized.start);
        const end = new Date(normalized.end);
        if (!eventIntersectsRange(start, end, from, to)) continue;
        events.push(normalized);
      }
    }

    return events;
  } finally {
    clearTimeout(timeout);
  }
}

function buildFallbackCalendarEvents(config, from, to) {
  return (config.fallbackCalendarEvents || [])
    .flatMap((event, index) => {
      const start = new Date(event.start);
      const end = new Date(event.end || event.start);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
      if (!eventIntersectsRange(start, end, from, to)) return [];
      return [{
        id: `fallback:${index}:${start.toISOString()}`,
        title: String(event.title || 'Planned item').trim() || 'Planned item',
        location: typeof event.location === 'string' ? event.location.trim() : '',
        start: start.toISOString(),
        end: end.toISOString(),
        isAllDay: Boolean(event.isAllDay),
        calendarLabel: event.calendarLabel || 'Board',
        color: event.color || '#94a3b8',
        source: 'fallback',
      }];
    });
}

function dedupeCalendarEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = [
      event.calendarLabel,
      event.title,
      event.start,
      event.end,
      event.location,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getCalendarPanelData(config) {
  const cacheKey = buildCalendarCacheKey(config);
  if (calendarCache.value && calendarCache.key === cacheKey && calendarCache.expiresAt > Date.now()) {
    return calendarCache.value;
  }

  const now = new Date();
  const from = new Date(now.getTime() - (CALENDAR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
  const to = new Date(now.getTime() + (CALENDAR_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000));
  const feedCalendars = (config.calendars || []).filter((calendar) => typeof calendar?.icsUrl === 'string' && calendar.icsUrl.trim());
  const results = await Promise.allSettled(feedCalendars.map((calendar) => fetchCalendarFeedEvents(calendar, from, to)));
  const failedFeeds = [];
  let events = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      events.push(...result.value);
      return;
    }
    failedFeeds.push(feedCalendars[index]?.label || `Calendar ${index + 1}`);
  });

  events = dedupeCalendarEvents(events)
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
    .slice(0, CALENDAR_MAX_EVENTS);

  let status = '';
  let mode = feedCalendars.length ? 'live' : 'setup';

  if (!feedCalendars.length) {
    status = 'For live Google events on TV, add each calendar’s Secret iCal URL in the local config.';
    events = buildFallbackCalendarEvents(config, from, to)
      .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
      .slice(0, CALENDAR_MAX_EVENTS);
    if (events.length > 0) mode = 'fallback';
  } else if (events.length === 0) {
    const fallbackEvents = buildFallbackCalendarEvents(config, from, to)
      .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
      .slice(0, CALENDAR_MAX_EVENTS);

    if (fallbackEvents.length > 0) {
      events = fallbackEvents;
      mode = 'fallback';
      status = failedFeeds.length
        ? 'Calendar feeds are unavailable right now. Showing fallback agenda.'
        : 'Showing fallback agenda until live calendar feeds are added.';
    } else if (failedFeeds.length) {
      mode = 'error';
      status = 'Calendar feeds are unavailable right now.';
    }
  } else if (failedFeeds.length > 0) {
    status = `${failedFeeds.length} calendar feed${failedFeeds.length === 1 ? '' : 's'} unavailable right now.`;
  }

  const value = {
    fetchedAt: now.toISOString(),
    metaLabel: events.length > 0 ? 'This workweek' : 'Agenda',
    status,
    mode,
    events,
  };

  calendarCache = {
    key: cacheKey,
    expiresAt: Date.now() + CALENDAR_CACHE_TTL_MS,
    value,
  };

  return value;
}

function formatDatePartsForZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === 'year')?.value || '0000',
    month: parts.find((part) => part.type === 'month')?.value || '01',
    day: parts.find((part) => part.type === 'day')?.value || '01',
  };
}

function formatYyyymmdd(date, timeZone) {
  const { year, month, day } = formatDatePartsForZone(date, timeZone);
  return `${year}${month}${day}`;
}

function formatEmbedCalendarUrl(embedUrl) {
  const url = new URL(embedUrl);
  url.searchParams.set('mode', 'AGENDA');
  url.searchParams.set('showTitle', '0');
  url.searchParams.set('showNav', '0');
  url.searchParams.set('showPrint', '0');
  url.searchParams.set('showTabs', '0');
  url.searchParams.set('showCalendars', '0');
  url.searchParams.set('showTz', '0');
  url.searchParams.set('wkst', '1');
  return url.toString();
}

function getCalendarEmbedParts(embedUrl) {
  const url = new URL(embedUrl);
  return {
    src: url.searchParams.get('src'),
    ctz: url.searchParams.get('ctz') || 'America/New_York',
  };
}

function buildMergedCalendarUrl(calendars = []) {
  const validCalendars = calendars.filter((calendar) => {
    try {
      return Boolean(getCalendarEmbedParts(calendar.embedUrl).src);
    } catch {
      return false;
    }
  });
  const first = validCalendars[0] ? getCalendarEmbedParts(validCalendars[0].embedUrl) : null;
  if (!first?.src) return '';
  const url = new URL('https://calendar.google.com/calendar/embed');
  url.searchParams.set('mode', 'AGENDA');
  url.searchParams.set('showTitle', '0');
  url.searchParams.set('showNav', '0');
  url.searchParams.set('showPrint', '0');
  url.searchParams.set('showTabs', '0');
  url.searchParams.set('showCalendars', '0');
  url.searchParams.set('showTz', '0');
  url.searchParams.set('wkst', '1');
  url.searchParams.set('ctz', first?.ctz || 'America/New_York');

  for (const calendar of validCalendars) {
    const { src } = getCalendarEmbedParts(calendar.embedUrl);
    if (src) url.searchParams.append('src', src);
    if (calendar.color) url.searchParams.append('color', calendar.color);
  }

  return url.toString();
}

function pickQuoteForToday(list) {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayIndex = Math.floor((todayUtc.getTime() - startOfYear.getTime()) / 86400000);
  return list[dayIndex % list.length];
}

function formatTelegramCreatedAt(value, timeZone = 'America/New_York') {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function summarizeHourlyForecast(hourly = {}, currentHourIso) {
  const times = hourly.time || [];
  const temperatures = hourly.temperature_2m || [];
  const precipitation = hourly.precipitation_probability || [];
  const wind = hourly.wind_speed_10m || [];
  const uvIndex = hourly.uv_index || [];
  const alignedCurrentHour = currentHourIso ? `${currentHourIso.slice(0, 13)}:00` : '';
  const startIndex = Math.max(times.indexOf(alignedCurrentHour), 0);

  return times.slice(startIndex, startIndex + 6).map((time, index) => ({
    time,
    temperature: temperatures[startIndex + index] ?? null,
    precipitationProbability: precipitation[startIndex + index] ?? null,
    windSpeed: wind[startIndex + index] ?? null,
    uvIndex: uvIndex[startIndex + index] ?? null,
  }));
}

function getMoonPhaseInfo(phaseValue) {
  if (phaseValue == null) {
    return {
      value: null,
      label: 'Unknown',
      emoji: '🌘',
      illuminationPercent: null,
    };
  }

  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phaseValue)) / 2) * 100);
  const phases = [
    { max: 0.0625, label: 'New Moon', emoji: '🌑' },
    { max: 0.1875, label: 'Waxing Crescent', emoji: '🌒' },
    { max: 0.3125, label: 'First Quarter', emoji: '🌓' },
    { max: 0.4375, label: 'Waxing Gibbous', emoji: '🌔' },
    { max: 0.5625, label: 'Full Moon', emoji: '🌕' },
    { max: 0.6875, label: 'Waning Gibbous', emoji: '🌖' },
    { max: 0.8125, label: 'Last Quarter', emoji: '🌗' },
    { max: 0.9375, label: 'Waning Crescent', emoji: '🌘' },
    { max: 1, label: 'New Moon', emoji: '🌑' },
  ];

  const phase = phases.find((item) => phaseValue <= item.max) || phases[0];
  return {
    value: phaseValue,
    label: phase.label,
    emoji: phase.emoji,
    illuminationPercent: illumination,
  };
}

function calculateMoonPhase(date = new Date()) {
  const synodicMonth = 29.530588853;
  const knownNewMoonMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSinceKnownNewMoon = (date.getTime() - knownNewMoonMs) / (1000 * 60 * 60 * 24);
  const normalized = ((daysSinceKnownNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  return normalized / synodicMonth;
}

async function getTideData(config) {
  const stationId = config.tide?.stationId;
  if (!stationId) return null;

  const timezone = config.timezone || 'America/New_York';
  const now = new Date();
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
  url.searchParams.set('product', 'predictions');
  url.searchParams.set('application', 'tv-info-panel');
  url.searchParams.set('begin_date', formatYyyymmdd(now, timezone));
  url.searchParams.set('end_date', formatYyyymmdd(tomorrow, timezone));
  url.searchParams.set('datum', 'MLLW');
  url.searchParams.set('station', stationId);
  url.searchParams.set('time_zone', 'gmt');
  url.searchParams.set('interval', 'hilo');
  url.searchParams.set('units', 'english');
  url.searchParams.set('format', 'json');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tide request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const predictions = (data.predictions || []).map((item) => ({
    type: item.type === 'H' ? 'High' : 'Low',
    feet: Number(item.v),
    time: `${item.t.replace(' ', 'T')}:00Z`,
  }));

  const nowMs = Date.now();
  const nextIndex = predictions.findIndex((item) => Date.parse(item.time) >= nowMs);
  const safeIndex = nextIndex >= 0 ? nextIndex : 0;
  const next = predictions[safeIndex] || null;
  const previous = predictions[safeIndex - 1] || predictions[predictions.length - 1] || null;

  return {
    label: config.tide?.label || 'Tide',
    stationId,
    next,
    previous,
    trend: next?.type === 'High' ? 'Rising' : 'Falling',
  };
}

async function getWeatherData(config) {
  const { latitude, longitude, label } = config.location;
  const timezone = config.timezone || 'America/New_York';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,wind_speed_10m,uv_index');
  url.searchParams.set('daily', 'uv_index_max,sunrise,sunset');

  const [weatherResponse, tide] = await Promise.all([
    fetch(url),
    getTideData(config).catch(() => null),
  ]);

  if (!weatherResponse.ok) {
    throw new Error(`Weather request failed with HTTP ${weatherResponse.status}`);
  }

  const data = await weatherResponse.json();
  const phaseValue = calculateMoonPhase(new Date());
  const uvIndexNow = data.current?.uv_index ?? data.hourly?.uv_index?.[0] ?? null;

  return {
    label,
    fetchedAt: new Date().toISOString(),
    current: {
      ...data.current,
      summary: WEATHER_CODE_LABELS[data.current?.weather_code] || 'Weather',
    },
    nextHours: summarizeHourlyForecast(data.hourly, data.current?.time),
    uv: {
      current: uvIndexNow,
      max: data.daily?.uv_index_max?.[0] ?? null,
    },
    moon: getMoonPhaseInfo(phaseValue),
    tide,
    astronomy: {
      sunrise: data.daily?.sunrise?.[0] ?? null,
      sunset: data.daily?.sunset?.[0] ?? null,
    },
  };
}

function buildStockFallback(item) {
  const quoteKey = item.quoteSymbol || item.symbol;
  const sample = STOCK_SAMPLE[quoteKey] || { price: null, previousClose: null };
  const dayChange = sample.price != null && sample.previousClose != null
    ? sample.price - sample.previousClose
    : null;
  const dayPercentChange = dayChange != null && sample.previousClose
    ? (dayChange / sample.previousClose) * 100
    : null;
  const basisChange = sample.price != null && item.averageCost != null
    ? sample.price - item.averageCost
    : null;
  const basisPercentChange = basisChange != null && item.averageCost
    ? (basisChange / item.averageCost) * 100
    : null;

  return {
    symbol: item.symbol,
    label: item.label,
    quoteSymbol: quoteKey,
    price: sample.price,
    dayChange,
    dayPercentChange,
    averageCost: item.averageCost ?? null,
    averageCostLabel: item.averageCostLabel || null,
    basisChange,
    basisPercentChange,
    isFallback: true,
  };
}

function calculatePercentChange(currentPrice, referencePrice) {
  if (currentPrice == null || referencePrice == null || referencePrice === 0) return null;
  return ((currentPrice - referencePrice) / referencePrice) * 100;
}

function isTimestampInPeriod(timestamp, period) {
  if (!period) return false;
  return timestamp >= period.start && timestamp < period.end;
}

function findLatestClosePoint(timestamps = [], closes = [], predicate = () => true) {
  const pointCount = Math.min(timestamps.length, closes.length);
  for (let index = pointCount - 1; index >= 0; index -= 1) {
    const timestamp = timestamps[index];
    const price = closes[index];
    if (!Number.isFinite(timestamp) || !Number.isFinite(price)) continue;
    if (predicate(timestamp)) {
      return { timestamp, price };
    }
  }
  return null;
}

function getDerivedMarketState(meta, latestPoint) {
  const periods = meta?.currentTradingPeriod || {};
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (isTimestampInPeriod(nowSeconds, periods.pre)) return 'PRE';
  if (isTimestampInPeriod(nowSeconds, periods.regular)) return 'REGULAR';
  if (isTimestampInPeriod(nowSeconds, periods.post)) return 'POST';

  if (latestPoint && isTimestampInPeriod(latestPoint.timestamp, periods.post)) return 'POST';
  if (latestPoint && isTimestampInPeriod(latestPoint.timestamp, periods.pre)) return 'PRE';
  return 'CLOSED';
}

function deriveExtendedSession(meta, timestamps = [], closes = []) {
  const periods = meta?.currentTradingPeriod || {};
  const latestPoint = findLatestClosePoint(timestamps, closes);
  const marketState = getDerivedMarketState(meta, latestPoint);
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? null;
  const regularPoint = findLatestClosePoint(timestamps, closes, (timestamp) => isTimestampInPeriod(timestamp, periods.regular));
  const regularReferencePrice = meta?.regularMarketPrice ?? regularPoint?.price ?? previousClose ?? null;
  const prePoint = findLatestClosePoint(timestamps, closes, (timestamp) => isTimestampInPeriod(timestamp, periods.pre));
  const postPoint = findLatestClosePoint(timestamps, closes, (timestamp) => isTimestampInPeriod(timestamp, periods.post));

  if (marketState === 'PRE' && prePoint?.price != null) {
    return {
      marketState,
      preMarketPrice: prePoint.price,
      preMarketChange: previousClose != null ? prePoint.price - previousClose : null,
      preMarketChangePercent: calculatePercentChange(prePoint.price, previousClose),
    };
  }

  if (marketState === 'POST' && postPoint?.price != null) {
    return {
      marketState,
      postMarketPrice: postPoint.price,
      postMarketChange: regularReferencePrice != null ? postPoint.price - regularReferencePrice : null,
      postMarketChangePercent: calculatePercentChange(postPoint.price, regularReferencePrice),
    };
  }

  return { marketState };
}

async function fetchQuote(item) {
  const quoteSymbol = item.quoteSymbol || item.symbol;
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quoteSymbol)}`);
  url.searchParams.set('interval', '5m');
  url.searchParams.set('range', '1d');
  url.searchParams.set('includePrePost', 'true');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'tv-info-panel/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Quote request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const timestamps = result?.timestamp || [];
  const latestPoint = findLatestClosePoint(timestamps, closes);
  const price = meta?.regularMarketPrice ?? latestPoint?.price ?? meta?.previousClose ?? null;
  const previousClose = meta?.previousClose
    ?? meta?.chartPreviousClose
    ?? closes.findLast((value) => Number.isFinite(value) && value !== price)
    ?? null;

  if (price == null) {
    throw new Error('Quote payload missing market price');
  }

  const dayChange = previousClose != null ? price - previousClose : null;
  const dayPercentChange = dayChange != null && previousClose ? (dayChange / previousClose) * 100 : null;
  const basisChange = item.averageCost != null ? price - item.averageCost : null;
  const basisPercentChange = basisChange != null && item.averageCost ? (basisChange / item.averageCost) * 100 : null;
  const extendedSession = deriveExtendedSession(meta, timestamps, closes);

  return {
    symbol: item.symbol,
    label: item.label,
    quoteSymbol,
    price,
    dayChange,
    dayPercentChange,
    averageCost: item.averageCost ?? null,
    averageCostLabel: item.averageCostLabel || null,
    basisChange,
    basisPercentChange,
    currency: meta?.currency || 'USD',
    exchange: meta?.exchangeName || '',
    marketState: extendedSession.marketState || '',
    preMarketPrice: extendedSession.preMarketPrice ?? null,
    preMarketChange: extendedSession.preMarketChange ?? null,
    preMarketChangePercent: extendedSession.preMarketChangePercent ?? null,
    postMarketPrice: extendedSession.postMarketPrice ?? null,
    postMarketChange: extendedSession.postMarketChange ?? null,
    postMarketChangePercent: extendedSession.postMarketChangePercent ?? null,
    isFallback: false,
  };
}

async function getStocksData(config) {
  const quotes = await Promise.all(config.stocks.map(async (item) => {
    try {
      return await fetchQuote(item);
    } catch {
      return buildStockFallback(item);
    }
  }));

  return {
    fetchedAt: new Date().toISOString(),
    quotes,
  };
}

function buildInspirationData() {
  return {
    label: 'Changes every day',
    quote: pickQuoteForToday(DAILY_QUOTES),
    bible: pickQuoteForToday(DAILY_BIBLE_QUOTES),
  };
}

function normalizeTelegramItems(items, timeZone) {
  return items
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((item) => ({
      ...item,
      createdAtLabel: formatTelegramCreatedAt(item.createdAt, timeZone),
    }));
}

async function getTelegramPanelData(config) {
  const state = await ensureTelegramState();
  return {
    fetchedAt: new Date().toISOString(),
    metaLabel: 'Live',
    status: '',
    items: normalizeTelegramItems(state.items, config.timezone || 'America/New_York'),
  };
}

function createSystemData(config) {
  return {
    fetchedAt: new Date().toISOString(),
    timezone: config.timezone,
    location: config.location.label,
    tideStation: config.tide?.label || '',
    runtime: `Node ${process.version}`,
  };
}

function canAccessChat(chatId) {
  if (TELEGRAM_ALLOWED_CHAT_IDS.size === 0) return true;
  return TELEGRAM_ALLOWED_CHAT_IDS.has(String(chatId));
}

function getTelegramApiUrl(method) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(getTelegramApiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function addTelegramItem(text, sourceLabel) {
  const state = await ensureTelegramState();
  const item = {
    id: state.nextId,
    text,
    sourceLabel,
    createdAt: new Date().toISOString(),
  };
  state.nextId += 1;
  state.items.push(item);
  await persistTelegramState();
  return item;
}

async function removeTelegramItem(id) {
  const state = await ensureTelegramState();
  const index = state.items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const [removed] = state.items.splice(index, 1);
  await persistTelegramState();
  return removed;
}

async function handleTelegramCommand(update) {
  const message = update.message || update.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim() || '';
  if (!chatId || !text) return;

  if (!canAccessChat(chatId)) {
    await sendTelegramMessage(chatId, 'This chat is not allowed to manage the TV board.');
    return;
  }

  if (text === '/start' || text === '/help') {
    await sendTelegramMessage(chatId, 'Use /add <text> to add a board item, /remove <id> to delete one, and /list to see current ids.');
    return;
  }

  if (text === '/whoami') {
    await sendTelegramMessage(chatId, `Chat id: ${chatId}`);
    return;
  }

  if (text.startsWith('/add ')) {
    const itemText = text.replace(/^\/add\s+/, '').trim();
    if (!itemText) {
      await sendTelegramMessage(chatId, 'Usage: /add <text>');
      return;
    }
    const sourceLabel = message.from?.first_name || message.chat?.title || 'Telegram';
    const item = await addTelegramItem(itemText, sourceLabel);
    await sendTelegramMessage(chatId, `Added #${item.id}: ${item.text}`);
    return;
  }

  if (text.startsWith('/remove ')) {
    const rawId = text.replace(/^\/remove\s+/, '').trim();
    const id = Number.parseInt(rawId, 10);
    if (!Number.isInteger(id)) {
      await sendTelegramMessage(chatId, 'Usage: /remove <id>');
      return;
    }
    const removed = await removeTelegramItem(id);
    await sendTelegramMessage(chatId, removed ? `Removed #${removed.id}.` : `No item found for #${id}.`);
    return;
  }

  if (text === '/list') {
    const state = await ensureTelegramState();
    if (!state.items.length) {
      await sendTelegramMessage(chatId, 'No board items yet.');
      return;
    }
    const lines = state.items.map((item) => `#${item.id} ${item.text}`);
    await sendTelegramMessage(chatId, lines.join('\n'));
    return;
  }

  if (!text.startsWith('/')) {
    const sourceLabel = message.from?.first_name || message.chat?.title || 'Telegram';
    const item = await addTelegramItem(text, sourceLabel);
    await sendTelegramMessage(chatId, `Added #${item.id}.`);
  }
}

async function pollTelegramOnce() {
  if (!TELEGRAM_BOT_TOKEN) return;
  if (telegramPollInFlight) return;
  telegramPollInFlight = true;

  try {
    const state = await ensureTelegramState();
    const url = new URL(getTelegramApiUrl('getUpdates'));
    url.searchParams.set('timeout', String(TELEGRAM_LONG_POLL_TIMEOUT_SECONDS));
    url.searchParams.set('allowed_updates', JSON.stringify(['message', 'edited_message']));
    if (state.lastUpdateId) url.searchParams.set('offset', String(state.lastUpdateId));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TELEGRAM_FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(timeout));
    if (!response.ok) {
      let description = '';
      try {
        const payload = await response.json();
        description = payload?.description || '';
      } catch {
        description = '';
      }
      if (response.status === 409) {
        throw new Error(`Telegram polling conflict: another getUpdates consumer is active for this bot. ${description}`.trim());
      }
      throw new Error(`Telegram polling failed with HTTP ${response.status}${description ? `: ${description}` : ''}`);
    }

    const payload = await response.json();
    const results = payload?.result || [];
    for (const update of results) {
      state.lastUpdateId = Math.max(state.lastUpdateId, (update.update_id || 0) + 1);
      await handleTelegramCommand(update);
    }
    if (results.length > 0) await persistTelegramState();
  } finally {
    telegramPollInFlight = false;
  }
}

async function startTelegramPolling() {
  if (telegramPollStarted || !TELEGRAM_BOT_TOKEN || !TELEGRAM_POLLING_ENABLED) return;
  telegramPollStarted = true;

  while (telegramPollStarted) {
    try {
      await pollTelegramOnce();
    } catch (error) {
      console.error('[telegram-panel] error:', error?.message, '| cause:', error?.cause, '| stack:', error?.stack?.split('\n').slice(0, 4).join(' | '));
    }
    await delay(TELEGRAM_POLL_INTERVAL_MS);
  }
}

const app = express();
const indexFile = path.join(publicDir, 'index.html');

app.get(['/', '/display'], (_request, response) => {
  response.sendFile(indexFile);
});

app.use(express.static(publicDir));

app.get('/api/config', async (_request, response) => {
  try {
    const config = await readConfig();
    const safeCalendars = getSafeCalendars(config);

    response.json({
      title: config.title,
      notes: config.notes,
      timezone: config.timezone,
      workdayEnd: config.workdayEnd,
      timeZones: config.timeZones || [],
      location: config.location.label,
      tide: config.tide || null,
      stocks: config.stocks,
      calendars: safeCalendars,
    });
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load config.') });
  }
});

app.get('/api/calendar', async (_request, response) => {
  try {
    const config = await readConfig();
    const data = await getCalendarPanelData(config);
    response.json(data);
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load calendar.') });
  }
});

app.get('/api/weather', async (_request, response) => {
  try {
    const config = await readConfig();
    const data = await getWeatherData(config);
    response.json(data);
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load weather.') });
  }
});

app.get('/api/stocks', async (_request, response) => {
  try {
    const config = await readConfig();
    const data = await getStocksData(config);
    response.json(data);
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load stocks.') });
  }
});

app.get('/api/inspiration', async (_request, response) => {
  response.json(buildInspirationData());
});

app.get('/api/telegram-panel', async (_request, response) => {
  try {
    const config = await readConfig();
    const data = await getTelegramPanelData(config);
    response.json(data);
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load Telegram panel.') });
  }
});

app.get('/api/system', async (_request, response) => {
  try {
    const config = await readConfig();
    response.json(createSystemData(config));
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load system panel.') });
  }
});

const server = app.listen(PORT, () => {
  console.log(`TV info panel running at http://localhost:${PORT}`);
  void startTelegramPolling();
});

server.keepAliveTimeout = 65_000;
