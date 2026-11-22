import { ThemeToggle } from "./theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowUp, BookOpen, Plus, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getClubUser } from "@/lib/club-session";
import { BookMarquee } from "./book-marquee";
import { MemberHome } from "./member-home";
import { HomeLink, Wordmark } from "./wordmark";
import styles from "./home.module.css";

const books = [
  "alice",
  "orgulho-e-preconceito",
  "frankenstein",
  "gatsby",
  "dracula",
  "mulherzinhas",
  "moby-dick",
  "o-jardim-secreto",
  "o-retrato-de-dorian-gray",
  "jane-eyre",
];

const createClub = "/entrar?acao=criar-clube";
const joinClub = "/entrar?acao=entrar-clube";

function GuestSections() {
  return (
    <>
      <BookMarquee>
        {books.map((book) => (
          <Image key={book} src={`/images/estante/${book}.webp`} alt="" width={288} height={432} unoptimized />
        ))}
      </BookMarquee>
      <section className={styles.how} id="como-funciona" aria-labelledby="como-titulo">
        <div className={styles.container}>
          <h2 id="como-titulo">Como funciona</h2>
          <div className={styles.steps}>
            <div>
              <Plus size={24} strokeWidth={1.5} aria-hidden />
              <h3>Crie seu clube</h3>
              <p>Escolha o livro do mês e compartilhe o código do clube com quem vai ler com você.</p>
            </div>
            <div>
              <Ticket size={24} strokeWidth={1.5} aria-hidden />
              <h3>Use um convite</h3>
              <p>Recebeu um código? Use-o para entrar no clube e ver o que o grupo está lendo.</p>
            </div>
            <div>
              <BookOpen size={24} strokeWidth={1.5} aria-hidden />
              <h3>Acompanhe a leitura</h3>
              <p>Registre seu progresso e acompanhe o ritmo de leitura do grupo.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function GuestHome() {
  return (
    <>
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="titulo">
        <div className={styles.heroCopy}>
          <h1 id="titulo">Bons livros.<br /><em>Melhor em grupo.</em></h1>
          <p>Crie um clube do livro ou entre com um convite para ler e acompanhar o progresso do seu grupo.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryLink} href={createClub}>Criar um clube <ArrowRight size={18} aria-hidden /></Link>
            <Link className={styles.secondaryLink} href={joinClub}><Ticket size={18} aria-hidden /> Entrar com código</Link>
          </div>
        </div>
        <div className={styles.heroArt}>
          <Image
            className={styles.heroImage}
            src="/images/leitura-editorial.webp"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) 43vw, 530px"
            preload
          />
          <span className={styles.bookmark} aria-hidden><BookOpen size={23} strokeWidth={1.5} /></span>
        </div>
      </section>
      <GuestSections />
    </>
  );
}

async function HomeContent() {
  const user = await getClubUser();

  return (
    <>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <HomeLink />
          <nav className={styles.navigation} aria-label="Navegação principal">
            {user ? (
              <Link href="/conta">Minha conta</Link>
            ) : (
              <>
                <a href="#como-funciona">Como funciona</a>
                <Link href="/entrar" className={styles.navSignIn}>Entrar <ArrowRight size={16} aria-hidden /></Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        {user ? <MemberHome userId={user.id} /> : <GuestHome />}
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <Wordmark />
        <a className={styles.textLink} href="#inicio">Voltar ao topo <ArrowUp size={17} aria-hidden /></a>
      </footer>
    </>
  );
}

export default function Home() {
  return (
    <div className={styles.site} id="inicio">
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <Suspense fallback={<Skeleton label="Carregando o Clube do Ovo…" rows={2} />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
