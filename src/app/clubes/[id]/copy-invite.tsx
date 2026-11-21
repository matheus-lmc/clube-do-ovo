"use client";

import { useRef, useState } from "react";
import { Check, Copy, Ticket } from "lucide-react";
import styles from "../clubs.module.css";

export function CopyInvite({ code }: { code: string }) {
  const [status, setStatus] = useState<"copied" | "manual" | null>(null);
  const codeRef = useRef<HTMLElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      const selection = window.getSelection();
      if (selection && codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setStatus("manual");
    }
  }

  return (
    <section className={styles.invite} aria-labelledby="invite-title">
      <div>
        <h2 id="invite-title"><Ticket size={18} aria-hidden /> Código de convite</h2>
        <p>Compartilhe com quem você quiser convidar.</p>
      </div>
      <div>
        <div className={styles.actions}>
          <code ref={codeRef} className={styles.code}>{code}</code>
          <button type="button" className={styles.button} onClick={() => void copy()}><Copy size={16} aria-hidden /> Copiar código</button>
        </div>
        <p role="status" className={styles.feedback}>
          {status === "copied" && <span className={styles.reveal}><Check size={16} aria-hidden /> Código copiado.</span>}
          {status === "manual" && "Copie o código pelo menu do seu dispositivo."}
        </p>
      </div>
    </section>
  );
}
