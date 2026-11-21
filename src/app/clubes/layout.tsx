import Link from "next/link";
import type { ReactNode } from "react";
import { HomeLink } from "../wordmark";
import styles from "./clubs.module.css";

export default function ClubsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.container}>
          <HomeLink className={styles.brand} />
          <Link href="/conta" className={styles.back}>Minha conta</Link>
        </div>
      </header>
      <main className={styles.container}>{children}</main>
    </div>
  );
}
