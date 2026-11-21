"use client";

import Image from "next/image";
import { Apple } from "lucide-react";
import { useFormStatus } from "react-dom";
import styles from "./sign-in.module.css";

export function SignInProviders({ appleEnabled }: { appleEnabled: boolean }) {
  const { pending, data } = useFormStatus();
  const provider = data?.get("provider");

  return (
    <>
      <button className={styles.provider} type="submit" name="provider" value="google" disabled={pending}>
        <Image src="/images/google-g.png" width={18} height={18} alt="" unoptimized />
        Entrar com Google
      </button>
      {appleEnabled && (
        <button className={styles.provider} type="submit" name="provider" value="apple" disabled={pending}>
          <Apple size={18} aria-hidden />
          Entrar com Apple
        </button>
      )}
      <p className={styles.pending} role="status">
        {pending && (provider === "apple" ? "Abrindo a Apple…" : "Abrindo o Google…")}
      </p>
    </>
  );
}
