# 🎬 CineScope — Entertainment Trend Analytics

CineScope tracks what the world is **watching** and **playing**, turning live data
from two public APIs into clean, meaningful insight. It's a portfolio project that
combines a polished front-end with real data engineering — fetching, normalizing,
and visualizing trending movies and games in real time.

---

## What it does

- **Landing page** — an at-a-glance snapshot of the week: top trending title,
  combined stats, and a side-by-side *Movies vs Games* rating comparison.
- **Movies page** — trending films with searchable/filterable cards plus analytics:
  popularity-vs-rating scatter, genre mix, rating distribution, release timeline,
  and average rating by genre.
- **Games page** — trending games with the same browsing experience plus
  game-specific analytics: platform reach, most-played leaderboard, Metacritic
  *critics-vs-players* comparison, genre mix, and rating distribution.

Every chart is **computed live** from the data that's currently loaded — nothing is
hard-coded.

---

## Tech & data

| Area | Details |
|------|---------|
| **Front-end** | Vanilla HTML, CSS, and JavaScript (no framework) |
| **Charts** | [Chart.js](https://www.chartjs.org/) |
| **Data sources** | [TMDB](https://www.themoviedb.org/) (movies) · [RAWG](https://rawg.io/) (games) |
| **Hosting** | [Vercel](https://vercel.com/) (static site + serverless functions) |

### How the data flows

```
Browser  ──►  /api/tmdb  ──►  TMDB API
         ──►  /api/rawg  ──►  RAWG API
```

API keys are **never exposed to the browser**. The front-end calls lightweight
serverless proxies (`/api/tmdb`, `/api/rawg`) that attach the secret keys
server-side, pass through real status codes, and cache responses at the edge for
performance.

The app also **normalizes** data so the two sources are comparable — for example,
RAWG's 0–5 ratings are converted to TMDB's 0–10 scale before any cross-comparison.

---

## Highlights for reviewers

- 🔒 **Secure by design** — secrets stay server-side via serverless proxies.
- 📊 **Real analytics** — distributions, scatter plots, and leaderboards derived
  from live API responses, not mock data.
- 🎨 **Responsive, modern UI** — dark theme, scroll animations, skeleton loaders,
  and a layout that adapts from desktop to mobile.
- 🛟 **Graceful degradation** — clear error banners and demo-data fallbacks so the
  page never breaks if an API is unavailable.

---

## Project structure

```
├── index.html          # Landing page
├── movies.html         # Movies page + analytics
├── games.html          # Games page + analytics
├── api/
│   ├── tmdb.js         # Serverless proxy for TMDB
│   └── rawg.js         # Serverless proxy for RAWG
└── assets/
    ├── css/style.css   # Shared design system
    └── js/             # Shared core + per-page logic
```

---

## Running it

The site is static, but live data needs the two serverless functions and API keys.

1. Add environment variables (in Vercel, or a local `.env`):
   - `TMDB_TOKEN` — TMDB API read access token
   - `RAWG_KEY` — RAWG API key
2. Deploy to Vercel (or run locally with `vercel dev`).

Without keys, the games page still works using built-in demo data, and the movies
page shows a friendly "data unavailable" message.
