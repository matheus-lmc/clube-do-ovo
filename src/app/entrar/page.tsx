import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getClubUser } from "@/lib/club-session";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { getLoginIntent, loginDestination } from "@/lib/supabase/login-intent";
import { startSocialSignIn } from "../auth/actions";
import { HomeLink } from "../wordmark";
import { SignInProviders } from "./providers";
import styles from "./sign-in.module.css";

async function SignInContent({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const { erro, acao } = await searchParams;
  const intent = getLoginIntent(acao);
  const config = getAuthConfig();

  if (!config) return <p className={styles.notice}>O login está indisponível no momento.</p>;
  if (await getClubUser()) redirect(loginDestination(intent));

  return (
    <div className={styles.signIn}>
      {intent && (
        <p className={styles.notice}>
          {intent === "criar-clube" ? "Acesse sua conta para criar o clube." : "Acesse sua conta para usar o código de convite."}
        </p>
      )}
      {erro === "login" && <p className={styles.notice} role="alert">Não foi possível entrar. Tente novamente.</p>}
      <form action={startSocialSignIn} className={styles.actions}>
        {intent && <input type="hidden" name="acao" value={intent} />}
        <SignInProviders appleEnabled={config.appleEnabled} />
      </form>
    </div>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.container}>
          <HomeLink />
          <Link href="/" className={styles.back} aria-label="Voltar à página inicial"><ArrowLeft size={17} aria-hidden /> Início</Link>
        </div>
      </header>
      <main className={`${styles.container} ${styles.main}`}>
        <section className={styles.content} aria-labelledby="sign-in-title">
          <h1 id="sign-in-title">Entre no <em>Clube do Ovo.</em></h1>
          <p>Crie seu clube de leitura, entre com um convite ou acompanhe o livro do mês com seu grupo.</p>
          <Suspense fallback={<Skeleton label="Carregando opções de login…" rows={2} />}>
            <SignInContent searchParams={searchParams} />
          </Suspense>
        </section>
        <div className={styles.art}>
          <Image src="/images/leitura-editorial.webp" alt="" width={1024} height={1024}
            sizes="(max-width: 700px) calc(100vw - 36px), (max-width: 1180px) 45vw, 540px" preload />
        </div>
      </main>
    </div>
  );
}
