const dashboardTitle = document.querySelector('#dashboard-title');
const clock = document.querySelector('#clock');
const dateLabel = document.querySelector('#date');
const workdayCountdown = document.querySelector('#workday-countdown');
const timezoneClocks = document.querySelector('#timezone-clocks');
const calendarFrame = document.querySelector('#calendar-frame');
const calendarSources = document.querySelector('#calendar-sources');
const layoutName = document.querySelector('#layout-name');
const nextLayoutButton = document.querySelector('#next-layout-button');
const telegramList = document.querySelector('#telegram-list');

const LAYOUTS = [
  { id: 'daylight', label: 'Daylight Board' },
  { id: 'midnight', label: 'Midnight Desk' },
  { id: 'pastel', label: 'Pastel Poster' },
  { id: 'paper', label: 'Slate & Paper' },
  { id: 'neon', label: 'Neon Blueprint' },
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
let activeLayoutIndex = Number.parseInt(window.localStorage.getItem('tv-info-layout-index') || '0', 10);
if (!Number.isFinite(activeLayoutIndex) || activeLayoutIndex < 0 || activeLayoutIndex >= LAYOUTS.length) {
  activeLayoutIndex = 0;
}

function setPanelMeta(id, value) {
  const node = document.querySelector(id);
  if (node) node.textContent = value;
}

function showStatus(id, message) {
  const node = document.querySelector(id);
  if (node) node.textContent = message || '';
}

function applyLayout(index) {
  activeLayoutIndex = index % LAYOUTS.length;
  const layout = LAYOUTS[activeLayoutIndex];
  document.body.dataset.layout = layout.id;
  layoutName.textContent = layout.label;
  nextLayoutButton.textContent = `Next layout`;
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
        <div class="timezone-label">${item.shortLabel}</div>
        <div class="timezone-time">${formatTime(now, item.timeZone)}</div>
        <div class="timezone-name">${item.label}</div>
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

function renderWeather(weather) {
  const currentNode = document.querySelector('#weather-current');
  const detailsNode = document.querySelector('#weather-details');
  const hoursNode = document.querySelector('#weather-hours');

  currentNode.innerHTML = `
    <div class="weather-temp-block">
      <div class="weather-temp">${formatDegrees(weather.current?.temperature_2m)}</div>
      <div class="weather-summary">
        <div class="weather-summary-title">${weather.label}</div>
        <div>${weather.current?.summary || 'Weather'} · Feels like ${formatDegrees(weather.current?.apparent_temperature)}</div>
        <div>Wind ${formatWind(weather.current?.wind_speed_10m)}</div>
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

function renderStocks(stocks) {
  const grid = document.querySelector('#stocks-grid');
  grid.innerHTML = stocks.quotes
    .map((quote) => {
      const brandColor = getStockBrandColor(quote.symbol);
      const state = quote.dayChange > 0 ? 'is-up' : quote.dayChange < 0 ? 'is-down' : 'is-flat';
      const dayPercent = quote.dayPercentChange == null ? '' : ` (${formatSigned(quote.dayPercentChange)}%)`;
      const basisState = quote.basisChange > 0 ? 'is-up' : quote.basisChange < 0 ? 'is-down' : 'is-flat';
      const fallbackLabel = quote.isFallback ? ' · Demo' : '';
      const arrow = quote.dayChange > 0 ? '▲' : quote.dayChange < 0 ? '▼' : '·';
      return `
        <article class="stock-card" data-symbol="${quote.symbol}" style="--brand: ${brandColor}">
          <header class="stock-card-top">
            <span class="stock-badge" aria-hidden="true"></span>
            <div class="stock-identity">
              <div class="stock-symbol">${quote.symbol}${fallbackLabel}</div>
              <div class="stock-label">${quote.label}</div>
            </div>
          </header>
          <div class="stock-card-core">
            <div class="stock-price">${formatMoney(quote.price)}</div>
            <div class="stock-change ${state}"><span class="stock-arrow">${arrow}</span> ${formatSigned(quote.dayChange)}${dayPercent}</div>
          </div>
          ${quote.averageCost != null ? `
            <footer class="stock-basis">
              <div class="stock-basis-label">${quote.averageCostLabel || `${formatMoney(quote.averageCost)} avg cost`}</div>
              <div class="stock-basis-change ${basisState}">Vs basis ${formatSigned(quote.basisPercentChange)}%</div>
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
    <div class="quote-kicker">${inspiration.quote.category}</div>
    <blockquote class="quote-text">“${inspiration.quote.text}”</blockquote>
    <div class="quote-author">${inspiration.quote.author}</div>
  `;

  bibleCard.innerHTML = `
    <div class="quote-kicker">Bible quote</div>
    <blockquote class="quote-text quote-text--bible">“${inspiration.bible.text}”</blockquote>
    <div class="quote-author">${inspiration.bible.reference}</div>
  `;

  setPanelMeta('#quotes-meta', inspiration.label || 'Daily');
}

function renderTelegramPanel(telegram) {
  showStatus('#telegram-status', telegram.status || '');
  setPanelMeta('#telegram-meta', telegram.metaLabel || 'Telegram');

  if (!telegram.items?.length) {
    telegramList.innerHTML = `
      <div class="telegram-empty">
        <p>No Telegram items yet.</p>
        <p>Send <code>/add your text</code> to the bot and it will show up here.</p>
      </div>
    `;
    return;
  }

  telegramList.innerHTML = telegram.items
    .map((item) => `
      <article class="telegram-item">
        <div class="telegram-item-id">#${item.id}</div>
        <div class="telegram-item-text">${item.text}</div>
        <div class="telegram-item-meta">${item.sourceLabel || 'Telegram'} · ${item.createdAtLabel || ''}</div>
      </article>
    `)
    .join('');
}

function renderCalendars(mergedCalendar, calendars) {
  if (!mergedCalendar?.embedUrl) {
    showStatus('#calendar-status', 'Add Google calendar embed URLs in config to show the combined calendar.');
    setPanelMeta('#calendar-meta', 'No calendars configured');
    calendarFrame.src = 'about:blank';
    calendarSources.innerHTML = '';
    return;
  }

  showStatus('#calendar-status', '');
  setPanelMeta('#calendar-meta', `${calendars.length} merged calendars`);
  calendarFrame.src = mergedCalendar.embedUrl;
  calendarSources.innerHTML = calendars
    .map((calendar) => `
      <div class="calendar-source-pill">
        <span class="calendar-source-dot" style="background:${calendar.color || '#69b3ff'}"></span>
        <span>${calendar.label}</span>
      </div>
    `)
    .join('');
}

async function loadDashboard() {
  try {
    const [config, weather, stocks, inspiration, telegram] = await Promise.all([
      fetchJson('/api/config'),
      fetchJson('/api/weather'),
      fetchJson('/api/stocks'),
      fetchJson('/api/inspiration'),
      fetchJson('/api/telegram-panel'),
    ]);

    dashboardConfig = config;
    dashboardTitle.textContent = config.title;
    updateTimePanel();
    renderWeather(weather);
    renderStocks(stocks);
    renderInspiration(inspiration);
    renderTelegramPanel(telegram);
    renderCalendars(config.mergedCalendar, config.calendars || []);
  } catch (error) {
    showStatus('#calendar-status', error instanceof Error ? error.message : 'Failed to load dashboard');
    setPanelMeta('#weather-meta', 'Error');
    setPanelMeta('#stocks-meta', 'Error');
    setPanelMeta('#quotes-meta', 'Error');
    setPanelMeta('#telegram-meta', 'Error');
    setPanelMeta('#calendar-meta', 'Error');
  }
}

nextLayoutButton.addEventListener('click', () => {
  applyLayout((activeLayoutIndex + 1) % LAYOUTS.length);
});

applyLayout(activeLayoutIndex);
loadDashboard();
window.setInterval(updateTimePanel, 1000);
window.setInterval(loadDashboard, 5 * 60 * 1000);
