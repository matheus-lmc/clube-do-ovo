import { cookies, headers } from "next/headers";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { signOut, startSocialSignIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const signInWithOAuth = vi.fn();
const endSession = vi.fn();
const setCookie = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(headers).mockResolvedValue(new Headers({ origin: "https://clube.example" }));
  vi.mocked(cookies).mockResolvedValue({ set: setCookie } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(createClient).mockImplementation(async () => ({
    auth: { signInWithOAuth, signOut: endSession },
  }) as unknown as Awaited<ReturnType<typeof createClient>>);
  vi.stubEnv("AUTH_APPLE_ENABLED", "false");
});

afterEach(() => vi.unstubAllEnvs());

function providerForm(provider: string) {
  const form = new FormData();
  form.set("provider", provider);
  return form;
}

test.each(["apple", "unrecognized"])("recusa o provedor %s quando indisponível", async (provider) => {
  await expect(startSocialSignIn(providerForm(provider))).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;/entrar?erro=login;307;",
  });
  expect(createClient).not.toHaveBeenCalled();
});

test("recusa iniciar o login de uma origem diferente", async () => {
  vi.mocked(headers).mockResolvedValue(new Headers({ origin: "https://outro.example" }));

  await expect(startSocialSignIn(providerForm("google"))).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;/entrar?erro=login;307;",
  });
  expect(createClient).not.toHaveBeenCalled();
});

test("inicia o login com a URL de callback do aplicativo", async () => {
  signInWithOAuth.mockResolvedValue({ data: { url: "https://example.supabase.co/authorize" }, error: null });

  await expect(startSocialSignIn(providerForm("google"))).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;https://example.supabase.co/authorize;307;",
  });
  expect(signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: "https://clube.example/auth/callback" },
  });
});

test("volta ao login quando o provedor falha", async () => {
  signInWithOAuth.mockRejectedValue(new Error("offline"));

  await expect(startSocialSignIn(providerForm("google"))).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;/entrar?erro=login;307;",
  });
});

test("preserva o destino escolhido sem mudar a URL de callback do OAuth", async () => {
  signInWithOAuth.mockResolvedValue({ data: { url: "https://example.supabase.co/authorize" }, error: null });
  const form = providerForm("google");
  form.set("acao", "criar-clube");

  await expect(startSocialSignIn(form)).rejects.toMatchObject({
    digest: "NEXT_REDIRECT;replace;https://example.supabase.co/authorize;307;",
  });
  expect(setCookie).toHaveBeenCalledWith("club-login-intent", "criar-clube", expect.objectContaining({
    httpOnly: true, sameSite: "lax", secure: true, path: "/auth/callback",
  }));
  expect(signInWithOAuth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: "https://clube.example/auth/callback" },
  });
});

test("encerra apenas a sessão deste navegador", async () => {
  endSession.mockResolvedValue({ error: null });

  await expect(signOut()).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/entrar;307;" });
  expect(endSession).toHaveBeenCalledWith({ scope: "local" });
});

test("mantém o usuário na conta com erro se não puder encerrar a sessão", async () => {
  endSession.mockResolvedValue({ error: new Error("offline") });

  await expect(signOut()).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/conta?erro=saida;307;" });
});
