import { expect, test } from "@playwright/test";

test("abre o login a partir da página inicial", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar", exact: true }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
});

test("redireciona visitantes sem sessão para o login", async ({ page }) => {
  await page.goto("/conta");

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entre no Clube do Ovo." })).toBeVisible();
});

test("mostra o erro de login quando o callback não recebe um código", async ({ page }) => {
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/entrar\?erro=login$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível entrar" }),
  ).toBeVisible();
});

test("protege as páginas de clubes e o catálogo para visitantes sem sessão", async ({ page }) => {
  for (const path of ["/clubes", "/clubes/novo", "/clubes/entrar", "/clubes/1be0a6ce-db27-4dc7-a130-ecce192f3c55"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar$/);
  }
  const catalog = await page.request.get("/api/livros?q=Torto+Arado");
  expect(catalog.status()).toBe(401);
});

test("alterna o tema pelo cabeçalho e mantém a escolha após navegar e recarregar", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "Tema escuro" });
  await expect(toggle).toBeChecked();
  await expect(toggle.locator('[data-theme-icon="dark"]')).toBeVisible();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(toggle.locator('[data-theme-icon="light"]')).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await toggle.press("Space");
  await expect(toggle).toBeChecked();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});
