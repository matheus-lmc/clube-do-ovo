import { supabaseConfig } from "./config";

export type SocialProvider = "google" | "apple";

export function getAuthConfig(): { origin: string; appleEnabled: boolean } | null {
  if (!supabaseConfig.url || !supabaseConfig.publishableKey) return null;

  const value = process.env.AUTH_APP_URL;
  const url = value && URL.parse(value);
  if (!url || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    return null;
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    return null;
  }

  return { origin: url.origin, appleEnabled: process.env.AUTH_APPLE_ENABLED === "true" };
}
