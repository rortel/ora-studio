#!/usr/bin/env bash
# ============================================================
# ORA Studio — Vercel environment setup script
# Run from your LOCAL machine (not this CI environment)
# Usage: bash scripts/setup-vercel-env.sh
# ============================================================
set -euo pipefail

VERCEL_TOKEN="${VERCEL_TOKEN:-vcp_0tarRC9oaCzlmIkU1HTbzMjW2W08zoXpt1eF0zdUF9Lp1hJofJ09Iq2v}"
PROJECT_NAME="ora-studio"

# ── 1. SUPABASE (REQUIRED — https://supabase.com/dashboard) ──────────────
VITE_SUPABASE_URL=""                  # ex: https://abcxyz.supabase.co
VITE_SUPABASE_ANON_KEY=""             # Settings > API > anon public
SUPABASE_SERVICE_ROLE_KEY=""          # Settings > API > service_role secret

# ── 2. MISTRAL  (REQUIRED — https://console.mistral.ai) ──────────────────
MISTRAL_API_KEY=""

# ── 3. FAL.AI   (REQUIRED for images/videos — https://fal.ai/dashboard) ──
FAL_API_KEY=""

# ── 4. UPSTASH REDIS  (REQUIRED — https://console.upstash.com) ───────────
UPSTASH_REDIS_REST_URL=""             # ex: https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=""

# ── 5. ADMIN EMAIL ───────────────────────────────────────────────────────
ADMIN_EMAILS=""                       # ex: admin@example.com

# ── 6. OPTIONAL PROVIDERS ────────────────────────────────────────────────
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_API_KEY=""
REPLICATE_API_TOKEN=""

# ─────────────────────────────────────────────────────────────────────────
echo "🔗 Linking Vercel project..."
npx vercel@latest link \
  --yes \
  --project "$PROJECT_NAME" \
  --token "$VERCEL_TOKEN"

echo ""
echo "📦 Adding environment variables to production..."

add_env() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "  ⏭  Skipping $key (empty)"
    return
  fi
  printf '%s' "$value" | npx vercel@latest env add "$key" production \
    --token "$VERCEL_TOKEN" --force 2>/dev/null || \
  echo "$value" | npx vercel@latest env add "$key" production \
    --token "$VERCEL_TOKEN" --force
  echo "  ✅ $key"
}

# Supabase — VITE_ vars are embedded at build time
add_env "VITE_SUPABASE_URL"        "$VITE_SUPABASE_URL"
add_env "VITE_SUPABASE_ANON_KEY"   "$VITE_SUPABASE_ANON_KEY"
# Server-side mirrors
add_env "SUPABASE_URL"             "$VITE_SUPABASE_URL"
add_env "SUPABASE_ANON_KEY"        "$VITE_SUPABASE_ANON_KEY"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"

# AI providers
add_env "MISTRAL_API_KEY"          "$MISTRAL_API_KEY"
add_env "OPENAI_API_KEY"           "$OPENAI_API_KEY"
add_env "ANTHROPIC_API_KEY"        "$ANTHROPIC_API_KEY"
add_env "GOOGLE_API_KEY"           "$GOOGLE_API_KEY"

# Media generation
add_env "FAL_API_KEY"              "$FAL_API_KEY"
add_env "REPLICATE_API_TOKEN"      "$REPLICATE_API_TOKEN"

# Redis
add_env "UPSTASH_REDIS_REST_URL"   "$UPSTASH_REDIS_REST_URL"
add_env "UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_REDIS_REST_TOKEN"

# Admin
add_env "ADMIN_EMAILS"             "$ADMIN_EMAILS"

echo ""
echo "🚀 Deploying to production..."
npx vercel@latest --prod --yes --token "$VERCEL_TOKEN"

echo ""
echo "✅ Done! ora-studio.vercel.app should be live in ~2 minutes."
echo ""
echo "⚠️  SUPABASE — don't forget to configure in your Supabase dashboard:"
echo "   Authentication > URL Configuration:"
echo "   Site URL      : https://ora-studio.vercel.app"
echo "   Redirect URLs : https://ora-studio.vercel.app/**"
echo ""
echo "⚠️  GOOGLE OAUTH — in Supabase dashboard:"
echo "   Authentication > Providers > Google > Enable"
echo "   Add your Google Client ID + Secret"
echo "   Authorized redirect URI in Google Console:"
echo "   https://[YOUR-SUPABASE-PROJECT].supabase.co/auth/v1/callback"
