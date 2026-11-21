import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getPrisma } from "@/lib/prisma";
import { Cover } from "./clubes/cover";
import { ReadingCard } from "./reading-card";
import styles from "./home.module.css";

async function MemberReadings({ userId }: { userId: string }) {
  let memberships;
  try {
    memberships = await getPrisma().clubMember.findMany({
      where: { userId, club: { bookTitle: { not: "" } } },
      orderBy: [{ joinedAt: "desc" }, { clubId: "asc" }],
      take: 4,
      select: {
        progress: true,
        club: {
          select: {
            id: true, name: true, bookTitle: true, bookCover: true,
            bookPages: true, chapterTotal: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Falha ao consultar Minhas leituras", error instanceof Error ? error.name : "Erro desconhecido");
    return <p className={styles.readingMessage}>Não foi possível carregar suas leituras. Tente novamente em instantes.</p>;
  }

  if (memberships.length === 0) {
    return <p className={styles.readingMessage}>Crie seu primeiro clube ou entre com um convite para acompanhar suas leituras aqui.</p>;
  }

  return (
    <ul className={styles.readingList}>
      {memberships.map(({ club, progress }) => {
        const total = club.chapterTotal ?? club.bookPages;
        const unit = club.chapterTotal === null ? "páginas" : "capítulos";
        const recorded = progress !== null && total !== null && total > 0;

        return (
          <li key={club.id}>
            <ReadingCard href={`/clubes/${club.id}`} title={club.bookTitle ?? ""} cover={
              <Cover url={club.bookCover} fallback={<span className={styles.readingPlaceholder}>{club.bookTitle}</span>} />
            }>
              <h3>{club.bookTitle}</h3>
              <p>{club.name}</p>
              <div className={styles.readingProgress}>
                {recorded ? (
                  <>
                    <span>{progress === total ? "Leitura concluída" : `${progress} de ${total} ${unit}`}</span>
                    <progress value={progress} max={total} aria-label={`Seu progresso em ${club.bookTitle}`} />
                  </>
                ) : (
                  <span>{total ? "Progresso ainda não registrado" : "Progresso indisponível"}</span>
                )}
              </div>
            </ReadingCard>
          </li>
        );
      })}
    </ul>
  );
}

export function MemberHome({ userId }: { userId: string }) {
  return (
    <>
      <section className={styles.memberHero} aria-labelledby="titulo">
        <div className={`${styles.container} ${styles.memberIntro}`}>
          <div>
            <h1 id="titulo">De volta às <em>suas leituras.</em></h1>
            <p>Acompanhe seu progresso nos livros do mês dos seus clubes.</p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.primaryLink} href="/clubes/novo"><Plus size={18} aria-hidden /> Criar um clube</Link>
            <Link className={styles.secondaryLink} href="/clubes/entrar"><Ticket size={18} aria-hidden /> Entrar com código</Link>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.memberReadings}`} aria-labelledby="leituras-titulo">
        <div className={styles.readingsHeading}>
          <h2 id="leituras-titulo">Minhas leituras</h2>
          <Link className={styles.textLink} href="/clubes">Meus clubes <ArrowRight size={17} aria-hidden /></Link>
        </div>
        <Suspense fallback={<Skeleton label="Carregando suas leituras…" rows={3} cover />}>
          <MemberReadings userId={userId} />
        </Suspense>
      </section>
    </>
  );
}
