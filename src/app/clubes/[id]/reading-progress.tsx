"use client";

import { useActionState, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { saveProgress } from "../actions";
import styles from "../clubs.module.css";

type Member = { id: string; name: string; progress: number | null; self: boolean };

export function ReadingProgress({ clubId, revision, total, byChapter, titles, shortcuts, members }: {
  clubId: string; revision: number; total: number; byChapter: boolean; titles: string[]; shortcuts: { title: string; page: number }[]; members: Member[];
}) {
  const current = members.find((member) => member.self)?.progress;
  const [position, setPosition] = useState(String(current ?? 0));
  const [state, submit, pending] = useActionState(saveProgress.bind(null, clubId), {});
  const [edited, setEdited] = useState(false);
  const sliderValue = Math.min(total, Math.max(0, Number(position) || 0));
  const label = byChapter ? "Último capítulo concluído" : "Página atual";
  const chapterPosition = sliderValue === 0 ? "Ainda não comecei" :
    titles[sliderValue - 1] ?? `Capítulo ${sliderValue}`;

  function edit(value: string) {
    setPosition(value);
    setEdited(true);
  }

  return (
    <section className={styles.progressSection} aria-labelledby="progress-title">
      <h2 id="progress-title">Progresso de leitura</h2>
      <div className={styles.progressLayout}>
        <form action={submit} onSubmit={() => setEdited(false)} className={styles.progressForm}>
          <input type="hidden" name="revision" value={revision} />
          <div className={styles.field}>
            <label htmlFor={byChapter ? "reading-slider" : "reading-position"}>{label}</label>
            <input id="reading-slider" type="range" min={0} max={total} step={1} value={sliderValue}
              aria-label={`${label}, barra editável`} aria-valuetext={byChapter ? `${chapterPosition}, ${sliderValue} de ${total} capítulos` : `${sliderValue} de ${total} páginas`}
              onChange={(event) => edit(event.target.value)}
              style={{ "--fill": `${sliderValue / total * 100}%` } as CSSProperties} />
            {byChapter ? (
              <>
                <input type="hidden" name="progress" value={sliderValue} />
                <output htmlFor="reading-slider">
                  <strong>{chapterPosition}</strong> · {sliderValue} de {total} capítulos
                </output>
              </>
            ) : <div className={styles.position}>
              <input id="reading-position" name="progress" type="number" required min={0} max={total} step={1} inputMode="numeric"
                value={position} onChange={(event) => edit(event.target.value)} aria-describedby="reading-total" />
              <span id="reading-total">de {total} páginas</span>
            </div>}
          </div>
          {shortcuts.length > 0 && (
            <fieldset className={styles.chapterShortcuts}>
              <legend>Início dos capítulos</legend>
              <div className={styles.chapterCards}>
                {shortcuts.map(({ title, page }, index) => (
                  <button key={index} type="button" className={styles.chapterCard}
                    aria-pressed={sliderValue === page} onClick={() => edit(String(page))}>
                    <strong>{title}</strong>
                    <span>Pág. {page}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "Salvando…" : "Salvar progresso"}
          </button>
          {!edited && state.error && <p className={styles.error} role="alert">{state.error}</p>}
          <p role="status" className={styles.feedback}>
            {!edited && state.saved && !pending && (
              <span className={styles.reveal}><Check size={16} aria-hidden /> Progresso atualizado.</span>
            )}
          </p>
        </form>
        <ul className={styles.members} aria-label="Progresso dos membros">
          {members.map(({ id, name, progress, self }) => {
            const memberName = self ? `${name} (você)` : name;
            const value = progress === null ? "Ainda sem registro" : byChapter
              ? `${progress} de ${total} capítulos` : `Pág. ${progress} de ${total}`;
            return (
              <li key={id} className={styles.member}>
                <span aria-hidden="true" className={styles.avatar}>{name.split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase()}</span>
                <div>
                  <div className={styles.memberLabel}><strong>{memberName}</strong><span>{value}</span></div>
                  <div className={styles.meter} role="progressbar" aria-label={`Progresso de ${memberName}`}
                    aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress ?? 0} aria-valuetext={value}>
                    <span style={{ transform: `scaleX(${(progress ?? 0) / total})` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
