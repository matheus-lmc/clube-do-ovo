import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClubUser } from "@/lib/club-session";
import { CreateClubForm } from "./create-form";
import styles from "../clubs.module.css";

async function NewClub() {
  await requireClubUser();
  return (
    <>
      <Link href="/clubes" className={styles.back}><ArrowLeft size={17} aria-hidden /> Meus clubes</Link>
      <h1>Criar clube</h1>
      <div className={styles.formLayout}>
        <CreateClubForm requestId={randomUUID()} />
        <aside className={styles.aside}>
          <h2>Você vai liderar o clube</h2>
          <p>Depois de criar o clube, compartilhe o código de seis caracteres com quem você quiser convidar.</p>
        </aside>
      </div>
    </>
  );
}

export default function NewClubPage() {
  return <Suspense fallback={<p role="status">Carregando formulário…</p>}><NewClub /></Suspense>;
}
