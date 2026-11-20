import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3101",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      AUTH_APP_URL: "http://localhost:3100",
      AUTH_APPLE_ENABLED: "false",
    },
  },
});
