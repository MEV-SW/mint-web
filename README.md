# MINT Frontend

React + TypeScript + Vite UI for MINT (design based on `design_sample`).

## Features

| Route | Description |
|-------|-------------|
| `/` | MINT Daily + 나만의 1면 (personalization on) |
| `/news`, `/topics/:keywordId` | News filters & keyword topic hubs |
| `/settings` | Interest categories/keywords + org featured topics |
| `/posts/:id`, `/reports`, `/personal-reports/:id` | Post & report detail (TTS listen) |
| `/inquiries` | User sign-up / approval inquiries |
| `/admin/*` | Review queue, accounts, sources, webhooks |

Auth: JWT via backend `/api/v1/auth`. Admin routes gated by `AdminRoute`.

## Quick start

```bash
cd MINT_Frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 — login with seed credentials from backend README.

## Build

`build/` is gitignored — run locally or in CI/deploy only.

```bash
npm run build
```
