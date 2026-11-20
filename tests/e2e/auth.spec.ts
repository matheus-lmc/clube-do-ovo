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
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("mostra o erro de login quando o callback não recebe um código", async ({ page }) => {
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/entrar\?erro=login$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível entrar" }),
  ).toBeVisible();
});
