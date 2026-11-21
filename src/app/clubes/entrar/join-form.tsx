"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { findClubInvite, joinClub } from "../actions";
import styles from "../clubs.module.css";

export function JoinForm() {
  const [code, setCode] = useState("");
  const [state, search, searching] = useActionState(findClubInvite, {});
  const [joiningState, join, joining] = useActionState(joinClub, {});
  const invite = state.invite?.code === code && !searching ? state.invite : null;

  return (
    <div className={styles.formLayout}>
      <form className={styles.form} action={search}>
        <div className={styles.field}>
          <label htmlFor="invite-code">Código do clube</label>
          <input id="invite-code" name="code" className={styles.code} autoComplete="off" autoCapitalize="characters"
            spellCheck={false} required minLength={6} maxLength={6} placeholder="ABC123" value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())} />
        </div>
        {state.error && !searching && <p className={styles.error} role="alert">{state.error}</p>}
        <button type="submit" className={styles.button} disabled={searching || joining}>
          {searching ? "Buscando clube…" : "Buscar clube"} <ArrowRight size={17} aria-hidden />
        </button>
      </form>
      {invite && (
        <section className={`${styles.aside} ${styles.reveal}`} aria-labelledby="found-club">
          <h2 id="found-club">{invite.name}</h2>
          {invite.leader && <p>Líder · {invite.leader}</p>}
          <p>Livro do mês · {invite.book}</p>
          <form className={styles.form} action={join}>
            <input type="hidden" name="code" value={invite.code} />
            {joiningState.error && <p className={styles.error} role="alert">{joiningState.error}</p>}
            <button type="submit" className={styles.primary} disabled={joining}>
              {joining ? "Entrando…" : "Entrar no clube"} <ArrowRight size={17} aria-hidden />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
