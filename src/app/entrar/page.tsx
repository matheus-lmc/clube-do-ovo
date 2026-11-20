import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { createClient } from "@/lib/supabase/server";
import { startSocialSignIn } from "../auth/actions";
import styles from "../auth/auth.module.css";

async function SignInContent({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const { erro } = await searchParams;
  const config = getAuthConfig();

  if (!config) return <p>Login indisponível no momento.</p>;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims.sub) redirect("/conta");

  return (
    <>
      {erro === "login" && <p role="alert">Não foi possível entrar. Tente novamente.</p>}
      <form action={startSocialSignIn} className={styles.actions}>
        <Button type="submit" name="provider" value="google">Entrar com Google</Button>
        {config.appleEnabled && (
          <Button type="submit" name="provider" value="apple" variant="outline">Entrar com Apple</Button>
        )}
      </form>
    </>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Link href="/">Voltar à página inicial</Link>
        <h1>Entrar</h1>
        <Suspense fallback={<p role="status">Carregando…</p>}>
          <SignInContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
