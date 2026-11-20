import { afterEach, beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("AUTH_APP_URL", "https://clube.example");
  vi.stubEnv("AUTH_APPLE_ENABLED", undefined);
});

afterEach(() => vi.unstubAllEnvs());

test("desabilita login sem a chave do Supabase", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
  const { getAuthConfig } = await import("@/lib/supabase/auth-config");
  expect(getAuthConfig()).toBeNull();
});

test.each([
  undefined,
  "sem-url",
  "https://user:pass@clube.example",
  "https://clube.example/entrar",
  "https://clube.example/?x=1",
  "https://clube.example/#conta",
  "http://clube.example",
])("rejeita origem de autenticação inválida (%s)", async (origin) => {
  vi.stubEnv("AUTH_APP_URL", origin);
  const { getAuthConfig } = await import("@/lib/supabase/auth-config");
  expect(getAuthConfig()).toBeNull();
});

test("permite HTTP em localhost e ativa Apple quando configurado", async () => {
  vi.stubEnv("AUTH_APP_URL", "http://localhost:3000/");
  vi.stubEnv("AUTH_APPLE_ENABLED", "true");
  const { getAuthConfig } = await import("@/lib/supabase/auth-config");
  expect(getAuthConfig()).toEqual({ origin: "http://localhost:3000", appleEnabled: true });
});

test("usa a origem HTTPS com Apple desativado por padrão", async () => {
  const { getAuthConfig } = await import("@/lib/supabase/auth-config");
  expect(getAuthConfig()).toEqual({ origin: "https://clube.example", appleEnabled: false });
});
