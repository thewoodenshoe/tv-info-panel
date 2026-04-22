# tv-info-panel

Quick lightweight office TV dashboard with market watchlist, richer Charleston weather, multi-timezone clocks, end-of-day countdown, merged Google calendar view, Telegram board items, and daily quotes.

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
- Combined Google calendar agenda
- Telegram-controlled task / reminder panel
- Quote of the day + Bible quote
- Five switchable visual layouts from the on-screen `Next layout` button

## Local Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file:

   ```bash
   cp .env.example .env
   ```

3. Start the local server:

   ```bash
   npm run dev
   ```

4. Open:

   ```text
   http://localhost:3030
   ```

## Calendar Setup

The current local-first setup uses Google Calendar embed URLs stored in `data/dashboard-config.json`, then merges them into one Google Calendar embed panel.

That means:

- no TV-side login is required
- you can add or remove shared calendars directly in config
- the board renders one merged agenda view plus source pills

If you later want a merged event list, we can add a server-side authenticated calendar integration in a later pass.

## Telegram Board

The Telegram panel is controlled by a bot polling loop on the server.

Environment variables:

```bash
TELEGRAM_BOT_TOKEN="bot token here"
TELEGRAM_ALLOWED_CHAT_IDS="123456789,987654321"
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

## Editable Config

Change these in `data/dashboard-config.json`:

- dashboard title
- timezone
- weather location
- tide station
- workday end time
- additional timezone clocks
- stock / crypto / option watchlist
- Google calendar embed URLs
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

- Preferred display app: Fully Kiosk Browser
- Point the Fire TV to the dashboard URL
- Keep fullscreen and auto-reload enabled

## Notes

- Weather uses Open-Meteo plus NOAA tides.
- Stocks use Yahoo Finance chart data with built-in demo fallbacks if the remote quote fetch fails.
- Telegram board items are stored in `data/telegram-panel.json`.
- This repo is safe to iterate on locally before any Ubuntu deployment.
