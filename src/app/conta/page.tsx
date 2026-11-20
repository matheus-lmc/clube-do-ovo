import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../auth/actions";
import styles from "../auth/auth.module.css";

async function AccountContent({ searchParams }: Pick<PageProps<"/conta">, "searchParams">) {
  const { erro } = await searchParams;
  if (!getAuthConfig()) redirect("/entrar");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/entrar");

  return (
    <>
      <p>Você está conectado.</p>
      {erro === "saida" && <p role="alert">Não foi possível sair. Tente novamente.</p>}
      <form action={signOut}>
        <Button type="submit" variant="outline">Sair</Button>
      </form>
    </>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Link href="/">Voltar à página inicial</Link>
        <h1>Minha conta</h1>
        <Suspense fallback={<p role="status">Carregando…</p>}>
          <AccountContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
