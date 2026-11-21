"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./home.module.css";

export function ReadingCard({ href, title, cover, children }: {
  href: string; title: string; cover: ReactNode; children: ReactNode;
}) {
  const card = useRef<HTMLAnchorElement>(null);
  const previewId = useId();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape" && card.current?.matches(":hover, :focus-visible")) {
        setDismissed(true);
      }
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);

  return (
    <Link ref={card} href={href} className={styles.readingRow} aria-label={title} aria-describedby={previewId}
      data-dismissed={dismissed} onPointerEnter={() => setDismissed(false)} onFocus={() => setDismissed(false)}>
      {cover}
      <div id={previewId} className={styles.readingDetails}>{children}</div>
    </Link>
  );
}
