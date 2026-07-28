# Wanderfound

Wanderfound turns wherever you are into a walkable, AI-generated mystery.

## Deployment

- **Live:** https://wanderfound.vercel.app
- **Source:** private GitHub repository `rishabhjha1993/wanderfound`
- **Workflow:** pushes to `main` deploy to production; other branches receive
  Vercel preview deployments.

## Local development

Requirements:

- Node.js 22.14 or newer
- npm 10 or newer

Install and start the app:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run check
npm run test:smoke
```

Copy `.env.example` to `.env.local` only when a milestone requires provider
credentials. Never commit real credentials.

## Current scope

Milestone 0 provides the deployable mobile shell, design foundations, automated
checks, health diagnostics, PWA metadata, and provider/privacy/safety boundaries.
Location, Google Maps, accounts, trail generation, verification, and payments
belong to later milestones in `plan.md`.
