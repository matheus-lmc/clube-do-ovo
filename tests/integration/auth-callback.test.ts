import { beforeEach, expect, test, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const exchangeCode = vi.fn();

beforeEach(() => {
  exchangeCode.mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(createClient).mockImplementation(async () => ({
    auth: { exchangeCodeForSession: exchangeCode },
  }) as unknown as Awaited<ReturnType<typeof createClient>>);
});

test("troca o código pela sessão e redireciona para a conta", async () => {
  exchangeCode.mockResolvedValue({ data: { session: { access_token: "test-token" } }, error: null });
  const response = await GET(new Request("https://clube.example/auth/callback?code=abc"));

  expect(exchangeCode).toHaveBeenCalledWith("abc");
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/conta");
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test.each(["", "?code=abc&error=denied", "?code=abc&error_code=denied"])(
  "redireciona ao login sem trocar um código ausente ou rejeitado (%s)",
  async (query) => {
    const response = await GET(new Request(`https://clube.example/auth/callback${query}`));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/entrar?erro=login");
    expect(createClient).not.toHaveBeenCalled();
  },
);

test("redireciona ao login quando a troca não cria uma sessão", async () => {
  exchangeCode.mockResolvedValue({ data: { session: null }, error: null });
  const response = await GET(new Request("https://clube.example/auth/callback?code=abc"));

  expect(response.headers.get("location")).toBe("/entrar?erro=login");
});

test("redireciona ao login quando o Supabase falha", async () => {
  exchangeCode.mockRejectedValue(new Error("offline"));
  const response = await GET(new Request("https://clube.example/auth/callback?code=abc"));

  expect(response.headers.get("location")).toBe("/entrar?erro=login");
});
