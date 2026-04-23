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
    { label: 'Paul', color: '#69b3ff', hasServerFeed: true },
    { label: 'Alexa', color: '#8b5cf6', hasServerFeed: true },
    { label: 'Family', color: '#22c55e', hasServerFeed: true },
    { label: 'Marc', color: '#f97316', hasServerFeed: true },
    { label: 'Nicole', color: '#ec4899', hasServerFeed: true },
  ],
};

export const STRESS_CONFIG = {
  ...BASE_CONFIG,
  title: 'Office Operations and Family Planning Wallboard',
  timeZones: [
    { shortLabel: 'CENTRAL', label: 'Birmingham Operations Hub', timeZone: 'America/Chicago' },
    { shortLabel: 'PACIFIC', label: 'San Francisco Client Hours', timeZone: 'America/Los_Angeles' },
    { shortLabel: 'MOUNTAIN', label: 'Denver Travel Window', timeZone: 'America/Denver' },
  ],
  calendars: [
    { label: 'Personal Planning', color: '#69b3ff', hasServerFeed: true },
    { label: 'Client Delivery', color: '#8b5cf6', hasServerFeed: true },
    { label: 'Family Schedule', color: '#22c55e', hasServerFeed: true },
    { label: 'Travel and Logistics', color: '#f97316', hasServerFeed: false },
    { label: 'School and Activities', color: '#ec4899', hasServerFeed: false },
  ],
};

export const CALENDAR_FIXTURE = {
  metaLabel: 'Next 7 days',
  status: '',
  mode: 'live',
  events: [
    {
      id: 'evt-1',
      title: 'Morning priorities review',
      location: 'Office desk',
      start: '2026-04-23T13:00:00.000Z',
      end: '2026-04-23T13:30:00.000Z',
      isAllDay: false,
      calendarLabel: 'Paul',
      color: '#69b3ff',
    },
    {
      id: 'evt-2',
      title: 'Client delivery call',
      location: 'Zoom',
      start: '2026-04-23T16:00:00.000Z',
      end: '2026-04-23T17:00:00.000Z',
      isAllDay: false,
      calendarLabel: 'Alexa',
      color: '#8b5cf6',
    },
    {
      id: 'evt-3',
      title: 'Family dinner',
      location: 'Home',
      start: '2026-04-23T22:00:00.000Z',
      end: '2026-04-23T23:30:00.000Z',
      isAllDay: false,
      calendarLabel: 'Family',
      color: '#22c55e',
    },
    {
      id: 'evt-4',
      title: 'Travel planning block',
      location: 'Upstairs office',
      start: '2026-04-24T14:00:00.000Z',
      end: '2026-04-24T15:00:00.000Z',
      isAllDay: false,
      calendarLabel: 'Marc',
      color: '#f97316',
    },
    {
      id: 'evt-5',
      title: 'Nicole school event',
      location: 'Auditorium',
      start: '2026-04-25T13:00:00.000Z',
      end: '2026-04-25T15:00:00.000Z',
      isAllDay: false,
      calendarLabel: 'Nicole',
      color: '#ec4899',
    },
    {
      id: 'evt-6',
      title: 'Project buffer',
      location: '',
      start: '2026-04-26T04:00:00.000Z',
      end: '2026-04-26T04:00:00.000Z',
      isAllDay: true,
      calendarLabel: 'Paul',
      color: '#69b3ff',
    },
  ],
};

export const CALENDAR_STRESS_FIXTURE = {
  metaLabel: 'Next 7 days',
  status: '2 calendar feeds unavailable right now.',
  mode: 'live',
  events: [
    {
      id: 'stress-1',
      title: 'Review the Charleston office setup checklist before the A/V technician arrives',
      location: 'Main office',
      start: '2026-04-23T13:00:00.000Z',
      end: '2026-04-23T13:45:00.000Z',
      isAllDay: false,
      calendarLabel: 'Personal Planning',
      color: '#69b3ff',
    },
    {
      id: 'stress-2',
      title: 'Client delivery milestone handoff and follow-up notes',
      location: 'Conference room B',
      start: '2026-04-23T16:30:00.000Z',
      end: '2026-04-23T17:30:00.000Z',
      isAllDay: false,
      calendarLabel: 'Client Delivery',
      color: '#8b5cf6',
    },
    {
      id: 'stress-3',
      title: 'Family pickup coordination',
      location: 'School loop',
      start: '2026-04-23T19:30:00.000Z',
      end: '2026-04-23T20:00:00.000Z',
      isAllDay: false,
      calendarLabel: 'Family Schedule',
      color: '#22c55e',
    },
    {
      id: 'stress-4',
      title: 'Travel and logistics buffer block',
      location: 'Airport planning',
      start: '2026-04-24T14:00:00.000Z',
      end: '2026-04-24T15:30:00.000Z',
      isAllDay: false,
      calendarLabel: 'Travel and Logistics',
      color: '#f97316',
    },
    {
      id: 'stress-5',
      title: 'School and activities coordination window',
      location: 'Gym',
      start: '2026-04-24T19:00:00.000Z',
      end: '2026-04-24T20:00:00.000Z',
      isAllDay: false,
      calendarLabel: 'School and Activities',
      color: '#ec4899',
    },
    {
      id: 'stress-6',
      title: 'Quarterly planning review',
      location: 'War room',
      start: '2026-04-25T14:00:00.000Z',
      end: '2026-04-25T15:30:00.000Z',
      isAllDay: false,
      calendarLabel: 'Client Delivery',
      color: '#8b5cf6',
    },
    {
      id: 'stress-7',
      title: 'All-day reset and catch-up block',
      location: '',
      start: '2026-04-26T04:00:00.000Z',
      end: '2026-04-26T04:00:00.000Z',
      isAllDay: true,
      calendarLabel: 'Personal Planning',
      color: '#69b3ff',
    },
  ],
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

export const WEATHER_STRESS_FIXTURE = {
  ...WEATHER_FIXTURE,
  label: 'Charleston Office',
  current: {
    ...WEATHER_FIXTURE.current,
    summary: 'Partly cloudy with coastal breeze',
  },
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

export const STOCKS_STRESS_REGULAR_FIXTURE = {
  fetchedAt: '2026-04-02T12:00:00.000Z',
  quotes: [
    { symbol: 'STRAT', label: 'Strategy Inc. Class A', price: 174.25, dayChange: 25.31, dayPercentChange: 16.99, marketState: 'REGULAR' },
    { symbol: 'BTC', label: 'Bitcoin Spot Reference', price: 77562.69, dayChange: 3706.34, dayPercentChange: 5.02, marketState: 'REGULAR' },
    { symbol: 'ETH', label: 'Ethereum Network Spot', price: 2320.38, dayChange: 55.46, dayPercentChange: 2.45, marketState: 'REGULAR' },
    {
      symbol: 'MSTR 200C',
      label: 'Strategy Jun 2027 Call',
      price: 53.67,
      dayChange: 6.1,
      dayPercentChange: 12.82,
      averageCost: 54,
      averageCostLabel: '$54.00 average cost basis',
      basisPercentChange: -0.61,
      basisChange: -0.33,
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

export const STOCKS_AFTER_HOURS_FIXTURE = {
  ...STOCKS_REGULAR_FIXTURE,
  quotes: STOCKS_REGULAR_FIXTURE.quotes.map((quote, index) => (index === 0
    ? {
      ...quote,
      marketState: 'POST',
      postMarketPrice: 1705.8,
      postMarketChangePercent: -0.39,
      postMarketChange: -6.7,
    }
    : quote)),
};

export const STOCKS_STRESS_PREMARKET_FIXTURE = {
  ...STOCKS_STRESS_REGULAR_FIXTURE,
  quotes: STOCKS_STRESS_REGULAR_FIXTURE.quotes.map((quote, index) => (index === 0
    ? {
      ...quote,
      marketState: 'PRE',
      preMarketPrice: 176.4,
      preMarketChangePercent: 1.23,
      preMarketChange: 2.15,
    }
    : quote)),
};

export const STOCKS_STRESS_AFTER_HOURS_FIXTURE = {
  ...STOCKS_STRESS_REGULAR_FIXTURE,
  quotes: STOCKS_STRESS_REGULAR_FIXTURE.quotes.map((quote, index) => (index === 0
    ? {
      ...quote,
      marketState: 'POST',
      postMarketPrice: 172.9,
      postMarketChangePercent: -0.77,
      postMarketChange: -1.35,
    }
    : quote)),
};

export const INSPIRATION_FIXTURE = {
  label: 'Changes every day',
  quote: { category: 'Funny', text: 'The rat race has no finish line.', author: 'Office wallboard rule' },
  bible: { reference: 'Proverbs 16:3', text: 'Commit your work to the Lord, and your plans will be established.' },
};

export const INSPIRATION_STRESS_FIXTURE = {
  label: 'Changes every day',
  quote: {
    category: 'Build',
    text: 'Good dashboards make the important things obvious first, the changing things noticeable second, and everything else politely quiet.',
    author: 'Office wallboard rule',
  },
  bible: {
    reference: 'Ecclesiastes 3:1',
    text: 'For everything there is a season, and a time for every matter under heaven.',
  },
};

export const TELEGRAM_WITH_ITEMS_FIXTURE = {
  metaLabel: 'Live bot connected',
  status: 'Send /add your text or /remove id to the bot.',
  items: [
    { id: 1, text: 'Bring extra HDMI cable', sourceLabel: 'Paul', createdAtLabel: 'Apr 2, 09:10' },
    { id: 2, text: 'Confirm client lunch at noon', sourceLabel: 'Alexa', createdAtLabel: 'Apr 2, 09:30' },
  ],
};

export const TELEGRAM_WITH_LONG_ITEMS_FIXTURE = {
  metaLabel: 'Live bot connected',
  status: 'Send /add your text or /remove id to the bot.',
  items: [
    { id: 6, text: 'Do not let HTML like <strong>this</strong> render on the TV board; keep it as plain text and still fit cleanly.', sourceLabel: 'Operations', createdAtLabel: 'Apr 2, 10:45' },
    { id: 5, text: 'Bring the extra HDMI cable, Ethernet adapter, USB keyboard, and backup remote before the office setup window starts.', sourceLabel: 'Paul', createdAtLabel: 'Apr 2, 10:30' },
    { id: 4, text: 'Confirm the noon client lunch, then post the finalized room number to the board for anyone walking in late.', sourceLabel: 'Alexa', createdAtLabel: 'Apr 2, 10:10' },
    { id: 3, text: 'Ask building management whether the conference room TV can stay powered overnight without timing out the HDMI input.', sourceLabel: 'Facilities', createdAtLabel: 'Apr 2, 09:50' },
    { id: 2, text: 'Check the Ubuntu host reboot policy after patching so the dashboard does not disappear before the morning meeting.', sourceLabel: 'Infra', createdAtLabel: 'Apr 2, 09:30' },
    { id: 1, text: 'Keep a written fallback URL nearby in case the TV browser clears session state.', sourceLabel: 'Notes', createdAtLabel: 'Apr 2, 09:10' },
  ],
};

export const TELEGRAM_EMPTY_FIXTURE = {
  metaLabel: 'Live bot connected',
  status: 'Send /add your text or /remove id to the bot.',
  items: [],
};

export async function mockDashboardApis(page, options = {}) {
  const telegramFixture = options.telegramEmpty
    ? TELEGRAM_EMPTY_FIXTURE
    : options.stress
      ? TELEGRAM_WITH_LONG_ITEMS_FIXTURE
      : TELEGRAM_WITH_ITEMS_FIXTURE;

  let stockFixture = options.stress ? STOCKS_STRESS_REGULAR_FIXTURE : STOCKS_REGULAR_FIXTURE;
  if (options.premarket) {
    stockFixture = options.stress ? STOCKS_STRESS_PREMARKET_FIXTURE : STOCKS_PREMARKET_FIXTURE;
  }
  if (options.afterHours) {
    stockFixture = options.stress ? STOCKS_STRESS_AFTER_HOURS_FIXTURE : STOCKS_AFTER_HOURS_FIXTURE;
  }

  const responses = {
    '/api/config': options.stress ? STRESS_CONFIG : BASE_CONFIG,
    '/api/calendar': options.stress ? CALENDAR_STRESS_FIXTURE : CALENDAR_FIXTURE,
    '/api/weather': options.stress ? WEATHER_STRESS_FIXTURE : WEATHER_FIXTURE,
    '/api/stocks': stockFixture,
    '/api/inspiration': options.stress ? INSPIRATION_STRESS_FIXTURE : INSPIRATION_FIXTURE,
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
