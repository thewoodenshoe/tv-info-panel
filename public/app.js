const dashboardTitle = document.querySelector('#dashboard-title');
const clock = document.querySelector('#clock');
const dateLabel = document.querySelector('#date');
const workdayCountdown = document.querySelector('#workday-countdown');
const timezoneClocks = document.querySelector('#timezone-clocks');
const calendarAgenda = document.querySelector('#calendar-agenda');
const calendarSources = document.querySelector('#calendar-sources');
const layoutName = document.querySelector('#layout-name');
const nextLayoutButton = document.querySelector('#next-layout-button');
const telegramList = document.querySelector('#telegram-list');
const MAX_TELEGRAM_ITEMS = 6;
const WORKWEEK_DAYS = 5;
const CALENDAR_EVENTS_PER_DAY_STANDARD = 2;
const CALENDAR_EVENTS_PER_DAY_COMPACT = 2;
const CALENDAR_EVENTS_PER_DAY_TV = 1;
const TELEGRAM_REFRESH_MS = 2 * 1000;
const STOCKS_REFRESH_MS = 60 * 1000;
const DASHBOARD_REFRESH_MS = 5 * 60 * 1000;

const LAYOUTS = [
  { id: 'midnight', label: 'Market Map' },
  { id: 'pastel', label: 'Coastal Outlook' },
  { id: 'neon', label: 'Night Operations' },
  { id: 'retro', label: 'Retro Console' },
];

const STOCK_BRAND_COLORS = {
  MSTR: '#2563eb',
  'BTC-USD': '#f7931a',
  'ETH-USD': '#627eea',
};
function getStockBrandColor(symbol = '') {
  if (STOCK_BRAND_COLORS[symbol]) return STOCK_BRAND_COLORS[symbol];
  if (symbol.startsWith('MSTR')) return '#10b981';
  return '#64748b';
}

let dashboardConfig = null;
let calendarData = null;
let activeLayoutIndex = Number.parseInt(window.localStorage.getItem('tv-info-layout-index') || '0', 10);
if (!Number.isFinite(activeLayoutIndex) || activeLayoutIndex < 0 || activeLayoutIndex >= LAYOUTS.length) {
  activeLayoutIndex = 0;
}

function isTvDisplayRequested() {
  const params = new URLSearchParams(window.location.search);
  return window.location.pathname === '/display'
    || params.get('tv') === '1'
    || params.get('display') === 'tv';
}

function isLikelyTvBrowser() {
  return /\bSilk\//i.test(window.navigator.userAgent || '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncateText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function sanitizeColor(value, fallback = '#69b3ff') {
  return /^#(?:[\da-f]{3,8})$/i.test(value || '') ? value : fallback;
}

function setPanelMeta(id, value) {
  const node = document.querySelector(id);
  if (node) node.textContent = value;
}

function showStatus(id, message) {
  const node = document.querySelector(id);
  if (node) node.textContent = message || '';
}

function syncDisplayMode() {
  const viewportHeight = Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight || 0));
  document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
  document.body.dataset.display = isTvDisplayRequested() ? 'tv' : 'standard';
  document.body.dataset.density = (isTvDisplayRequested() || isLikelyTvBrowser() || viewportHeight < 900)
    ? 'compact'
    : 'standard';

  if (isTvDisplayRequested()) {
    window.setTimeout(() => nextLayoutButton.focus({ preventScroll: true }), 0);
  }

  if (calendarData) {
    renderCalendars(calendarData);
  }
}

function applyLayout(index) {
  activeLayoutIndex = index % LAYOUTS.length;
  const layout = LAYOUTS[activeLayoutIndex];
  document.body.dataset.layout = layout.id;
  document.body.dataset.layoutIndex = String(activeLayoutIndex + 1);
  layoutName.textContent = layout.label;
  nextLayoutButton.textContent = 'Next';
  nextLayoutButton.setAttribute('aria-label', `Show next layout. Current layout: ${layout.label}`);
  window.localStorage.setItem('tv-info-layout-index', String(activeLayoutIndex));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function formatTime(date, timeZone, options = {}) {
  return new Intl.DateTimeFormat([], {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

function formatLongDate(date, timeZone) {
  return new Intl.DateTimeFormat([], {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatShortDate(date, timeZone) {
  return new Intl.DateTimeFormat([], {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatDateTimeForZone(date, timeZone) {
  return new Intl.DateTimeFormat([], {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getZonedDate(date, timeZone) {
  const localString = date.toLocaleString('en-US', { timeZone });
  return new Date(localString);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${remainingSeconds}`;
}

function formatDayKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatLocalDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalShortDate(date) {
  return new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getWorkweekDays(_events = [], timeZone) {
  const anchor = new Date();
  const zonedAnchor = getZonedDate(anchor, timeZone);
  zonedAnchor.setHours(0, 0, 0, 0);

  const weekday = zonedAnchor.getDay();
  const offsetToMonday = weekday === 0 ? 1 : weekday === 6 ? 2 : 1 - weekday;
  const monday = new Date(zonedAnchor);
  monday.setDate(zonedAnchor.getDate() + offsetToMonday);

  const todayKey = formatDayKey(new Date(), timeZone);
  return Array.from({ length: WORKWEEK_DAYS }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = formatLocalDayKey(date);
    return {
      key,
      title: key === todayKey
        ? 'Today'
        : new Intl.DateTimeFormat([], { weekday: 'short' }).format(date),
      subtitle: formatLocalShortDate(date),
    };
  });
}

function getCalendarDayHeader(date, timeZone) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayKey = formatDayKey(date, timeZone);
  const todayKey = formatDayKey(today, timeZone);
  const tomorrowKey = formatDayKey(tomorrow, timeZone);

  return {
    title: dayKey === todayKey
      ? 'Today'
      : dayKey === tomorrowKey
        ? 'Tomorrow'
        : new Intl.DateTimeFormat([], { timeZone, weekday: 'long' }).format(date),
    subtitle: formatShortDate(date, timeZone),
  };
}

function formatCalendarTimeRange(event, timeZone) {
  const start = new Date(event.start);
  const end = new Date(event.end || event.start);
  if (event.isAllDay) return 'All day';

  const startLabel = formatTime(start, timeZone);
  if (Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) return startLabel;

  const startDay = formatDayKey(start, timeZone);
  const endDay = formatDayKey(end, timeZone);
  if (startDay !== endDay) {
    return `${startLabel} - ${formatDateTimeForZone(end, timeZone)}`;
  }

  return `${startLabel} - ${formatTime(end, timeZone)}`;
}

function getCalendarEventLimit() {
  if (document.body.dataset.display === 'tv') return CALENDAR_EVENTS_PER_DAY_TV;
  return document.body.dataset.density === 'compact'
    ? CALENDAR_EVENTS_PER_DAY_COMPACT
    : CALENDAR_EVENTS_PER_DAY_STANDARD;
}

function getCalendarTitleLimit() {
  if (document.body.dataset.display === 'tv') return 42;
  return document.body.dataset.density === 'compact' ? 48 : 64;
}

function getCalendarDisplayTitle(event) {
  const title = event.title || 'Untitled event';
  if (document.body.dataset.display !== 'tv' || !event.calendarLabel) return title;
  return `${event.calendarLabel}: ${title}`;
}

function renderMoonSvg(phaseValue = 0, label = 'Moon') {
  const normalized = ((phaseValue % 1) + 1) % 1;
  const waxing = normalized < 0.5;
  const phaseDistance = Math.abs(normalized - 0.5) / 0.5;
  const overlayRadiusX = 44 * phaseDistance;
  const overlayCx = waxing ? 50 - ((1 - phaseDistance) * 44) : 50 + ((1 - phaseDistance) * 44);
  const clipId = `moon-clip-${Math.round(normalized * 1000)}`;

  return `
    <svg class="moon-svg" viewBox="0 0 100 100" role="img" aria-label="${label}">
      <defs>
        <clipPath id="${clipId}">
          <circle cx="50" cy="50" r="44"></circle>
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="44" fill="#f6f2d2"></circle>
      <ellipse
        cx="${overlayCx}"
        cy="50"
        rx="${Math.max(overlayRadiusX, 0.1)}"
        ry="44"
        clip-path="url(#${clipId})"
        fill="#0b1220"></ellipse>
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"></circle>
    </svg>
  `;
}

function updateTimePanel() {
  if (!dashboardConfig) return;

  const now = new Date();
  const panelZone = dashboardConfig.timezone;
  clock.textContent = formatTime(now, panelZone);
  dateLabel.textContent = formatLongDate(now, panelZone);

  const zonedNow = getZonedDate(now, panelZone);
  const [hour, minute, second] = (dashboardConfig.workdayEnd || '17:00:00').split(':').map((value) => Number.parseInt(value, 10));
  const endOfWorkday = new Date(zonedNow);
  endOfWorkday.setHours(hour || 17, minute || 0, second || 0, 0);
  if (endOfWorkday <= zonedNow) {
    endOfWorkday.setDate(endOfWorkday.getDate() + 1);
  }

  const secondsRemaining = Math.floor((endOfWorkday.getTime() - zonedNow.getTime()) / 1000);
  workdayCountdown.textContent = formatDuration(secondsRemaining);

  timezoneClocks.innerHTML = (dashboardConfig.timeZones || [])
    .map((item) => `
      <div class="timezone-card">
        <div class="timezone-label">${escapeHtml(item.shortLabel)}</div>
        <div class="timezone-time">${formatTime(now, item.timeZone)}</div>
        <div class="timezone-name">${escapeHtml(item.label)}</div>
      </div>
    `)
    .join('');
}

function formatDegrees(value) {
  return value == null ? '--' : `${Math.round(value)}°`;
}

function formatPercent(value) {
  return value == null ? '--' : `${Math.round(value)}%`;
}

function formatWind(value) {
  return value == null ? '--' : `${Math.round(value)} mph`;
}

function formatUv(value) {
  return value == null ? '--' : Number(value).toFixed(1);
}

function getWeatherIcon(summary = '') {
  const normalized = summary.toLowerCase();
  if (normalized.includes('thunder')) return 'storm';
  if (normalized.includes('snow')) return 'snow';
  if (normalized.includes('rain') || normalized.includes('shower') || normalized.includes('drizzle')) return 'rain';
  if (normalized.includes('fog')) return 'fog';
  if (normalized.includes('cloud')) return 'cloud';
  return 'sun';
}

function renderWeatherGlyph(type) {
  const cloud = '<path d="M28 66h42a16 16 0 0 0 1.5-31.9A24 24 0 0 0 25.8 42 12.5 12.5 0 0 0 28 66Z"/>';
  const sun = '<circle cx="50" cy="50" r="17"/><path d="M50 16v10M50 74v10M16 50h10M74 50h10M25.9 25.9l7.1 7.1M67 67l7.1 7.1M74.1 25.9 67 33M33 67l-7.1 7.1"/>';
  const rain = `${cloud}<path d="M35 76l-5 10M51 76l-5 10M67 76l-5 10"/>`;
  const storm = `${cloud}<path d="M51 72 42 91h13l-6 15 19-26H56l7-8H51Z"/>`;
  const fog = `${cloud}<path d="M26 78h48M34 90h32"/>`;
  const snow = `${cloud}<path d="M34 80h0M50 84h0M66 80h0" stroke-linecap="round" stroke-width="6"/>`;
  const paths = { sun, cloud, rain, storm, fog, snow };

  return `
    <svg class="weather-glyph weather-glyph--${type}" viewBox="0 0 100 110" role="img" aria-label="${type} weather">
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
        ${paths[type] || sun}
      </g>
    </svg>
  `;
}

function renderWeather(weather) {
  const currentNode = document.querySelector('#weather-current');
  const detailsNode = document.querySelector('#weather-details');
  const hoursNode = document.querySelector('#weather-hours');
  const summary = weather.current?.summary || 'Weather';
  const glyph = getWeatherIcon(summary);
  const currentUv = weather.current?.uv_index ?? weather.uv?.current;

  currentNode.innerHTML = `
    <div class="weather-hero">
      <div class="weather-temp-block">
        ${renderWeatherGlyph(glyph)}
        <div>
          <div class="weather-temp">${formatDegrees(weather.current?.temperature_2m)}</div>
          <div class="weather-feels">Feels ${formatDegrees(weather.current?.apparent_temperature)}</div>
        </div>
      </div>
      <div class="weather-summary">
        <div class="weather-summary-title">${escapeHtml(weather.label)}</div>
        <div>${escapeHtml(summary)}</div>
        <div>Wind ${formatWind(weather.current?.wind_speed_10m)} · UV ${formatUv(currentUv)}</div>
      </div>
    </div>
    <div class="weather-highlight">
      ${renderMoonSvg(weather.moon?.value || 0, weather.moon?.label || 'Moon')}
      <div class="weather-highlight-copy">
        <div class="metric-label">Moon</div>
        <div class="weather-highlight-title">${weather.moon?.label || 'Moon'}</div>
        <div class="weather-highlight-subtitle">${weather.moon?.illuminationPercent ?? '--'}% illuminated</div>
      </div>
    </div>
  `;

  detailsNode.innerHTML = `
    <div class="detail-card">
      <div class="detail-label">Tide</div>
      <div class="detail-value">${weather.tide?.next?.type || '--'}</div>
      <div class="detail-subtitle">${weather.tide?.trend || ''} · ${weather.tide?.next?.time ? formatDateTimeForZone(new Date(weather.tide.next.time), dashboardConfig.timezone) : 'No tide data'}</div>
    </div>
    <div class="detail-card">
      <div class="detail-label">Next tide</div>
      <div class="detail-value">${weather.tide?.next?.feet != null ? `${weather.tide.next.feet.toFixed(1)} ft` : '--'}</div>
      <div class="detail-subtitle">${weather.tide?.label || 'Charleston Harbor'}</div>
    </div>
    <div class="detail-card">
      <div class="detail-label">UV</div>
      <div class="detail-value">${formatUv(weather.uv?.current)}</div>
      <div class="detail-subtitle">Max today ${formatUv(weather.uv?.max)}</div>
    </div>
    <div class="detail-card">
      <div class="detail-label">Sun</div>
      <div class="detail-value">${weather.astronomy?.sunset ? formatTime(new Date(weather.astronomy.sunset), dashboardConfig.timezone) : '--:--'}</div>
      <div class="detail-subtitle">Sunrise ${weather.astronomy?.sunrise ? formatTime(new Date(weather.astronomy.sunrise), dashboardConfig.timezone) : '--:--'}</div>
    </div>
  `;

  hoursNode.innerHTML = weather.nextHours
    .map((hour) => {
      const date = new Date(hour.time);
      return `
        <div class="weather-hour">
          <div class="weather-hour-time">${formatTime(date, dashboardConfig.timezone)}</div>
          <div class="weather-hour-temp">${formatDegrees(hour.temperature)}</div>
          <div class="weather-hour-extra">Rain ${formatPercent(hour.precipitationProbability)}</div>
          <div class="weather-hour-extra">UV ${formatUv(hour.uvIndex)} · Wind ${formatWind(hour.windSpeed)}</div>
        </div>
      `;
    })
    .join('');

  setPanelMeta('#weather-meta', `Updated ${formatTime(new Date(weather.fetchedAt), dashboardConfig.timezone)}`);
}

function formatMoney(value) {
  if (value == null) return '--';
  const absValue = Math.abs(value);
  const digits = absValue >= 1000 ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatSigned(value, digits = 2) {
  if (value == null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(digits)}`;
}

function getStockSessionBadge(quote) {
  const marketState = `${quote.marketState || ''}`.toUpperCase();
  if (marketState === 'PRE' || marketState === 'PREPRE') {
    return '<span class="stock-session-badge stock-session-badge--pre">PRE</span>';
  }
  if (marketState === 'POST' || marketState === 'POSTPOST') {
    return '<span class="stock-session-badge stock-session-badge--post">AH</span>';
  }
  return '';
}

function getExtendedMarketLine(quote) {
  const marketState = `${quote.marketState || ''}`.toUpperCase();
  if (marketState === 'PRE' || marketState === 'PREPRE') {
    if (quote.preMarketPrice == null) return '';
    const state = quote.preMarketChange > 0 ? 'is-up' : quote.preMarketChange < 0 ? 'is-down' : 'is-flat';
    return `
      <div class="stock-extended ${state}">
        <span class="stock-extended-label">Pre-market</span>
        <span class="stock-extended-price">${formatMoney(quote.preMarketPrice)}</span>
        ${quote.preMarketChangePercent == null ? '' : `<span class="stock-extended-percent">${formatSigned(quote.preMarketChangePercent)}%</span>`}
      </div>
    `;
  }
  if (marketState === 'POST' || marketState === 'POSTPOST') {
    if (quote.postMarketPrice == null) return '';
    const state = quote.postMarketChange > 0 ? 'is-up' : quote.postMarketChange < 0 ? 'is-down' : 'is-flat';
    return `
      <div class="stock-extended ${state}">
        <span class="stock-extended-label">After hours</span>
        <span class="stock-extended-price">${formatMoney(quote.postMarketPrice)}</span>
        ${quote.postMarketChangePercent == null ? '' : `<span class="stock-extended-percent">${formatSigned(quote.postMarketChangePercent)}%</span>`}
      </div>
    `;
  }
  return '';
}

function renderStocks(stocks) {
  const grid = document.querySelector('#stocks-grid');
  grid.innerHTML = stocks.quotes
    .map((quote) => {
      const brandColor = getStockBrandColor(quote.symbol);
      const state = quote.dayChange > 0 ? 'is-up' : quote.dayChange < 0 ? 'is-down' : 'is-flat';
      const basisState = quote.basisChange > 0 ? 'is-up' : quote.basisChange < 0 ? 'is-down' : 'is-flat';
      const fallbackLabel = quote.isFallback ? ' · Demo' : '';
      const arrow = quote.dayChange > 0 ? '▲' : quote.dayChange < 0 ? '▼' : '·';
      const sessionBadge = getStockSessionBadge(quote);
      const extendedLine = getExtendedMarketLine(quote);
      return `
        <article class="stock-card" data-symbol="${quote.symbol}" data-market-state="${quote.marketState || 'regular'}" style="--brand: ${brandColor}">
          <header class="stock-card-top">
            <span class="stock-badge" aria-hidden="true"></span>
            <div class="stock-identity">
              <div class="stock-symbol">${escapeHtml(quote.symbol)}${escapeHtml(fallbackLabel)}</div>
              <div class="stock-label">${escapeHtml(quote.label)}</div>
            </div>
            ${sessionBadge}
          </header>
          <div class="stock-card-core">
            <div class="stock-price ${state}">${formatMoney(quote.price)}</div>
            <div class="stock-change ${state}">
              <span class="stock-arrow">${arrow}</span>
              <span class="stock-change-value">${formatSigned(quote.dayChange)}</span>
              ${quote.dayPercentChange == null ? '' : `<span class="stock-change-percent">${formatSigned(quote.dayPercentChange)}%</span>`}
            </div>
            ${extendedLine}
          </div>
          ${quote.averageCost != null ? `
            <footer class="stock-basis">
              <div class="stock-basis-label">${escapeHtml(quote.averageCostLabel || `${formatMoney(quote.averageCost)} avg cost`)}</div>
              <div class="stock-basis-change ${basisState}">
                <span class="stock-basis-prefix">Vs basis</span>
                <span class="stock-basis-value">${formatSigned(quote.basisPercentChange)}%</span>
              </div>
            </footer>
          ` : ''}
        </article>
      `;
    })
    .join('');

  setPanelMeta('#stocks-meta', `Updated ${formatTime(new Date(stocks.fetchedAt), dashboardConfig.timezone)}`);
}

function renderInspiration(inspiration) {
  const quoteCard = document.querySelector('#quote-card');
  const bibleCard = document.querySelector('#bible-card');

  quoteCard.innerHTML = `
    <div class="quote-kicker">${escapeHtml(inspiration.quote.category)}</div>
    <blockquote class="quote-text">“${escapeHtml(inspiration.quote.text)}”</blockquote>
    <div class="quote-author">${escapeHtml(inspiration.quote.author)}</div>
  `;

  bibleCard.innerHTML = `
    <div class="quote-kicker">Bible quote</div>
    <blockquote class="quote-text quote-text--bible">“${escapeHtml(inspiration.bible.text)}”</blockquote>
    <div class="quote-author">${escapeHtml(inspiration.bible.reference)}</div>
  `;

  setPanelMeta('#quotes-meta', inspiration.label || 'Daily');
}

function renderTelegramPanel(telegram) {
  showStatus('#telegram-status', '');
  setPanelMeta('#telegram-meta', telegram.fetchedAt ? formatTime(new Date(telegram.fetchedAt), dashboardConfig?.timezone || 'America/New_York') : 'Live');

  if (!telegram.items?.length) {
    telegramList.innerHTML = `
      <div class="telegram-empty">
        <p>No reminders.</p>
      </div>
    `;
    return;
  }

  const visibleItems = telegram.items.slice(0, MAX_TELEGRAM_ITEMS);
  const overflowCount = Math.max(0, telegram.items.length - visibleItems.length);

  telegramList.innerHTML = visibleItems
    .map((item) => `
      <article class="telegram-item" data-id="${item.id}">
        <div class="telegram-bullet" aria-hidden="true"></div>
        <div class="telegram-item-text">${escapeHtml(item.text)}</div>
      </article>
    `)
    .join('') + (
      overflowCount
        ? `<div class="telegram-overflow-notice">+${overflowCount} more item${overflowCount === 1 ? '' : 's'} in Telegram</div>`
        : ''
    );
}

function renderCalendars(calendarPanel) {
  calendarData = calendarPanel;
  const calendars = dashboardConfig?.calendars || [];
  const events = Array.isArray(calendarPanel?.events) ? calendarPanel.events : [];
  const timeZone = dashboardConfig?.timezone || 'America/New_York';

  calendarSources.innerHTML = calendars
    .map((calendar) => `
      <div class="calendar-source-pill" data-live="${calendar.hasServerFeed ? 'true' : 'false'}">
        <span class="calendar-source-dot" style="background:${sanitizeColor(calendar.color)}"></span>
        <span>${escapeHtml(calendar.label)}</span>
      </div>
    `)
    .join('');

  showStatus('#calendar-status', calendarPanel?.status || '');
  setPanelMeta('#calendar-meta', calendarPanel?.metaLabel || (calendars.length ? 'Agenda' : 'No calendars configured'));

  calendarAgenda.classList.add('calendar-agenda--workweek');

  const workweekDays = getWorkweekDays(events, timeZone);
  const workweekKeys = new Set(workweekDays.map((day) => day.key));
  const eventsByDay = new Map(workweekDays.map((day) => [day.key, []]));
  const eventsPerDayLimit = getCalendarEventLimit();

  for (const event of events) {
    const start = new Date(event.start);
    if (Number.isNaN(start.getTime())) continue;
    const dayKey = formatDayKey(start, timeZone);
    if (!workweekKeys.has(dayKey)) continue;
    if (!eventsByDay.has(dayKey)) {
      eventsByDay.set(dayKey, []);
    }
    eventsByDay.get(dayKey).push(event);
  }

  let overflowCount = events.filter((event) => {
    const start = new Date(event.start);
    return !Number.isNaN(start.getTime()) && !workweekKeys.has(formatDayKey(start, timeZone));
  }).length;

  calendarAgenda.innerHTML = workweekDays
    .map((day) => {
      const dayEvents = (eventsByDay.get(day.key) || [])
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const visibleDayEvents = dayEvents.slice(0, eventsPerDayLimit);
      overflowCount += Math.max(0, dayEvents.length - visibleDayEvents.length);

      return `
      <section class="calendar-day-group">
        <header class="calendar-day-header">
          <div class="calendar-day-title">${escapeHtml(day.title)}</div>
          <div class="calendar-day-date">${escapeHtml(day.subtitle)}</div>
        </header>
        <div class="calendar-events">
          ${visibleDayEvents.length ? visibleDayEvents.map((event) => {
            const eventTitle = getCalendarDisplayTitle(event);
            return `
            <article class="calendar-event">
              <span class="calendar-event-accent" style="background:${sanitizeColor(event.color, '#94a3b8')}"></span>
              <div class="calendar-event-main">
                <div class="calendar-event-time">${escapeHtml(formatCalendarTimeRange(event, timeZone))}</div>
                <div class="calendar-event-title" title="${escapeHtml(eventTitle)}">${escapeHtml(truncateText(eventTitle, getCalendarTitleLimit()))}</div>
                <div class="calendar-event-meta">
                  <span class="calendar-event-source">${escapeHtml(event.calendarLabel || 'Calendar')}</span>
                  ${event.location ? `<span class="calendar-event-location">${escapeHtml(event.location)}</span>` : ''}
                </div>
              </div>
            </article>
          `;
          }).join('') : '<div class="calendar-empty-day">Open</div>'}
        </div>
      </section>
    `;
    })
    .join('') + (
      overflowCount
        ? `<div class="calendar-overflow-notice">+${overflowCount} more upcoming event${overflowCount === 1 ? '' : 's'}</div>`
        : ''
    );
}

async function loadDashboard() {
  try {
    const [config, weather, stocks, inspiration, telegram, calendar] = await Promise.all([
      fetchJson('/api/config'),
      fetchJson('/api/weather'),
      fetchJson('/api/stocks'),
      fetchJson('/api/inspiration'),
      fetchJson('/api/telegram-panel'),
      fetchJson('/api/calendar'),
    ]);

    dashboardConfig = config;
    dashboardTitle.textContent = config.title;
    syncDisplayMode();
    updateTimePanel();
    renderWeather(weather);
    renderStocks(stocks);
    renderInspiration(inspiration);
    renderTelegramPanel(telegram);
    renderCalendars(calendar);
  } catch (error) {
    showStatus('#calendar-status', error instanceof Error ? error.message : 'Failed to load dashboard');
    setPanelMeta('#weather-meta', 'Error');
    setPanelMeta('#stocks-meta', 'Error');
    setPanelMeta('#quotes-meta', 'Error');
    setPanelMeta('#telegram-meta', 'Error');
    setPanelMeta('#calendar-meta', 'Error');
  }
}

async function loadTelegramPanel() {
  try {
    renderTelegramPanel(await fetchJson('/api/telegram-panel'));
  } catch {
    setPanelMeta('#telegram-meta', 'Offline');
  }
}

async function loadStocksPanel() {
  try {
    renderStocks(await fetchJson('/api/stocks'));
  } catch {
    setPanelMeta('#stocks-meta', 'Offline');
  }
}

function showNextLayout() {
  applyLayout((activeLayoutIndex + 1) % LAYOUTS.length);
  nextLayoutButton.focus({ preventScroll: true });
}

nextLayoutButton.addEventListener('click', showNextLayout);

window.showNextDashboardLayout = showNextLayout;

document.addEventListener('keydown', (event) => {
  if (!isTvDisplayRequested()) return;
  if (!['Enter', ' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'MediaTrackNext'].includes(event.key)) return;
  event.preventDefault();
  showNextLayout();
});

applyLayout(activeLayoutIndex);
syncDisplayMode();
loadDashboard();
window.addEventListener('resize', syncDisplayMode);
window.visualViewport?.addEventListener('resize', syncDisplayMode);
window.setInterval(updateTimePanel, 1000);
window.setInterval(loadTelegramPanel, TELEGRAM_REFRESH_MS);
window.setInterval(loadStocksPanel, STOCKS_REFRESH_MS);
window.setInterval(loadDashboard, DASHBOARD_REFRESH_MS);
