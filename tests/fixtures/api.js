export const BASE_CONFIG = {
  title: "Paul's Office Panel",
  timezone: 'America/New_York',
  workdayEnd: '17:00:00',
  timeZones: [
    { shortLabel: 'CDT', label: 'Alabama', timeZone: 'America/Chicago' },
    { shortLabel: 'SFO', label: 'San Francisco', timeZone: 'America/Los_Angeles' },
    { shortLabel: 'MT', label: 'Mountain', timeZone: 'America/Denver' },
  ],
  location: 'Charleston, SC',
  calendars: [
    { label: 'Paul', color: '#69b3ff' },
    { label: 'Alexa', color: '#8b5cf6' },
    { label: 'Family', color: '#22c55e' },
    { label: 'Marc', color: '#f97316' },
    { label: 'Nicole', color: '#ec4899' },
  ],
  mergedCalendar: {
    label: 'Combined family schedule',
    embedUrl: 'https://calendar.google.com/calendar/embed?mode=AGENDA&wkst=1&src=one&src=two',
  },
};

export const WEATHER_FIXTURE = {
  label: 'Charleston, SC',
  fetchedAt: '2026-04-02T12:00:00.000Z',
  current: {
    temperature_2m: 22,
    apparent_temperature: 20,
    summary: 'Partly cloudy',
    wind_speed_10m: 9,
  },
  moon: {
    value: 0.41,
    label: 'Waxing Gibbous',
    illuminationPercent: 66,
  },
  tide: {
    next: { type: 'High', feet: 5.4, time: '2026-04-02T16:00:00.000Z' },
    trend: 'Rising',
    label: 'Charleston Harbor',
  },
  uv: { current: 4.2, max: 7.9 },
  astronomy: { sunrise: '2026-04-02T11:08:00.000Z', sunset: '2026-04-02T23:42:00.000Z' },
  nextHours: [
    { time: '2026-04-02T13:00:00.000Z', temperature: 23, precipitationProbability: 10, uvIndex: 4, windSpeed: 8 },
    { time: '2026-04-02T14:00:00.000Z', temperature: 24, precipitationProbability: 8, uvIndex: 5, windSpeed: 10 },
    { time: '2026-04-02T15:00:00.000Z', temperature: 24, precipitationProbability: 5, uvIndex: 5, windSpeed: 11 },
    { time: '2026-04-02T16:00:00.000Z', temperature: 23, precipitationProbability: 15, uvIndex: 4, windSpeed: 12 },
    { time: '2026-04-02T17:00:00.000Z', temperature: 22, precipitationProbability: 20, uvIndex: 2, windSpeed: 9 },
  ],
};

export const STOCKS_REGULAR_FIXTURE = {
  fetchedAt: '2026-04-02T12:00:00.000Z',
  quotes: [
    { symbol: 'MSTR', label: 'MicroStrategy', price: 1712.5, dayChange: 24.4, dayPercentChange: 1.45, marketState: 'REGULAR' },
    { symbol: 'BTC', label: 'Bitcoin', price: 93450, dayChange: -510, dayPercentChange: -0.54, marketState: 'REGULAR' },
    { symbol: 'ETH', label: 'Ethereum', price: 1798, dayChange: 12, dayPercentChange: 0.67, marketState: 'REGULAR' },
    {
      symbol: 'MSTR 200C',
      label: 'MSTR $200 Call',
      price: 94.2,
      dayChange: -1.2,
      dayPercentChange: -1.25,
      averageCost: 54,
      averageCostLabel: '$54.00 avg cost',
      basisPercentChange: 74.44,
      basisChange: 40.2,
      marketState: 'REGULAR',
    },
  ],
};

export const STOCKS_PREMARKET_FIXTURE = {
  ...STOCKS_REGULAR_FIXTURE,
  quotes: STOCKS_REGULAR_FIXTURE.quotes.map((quote, index) => (index === 0
    ? {
      ...quote,
      marketState: 'PRE',
      preMarketPrice: 1730.2,
      preMarketChangePercent: 1.03,
      preMarketChange: 17.7,
    }
    : quote)),
};

export const INSPIRATION_FIXTURE = {
  label: 'Changes every day',
  quote: { category: 'Funny', text: 'The rat race has no finish line.', author: 'Office wallboard rule' },
  bible: { reference: 'Proverbs 16:3', text: 'Commit your work to the Lord, and your plans will be established.' },
};

export const TELEGRAM_WITH_ITEMS_FIXTURE = {
  metaLabel: 'Live bot connected',
  status: 'Send /add your text or /remove id to the bot.',
  items: [
    { id: 1, text: 'Bring extra HDMI cable', sourceLabel: 'Paul', createdAtLabel: 'Apr 2, 09:10' },
    { id: 2, text: 'Confirm client lunch at noon', sourceLabel: 'Alexa', createdAtLabel: 'Apr 2, 09:30' },
  ],
};

export const TELEGRAM_EMPTY_FIXTURE = {
  metaLabel: 'Live bot connected',
  status: 'Send /add your text or /remove id to the bot.',
  items: [],
};

export async function mockDashboardApis(page, options = {}) {
  const telegramFixture = options.telegramEmpty ? TELEGRAM_EMPTY_FIXTURE : TELEGRAM_WITH_ITEMS_FIXTURE;
  const stockFixture = options.premarket ? STOCKS_PREMARKET_FIXTURE : STOCKS_REGULAR_FIXTURE;
  const responses = {
    '/api/config': BASE_CONFIG,
    '/api/weather': WEATHER_FIXTURE,
    '/api/stocks': stockFixture,
    '/api/inspiration': INSPIRATION_FIXTURE,
    '/api/telegram-panel': telegramFixture,
  };

  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (responses[pathname]) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responses[pathname]),
      });
      return;
    }
    await route.continue();
  });
}
