"use client";

import { Suspense, use, useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { layoutChapterShortcuts } from "@/lib/club-rules";
import { saveProgress } from "../actions";
import styles from "../clubs.module.css";

type Member = { id: string; name: string; progress: number | null; self: boolean };

type Shortcut = { title: string; page: number };

function ChapterTimeline({ source, page, total, onSelect }: {
  source: Promise<Shortcut[]>; page: number; total: number; onSelect: (page: string) => void;
}) {
  const shortcuts = use(source);
  const rail = useRef<HTMLDivElement>(null);
  const [railWidth, setRailWidth] = useState(0);
  const active = shortcuts.findLastIndex((shortcut) => shortcut.page <= page);
  const cardWidth = Math.min(108, railWidth);
  const cards = railWidth ? layoutChapterShortcuts(shortcuts.map((shortcut) => shortcut.page),
    total, railWidth, cardWidth, Math.max(0, active)) : [];
  const previous = active >= 0 && page === shortcuts[active].page ? active - 1 : active;

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setRailWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!shortcuts.length) return null;

  return (
    <div role="group" aria-label="Início dos capítulos" className={styles.chapterTimeline}>
      <div className={styles.chapterAxis} aria-hidden="true">
        {shortcuts.map(({ page }, index) => (
          <span key={index} className={styles.chapterMarker} data-current={index === active}
            style={{ left: `${page / total * 100}%` }} />
        ))}
      </div>
      <div ref={rail} className={styles.chapterRail}>
        {cards.map(({ index, left }) => {
          const { title, page } = shortcuts[index];
          return (
            <button key={index} type="button" className={styles.chapterCard} title={title}
              style={{ left, width: cardWidth }} aria-current={index === active ? "true" : undefined}
              onClick={() => onSelect(String(page))}>
              <strong>{title}</strong>
              <span>Pág. {page}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.chapterNavigation}>
        <button type="button" className={styles.chapterStep} aria-label="Capítulo anterior" disabled={previous < 0}
          onClick={() => onSelect(String(shortcuts[previous].page))}><ArrowLeft size={17} aria-hidden /></button>
        <button type="button" className={styles.chapterStep} aria-label="Próximo capítulo" disabled={active + 1 >= shortcuts.length}
          onClick={() => onSelect(String(shortcuts[active + 1].page))}><ArrowRight size={17} aria-hidden /></button>
        <span>{active < 0 ? "Antes do primeiro capítulo" : `Capítulo ${active + 1} de ${shortcuts.length}`}</span>
      </div>
    </div>
  );
}

export function ReadingProgress({ clubId, revision, total, byChapter, titles, shortcuts, members }: {
  clubId: string; revision: number; total: number; byChapter: boolean; titles: string[]; shortcuts: Promise<Shortcut[]> | null; members: Member[];
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
            <div className={styles.sliderTrack}>
              <input id="reading-slider" type="range" min={0} max={total} step={1} value={sliderValue}
                aria-label={`${label}, barra editável`} aria-valuetext={byChapter ? `${chapterPosition}, ${sliderValue} de ${total} capítulos` : `${sliderValue} de ${total} páginas`}
                onChange={(event) => edit(event.target.value)}
                style={{ "--fill": `${sliderValue / total * 100}%` } as CSSProperties} />
              {shortcuts && (
                <Suspense fallback={<div className={styles.chapterTimelinePlaceholder} aria-hidden="true" />}>
                  <ChapterTimeline source={shortcuts} page={sliderValue} total={total} onSelect={edit} />
                </Suspense>
              )}
            </div>
          </div>
          <div className={styles.progressFooter}>
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
            <button type="submit" className={styles.primary} disabled={pending}>
              {pending ? "Salvando…" : "Salvar progresso"}
            </button>
          </div>
          {!edited && state.error && <p className={styles.error} role="alert">{state.error}</p>}
          <p role="status" className={styles.feedback}>
            {!edited && state.saved && !pending && (
              <span className={styles.reveal}><Check size={16} aria-hidden /> Progresso atualizado.</span>
            )}
          </p>
        </form>
        <section className={styles.memberProgress} aria-labelledby="member-progress-title">
          <h3 id="member-progress-title">Progresso dos membros</h3>
          <ul className={styles.members}>
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
        </section>
      </div>
    </section>
  );
}
