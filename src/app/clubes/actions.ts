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
type InviteState = { error?: string; invite?: { code: string; name: string; book: string; leader?: string } };

export async function createClub(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  const rawName = form.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const volume = form.get("volume");
  const id = form.get("requestId");
  if (!name || name.length > 60) return { error: "Informe um nome de até 60 caracteres." };
  if (typeof volume !== "string" || !/^[\w-]{1,64}$/.test(volume)) return { error: "Selecione uma edição na lista de sugestões." };
  if (typeof id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) return { error: "Reabra o formulário e tente novamente." };

  const rawChapters = form.get("chapters");
  const chapterTotal = progressValue(rawChapters, 1000);
  if (rawChapters && !chapterTotal) return { error: "Informe um total de 1 a 1.000 capítulos." };

  let book;
  try {
    ({ book } = await getBookEdition(volume));
  } catch {
    return { error: "Não foi possível confirmar a edição. Tente novamente." };
  }
  const rawPages = form.get("pages");
  const bookPages = book.pages ?? progressValue(rawPages, 100_000);
  if (!bookPages && (!chapterTotal || rawPages)) return { error: "Informe um total válido de páginas ou capítulos." };

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const db = getPrisma();
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
    try {
      await db.club.create({ data: {
        id, name, leaderId: user.id, inviteCode: code, bookVolumeId: book.id,
        bookTitle: book.title, bookAuthors: book.authors, bookPublisher: book.publisher,
        bookYear: book.year, bookIsbn: book.isbn, bookCover: book.cover,
        bookPages: bookPages || null, chapterTotal,
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
  const club = await db.club.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!club) return { error: "Clube não encontrado. Confira o código e tente novamente." };
  await db.clubMember.createMany({
    data: { clubId: club.id, userId: user.id, displayName: user.name },
    skipDuplicates: true,
  });

  revalidatePath("/");
  revalidatePath("/clubes");
  redirect(`/clubes/${club.id}`);
}

export async function saveProgress(clubId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireClubUser();
  const db = getPrisma();
  const where = { clubId, userId: user.id };
  const member = await db.clubMember.findUnique({
    where: { clubId_userId: where },
    select: { club: { select: { bookPages: true, chapterTotal: true } } },
  });
  if (!member) return { error: "Você precisa fazer parte do clube para atualizar seu progresso." };
  const total = member.club.chapterTotal ?? member.club.bookPages;
  if (!total) return { error: "O total desta leitura ainda não está disponível." };

  const progress = progressValue(form.get("progress"), total);
  if (progress === null) return { error: `Informe um número inteiro de 0 a ${total}.` };

  const { count } = await db.clubMember.updateMany({ where, data: { progress } });
  if (!count) return { error: "Você precisa fazer parte do clube para atualizar seu progresso." };
  revalidatePath("/");
  revalidatePath(`/clubes/${clubId}`);
  return { saved: true };
}
