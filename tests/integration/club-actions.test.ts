import { beforeEach, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createClub, findClubInvite, joinClub, saveProgress } from "@/app/clubes/actions";
import { requireClubUser } from "@/lib/club-session";
import { getBookEdition } from "@/lib/book-editions";

const db = vi.hoisted(() => ({
  club: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  clubMember: { findFirst: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/club-session", () => ({ requireClubUser: vi.fn() }));
vi.mock("@/lib/book-editions", () => ({ getBookEdition: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ ...db,
  $transaction: (run: (tx: typeof db & { $queryRaw: () => void }) => unknown) => run({ ...db, $queryRaw: () => {} }),
}) }));

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
  db.clubMember.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ club: { chapterTotal: 12, bookPages: 264, readingRevision: 0 } });
  db.clubMember.updateMany.mockResolvedValue({ count: 1 });

  await expect(saveProgress(clubId, {}, form({ progress: "2" }))).resolves.toHaveProperty("error");
  await expect(saveProgress(clubId, {}, form({ progress: "13", revision: "0" }))).resolves.toHaveProperty("error");
  expect(db.clubMember.updateMany).not.toHaveBeenCalled();

  await expect(saveProgress(clubId, {}, form({ progress: "0", revision: "0", userId: "other" }))).resolves.toEqual({ saved: true });
  expect(db.clubMember.updateMany).toHaveBeenCalledWith({ where: { clubId, userId: reader.id }, data: { progress: 0 } });
  expect(revalidatePath).toHaveBeenCalledWith("/");
});

test("renomeia somente o clube liderado pela sessão", async () => {
  const { renameClub } = await import("@/app/clubes/actions");
  db.club.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  await expect(renameClub(clubId, {}, form({ name: " Entre Páginas " }))).resolves.toEqual({ saved: true });
  expect(db.club.updateMany).toHaveBeenCalledWith({
    where: { id: clubId, leaderId: reader.id }, data: { name: "Entre Páginas" },
  });
  await expect(renameClub(clubId, {}, form({ name: "Outro" }))).resolves.toHaveProperty("error");
  await expect(renameClub(clubId, {}, form({ name: " " }))).resolves.toHaveProperty("error");
  expect(db.club.updateMany).toHaveBeenCalledTimes(2);
});

test("exige confirmação e liderança para excluir", async () => {
  const { deleteClub } = await import("@/app/clubes/actions");
  db.club.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
  await expect(deleteClub(clubId, {}, form({}))).resolves.toHaveProperty("error");
  expect(db.club.deleteMany).not.toHaveBeenCalled();
  await expect(deleteClub(clubId, {}, form({ confirm: "yes" }))).resolves.toHaveProperty("error");
  await expect(deleteClub(clubId, {}, form({ confirm: "yes" }))).rejects.toThrow("NEXT_REDIRECT");
  expect(db.club.deleteMany).toHaveBeenCalledWith({ where: { id: clubId, leaderId: reader.id } });
});

test("recusa progresso de um formulário da leitura anterior", async () => {
  db.clubMember.findUnique.mockResolvedValue({ club: { bookPages: 300, chapterTotal: null, readingRevision: 2 } });
  await expect(saveProgress(clubId, {}, form({ progress: "10", revision: "1" }))).resolves.toEqual({
    error: "A leitura mudou. Atualize a página e tente novamente.",
  });
  expect(db.clubMember.updateMany).not.toHaveBeenCalled();
});

test("exige confirmação para remover a leitura", async () => {
  const { removeReading } = await import("@/app/clubes/actions");
  await expect(removeReading(clubId, {}, form({ revision: "0" }))).resolves.toHaveProperty("error");
});

test("recusa adesão se o convite foi invalidado durante o envio", async () => {
  db.club.findUnique.mockResolvedValueOnce({ id: clubId }).mockResolvedValueOnce(null);
  await expect(joinClub({}, form({ code: "ARAD26" }))).resolves.toHaveProperty("error");
  expect(db.clubMember.createMany).not.toHaveBeenCalled();
});

const currentReading = { bookVolumeId: "old-edition", bookPages: 180, chapterTotal: null, readingRevision: 2 };

test("troca de edição exige confirmação e limpa o progresso de todo o clube", async () => {
  const { saveReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue(currentReading);
  const fields = { volume: edition.id, revision: "2" };
  await expect(saveReading(clubId, {}, form(fields))).resolves.toHaveProperty("error");
  expect(db.club.update).not.toHaveBeenCalled();

  await expect(saveReading(clubId, {}, form({ ...fields, confirm: "yes" }))).resolves.toEqual({ saved: true });
  expect(db.clubMember.updateMany).toHaveBeenCalledWith({ where: { clubId }, data: { progress: null } });
  expect(db.club.update).toHaveBeenCalledWith({ where: { id: clubId }, data: expect.objectContaining({
    bookVolumeId: edition.id, readingStartedAt: expect.any(Date), bookPages: 264, readingRevision: { increment: 1 },
  }) });
});

test("remoção confirmada limpa a edição e o progresso", async () => {
  const { removeReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue(currentReading);
  await expect(removeReading(clubId, {}, form({ revision: "2", confirm: "yes" }))).resolves.toEqual({ saved: true });
  expect(db.clubMember.updateMany).toHaveBeenCalledWith({ where: { clubId }, data: { progress: null } });
  expect(db.club.update).toHaveBeenCalledWith({ where: { id: clubId }, data: expect.objectContaining({
    bookVolumeId: null, bookTitle: null, readingStartedAt: null, bookPages: null, chapterTotal: null,
  }) });
});

test("corrige páginas manuais apenas se o novo total comportar os registros", async () => {
  const { saveReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue(currentReading);
  db.clubMember.findFirst.mockResolvedValueOnce({ userId: reader.id }).mockResolvedValueOnce(null);
  vi.mocked(getBookEdition).mockResolvedValue({ book: { ...edition, id: "old-edition", pages: null }, chapters: null });
  const fields = { volume: "old-edition", revision: "2" };
  await expect(saveReading(clubId, {}, form({ ...fields, pages: "119" }))).resolves.toHaveProperty("error");
  expect(db.club.update).not.toHaveBeenCalled();
  expect(db.clubMember.findFirst).toHaveBeenCalledWith({
    where: { clubId, progress: { gt: 119 } }, select: { userId: true },
  });
  await expect(saveReading(clubId, {}, form({ ...fields, pages: "120" }))).resolves.toEqual({ saved: true });
  expect(db.clubMember.updateMany).not.toHaveBeenCalled();
  expect(db.club.update).toHaveBeenCalledWith({ where: { id: clubId }, data: {
    bookPages: 120, chapterTotal: null, readingRevision: { increment: 1 },
  } });
});

test("adiciona leitura a um clube sem livro sem exigir confirmação", async () => {
  const { saveReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue({ bookVolumeId: null, bookPages: null, chapterTotal: null, readingRevision: 3 });
  await expect(saveReading(clubId, {}, form({ volume: edition.id, revision: "3" }))).resolves.toEqual({ saved: true });
  expect(db.club.update).toHaveBeenCalledWith({ where: { id: clubId }, data: expect.objectContaining({
    bookVolumeId: edition.id, bookTitle: edition.title, bookPages: 264, readingStartedAt: expect.any(Date),
  }) });
});

test("limita edição à liderança antes de consultar o catálogo", async () => {
  const { saveReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue(null);
  await expect(saveReading(clubId, {}, form({ volume: edition.id, revision: "0" }))).resolves.toHaveProperty("error");
  expect(db.club.findFirst).toHaveBeenCalledWith({ where: { id: clubId, leaderId: reader.id } });
  expect(getBookEdition).not.toHaveBeenCalled();
  expect(db.club.update).not.toHaveBeenCalled();
});

test("salvar uma leitura sem mudanças conserva a revisão e os formulários abertos", async () => {
  const { saveReading } = await import("@/app/clubes/actions");
  db.club.findFirst.mockResolvedValue(currentReading);
  await expect(saveReading(clubId, {}, form({ volume: "old-edition", pages: "180", revision: "2" })))
    .resolves.toEqual({ saved: true });
  expect(db.club.update).not.toHaveBeenCalled();
  expect(getBookEdition).not.toHaveBeenCalled();
});
