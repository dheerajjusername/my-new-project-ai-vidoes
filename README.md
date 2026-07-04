# Ad Champ — AI Video Ads Platform

Create an AI character once, reuse it across unlimited AI-generated video ads.

## Tech stack

- **Next.js** — frontend + backend (App Router)
- **PostgreSQL + Prisma** — database
- **Veo 3.1 Lite** (via fal.ai) — video generation
- **Nano Banana 2** (via fal.ai) — character reference images
- **ElevenLabs TTS** (via fal.ai) — voiceover
- **Claude API** — turns a user brief into a scene-by-scene shot list
- **FFmpeg** — stitches shots into a final video

Video, image and voice models are all accessed through a single fal.ai API key.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env` and fill in your API keys before running anything
that talks to fal.ai, Claude, or the database.

## Deploying to Vercel

1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new).
2. In the project settings, add these Environment Variables:
   - `DATABASE_URL` — Neon Postgres connection string
   - `FAL_KEY` — fal.ai API key
   - `ANTHROPIC_API_KEY` — Claude API key
3. Deploy. FFmpeg ships with the app via `@ffmpeg-installer/ffmpeg`, and the
   heavy API routes set `maxDuration = 300` (requires Fluid Compute, which is
   on by default for new Vercel projects).
