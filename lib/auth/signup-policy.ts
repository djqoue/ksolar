export const PUBLIC_SIGNUP_ENV_KEY = "KSOLAR_ENABLE_PUBLIC_SIGNUP";

export function isPublicSignupEnabled(value = process.env[PUBLIC_SIGNUP_ENV_KEY]) {
  return value?.trim().toLowerCase() === "true";
}
