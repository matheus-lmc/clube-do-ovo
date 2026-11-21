import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { requireClubUser } from "@/lib/club-session";
import { getPrisma } from "@/lib/prisma";
import { Cover } from "../cover";
import { CopyInvite } from "./copy-invite";
import { ClubSettings, ReadingEditor } from "./club-management";
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
  const readingMonth = club.readingStartedAt && new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(club.readingStartedAt);
  const edition = [club.bookPublisher, club.bookYear, club.bookIsbn && `ISBN ${club.bookIsbn}`].filter(Boolean).join(" · ");

  const leads = club.leaderId === user.id;
  const book = club.bookVolumeId && club.bookTitle ? {
    id: club.bookVolumeId, title: club.bookTitle, authors: club.bookAuthors,
    publisher: club.bookPublisher, year: club.bookYear, isbn: club.bookIsbn,
    cover: club.bookCover, pages: club.bookPages,
  } : null;

  return (
    <>
      <Link href="/clubes" className={styles.back}><ArrowLeft size={17} aria-hidden /> Meus clubes</Link>
      <div className={styles.clubHeader}>
        <div>
          <h1>{club.name}</h1>
          <div className={styles.leader}>
            {leader && <p>Líder · {leader.displayName}</p>}
            <span className={styles.badge}>{leads ? "Você lidera" : "Você é membro"}</span>
          </div>
        </div>
        {leads && <ClubSettings key={id} id={id} name={club.name} />}
      </div>
      <section className={styles.reading} aria-labelledby="reading-title">
        {book ? <Cover url={book.cover} /> : <span className={styles.emptyReadingCover} aria-hidden><BookOpen size={30} /></span>}
        <div>
          {book && <p>Livro do mês · {readingMonth}</p>}
          <h2 id="reading-title">{book ? book.title : "Sem livro do mês"}</h2>
          {book?.authors && <p>{book.authors}</p>}
          {edition && <p>{edition}</p>}
          {!book && <p>{leads ? "Escolha uma edição para começar a próxima leitura." : "A próxima leitura ainda não foi escolhida."}</p>}
        </div>
        {leads && (
          <div className={styles.readingActions}>
            <ReadingEditor key={id} reading={{ clubId: id, revision: club.readingRevision, book, chapters: club.chapterTotal }} />
          </div>
        )}
      </section>
      {total && (
        <ReadingProgress key={`${id}:${club.readingRevision}`} clubId={id} revision={club.readingRevision} total={total} byChapter={club.chapterTotal !== null}
          members={[current, ...club.members.filter((member) => member.userId !== user.id)].map((member) => ({
            id: member.userId, name: member.displayName, progress: member.progress, self: member.userId === user.id,
          }))} />
      )}
      {leads && <CopyInvite key={id} code={club.inviteCode} />}
    </>
  );
}

export default function ClubPage({ params }: PageProps<"/clubes/[id]">) {
  return <Suspense fallback={<Skeleton label="Carregando clube…" rows={3} cover />}><ClubDetails params={params} /></Suspense>;
}
