import { ArrowDown, ArrowRight, ArrowUp, BookOpen, CalendarDays, LibraryBig } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <span className={styles.egg} aria-hidden="true" />
      Clube do Ovo
    </span>
  );
}

export default function Home() {
  return (
    <div className={styles.site} id="inicio">
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <a href="#inicio" aria-label="Clube do Ovo, início"><Wordmark /></a>
          <nav className={styles.navigation} aria-label="Navegação principal">
            <a href="#leitura-do-mes">Leitura do mês</a>
            <a href="#estante">Nossa estante</a>
            <a href="#sobre">Sobre o clube</a>
            <Link href="/entrar">Entrar</Link>
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="titulo">
          <div className={styles.heroCopy}>
            <h1 id="titulo">Um livro por vez.<br /><em>Muita conversa.</em></h1>
            <p>Um clube do livro para descobrir novas histórias e conversar sobre elas em boa companhia.</p>
            <a className={styles.primaryLink} href="#leitura-do-mes">
              Ver a leitura do mês <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.heroArt}>
            <Image
              className={styles.heroImage}
              src="/images/leitura-editorial.webp"
              alt="Livro verde com marcador amarelo sobre as páginas de um livro aberto."
              width={1024}
              height={1024}
              sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) 43vw, 530px"
              preload
            />
            <span className={styles.bookmark} aria-hidden="true"><BookOpen size={23} strokeWidth={1.5} /></span>
          </div>
        </section>

        <section className={styles.reading} id="leitura-do-mes" aria-labelledby="leitura-titulo">
          <div className={`${styles.container} ${styles.readingInner}`}>
            <div className={styles.readingCopy}>
              <BookOpen size={26} strokeWidth={1.5} aria-hidden="true" />
              <h2 id="leitura-titulo">Leitura do mês</h2>
              <p>O próximo livro será anunciado aqui.</p>
            </div>
            <div className={styles.meeting}>
              <CalendarDays size={25} strokeWidth={1.5} aria-hidden="true" />
              <h3>Próximo encontro</h3>
              <p>A data e os detalhes serão divulgados junto com a leitura.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.shelf}`} id="estante" aria-labelledby="estante-titulo">
          <h2 id="estante-titulo">Nossa estante</h2>
          <div className={styles.emptyShelf}>
            <LibraryBig size={25} strokeWidth={1.5} aria-hidden="true" />
            <p>As leituras anteriores do clube vão ficar aqui.</p>
          </div>
        </section>

        <section className={styles.about} id="sobre" aria-labelledby="sobre-titulo">
          <div className={`${styles.container} ${styles.aboutInner}`}>
            <h2 id="sobre-titulo">Sobre o clube</h2>
            <div>
              <p>O Clube do Ovo reúne gente que gosta de trocar impressões sobre o que lê. A cada leitura, abrimos espaço para falar das passagens que ficaram com a gente e ouvir o que outras pessoas encontraram no mesmo livro.</p>
              <a className={styles.textLink} href="#leitura-do-mes">
                Acompanhar a próxima leitura <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <Wordmark />
        <a className={styles.textLink} href="#inicio">Voltar ao topo <ArrowUp size={17} aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
