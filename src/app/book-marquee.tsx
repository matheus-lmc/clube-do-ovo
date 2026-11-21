"use client";

import { Pause, Play } from "lucide-react";
import { useState, type ReactNode } from "react";
import styles from "./home.module.css";

export function BookMarquee({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const Icon = paused ? Play : Pause;

  return (
    <section className={styles.shelf} aria-labelledby="estante-titulo">
      <div className={`${styles.container} ${styles.shelfHeading}`}>
        <h2 id="estante-titulo">Clássicos para ler em grupo</h2>
        <button className={styles.pause} type="button" onClick={() => setPaused(!paused)}>
          <Icon size={16} aria-hidden /> {paused ? "Retomar capas" : "Pausar capas"}
        </button>
      </div>
      <div className={styles.shelfWindow} aria-hidden>
        <div className={styles.shelfTrack} data-paused={paused}>
          <div className={styles.coverGroup}>{children}</div>
          <div className={styles.coverGroup}>{children}</div>
        </div>
      </div>
    </section>
  );
}
