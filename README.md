# AdCharacter — AI Video Ads Platform

Create an AI character once, reuse it across unlimited AI-generated video ads.

## Tech stack

- **Next.js** — frontend + backend (App Router)
- **PostgreSQL + Prisma** — database
- **Veo 3.1 Lite** (Gemini API) — video generation
- **Nano Banana 2** (`gemini-3.1-flash-image`) — character reference images
- **Claude API** — turns a user brief into a scene-by-scene shot list
- **ElevenLabs** — voiceover
- **FFmpeg** — stitches shots into a final video

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env` and fill in your API keys before running anything
that talks to Gemini, Claude, ElevenLabs, or the database.
