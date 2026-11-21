import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClubUser } from "@/lib/club-session";
import { getPrisma } from "@/lib/prisma";
import { Cover } from "../cover";
import { CopyInvite } from "./copy-invite";
import { ReadingProgress } from "./reading-progress";
import styles from "../clubs.module.css";

async function ClubDetails({ params }: Pick<PageProps<"/clubes/[id]">, "params">) {
  const user = await requireClubUser();
  const { id } = await params;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) notFound();

  const club = await getPrisma().club.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    include: { members: { orderBy: [{ joinedAt: "asc" }, { userId: "asc" }] } },
  });
  if (!club) notFound();

  const leader = club.members.find(({ userId }) => userId === club.leaderId);
  const current = club.members.find(({ userId }) => userId === user.id);
  if (!current) notFound();
  const total = club.chapterTotal ?? club.bookPages;
  const readingMonth = new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(club.createdAt);
  const edition = [club.bookPublisher, club.bookYear, club.bookIsbn && `ISBN ${club.bookIsbn}`].filter(Boolean).join(" · ");

  return (
    <>
      <Link href="/clubes" className={styles.back}><ArrowLeft size={17} aria-hidden /> Meus clubes</Link>
      <h1>{club.name}</h1>
      <div className={styles.leader}>
        {leader && <p>Líder · {leader.displayName}</p>}
        <span className={styles.badge}>{club.leaderId === user.id ? "Você lidera" : "Você é membro"}</span>
      </div>
      <section className={styles.reading} aria-labelledby="reading-title">
        <Cover url={club.bookCover} />
        <div>
          <p>Livro do mês · {readingMonth}</p>
          <h2 id="reading-title">{club.bookTitle}</h2>
          {club.bookAuthors && <p>{club.bookAuthors}</p>}
          {edition && <p>{edition}</p>}
        </div>
      </section>
      {total && (
        <ReadingProgress key={id} clubId={id} total={total} byChapter={club.chapterTotal !== null}
          members={[current, ...club.members.filter((member) => member.userId !== user.id)].map((member) => ({
            id: member.userId, name: member.displayName, progress: member.progress, self: member.userId === user.id,
          }))} />
      )}
      {club.leaderId === user.id && <CopyInvite code={club.inviteCode} />}
    </>
  );
}

export default function ClubPage({ params }: PageProps<"/clubes/[id]">) {
  return <Suspense fallback={<p role="status">Carregando clube…</p>}><ClubDetails params={params} /></Suspense>;
}
