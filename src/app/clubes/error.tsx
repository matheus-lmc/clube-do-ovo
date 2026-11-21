"use client";

import styles from "./clubs.module.css";

export default function ClubsError({ reset }: { reset: () => void }) {
  return (
    <section className={styles.form}>
      <h1>Não foi possível abrir os clubes</h1>
      <p>Tente novamente em instantes.</p>
      <button type="button" className={styles.button} onClick={reset}>Tentar novamente</button>
    </section>
  );
}
