# Dynamic Engine — Generative AI Dashboard & Widget Builder

An adaptive workspace that renders real-time, customizable UI widgets from
structured JSON returned by a mock LLM backend.

## Repository structure

```
.
├── client/   React + TypeScript frontend (Vite, Tailwind, shadcn/ui)
└── server/   Express + TypeScript mock LLM API
```

This is an **npm workspaces** monorepo — one install, one dev command, no
`cd`-ing into subfolders required.

## Requirements

- Node.js 20+
- npm 10+

## Setup

From the repository root:

```bash
npm install
```

This installs dependencies for both `client/` and `server/` in one pass.

## Running locally

```bash
npm run dev
```

Runs both apps concurrently:

- **Client** — http://localhost:5173
- **Server** — http://localhost:4000

The client's dev server proxies any `/api/*` request to the backend
(`http://localhost:4000`), so the frontend never needs to know the backend's
port or deal with CORS during development.

## Other root scripts

```bash
npm run build   # production build for both client and server
npm run lint    # lint both workspaces
```

Each workspace also has its own scripts, runnable individually with
`npm run <script> -w client` / `-w server` if you ever need to work on just
one side.

## Architecture

_To be filled in as the Dynamic Component Registry, widget system, and
optimistic-update strategy are implemented — see the evaluation criteria this
project is built against for what to expect here._
