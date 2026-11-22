"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getBookEdition } from "@/lib/book-editions";
import { inviteCode, progressValue } from "@/lib/club-rules";
import { requireClubUser } from "@/lib/club-session";
import { getPrisma } from "@/lib/prisma";

type ActionState = { error?: string; saved?: boolean };
type InviteState = { error?: string; invite?: { code: string; name: string; book: string | null; leader?: string } };

export async function createClub(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  const rawName = form.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const volume = form.get("volume");
  const id = form.get("requestId");
  if (!name || name.length > 60) return { error: "Informe um nome de até 60 caracteres." };
  if (typeof volume !== "string" || !/^[\w-]{1,64}$/.test(volume)) return { error: "Selecione uma edição na lista de sugestões." };
  if (typeof id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) return { error: "Reabra o formulário e tente novamente." };

  let edition;
  try {
    edition = await getBookEdition(volume);
  } catch {
    return { error: "Não foi possível confirmar a edição. Tente novamente." };
  }
  const { book } = edition;
  const rawPages = form.get("pages");
  const bookPages = book.pages ?? progressValue(rawPages, 100_000);
  if (!bookPages) return { error: "Informe um total válido de páginas." };

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const db = getPrisma();
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
    try {
      await db.club.create({ data: {
        id, name, leaderId: user.id, inviteCode: code, bookVolumeId: book.id,
        readingStartedAt: new Date(), bookTitle: book.title, bookAuthors: book.authors, bookPublisher: book.publisher,
        bookYear: book.year, bookIsbn: book.isbn, bookCover: book.cover,
        bookPages, chapterTotal: null,
        members: { create: { userId: user.id, displayName: user.name } },
      } });
      created = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        return { error: "Não foi possível criar o clube. Tente novamente." };
      }
      const existing = await db.club.findUnique({ where: { id }, select: { leaderId: true } });
      if (existing && existing.leaderId !== user.id) return { error: "Reabra o formulário e tente novamente." };
      created = existing?.leaderId === user.id;
    }
  }
  if (!created) return { error: "Não foi possível gerar o convite. Tente novamente." };

  revalidatePath("/");
  revalidatePath("/clubes");
  redirect(`/clubes/${id}`);
}

export async function findClubInvite(_state: InviteState, form: FormData): Promise<InviteState> {
  await requireClubUser();
  const code = inviteCode(form.get("code"));
  if (!code) return { error: "Informe os seis caracteres do convite." };

  const club = await getPrisma().club.findUnique({
    where: { inviteCode: code },
    select: {
      id: true, leaderId: true, name: true, bookTitle: true,
    },
  });
  if (!club) return { error: "Clube não encontrado. Confira o código e tente novamente." };

  const leader = await getPrisma().clubMember.findUnique({
    where: { clubId_userId: { clubId: club.id, userId: club.leaderId } },
    select: { displayName: true },
  });
  return { invite: { code, name: club.name, book: club.bookTitle, leader: leader?.displayName } };
}

export async function joinClub(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  const code = inviteCode(form.get("code"));
  if (!code) return { error: "Informe os seis caracteres do convite." };

  const db = getPrisma();
  let club;
  try {
    club = await db.club.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!club) return inviteUnavailable;
    const id = club.id;
    const joined = await db.$transaction(async (tx) => {
      await lockClub(tx, id);
      const active = await tx.club.findUnique({ where: { inviteCode: code }, select: { id: true } });
      if (active?.id !== id) return false;
      await tx.clubMember.createMany({
        data: { clubId: id, userId: user.id, displayName: user.name },
        skipDuplicates: true,
      });
      return true;
    });
    if (!joined) return inviteUnavailable;
  } catch {
    return { error: "Não foi possível entrar no clube. Tente novamente." };
  }

  revalidatePath("/");
  revalidatePath("/clubes");
  redirect(`/clubes/${club.id}`);
}

export async function saveProgress(clubId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  if (!validClubId.test(clubId)) return clubUnavailable;
  const where = { clubId, userId: user.id };
  try {
    const result = await getPrisma().$transaction(async (tx) => {
      await lockClub(tx, clubId);
      const member = await tx.clubMember.findUnique({
        where: { clubId_userId: where },
        select: { club: { select: { bookPages: true, chapterTotal: true, readingRevision: true } } },
      });
      if (!member) return { error: "Você precisa fazer parte do clube para atualizar seu progresso." };
      if (form.get("revision") !== String(member.club.readingRevision)) return readingChanged;
      const total = member.club.chapterTotal ?? member.club.bookPages;
      if (!total) return { error: "O total desta leitura ainda não está disponível." };
      const progress = progressValue(form.get("progress"), total);
      if (progress === null) return { error: `Informe um número inteiro de 0 a ${total}.` };
      await tx.clubMember.updateMany({ where, data: { progress } });
      return { saved: true };
    });
    if (result.saved) refreshClub(clubId);
    return result;
  } catch {
    return { error: "Não foi possível salvar o progresso. Tente novamente." };
  }
}

const inviteUnavailable = { error: "Clube não encontrado. Confira o código e tente novamente." };
const clubUnavailable = { error: "Clube indisponível para esta alteração." };
const validClubId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

function refreshClub(id: string) {
  revalidatePath("/");
  revalidatePath("/clubes");
  revalidatePath(`/clubes/${id}`);
}

export async function renameClub(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  if (!validClubId.test(id)) return clubUnavailable;
  const value = form.get("name");
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 60) return { error: "Informe um nome de até 60 caracteres." };
  try {
    const { count } = await getPrisma().club.updateMany({ where: { id, leaderId: user.id }, data: { name } });
    if (!count) return clubUnavailable;
  } catch {
    return { error: "Não foi possível renomear o clube. Tente novamente." };
  }
  refreshClub(id);
  return { saved: true };
}

export async function deleteClub(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  if (!validClubId.test(id)) return clubUnavailable;
  if (form.get("confirm") !== "yes") return { error: "Confirme a exclusão do clube." };
  try {
    const { count } = await getPrisma().club.deleteMany({ where: { id, leaderId: user.id } });
    if (!count) return clubUnavailable;
  } catch {
    return { error: "Não foi possível excluir o clube. Tente novamente." };
  }
  refreshClub(id);
  redirect("/clubes");
}

const readingChanged = { error: "A leitura mudou. Atualize a página e tente novamente." };

async function lockClub(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Club" WHERE id = ${id}::uuid FOR UPDATE`;
}

async function changeReading(id: string, form: FormData, remove: boolean): Promise<ActionState> {
  const user = await requireClubUser();
  if (!validClubId.test(id)) return clubUnavailable;
  const confirmed = form.get("confirm") === "yes";
  if (remove && !confirmed) return { error: "Confirme a remoção do livro." };
  const db = getPrisma();
  try {
    const current = await db.club.findFirst({ where: { id, leaderId: user.id } });
    if (!current) return clubUnavailable;
    if (form.get("revision") !== String(current.readingRevision)) return readingChanged;
    if (remove && !current.bookVolumeId) return readingChanged;

    const volume = form.get("volume");
    const replacing = !remove && volume !== current.bookVolumeId;
    let pages = remove ? null : current.bookPages;
    let edition: Prisma.ClubUpdateInput = {};
    if (!remove) {
      if (typeof volume !== "string" || !/^[\w-]{1,64}$/.test(volume)) {
        return { error: "Selecione uma edição na lista de sugestões." };
      }
      const rawPages = form.get("pages");
      const pageChange = rawPages !== null && rawPages !== String(current.bookPages ?? "");
      if (replacing || pageChange) {
        const { book } = await getBookEdition(volume);
        if (!replacing && book.pages && current.bookPages) return { error: "Esta edição já tem um total de páginas no catálogo." };
        pages = book.pages ?? progressValue(rawPages, 100_000);
        if (!pages && rawPages) return { error: "Informe um total válido de páginas." };
        if (replacing) edition = {
          bookVolumeId: book.id, bookTitle: book.title, bookAuthors: book.authors,
          bookPublisher: book.publisher, bookYear: book.year, bookIsbn: book.isbn, bookCover: book.cover,
          readingStartedAt: new Date(),
        };
      }
      if (!pages) return { error: "Informe um total válido de páginas." };
    } else {
      edition = { bookVolumeId: null, bookTitle: null, bookAuthors: null, bookPublisher: null,
        bookYear: null, bookIsbn: null, bookCover: null, readingStartedAt: null };
    }

    const reset = remove || replacing || current.chapterTotal !== null;
    if (reset && current.bookVolumeId && !confirmed) return { error: "Confirme que o progresso dos membros será apagado." };

    const result = await db.$transaction<ActionState>(async (tx) => {
      await lockClub(tx, id);
      const club = await tx.club.findFirst({ where: { id, leaderId: user.id }, select: { readingRevision: true } });
      if (!club) return clubUnavailable;
      if (club.readingRevision !== current.readingRevision) return readingChanged;
      if (!reset && pages === current.bookPages) return { saved: true };
      if (!reset && pages && await tx.clubMember.findFirst({
        where: { clubId: id, progress: { gt: pages } }, select: { userId: true },
      })) return { error: "O total é menor que o progresso já salvo por um membro." };
      if (reset) await tx.clubMember.updateMany({ where: { clubId: id }, data: { progress: null } });
      await tx.club.update({ where: { id }, data: {
        ...edition, bookPages: pages, chapterTotal: null, ...(reset ? { chapterTitles: [], chapterSource: null } : {}), readingRevision: { increment: 1 },
      } });
      return { saved: true };
    });
    if (result.saved) refreshClub(id);
    return result;
  } catch {
    return { error: "Não foi possível alterar o livro. Confira a edição e tente novamente." };
  }
}

export async function saveReading(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  return changeReading(id, form, false);
}

export async function removeReading(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  return changeReading(id, form, true);
}
