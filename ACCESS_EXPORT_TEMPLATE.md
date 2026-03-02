# ORA Studio — Access Export Template (Fill before sending)

> Purpose: centralize runtime accesses for Claude without searching across dashboards.

## Vercel
- Team: `romainortel-1473s-projects`
- Project: `ora-studio`
- Production URL: `https://ora-studio.vercel.app`
- CLI login owner: `<to-fill>`
- Deploy command:
  - `npx vercel --prod --yes`
- Alias command:
  - `npx vercel alias set <deployment-url> ora-studio.vercel.app`

## Supabase
- Project URL: `<SUPABASE_URL>`
- Anon key: `<SUPABASE_ANON_KEY>`
- Service role key: `<SUPABASE_SERVICE_ROLE_KEY>`
- Google OAuth enabled: `<yes/no>`
- Redirect URL(s):
  - `https://ora-studio.vercel.app`
  - `https://ora-studio.vercel.app/login`

## Redis / KV (REST)
- REST URL: `<UPSTASH_REDIS_REST_URL or KV_REST_API_URL>`
- REST token: `<UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN>`

## AI providers
- FAL_API_KEY: `<to-fill>`
- REPLICATE_API_KEY or REPLICATE_API_TOKEN: `<to-fill>`
- OPENAI_API_KEY: `<to-fill>`
- MISTRAL_API_KEY or MISTRAL_API: `<to-fill>`

## Model env configuration
- REPLICATE_IMAGE_MODEL: `black-forest-labs/flux-schnell`
- REPLICATE_VIDEO_MODEL: `<owner/model slug>`
- FAL_IMAGE_MODEL: `fal-ai/flux/v1.1/pro`
- FAL_VIDEO_MODEL: `fal-ai/minimax-video/hailuo-02`
- Optional:
  - FAL_VIDEO_MODEL_KLING: `fal-ai/kling-video/o3/pro/text-to-video`
  - FAL_VIDEO_MODEL_RUNWAY: `<to-fill>`
  - FAL_VIDEO_MODEL_VEO: `<to-fill>`

## Admin
- ADMIN_EMAILS: `<comma-separated admin emails>`

## Sanity checks
- Public providers diagnostic:
  - `GET https://ora-studio.vercel.app/api/dashboard?section=providers`
- Hub generate:
  - `POST https://ora-studio.vercel.app/api/hub-generate` (with bearer token)
- Studio generate:
  - `POST https://ora-studio.vercel.app/api/generate-campaign` (with bearer token)
