import { beforeEach, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createClub, findClubInvite, joinClub, saveProgress } from "@/app/clubes/actions";
import { requireClubUser } from "@/lib/club-session";
import { getBookEdition } from "@/lib/book-editions";

const db = vi.hoisted(() => ({
  club: { create: vi.fn(), findUnique: vi.fn() },
  clubMember: { createMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/club-session", () => ({ requireClubUser: vi.fn() }));
vi.mock("@/lib/book-editions", () => ({ getBookEdition: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => db }));

const reader = { id: "29e21963-14ae-444a-a18b-4d09576bfb0b", name: "Marina Costa" };
const clubId = "1be0a6ce-db27-4dc7-a130-ecce192f3c55";
const edition = { id: "book-id", title: "Torto Arado", authors: "Itamar Vieira Junior", publisher: "Todavia", year: "2019",
  isbn: "9786580309313", cover: null, pages: 264 };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireClubUser).mockResolvedValue(reader);
  vi.mocked(getBookEdition).mockResolvedValue({ book: edition, chapters: null });
});

test("cria clube e associação do líder na mesma operação, com dados canônicos da edição", async () => {
  await expect(createClub({}, form({
    requestId: clubId, name: " Entre Páginas ", volume: edition.id, chapters: "12", pages: "3",
  }))).rejects.toThrow("NEXT_REDIRECT");

  expect(db.club.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    id: clubId, name: "Entre Páginas", leaderId: reader.id, bookPages: 264, chapterTotal: 12,
    inviteCode: expect.stringMatching(/^[A-Z0-9]{6}$/), bookIsbn: edition.isbn,
    members: { create: { userId: reader.id, displayName: reader.name } },
  }) });
  expect(revalidatePath).toHaveBeenCalledWith("/");
});

test("exige um total válido quando o catálogo omite a contagem de páginas", async () => {
  vi.mocked(getBookEdition).mockResolvedValue({ book: { ...edition, pages: null }, chapters: null });
  const create = (fields: Record<string, string>) => createClub({}, form({ requestId: clubId, name: "Clube", volume: edition.id, ...fields }));
  await expect(create({})).resolves.toHaveProperty("error");
  expect(db.club.create).not.toHaveBeenCalled();
  await expect(create({ chapters: "5" })).rejects.toThrow("NEXT_REDIRECT");
  expect(db.club.create).toHaveBeenCalledWith({ data: expect.objectContaining({ bookPages: null, chapterTotal: 5 }) });
});

test("a prévia exige sessão e código e mostra somente dados do convite", async () => {
  vi.mocked(requireClubUser).mockRejectedValueOnce(new Error("Sem sessão"));
  await expect(findClubInvite({}, form({ code: "ARAD26" }))).rejects.toThrow("Sem sessão");
  expect(db.club.findUnique).not.toHaveBeenCalled();
  db.club.findUnique.mockResolvedValue({ id: clubId, leaderId: reader.id, name: "Entre Páginas", bookTitle: edition.title });
  db.clubMember.findUnique.mockResolvedValue({ displayName: reader.name });
  await expect(findClubInvite({}, form({ code: "arad26" }))).resolves.toEqual({
    invite: { code: "ARAD26", name: "Entre Páginas", book: "Torto Arado", leader: reader.name },
  });
});

test("entrar novamente preserva o progresso da associação existente", async () => {
  db.club.findUnique.mockResolvedValue({ id: clubId });
  await expect(joinClub({}, form({ code: "ARAD26" }))).rejects.toThrow("NEXT_REDIRECT");
  expect(db.clubMember.createMany).toHaveBeenCalledWith({
    data: { clubId, userId: reader.id, displayName: reader.name }, skipDuplicates: true,
  });
  expect(revalidatePath).toHaveBeenCalledWith("/");
});

test("só atualiza o próprio progresso e valida o limite de capítulos no banco", async () => {
  db.clubMember.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ club: { chapterTotal: 12, bookPages: 264 } });
  db.clubMember.updateMany.mockResolvedValue({ count: 1 });

  await expect(saveProgress(clubId, {}, form({ progress: "2" }))).resolves.toHaveProperty("error");
  await expect(saveProgress(clubId, {}, form({ progress: "13" }))).resolves.toHaveProperty("error");
  expect(db.clubMember.updateMany).not.toHaveBeenCalled();

  await expect(saveProgress(clubId, {}, form({ progress: "0", userId: "other" }))).resolves.toEqual({ saved: true });
  expect(db.clubMember.updateMany).toHaveBeenCalledWith({ where: { clubId, userId: reader.id }, data: { progress: 0 } });
  expect(revalidatePath).toHaveBeenCalledWith("/");
});
