import Link from "next/link";
import styles from "./home.module.css";

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <span className={styles.egg} aria-hidden />
      Clube do Ovo
    </span>
  );
}

export function HomeLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="Clube do Ovo, página inicial">
      <Wordmark />
    </Link>
  );
}
