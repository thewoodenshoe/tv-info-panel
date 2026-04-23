import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const configPath = path.join(rootDir, 'data', 'dashboard-config.json');
const telegramStorePath = path.join(rootDir, 'data', 'telegram-panel.json');

const PORT = Number.parseInt(process.env.PORT || '3030', 10);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
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

let telegramState = null;
let telegramPollStarted = false;
let telegramPollTimer = null;
let quoteExtendedFetchWarned = false;

async function readConfig() {
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function ensureTelegramState() {
  if (telegramState) return telegramState;
  try {
    const raw = await fs.readFile(telegramStorePath, 'utf8');
    telegramState = JSON.parse(raw);
  } catch {
    telegramState = { nextId: 1, items: [], lastUpdateId: 0 };
    await fs.writeFile(telegramStorePath, JSON.stringify(telegramState, null, 2), 'utf8');
  }
  if (!Number.isInteger(telegramState.lastUpdateId)) telegramState.lastUpdateId = 0;
  return telegramState;
}

async function persistTelegramState() {
  if (!telegramState) return;
  await fs.writeFile(telegramStorePath, JSON.stringify(telegramState, null, 2), 'utf8');
}

function formatErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
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
  const first = calendars[0] ? getCalendarEmbedParts(calendars[0].embedUrl) : null;
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

  for (const calendar of calendars) {
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

async function fetchQuote(item) {
  const quoteSymbol = item.quoteSymbol || item.symbol;
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quoteSymbol)}`);
  url.searchParams.set('interval', '1d');
  url.searchParams.set('range', '5d');

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
  const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
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
    marketState: meta?.marketState || '',
    isFallback: false,
  };
}

async function fetchQuoteExtended(symbols = []) {
  if (!symbols.length) return new Map();
  const url = new URL('https://query1.finance.yahoo.com/v7/finance/quote');
  url.searchParams.set('symbols', symbols.join(','));
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'tv-info-panel/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Extended quote request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const result = data?.quoteResponse?.result || [];
  const bySymbol = new Map();
  for (const quote of result) {
    bySymbol.set(quote.symbol, {
      marketState: quote.marketState || '',
      preMarketPrice: quote.preMarketPrice ?? null,
      preMarketChange: quote.preMarketChange ?? null,
      preMarketChangePercent: quote.preMarketChangePercent ?? null,
      postMarketPrice: quote.postMarketPrice ?? null,
      postMarketChange: quote.postMarketChange ?? null,
      postMarketChangePercent: quote.postMarketChangePercent ?? null,
    });
  }
  return bySymbol;
}

async function getStocksData(config) {
  const quotes = await Promise.all(config.stocks.map(async (item) => {
    try {
      return await fetchQuote(item);
    } catch {
      return buildStockFallback(item);
    }
  }));

  const quoteSymbols = quotes.map((quote) => quote.quoteSymbol).filter(Boolean);
  let extendedBySymbol = new Map();
  try {
    extendedBySymbol = await fetchQuoteExtended(quoteSymbols);
  } catch (error) {
    if (!quoteExtendedFetchWarned) {
      quoteExtendedFetchWarned = true;
      console.warn('[stocks] extended quote data unavailable:', formatErrorMessage(error, 'unknown error'));
    }
  }

  const mergedQuotes = quotes.map((quote) => {
    const extended = extendedBySymbol.get(quote.quoteSymbol);
    if (!extended) return quote;
    return {
      ...quote,
      marketState: extended.marketState || quote.marketState || '',
      preMarketPrice: extended.preMarketPrice,
      preMarketChange: extended.preMarketChange,
      preMarketChangePercent: extended.preMarketChangePercent,
      postMarketPrice: extended.postMarketPrice,
      postMarketChange: extended.postMarketChange,
      postMarketChangePercent: extended.postMarketChangePercent,
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    quotes: mergedQuotes,
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
    .sort((a, b) => a.id - b.id)
    .map((item) => ({
      ...item,
      createdAtLabel: formatTelegramCreatedAt(item.createdAt, timeZone),
    }));
}

async function getTelegramPanelData(config) {
  const state = await ensureTelegramState();
  return {
    metaLabel: TELEGRAM_BOT_TOKEN ? 'Live bot connected' : 'Bot token not configured',
    status: TELEGRAM_BOT_TOKEN
      ? 'Send /add your text or /remove id to the bot.'
      : 'Telegram bot token is not configured yet on this environment.',
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
  if (!chatId || !text.startsWith('/')) return;

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
  }
}

async function pollTelegramOnce() {
  if (!TELEGRAM_BOT_TOKEN) return;
  const state = await ensureTelegramState();
  const url = new URL(getTelegramApiUrl('getUpdates'));
  url.searchParams.set('timeout', '0');
  url.searchParams.set('allowed_updates', JSON.stringify(['message', 'edited_message']));
  if (state.lastUpdateId) url.searchParams.set('offset', String(state.lastUpdateId));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Telegram polling failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  const results = payload?.result || [];
  for (const update of results) {
    state.lastUpdateId = Math.max(state.lastUpdateId, (update.update_id || 0) + 1);
    await handleTelegramCommand(update);
  }
  if (results.length > 0) await persistTelegramState();
}

function startTelegramPolling() {
  if (telegramPollStarted || !TELEGRAM_BOT_TOKEN) return;
  telegramPollStarted = true;

  const tick = async () => {
    try {
      await pollTelegramOnce();
    } catch (error) {
      console.error('[telegram-panel] error:', error?.message, '| cause:', error?.cause, '| stack:', error?.stack?.split('\n').slice(0, 4).join(' | '));
    } finally {
      telegramPollTimer = setTimeout(tick, 15000);
    }
  };

  tick();
}

const app = express();

app.use(express.static(publicDir));

app.get('/api/config', async (_request, response) => {
  try {
    const config = await readConfig();
    response.json({
      title: config.title,
      notes: config.notes,
      timezone: config.timezone,
      workdayEnd: config.workdayEnd,
      timeZones: config.timeZones || [],
      location: config.location.label,
      tide: config.tide || null,
      stocks: config.stocks,
      calendars: (config.calendars || []).map((calendar) => ({
        label: calendar.label,
        color: calendar.color || null,
        embedUrl: formatEmbedCalendarUrl(calendar.embedUrl),
      })),
      mergedCalendar: {
        label: 'Combined family schedule',
        embedUrl: buildMergedCalendarUrl(config.calendars || []),
      },
    });
  } catch (error) {
    response.status(500).json({ error: formatErrorMessage(error, 'Failed to load config.') });
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

app.listen(PORT, () => {
  console.log(`TV info panel running at http://localhost:${PORT}`);
  startTelegramPolling();
});
