import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus, Ticket } from "lucide-react";
import { requireClubUser } from "@/lib/club-session";
import { getPrisma } from "@/lib/prisma";
import { Cover } from "./cover";
import styles from "./clubs.module.css";

async function ClubList() {
  const user = await requireClubUser();
  const memberships = await getPrisma().clubMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "desc" },
    select: { club: { select: { id: true, name: true, leaderId: true, bookTitle: true, bookCover: true } } },
  });

  return (
    <>
      <div className={styles.heading}>
        <div>
          <h1>Meus clubes</h1>
          <p>Veja o que cada clube está lendo neste mês.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/clubes/entrar" className={styles.button}><Ticket size={17} aria-hidden /> Entrar com código</Link>
          <Link href="/clubes/novo" className={styles.primary}><Plus size={17} aria-hidden /> Criar clube</Link>
        </div>
      </div>
      {memberships.length === 0 ? (
        <p className={styles.empty}>Você ainda não participa de um clube. Crie o seu ou use o código de um convite.</p>
      ) : (
        <ul className={styles.list} aria-label="Clubes dos quais você participa">
          {memberships.map(({ club }) => (
            <li key={club.id}>
              <Link href={`/clubes/${club.id}`} className={styles.clubRow}>
                <Cover url={club.bookCover} />
                <div>
                  <h2>{club.name}</h2>
                  <p>Livro do mês · {club.bookTitle}</p>
                </div>
                <span className={styles.badge}>{club.leaderId === user.id ? "Líder" : "Membro"}</span>
                <ArrowRight size={17} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ClubsPage() {
  return <Suspense fallback={<p role="status">Carregando clubes…</p>}><ClubList /></Suspense>;
}
