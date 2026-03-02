# ORA Studio — Handoff Pack for Claude

## 1) Project purpose
- ORA is an AI aggregator + Studio platform.
- Hub/Chat mode: fast generation (text/image/video/code) with model selection and Arena comparison.
- Studio mode: campaign workflow with Brand Vault constraints and compliance checks.

## 2) Stack
- Frontend: Vite + React + TypeScript (`src/`)
- Backend (serverless): Vercel API routes (`api/`)
- Auth: Supabase Auth (JWT bearer validation in API routes)
- Storage/session/profile: Redis REST (Upstash/Vercel KV compatible)
- Providers: OpenAI, Mistral, Fal, Replicate

## 3) Main folders
- `src/`: UI pages, components, app logic
- `api/`: Vercel serverless endpoints (generation, dashboard, auth, admin, vault)
- `server/`: shared server helpers (`auth.js`, `redis.js`)
- `assets/`: static assets
- `guidelines/`: product/design docs and references
- `vercel.json`: Vercel routing/build config

## 4) Key runtime endpoints
- `POST /api/hub-generate`: Hub generation (single/arena)
- `POST /api/generate-campaign`: Studio campaign generation
- `GET /api/dashboard?section=providers`: provider diagnostics (public mode if no bearer token)
- `POST /api/auth-sync`: profile sync/create on login
- `GET /api/admin-store`: admin data (auth required + admin checks)

## 5) Environment variables expected
Do not hardcode values in code. Configure in Vercel/Supabase secrets.

### Core auth
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY` for limited flows)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ADMIN_EMAILS`

### Redis (REST mode)
- Preferred:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Supported alternates:
  - `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_REDIS_URL`, `KV_REST_REDIS_TOKEN`
  - `REDIS_REST_URL`, `REDIS_REST_TOKEN`

### AI providers
- `FAL_API_KEY` (or `FAL_KEY`)
- `REPLICATE_API_KEY` (or `REPLICATE_API_TOKEN`)
- `OPENAI_API_KEY`
- `MISTRAL_API_KEY` (or `MISTRAL_API`)

### Model config
- `FAL_IMAGE_MODEL`
- `FAL_VIDEO_MODEL`
- `FAL_VIDEO_MODEL_KLING`
- `FAL_VIDEO_MODEL_RUNWAY`
- `FAL_VIDEO_MODEL_VEO`
- `REPLICATE_IMAGE_MODEL`
- `REPLICATE_VIDEO_MODEL`
- `REPLICATE_VIDEO_MODEL_KLING`
- `REPLICATE_VIDEO_MODEL_RUNWAY`
- `REPLICATE_VIDEO_MODEL_VEO`

### Optional tuning
- `REPLICATE_WAIT_SECONDS`
- `FAL_IMAGE_INPUT_JSON`
- `FAL_VIDEO_INPUT_JSON`
- `REPLICATE_VIDEO_INPUT_JSON`
- `ASSET_STRICT_THRESHOLD`
- `BRAND_LEAK_MAX_RATIO`
- `BRAND_LEAK_MAX_WORD_WINDOW`
- `CREATION_ANCHOR_MIN_HITS`

## 6) CLI and deploy workflow
```bash
# local
npm install
npm run dev

# build check
npm run build

# deploy prod
npx vercel --prod --yes

# set production alias
npx vercel alias set <deployment-url> ora-studio.vercel.app
```

## 7) Access handoff checklist (manual)
- Vercel Project: `ora-studio`
- Domain alias: `ora-studio.vercel.app`
- Supabase project URL + service role key
- Redis REST URL + token
- Provider keys (Fal/Replicate/OpenAI/Mistral)
- Google OAuth enabled in Supabase Auth (provider + redirect URLs)

## 8) Security note
- This pack intentionally does **not** include raw secret values.
- Secrets must stay in Vercel and/or Supabase secret stores.

## 9) Design system and product references
- Keep current UI tokens and layout conventions from existing `src/` styles/components.
- Product/brand references are in:
  - `guidelines/`
  - `README.md`
  - `ATTRIBUTIONS.md`

## 10) Current known behavior focus
- Media generation is routed with provider fallbacks (Fal + Replicate, plus OpenAI for DALL-E path).
- Provider diagnostics available via dashboard endpoint to quickly validate key/model wiring.
