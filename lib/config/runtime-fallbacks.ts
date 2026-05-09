// Runtime fallbacks intentionally do not contain real keys.
// Keep API keys in `.env.local` and Vercel Environment Variables only, so the
// app never silently falls back to a shared demo key and burns its daily quota.

export const RUNTIME_FALLBACKS = {
  googleMapsApiKey: "",
  googleSolarApiKey: "",
} as const;
