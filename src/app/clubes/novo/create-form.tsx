"use client";

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { BookEdition } from "@/lib/book-editions";
import { createClub } from "../actions";
import { Cover } from "../cover";
import styles from "../clubs.module.css";

type Results = { query: string; items?: BookEdition[]; error?: boolean };

function editionDescription(book: BookEdition) {
  return [book.publisher, book.year, book.pages && `${book.pages} pág.`].filter(Boolean).join(" · ");
}

export function CreateClubForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(createClub, {});
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>({ query: "" });
  const [selected, setSelected] = useState<BookEdition | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [chapters, setChapters] = useState("");
  const [pages, setPages] = useState("");
  const [suggestion, setSuggestion] = useState<{ pending: boolean; count?: number; failed?: boolean }>({ pending: false });
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
      setPages("");
      setChapters("");
    }
    setSuggestion({ pending: true });
    const request = new AbortController();
    detailsRequest.current = request;
    const params = new URLSearchParams({ volume: book.id });
    if (book.isbn) params.set("isbn", book.isbn);

    try {
      const response = await fetch(`/api/livros?${params}`, { signal: request.signal });
      if (!response.ok) throw new Error();
      const details: { book: BookEdition; chapters: number | null } = await response.json();
      if (request.signal.aborted) return;
      setSelected(details.book);
      setSuggestion({ pending: false, count: details.chapters ?? undefined });
    } catch {
      if (!request.signal.aborted) setSuggestion({ pending: false, failed: true });
    }
  }

  function onBookKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
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

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="volume" value={selected?.id ?? ""} />
      <div className={styles.field}>
        <label htmlFor="club-name">Nome do clube</label>
        <input id="club-name" name="name" required maxLength={60} placeholder="Ex. Entre Páginas"
          value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor="book-query">Livro do mês</label>
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
        <p role="status" className={styles.searchStatus}>
          {searching && "Buscando edições…"}
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
          <div className={styles.field}>
            <label htmlFor="chapter-total">Total de capítulos <span>(opcional)</span></label>
            <input id="chapter-total" name="chapters" type="number" min={1} max={1000} step={1}
              value={chapters} onChange={(event) => setChapters(event.target.value)} aria-describedby="chapter-help" />
            <p id="chapter-help">Deixe em branco para acompanhar a leitura por páginas.</p>
            <p role="status" className={styles.searchStatus}>
              {suggestion.pending && "Consultando o sumário…"}
              {suggestion.failed && "Os detalhes da edição estão indisponíveis. Você ainda pode informar os capítulos."}
            </p>
            {suggestion.failed && (
              <button className={styles.button} type="button" onClick={() => void choose(selected)}>
                Consultar edição novamente
              </button>
            )}
            {suggestion.count && (
              <button className={styles.button} type="button" onClick={() => setChapters(String(suggestion.count))}>
                Usar sugestão de {suggestion.count} {suggestion.count === 1 ? "capítulo" : "capítulos"}
              </button>
            )}
          </div>
          {!selected.pages && (
            <div className={styles.field}>
              <label htmlFor="page-total">Total de páginas da edição</label>
              <input id="page-total" name="pages" type="number" min={1} max={100000} step={1}
                required={!chapters && !suggestion.pending} value={pages} onChange={(event) => setPages(event.target.value)} />
              <p>O catálogo não informou o total de páginas.</p>
            </div>
          )}
        </>
      )}
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button className={styles.primary} type="submit" disabled={!selected || pending || suggestion.pending}>
        {pending ? "Criando clube…" : "Criar clube"} <ArrowRight size={17} aria-hidden />
      </button>
    </form>
  );
}
