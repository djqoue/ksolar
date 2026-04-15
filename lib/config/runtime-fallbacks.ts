// Temporary deployment fallbacks for environments where Vercel env vars
// were not configured correctly yet. Environment variables still take priority.
// Move these keys back into platform-managed secrets after the deployment is stable.

export const RUNTIME_FALLBACKS = {
  googleMapsApiKey: "AIzaSyC7_qNO84rs7H3kYmQTR70AvUBQAPpXDo8",
  googleSolarApiKey: "AIzaSyBB_qZ6ZcGSyztbrDG0wh_JWSSSKUgjVM8",
} as const;
