import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClubUser } from "@/lib/club-session";
import { JoinForm } from "./join-form";
import styles from "../clubs.module.css";

async function JoinClub() {
  await requireClubUser();
  return (
    <>
      <Link href="/clubes" className={styles.back}><ArrowLeft size={17} aria-hidden /> Meus clubes</Link>
      <h1>Entrar com código</h1>
      <p className={styles.intro}>Cole ou digite o código de convite que você recebeu.</p>
      <JoinForm />
    </>
  );
}

export default function JoinClubPage() {
  return <Suspense fallback={<p role="status">Carregando formulário…</p>}><JoinClub /></Suspense>;
}
