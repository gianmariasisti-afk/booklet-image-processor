# Booklet Image Processor

AI-powered tool that extracts, crops, and describes images from scanned booklet pages.

## What it does

1. **Upload** a scanned booklet page (JPG, PNG, WebP)
2. **Detect** all images, figures, diagrams, and illustrations using Claude AI vision
3. **Crop** each detected region automatically
4. **Describe** each cropped image with AI-generated context-aware descriptions
5. **Browse** results in a gallery and download individual images

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + Radix UI |
| API | Express + tRPC (end-to-end type safety) |
| AI | Anthropic Claude (claude-haiku-4-5) for vision & descriptions |
| Database | SQLite via Drizzle ORM |
| Storage | Local filesystem (`./uploads/`) |
| Image processing | Sharp |

## Setup

### Prerequisites
- Node.js 20+ 
- pnpm (`npm install -g pnpm`)
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Install

```bash
git clone <repo-url>
cd booklet-image-processor
pnpm install
```

### Configure

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
JWT_SECRET=change-this-in-production
```

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — click **Sign In** to auto-login (dev mode).

### Build for production

```bash
pnpm build
pnpm start
```

## Project structure

```
├── client/          # React frontend
│   └── src/
│       ├── pages/   # Upload, Processing, Results, History, Home
│       └── _core/   # tRPC client, auth hook
├── server/          # Express backend
│   ├── _core/       # tRPC router, auth SDK, env, LLM client
│   ├── db.ts        # SQLite queries via Drizzle
│   ├── storage.ts   # Local file storage
│   ├── imageProcessing.ts  # Claude vision + Sharp cropping
│   └── processingRouter.ts # tRPC API routes
├── drizzle/         # Database schema
└── shared/          # Shared types/constants
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `JWT_SECRET` | ✅ | Secret for signing session cookies |
| `DATABASE_URL` | — | Path to SQLite file (default: `./data/app.db`) |
| `UPLOADS_DIR` | — | Directory for uploaded files (default: `./uploads`) |
