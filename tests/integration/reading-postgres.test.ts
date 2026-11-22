import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { deleteClub, saveProgress, saveReading } from "@/app/clubes/actions";

const { getPrisma, user } = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  user: { id: "29e21963-14ae-444a-a18b-4d09576bfb0b", name: "Marina" },
}));
vi.mock("@/lib/prisma", () => ({ getPrisma }));
vi.mock("@/lib/club-session", () => ({ requireClubUser: async () => user }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/book-editions", () => ({
  getBookEdition: async () => ({ book: { id: "nova", title: "Nova leitura", pages: 200 }, chapters: null }),
}));

const url = process.env.CLUBE_DISPOSABLE_POSTGRES_URL;
const id = "1be0a6ce-db27-4dc7-a130-ecce192f3c55";
const date = new Date("2026-11-01T04:00:00Z");
let db: PrismaClient;

function fields(values: Record<string, string>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

async function migrate(path: string) {
  const sql = await readFile(`prisma/migrations/${path}/migration.sql`, "utf8");
  for (const statement of sql.replace(/^--.*$/gm, "").split(";")) {
    if (statement.trim()) await db.$executeRawUnsafe(statement);
  }
}

test.runIf(Boolean(url))("migra a leitura legada, serializa progresso e troca e mantém a cascata", async () => {
  await migrate("20261120171000_reading_clubs");
  await db.$executeRaw`INSERT INTO "Club" (id, name, "leaderId", "inviteCode", "bookVolumeId", "bookTitle", "bookPages", "createdAt")
    VALUES (${id}::uuid, 'Clube', ${user.id}::uuid, 'AC1234', 'original', 'Original', 264, ${date})`;
  await db.$executeRaw`INSERT INTO "ClubMember" ("clubId", "userId", "displayName", progress)
    VALUES (${id}::uuid, ${user.id}::uuid, 'Marina', 0)`;
  await migrate("20261120215000_optional_reading");
  await migrate("20261121160000_chapter_titles");

  const club = () => db.club.findUniqueOrThrow({ where: { id }, include: { members: true } });
  expect(await club()).toMatchObject({ readingStartedAt: date, bookTitle: "Original", members: [{ progress: 0 }] });
  await expect(db.club.update({ where: { id }, data: { bookTitle: null } })).rejects.toThrow();

  const position = fields({ progress: "25", revision: "0" });
  const [progress, reading] = await Promise.all([
    saveProgress(id, {}, position),
    saveReading(id, {}, fields({ volume: "nova", revision: "0", confirm: "yes" })),
  ]);
  if (!progress.saved) expect(progress.error).toBe("A leitura mudou. Atualize a página e tente novamente.");
  expect(reading).toEqual({ saved: true });
  expect(await club()).toMatchObject({ bookTitle: "Nova leitura", readingRevision: 1, members: [{ progress: null }] });
  await expect(saveProgress(id, {}, position)).resolves.toHaveProperty("error");
  await expect(saveProgress(id, {}, fields({ progress: "30", revision: "1" }))).resolves.toEqual({ saved: true });
  await db.$executeRaw`ALTER TABLE "Club" ADD CONSTRAINT "test_reject_revision" CHECK ("readingRevision" < 2)`;
  try {
    await expect(saveReading(id, {}, fields({ volume: "nova", chapters: "10", revision: "1", confirm: "yes" })))
      .resolves.toHaveProperty("error");
    expect(await club()).toMatchObject({ readingRevision: 1, chapterTotal: null, members: [{ progress: 30 }] });
  } finally {
    await db.$executeRaw`ALTER TABLE "Club" DROP CONSTRAINT "test_reject_revision"`;
  }
  await expect(saveReading(id, {}, fields({ volume: "nova", chapters: "2", revision: "1", confirm: "yes" })))
    .resolves.toEqual({ saved: true });
  await expect(saveProgress(id, {}, fields({ progress: "1", revision: "2" }))).resolves.toEqual({ saved: true });
  await expect(saveReading(id, {}, fields({ volume: "nova", chapterTitles: "Início\nFim", revision: "2" })))
    .resolves.toEqual({ saved: true });
  expect(await club()).toMatchObject({ chapterTotal: 2, chapterTitles: ["Início", "Fim"], members: [{ progress: 1 }] });
  await expect(saveReading(id, {}, fields({ volume: "nova", chapterTitles: "Fim\nInício", revision: "3" })))
    .resolves.toHaveProperty("error");
  expect(await club()).toMatchObject({ chapterTitles: ["Início", "Fim"], members: [{ progress: 1 }] });

  await expect(deleteClub(id, {}, fields({ confirm: "yes" }))).rejects.toThrow("NEXT_REDIRECT");
  expect(await db.clubMember.count({ where: { clubId: id } })).toBe(0);
});

beforeAll(() => {
  if (!url) return;
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  getPrisma.mockReturnValue(db);
});

afterAll(async () => {
  await db?.$disconnect();
});
