import React from "react";
import styles from "./skeleton.module.css";

export function Skeleton({ label, rows = 1, cover = false }: { label: string; rows?: number; cover?: boolean }) {
  return (
    <div className={styles.skeleton}>
      <span role="status" className={styles.status}>{label}</span>
      <div aria-busy="true">
        <div aria-hidden="true">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className={styles.row} data-skeleton-row>
              {cover && <span className={styles.cover} />}
              <span className={styles.lines}><span /><span /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
