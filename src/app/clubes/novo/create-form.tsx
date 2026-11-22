"use client";

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { BookEdition } from "@/lib/book-editions";
import { Skeleton } from "@/components/ui/skeleton";
import { createClub, saveReading } from "../actions";
import { Cover } from "../cover";
import styles from "../clubs.module.css";

type Results = { query: string; items?: BookEdition[]; error?: boolean };

function editionDescription(book: BookEdition) {
  return [book.publisher, book.year, book.pages && `${book.pages} pág.`].filter(Boolean).join(" · ");
}

export type ReadingEdit = { clubId: string; revision: number; book: BookEdition | null; chapters: number | null };

export function CreateClubForm({ requestId, reading, onCancel, onSaved }: {
  requestId?: string; reading?: ReadingEdit; onCancel?: () => void; onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(async (state: { error?: string }, form: FormData) => {
    const result = reading ? await saveReading(reading.clubId, state, form) : await createClub(state, form);
    if (result.saved) onSaved?.();
    return result;
  }, {});
  const [name, setName] = useState("");
  const [query, setQuery] = useState(reading?.book?.title ?? "");
  const [results, setResults] = useState<Results>({ query: "" });
  const [selected, setSelected] = useState<BookEdition | null>(reading?.book ?? null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pages, setPages] = useState(String(reading?.book?.pages ?? ""));
  const [suggestion, setSuggestion] = useState<{ pending: boolean; count?: number; failed?: boolean; checked?: boolean }>({ pending: false });
  const detailsRequest = useRef<AbortController | null>(null);
  const term = query.trim();
  const items = results.query === term ? results.items ?? [] : [];
  const listVisible = open && !selected && items.length > 0;
  const searching = open && !selected && term.length >= 2 && results.query !== term;

  useEffect(() => {
    if (selected || term.length < 2) return;
    const request = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ q: term });
      try {
        const response = await fetch(`/api/livros?${params}`, { signal: request.signal });
        if (!response.ok) throw new Error();
        const items: BookEdition[] = await response.json();
        if (!request.signal.aborted) setResults({ query: term, items });
      } catch {
        if (!request.signal.aborted) setResults({ query: term, error: true });
      }
    }, 260);
    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [term, selected]);

  useEffect(() => () => detailsRequest.current?.abort(), []);

  useEffect(() => {
    if (listVisible && active >= 0) {
      document.getElementById(`book-option-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [listVisible, active]);

  async function choose(book: BookEdition) {
    detailsRequest.current?.abort();
    setSelected(book);
    setQuery(book.title);
    setOpen(false);
    setActive(-1);
    if (selected?.id !== book.id) {
      const initial = reading?.book?.id === book.id ? reading : undefined;
      setPages(String(initial?.book?.pages ?? ""));
    }
    setSuggestion({ pending: true });
    const request = new AbortController();
    detailsRequest.current = request;
    const params = new URLSearchParams({ volume: book.id });
    if (book.isbn) params.set("isbn", book.isbn);

    try {
      const response = await fetch(`/api/livros?${params}`, { signal: request.signal });
      if (!response.ok) throw new Error();
      const details: { book: BookEdition; chapters: number | null; titles: string[] } = await response.json();
      if (request.signal.aborted) return;
      setSelected(details.book);
      setSuggestion({ pending: false, count: details.chapters ?? undefined, checked: true });
    } catch {
      if (!request.signal.aborted) setSuggestion({ pending: false, failed: true });
    }
  }

  function onBookKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open && !selected && term.length >= 2) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
    if (!selected && items.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = active < 0 ? (step === 1 ? 0 : items.length - 1) : (active + step + items.length) % items.length;
      setOpen(true);
      setActive(next);
    }
    if (event.key === "Enter" && listVisible && items[active]) {
      event.preventDefault();
      void choose(items[active]);
    }
  }

  const sameEdition = reading?.book?.id === selected?.id;
  const chapterTotal = (sameEdition ? reading?.chapters : null) ?? suggestion.count ?? null;
  const resetsProgress = Boolean(reading?.book && selected &&
    (!sameEdition || chapterTotal !== reading.chapters));

  return (
    <form action={action} className={reading ? styles.editorForm : styles.form} aria-busy={pending}>
      {reading ? <input type="hidden" name="revision" value={reading.revision} /> :
        <input type="hidden" name="requestId" value={requestId} />}
      {suggestion.checked && <input type="hidden" name="detectChapters" value="yes" />}
      <input type="hidden" name="volume" value={selected?.id ?? ""} />
      {!reading && <div className={styles.field}>
        <label htmlFor="club-name">Nome do clube</label>
        <input id="club-name" name="name" required maxLength={60} placeholder="Ex. Entre Páginas"
          value={name} onChange={(event) => setName(event.target.value)} />
      </div>}
      <div className={styles.field}>
        <label htmlFor="book-query">{reading ? "Buscar edição" : "Livro do mês"}</label>
        <div className={styles.searchInput}>
          <Search size={18} aria-hidden />
          <input id="book-query" type="search" role="combobox" autoComplete="off" maxLength={120}
            aria-expanded={listVisible} aria-controls="book-suggestions" aria-autocomplete="list"
            aria-activedescendant={listVisible && active >= 0 ? `book-option-${active}` : undefined}
            onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }} onKeyDown={onBookKey}
            placeholder="Título, autor ou ISBN" value={query}
            onChange={(event) => {
              detailsRequest.current?.abort();
              setSelected(null);
              if (event.target.value.trim() !== term) setResults({ query: "" });
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }} />
        </div>
        <ul id="book-suggestions" className={styles.suggestions} role="listbox" aria-label="Sugestões de livros" hidden={!listVisible} inert={!listVisible}>
          {items.map((book, index) => (
            <li key={book.id} id={`book-option-${index}`} role="option" aria-selected={index === active} className={styles.option}
              onMouseDown={(event) => event.preventDefault()} onClick={() => void choose(book)}>
              <Cover url={book.cover} />
              <div>
                <strong>{book.title}</strong>
                {book.authors && <p>{book.authors}</p>}
                <p>{editionDescription(book)}</p>
                {book.isbn && <p>ISBN {book.isbn}</p>}
              </div>
            </li>
          ))}
        </ul>
        {searching && <Skeleton label="Buscando edições…" rows={3} cover />}
        <p role="status" className={styles.searchStatus}>
          {open && !selected && term.length >= 2 && results.query === term && (
            results.error ? "A busca está indisponível. Edite o termo para tentar novamente."
              : !items.length ? "Nenhuma edição encontrada." : ""
          )}
        </p>
        {selected && (
          <div className={`${styles.selectedEdition} ${styles.reveal}`}>
            <Cover url={selected.cover} />
            <div>
              <strong>{selected.title}</strong>
              <p>{editionDescription(selected)}{selected.isbn && ` · ISBN ${selected.isbn}`}</p>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <>
          {suggestion.pending ? <Skeleton label="Consultando o sumário…" /> : (
            <p role="status" className={styles.searchStatus}>
              {chapterTotal ? (
                sameEdition && reading?.chapters
                  ? `Acompanhamento por capítulos · ${chapterTotal} no total`
                  : `${chapterTotal} ${chapterTotal === 1 ? "capítulo encontrado" : "capítulos encontrados"} automaticamente na Open Library.`
              ) : suggestion.failed
                ? "Não foi possível consultar o sumário. O progresso será por páginas."
                : "O catálogo não encontrou capítulos para esta edição. O progresso será por páginas."}
            </p>
          )}
          {(!selected.pages || sameEdition) && !chapterTotal && (
            <div className={styles.field}>
              <label htmlFor="page-total">Total de páginas da edição</label>
              <input id="page-total" name="pages" type="number" min={1} max={100000} step={1}
                required={!chapterTotal && !suggestion.pending} value={pages} onChange={(event) => setPages(event.target.value)} />
              <p>{sameEdition ? "O total do catálogo tem prioridade." : "O catálogo não informou o total de páginas."}</p>
            </div>
          )}
        </>
      )}
      {resetsProgress && <label className={styles.readingWarning}><input type="checkbox" name="confirm" value="yes" required /> Confirmo que o progresso dos membros será apagado.</label>}
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <div className={reading ? styles.editorActions : undefined}>
        {onCancel && <button className={styles.button} type="button" onClick={onCancel} disabled={pending}>Cancelar</button>}
        <button className={styles.primary} type="submit" disabled={!selected || pending || suggestion.pending}>
          {reading ? (pending ? "Salvando…" : "Salvar livro") : (pending ? "Criando clube…" : "Criar clube")}
          {!reading && <ArrowRight size={17} aria-hidden />}
        </button>
      </div>
    </form>
  );
}
