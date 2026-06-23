# MINT Frontend

React + TypeScript + Vite UI for MINT (design based on `design_sample`).

## Features

| Route | Description |
|-------|-------------|
| `/`, `/trusted`, `/discovery` | Dashboard & news boards |
| `/posts/:id`, `/reports` | Post detail & daily reports |
| `/inquiries` | User sign-up / approval inquiries |
| `/sources`, `/slack` | Admin: feed sources & Slack (admin only) |
| `/admin/users`, `/admin/inquiries` | Admin: user & inquiry management |

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
