import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect, test, type BrowserContext } from "@playwright/test";

const reader = { id: "29e21963-14ae-444a-a18b-4d09576bfb0b", user_metadata: { name: "Marina" } };
const member = { id: "3d22a67e-fa37-40ca-b01b-fa4b3d30101c", user_metadata: { name: "Miguel" } };
const sessions = new Map<string, typeof reader>();
const auth = createServer((request, response) => {
  if (request.url !== "/auth/v1/user") {
    response.writeHead(404).end();
    return;
  }
  const user = sessions.get(request.headers.authorization ?? "");
  response.writeHead(user ? 200 : 401, { "Content-Type": "application/json" })
    .end(JSON.stringify(user ?? { message: "Sessão inválida" }));
});

test.beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    auth.once("error", reject);
    auth.listen(3101, "127.0.0.1", resolve);
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => auth.close(() => resolve()));
});

async function signIn(context: BrowserContext, user = reader) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1_000) + 3_600;
  const access_token = `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp })}.dGVzdA`;
  sessions.set(`Bearer ${access_token}`, user);
  await context.addCookies([{
    name: "sb-127-auth-token", url: "http://127.0.0.1:3100",
    value: `base64-${encode({ access_token, refresh_token: "test", expires_at: exp, user })}`,
  }]);
}

test("mostra skeleton durante a busca e permite escolher um resultado pelo teclado", async ({ page, context }) => {
  await signIn(context);
  const edition = { id: "book-id", title: "Torto Arado", authors: "Itamar Vieira Junior", publisher: "Todavia",
    year: "2019", isbn: "9786580309313", cover: null, pages: 264 };

  let releaseSearch!: () => void;
  let releaseDetails!: () => void;
  const search = new Promise<void>((resolve) => { releaseSearch = resolve; });
  const details = new Promise<void>((resolve) => { releaseDetails = resolve; });
  await page.route("**/api/livros?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("volume")) {
      await details;
      await route.fulfill({ json: { book: edition, chapters: 2, titles: ["Início", "Fim"] } });
    } else {
      await search;
      await route.fulfill({ json: [edition] });
    }
  });

  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/clubes/novo");
    const input = page.getByRole("combobox", { name: "Livro do mês" });
    await input.fill("Torto");
    await expect(page.getByRole("status").filter({ hasText: "Buscando edições" })).toBeAttached();
    await expect(page.locator("[data-skeleton-row]").first()).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("option")).toHaveCount(0);
    releaseSearch();

    await expect(page.getByRole("option", { name: /Torto Arado/ })).toBeVisible();
    await expect(page.locator("[data-skeleton-row]")).toHaveCount(0);
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Consultando o sumário" })).toBeAttached();
    releaseDetails();
    await expect(page.getByRole("status").filter({ hasText: "2 capítulos encontrados automaticamente" })).toBeVisible();
    await expect(page.getByLabel("Total de capítulos")).toHaveCount(0);
    await expect(page.locator("[data-skeleton-row]")).toHaveCount(0);
  } finally {
    releaseSearch();
    releaseDetails();
  }
});

const postgresUrl = process.env.CLUBE_DISPOSABLE_POSTGRES_URL;

test("líder renomeia, remove a leitura e confirma a exclusão do clube", async ({ page, context, browser }) => {
  test.skip(!postgresUrl, "Requer PostgreSQL descartável com as migrações aplicadas.");
  const db = new pg.Client({ connectionString: postgresUrl });
  await db.connect();
  const id = randomUUID();
  const invite = id.slice(0, 6).toUpperCase();
  const memberContext = await browser.newContext();
  try {
    await db.query(
      `INSERT INTO "Club" (id, name, "leaderId", "inviteCode", "bookVolumeId", "bookTitle", "bookPages", "readingStartedAt")
      VALUES ($1, 'Entre Páginas', $2, $3, 'livro-1', 'Livro de teste', 100, CURRENT_TIMESTAMP)`,
      [id, reader.id, invite],
    );
    await db.query(
      `INSERT INTO "ClubMember" ("clubId", "userId", "displayName") VALUES ($1, $2, 'Marina'), ($1, $3, 'Miguel')`,
      [id, reader.id, member.id],
    );
    await signIn(context);
    await signIn(memberContext, member);
    const memberPage = await memberContext.newPage();
    await memberPage.goto("/");
    const reading = memberPage.getByRole("link", { name: "Livro de teste" });
    const preview = memberPage.getByText("Progresso ainda não registrado");
    const footer = memberPage.getByRole("contentinfo");
    await expect(reading).toBeVisible();
    const footerBefore = await footer.boundingBox();
    await expect(preview).toBeHidden();
    await reading.hover();
    await expect(preview).toBeVisible();
    const cover = reading.locator(":scope > span");
    await expect(cover).not.toHaveCSS("transform", "none");
    const coverBox = await cover.boundingBox();
    const previewBox = await preview.boundingBox();
    expect(previewBox!.y).toBeGreaterThan(coverBox!.y + coverBox!.height / 2);
    expect((await footer.boundingBox())!.y).toBe(footerBefore!.y);
    await preview.hover();
    await expect(preview).toBeVisible();
    await memberPage.mouse.move(0, 0);
    await expect(preview).toBeHidden();
    await reading.focus();
    await expect(preview).toBeVisible();
    await reading.press("Escape");
    await expect(preview).toBeHidden();
    await reading.press("Enter");
    await expect(memberPage).toHaveURL(new RegExp(`/clubes/${id}$`));
    await expect(memberPage.getByRole("heading", { name: "Livro de teste" })).toBeVisible();
    await expect(memberPage.getByText("Editar clube", { exact: true })).toHaveCount(0);
    await memberPage.getByRole("spinbutton", { name: "Página atual" }).fill("25");
    await memberPage.getByRole("button", { name: "Salvar progresso" }).click();
    await expect(memberPage.getByText("Progresso atualizado.")).toBeVisible();
    await memberPage.setViewportSize({ width: 390, height: 844 });
    await memberPage.goto("/");
    await expect(memberPage.getByText("25 de 100 páginas")).toBeHidden();
    await reading.click();
    await expect(memberPage).toHaveURL(new RegExp(`/clubes/${id}$`));

    await page.goto(`/clubes/${id}`);
    const settings = page.getByRole("button", { name: "Editar clube" });
    await expect(settings).toBeVisible();
    await settings.click();
    await expect(page.getByRole("dialog", { name: "Configurações do clube" })).toBeVisible();
    await expect(page.getByLabel("Nome do clube")).toBeFocused();
    await page.getByLabel("Nome do clube").fill("Clube renomeado");
    await page.getByRole("button", { name: "Salvar nome" }).click();
    await expect(page.getByRole("heading", { name: "Clube renomeado" })).toBeVisible();

    const editReading = page.getByRole("button", { name: "Editar livro do mês" });
    await page.setViewportSize({ width: 390, height: 844 });
    await editReading.click();
    const readingDialog = page.getByRole("dialog", { name: "Editar livro do mês" });
    await expect(readingDialog).toBeVisible();
    expect(await readingDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(editReading).toBeFocused();
    await db.query(
      `UPDATE "Club" SET "chapterTotal" = 2, "chapterTitles" = ARRAY['Início', 'Fim'],
        "chapterSource" = 'open-library', "readingRevision" = "readingRevision" + 1 WHERE id = $1`,
      [id],
    );
    await db.query(`UPDATE "ClubMember" SET progress = NULL WHERE "clubId" = $1`, [id]);
    await page.reload();
    const slider = page.getByRole("slider", { name: /Último capítulo concluído/ });
    await expect(slider).toBeVisible();
    await expect(page.getByText("Ainda não comecei", { exact: true })).toBeVisible();
    await slider.press("ArrowRight");
    await expect(page.getByText("Início", { exact: true })).toBeVisible();
    await slider.press("End");
    await expect(page.getByText("Fim", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Salvar progresso" }).click();
    await expect(page.getByText("Progresso atualizado.")).toBeVisible();
    await editReading.click();
    await page.getByRole("button", { name: "Remover livro", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar: remover livro" }).click();
    await expect(page.getByText("Sem livro do mês")).toBeVisible();
    await expect(page.getByText("Adicionar livro")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Progresso de leitura" })).toHaveCount(0);

    await page.getByRole("button", { name: "Editar clube" }).click();
    await page.getByRole("button", { name: "Excluir clube", exact: true }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog", { name: "Configurações do clube" })).toBeVisible();
    await expect(page.getByLabel("Nome do clube")).toHaveValue("Clube renomeado");
    await expect(page.getByRole("button", { name: "Excluir clube", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Excluir clube", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar: excluir clube" }).click();
    await expect(page).toHaveURL(/\/clubes$/);
    await expect(page.getByRole("link", { name: /Clube renomeado/ })).toHaveCount(0);
    await memberPage.goto(`/clubes/${id}`);
    await expect(memberPage.getByRole("heading", { name: "Clube renomeado" })).toHaveCount(0);
    await memberPage.goto("/clubes/entrar");
    await memberPage.getByLabel("Código do clube").fill(invite);
    await memberPage.getByRole("button", { name: "Buscar clube" }).click();
    await expect(memberPage.getByRole("alert").filter({ hasText: "Clube não encontrado" })).toBeVisible();
  } finally {
    await memberContext.close();
    await db.query('DELETE FROM "Club" WHERE id = $1', [id]);
    await db.end();
  }
});

test("descarta busca anterior e trata vazio, falha e fechamento por Escape", async ({ page, context }) => {
  await signIn(context);
  let releaseOld!: () => void;
  const old = new Promise<void>((resolve) => { releaseOld = resolve; });
  await page.route("**/api/livros?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "Antigo") {
      await old;
      await route.fulfill({ json: [{ id: "old", title: "Resultado antigo" }] });
      return;
    }
    if (query === "Falha") {
      await route.fulfill({ status: 502 });
      return;
    }
    await route.fulfill({ json: [] });
  });

  try {
    await page.goto("/clubes/novo");
    const input = page.getByRole("combobox", { name: "Livro do mês" });
    const oldRequested = page.waitForRequest(/\/api\/livros\?q=Antigo$/);
    await input.fill("Antigo");
    await oldRequested;
    await input.fill("Vazio");
    await expect(page.getByText("Nenhuma edição encontrada.")).toBeVisible();
    releaseOld();
    await expect(page.getByRole("option", { name: "Resultado antigo" })).toHaveCount(0);
    await input.fill("Falha");
    await expect(page.getByText(/A busca está indisponível/)).toBeVisible();
    await input.press("Escape");
    await expect(page.getByText(/A busca está indisponível/)).toHaveCount(0);
    await input.fill("Outro");
    await expect(page.getByText("Nenhuma edição encontrada.")).toBeVisible();
    await expect(page.locator("[data-skeleton-row]")).toHaveCount(0);
  } finally {
    releaseOld();
  }
});
