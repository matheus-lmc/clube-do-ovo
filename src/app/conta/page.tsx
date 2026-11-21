import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireClubUser } from "@/lib/club-session";
import { signOut } from "../auth/actions";
import styles from "../auth/auth.module.css";
import { HomeLink } from "../wordmark";

async function AccountContent({ searchParams }: Pick<PageProps<"/conta">, "searchParams">) {
  await requireClubUser();
  const { erro } = await searchParams;

  return (
    <>
      <p>Você está conectado.</p>
      <Link href="/clubes">Meus clubes</Link>
      {erro === "saida" && <p role="alert">Não foi possível sair. Tente novamente.</p>}
      <form action={signOut}>
        <Button type="submit" variant="outline">Sair</Button>
      </form>
    </>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <HomeLink />
      </header>
      <main className={styles.content}>
        <h1>Minha conta</h1>
        <Suspense fallback={<Skeleton label="Carregando…" rows={2} />}>
          <AccountContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
