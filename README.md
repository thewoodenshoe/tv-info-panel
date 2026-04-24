# tv-info-panel

Quick lightweight office TV dashboard with market watchlist, richer Charleston weather, multi-timezone clocks, end-of-day countdown, a TV-safe agenda panel, Telegram board items, and daily quotes.

The tracked repo ships with safe sample data. Personal calendars and other private board settings belong in local-only files.

## Stack

- Small Node + Express server
- Single HTML/CSS/JS dashboard page
- Server-side data fetches for panels that should not depend on TV-side logins
- Local-first workflow, with Ubuntu deploy later

## Current Panels

- Main office clock and date
- Countdown to 5 PM
- Alabama / SFO / Mountain clocks
- Charleston weather with tide, moon phase, UV, sunrise/sunset, and next hours
- Stock and crypto watchlist
- Combined agenda panel with server-fed calendar events
- Telegram-controlled task / reminder panel
- Quote of the day + Bible quote
- Four switchable visual layouts from the on-screen `Next layout` button

## Local Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file:

   ```bash
   cp .env.example .env
   ```

3. Create a local dashboard override if you want private calendars, labels, or watchlists:

   ```bash
   cp data/dashboard-config.json data/dashboard-config.local.json
   ```

4. Start the local server:

   ```bash
   npm run dev
   ```

5. Open:

   ```text
   http://localhost:3030
   ```

   TV-friendly display route:

   ```text
   http://localhost:3030/display
   ```

6. Run panel contract tests:

   ```bash
   npm test
   ```

Local-only files:

- `data/dashboard-config.local.json` is ignored by git and overrides the tracked sample config.
- `data/telegram-panel.local.json` is ignored by git and stores runtime Telegram board items.
- `DASHBOARD_CONFIG_PATH` and `TELEGRAM_STORE_PATH` can point to custom files if you want them elsewhere.

## Calendar Setup

The TV-friendly calendar path is server-side, not a Google iframe on the TV.

For each Google calendar you want on the board, add its `Secret address in iCal format` to `data/dashboard-config.local.json` as `icsUrl`.

Example:

```json
{
  "label": "Family",
  "color": "#22c55e",
  "icsUrl": "https://calendar.google.com/calendar/ical/your-private-feed/basic.ics"
}
```

Notes:

- keep `icsUrl` values only in the ignored local config file
- do not commit private iCal feed URLs
- the board will show fallback events if no live `icsUrl` feeds are configured
- `/display` is the best route for TVs because it removes the dashboard header and uses tighter spacing
- you cannot derive Google `Secret address in iCal format` values from the existing embed URLs; paste them manually from Google Calendar settings

## Telegram Board

The Telegram panel is controlled by a bot polling loop on the server.

Environment variables:

```bash
TELEGRAM_BOT_TOKEN="bot token here"
TELEGRAM_ALLOWED_CHAT_IDS="123456789,987654321"
TELEGRAM_POLLING_ENABLED=true
```

Commands:

```text
/add your text here
/remove 3
/list
/whoami
```

Important:

- keep `TELEGRAM_BOT_TOKEN` only in the local / Ubuntu `.env`
- never commit the token
- `TELEGRAM_ALLOWED_CHAT_IDS` is optional; if blank, any chat that reaches the bot can manage the board
- only one running server can poll a Telegram bot token; set `TELEGRAM_POLLING_ENABLED=false` in local `.env` if Ubuntu is the production poller

## Editable Config

Change these in `data/dashboard-config.local.json`:

- dashboard title
- timezone
- weather location
- tide station
- workday end time
- additional timezone clocks
- stock / crypto / option watchlist
- Google calendar `icsUrl` feeds
- calendar colors

## Repo Guidance

This repo is intentionally separate from `chs-spots`.

### Working rules

- Build and verify locally first.
- Keep the TV as a thin browser client.
- Prefer server-side fetches for any private integrations.
- Avoid heavyweight frameworks unless the simple dashboard shape becomes limiting.

### Suggested Ubuntu deploy target

- SSH alias: `ubuntu`
- Suggested project path: `~/projects/tv-info-panel`
- Suggested first deploy flow:
  - push repo to GitHub
  - clone/pull on Ubuntu into `~/projects/tv-info-panel`
  - create a repo-specific `.env` on Ubuntu
  - run with `npm start` behind a reverse proxy, or add Docker later

### Fire TV path

- Keep the TV as a thin browser client.
- Prefer `/display` or a packaged Fire TV web app so the TV never has to log into Google directly.
- Avoid relying on paid kiosk dependencies unless you explicitly want them.

## Fire TV Wrapper App

A starter Fire TV wrapper app lives in [fire-tv-wrapper/README.md](/Users/paulstewart/projects/tv-info-panel/fire-tv-wrapper/README.md).

It is a small Android / Fire TV app that opens the dashboard in a full-screen `WebView` using the TV-safe route:

```text
http://192.168.86.250:3030/display
```

Before building it, copy:

```bash
cp fire-tv-wrapper/dashboard.local.properties.example fire-tv-wrapper/dashboard.local.properties
```

Then set:

```properties
dashboardUrl=http://192.168.86.250:3030/display
appName=Paul's Office Panel
```

## Notes

- Weather uses Open-Meteo plus NOAA tides.
- Stocks use Yahoo Finance chart data, including derived pre-market and after-hours sessions when available, with built-in demo fallbacks if remote fetches fail.
- Telegram board items are stored in `data/telegram-panel.local.json`.
- This repo is safe to iterate on locally before any Ubuntu deployment.
