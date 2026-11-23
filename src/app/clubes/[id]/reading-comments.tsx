"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { groupCommentPages } from "@/lib/reading-comments";
import { publishReadingComment, readReadingComment } from "../actions";
import styles from "../clubs.module.css";

export type CommentMarker = { id: string; page: number; authorId: string };
type Author = { id: string; name: string; avatarUrl: string | null };

function Avatar({ author }: { author?: Author }) {
  const [failed, setFailed] = useState(false);
  const initials = author?.name.trim().split(/\s+/).slice(0, 2)
    .map(part => Array.from(part)[0]).join("").toUpperCase();
  return <span className={styles.commentAvatar} aria-hidden>
    {author?.avatarUrl && !failed
      // eslint-disable-next-line @next/next/no-img-element -- provider photos already match the avatar size
      ? <img alt="" src={author.avatarUrl} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : initials || "?"}
  </span>;
}

function CommentPin({ items, members, center, width, active, onOpen, onClose, clubId, readingId }: {
  items: CommentMarker[]; members: Author[]; center: number; width: number; active: boolean;
  onOpen: (pin?: boolean) => void; onClose: () => void; clubId: string; readingId: string;
}) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [content, setContent] = useState<Awaited<ReturnType<typeof readReadingComment>>>();
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const marker = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const note = active ? items[index] ?? items[0] : items[0];
  const author = members.find(member => member.id === note.authorId);
  const reveal = revealed.includes(note.id);
  const right = width - center - 24;
  const left = center - 24;
  const opensRight = right >= 320 || right >= left;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    readReadingComment(clubId, readingId, note.id, reveal).then(
      result => { if (!cancelled) setContent(result); },
      () => { if (!cancelled) setContent({ error: "Não foi possível carregar o comentário." }); },
    );
    return () => { cancelled = true; };
  }, [active, attempt, clubId, readingId, note.id, reveal]);

  useEffect(() => {
    if (!active) return;
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const focused = panel.current?.contains(document.activeElement);
      if (focused) marker.current?.focus({ preventScroll: true });
      close();
    }
    function close() {
      setPinned(false);
      setIndex(0);
      setRevealed([]);
      setContent(undefined);
      onClose();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [active, onClose]);

  function close() {
    setPinned(false);
    setIndex(0);
    setRevealed([]);
    setContent(undefined);
    onClose();
  }

  return <div ref={panel} className={styles.commentPin} data-active={active} style={{ left: center - 24 }}
    onPointerEnter={event => {
      if (event.pointerType !== "mouse") return;
      if (timer.current) clearTimeout(timer.current);
      onOpen();
    }}
    onPointerLeave={event => {
      if (event.pointerType !== "mouse" || pinned) return;
      timer.current = setTimeout(() => {
        if (!panel.current?.contains(document.activeElement)) close();
      }, 110);
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) close();
    }}>
    <button ref={marker} type="button" className={styles.commentMarker}
      aria-expanded={active} aria-controls={`comment-${items[0].id}`}
      aria-label={`${author?.name ?? "Membro do clube"}, página ${note.page}${items.length > 1 ? `, grupo com ${items.length} comentários` : ""}`}
      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) onOpen(); }}
      onClick={() => {
        if (active && pinned) close();
        else { setPinned(true); onOpen(true); }
      }}>
      <Avatar key={author?.avatarUrl} author={author} />
      {items.length > 1 && <span className={styles.commentBadge} aria-hidden>+{items.length - 1}</span>}
    </button>
    <div id={`comment-${items[0].id}`} hidden={!active} className={styles.commentStrip}
      data-side={opensRight ? "right" : "left"} style={{ width: Math.min(320, opensRight ? right : left) }}>
      <div className={styles.commentByline}><strong>{author?.name ?? "Membro do clube"}</strong><span>Pág. {note.page}</span></div>
      <div aria-live="polite">
        {content?.body !== undefined ? <p className={styles.commentBody}>{content.body}</p>
          : content?.spoiler ? <button type="button" className={styles.chapterStep} onClick={() => {
            setContent(undefined);
            setRevealed([...revealed, note.id]);
            marker.current?.focus();
          }}>Mostrar spoiler</button>
          : content?.error ? <button type="button" className={styles.chapterStep} onClick={() => {
            setContent(undefined);
            setAttempt(attempt + 1);
            marker.current?.focus();
          }}>Tentar novamente</button>
          : <p>Carregando…</p>}
      </div>
      {items.length > 1 && <div className={styles.commentNavigation}>
        <button type="button" className={styles.chapterStep} aria-label="Comentário anterior" onClick={() => {
          setContent(undefined); setIndex((index + items.length - 1) % items.length);
        }}><ArrowLeft size={16} aria-hidden /></button>
        <span aria-live="polite">{index + 1}/{items.length}</span>
        <button type="button" className={styles.chapterStep} aria-label="Próximo comentário" onClick={() => {
          setContent(undefined); setIndex((index + 1) % items.length);
        }}><ArrowRight size={16} aria-hidden /></button>
      </div>}
    </div>
  </div>;
}

export function ReadingComments({ clubId, readingId, revision, total, selected, members, comments }: {
  clubId: string; readingId: string; revision: number; total: number; selected: number;
  members: Author[]; comments: CommentMarker[] | null;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<string>();
  const fixed = useRef<string>(null);
  const [draft, setDraft] = useState<{ id: string; page: string; body: string; isSpoiler: boolean }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function closeComposer() {
    setDraft(undefined);
    trigger.current?.focus();
  }

  async function publish() {
    if (!draft || pending) return;
    const form = new FormData();
    form.set("requestId", draft.id);
    form.set("page", draft.page);
    form.set("body", draft.body);
    form.set("isSpoiler", String(draft.isSpoiler));
    form.set("revision", String(revision));
    setPending(true);
    setError("");
    try {
      const result = await publishReadingComment(clubId, readingId, form);
      if (!result.saved) { setError(result.error ?? "Não foi possível publicar."); return; }
      closeComposer();
      setStatus(`Comentário publicado na página ${draft.page}.`);
    } catch {
      setError("Não foi possível publicar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const pages = [...new Set((comments ?? []).map(comment => comment.page))];
  const groups = width >= 48 ? groupCommentPages(pages, total, width) : [];
  return <div className={styles.comments}>
    <button type="button" ref={trigger} className={`${styles.chapterStep} ${styles.commentTrigger}`}
      aria-label="Comentar" aria-expanded={!!draft} aria-controls="reading-comment-composer"
      onClick={() => {
        if (pending) return;
        if (draft) { closeComposer(); return; }
        fixed.current = null;
        setActive(undefined);
        setError("");
        setDraft({ id: crypto.randomUUID(), page: String(selected || 1), body: "", isSpoiler: false });
      }}><Plus size={16} aria-hidden /><span>Comentar</span></button>
    <div ref={rail} className={styles.commentRail} data-empty={!pages.length} role="group" aria-label="Comentários por página">
      {width > 0 && pages.map(page => <span key={page} aria-hidden className={styles.chapterMarker}
        style={{ left: 10 + (width - 20) * page / total }} />)}
      {groups.map(group => {
        const items = (comments ?? []).filter(comment => group.pages.includes(comment.page));
        const id = items[0].id;
        return <CommentPin key={`${group.pages.join("-")}-${Boolean(draft)}`} items={items} members={members} center={group.center} width={width}
          active={active === id && !draft} onOpen={pin => {
            if (draft || (!pin && fixed.current && fixed.current !== id)) return;
            if (pin) fixed.current = id;
            setActive(id);
          }}
          onClose={() => {
            if (fixed.current === id) fixed.current = null;
            setActive(value => value === id ? undefined : value);
          }} clubId={clubId} readingId={readingId} />;
      })}
    </div>
    {comments === null && <button type="button" className={styles.chapterStep} onClick={() => router.refresh()}>Tentar carregar comentários</button>}
    <div id="reading-comment-composer" hidden={!draft} className={styles.commentComposer} aria-label="Novo comentário"
      onKeyDown={event => {
        if (event.key === "Escape" && !pending) closeComposer();
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type === "text") { event.preventDefault(); void publish(); }
      }}>
      {draft && <>
        <label htmlFor="reading-comment-page">Página</label>
        <input id="reading-comment-page" type="text" inputMode="numeric" value={draft.page} disabled={pending}
          onChange={event => setDraft({ ...draft, page: event.target.value })} />
        <label htmlFor="reading-comment-body">Comentário</label>
        <textarea autoFocus id="reading-comment-body" rows={3} maxLength={500} value={draft.body} disabled={pending}
          onChange={event => setDraft({ ...draft, body: event.target.value })} />
        <label className={styles.commentSpoiler}>
          <input type="checkbox" checked={draft.isSpoiler} disabled={pending}
            onChange={event => setDraft({ ...draft, isSpoiler: event.target.checked })} />
          Marcar como spoiler
        </label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div>
          <button type="button" className={styles.chapterStep} disabled={pending} onClick={closeComposer}>Cancelar</button>
          <button type="button" className={styles.primary} disabled={pending} onClick={() => void publish()}>
            {pending ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </>}
    </div>
    <p className={styles.feedback} role="status">{status && <span className={styles.commentAnnouncement}>{status}</span>}</p>
  </div>;
}
