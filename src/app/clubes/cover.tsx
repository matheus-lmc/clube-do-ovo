"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import styles from "./clubs.module.css";

export function Cover({ url, fallback }: { url: string | null; fallback?: ReactNode }) {
  return (
    <span className={styles.cover} aria-hidden="true">
      {fallback ?? <BookOpen size={20} strokeWidth={1.5} />}
      {url && <Image key={url} src={url} alt="" width={112} height={160} unoptimized referrerPolicy="no-referrer"
        onError={(event) => { event.currentTarget.hidden = true; }} />}
    </span>
  );
}
