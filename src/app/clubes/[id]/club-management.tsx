"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { deleteClub, removeReading, renameClub } from "../actions";
import { CreateClubForm, type ReadingEdit } from "../novo/create-form";
import styles from "../clubs.module.css";

type Danger = { label: string; description: string; action: (state: { error?: string }, form: FormData) => Promise<{ saved?: boolean; error?: string }>; revision?: number };

function ConfirmChange({ danger, descriptionId, cancel, done }: { danger: Danger; descriptionId: string; cancel: () => void; done: () => void }) {
  const [state, action, pending] = useActionState(async (state: { error?: string }, form: FormData) => {
    const result = await danger.action(state, form);
    if (result.saved) done();
    return result;
  }, {});
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelButton.current?.focus(); }, []);
  return (
    <form action={action} className={styles.editorForm} aria-busy={pending}>
      <p id={descriptionId}>{danger.description}</p>
      <input type="hidden" name="confirm" value="yes" />
      {danger.revision !== undefined && <input type="hidden" name="revision" value={danger.revision} />}
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <div className={styles.editorActions}>
        <button ref={cancelButton} type="button" className={styles.button} onClick={cancel} disabled={pending}>Cancelar</button>
        <button className={styles.dangerSubmit} disabled={pending}>
          {pending ? "Processando…" : `Confirmar: ${danger.label.toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}

function ManagementDialog({ label, title, icon, primary, danger, children }: {
  label: string; title: string; icon: ReactNode; primary?: boolean; danger?: Danger;
  children: (close: () => void, saved: (message: string) => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dangerButton = useRef<HTMLButtonElement>(null);
  const returnToDanger = useRef(false);
  const heading = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const close = () => setOpen(false);
  const saved = (message: string) => { setNotice(message); close(); };
  const isSaving = () => Boolean(ref.current?.querySelector('form[aria-busy="true"]'));
  function cancelConfirmation() {
    returnToDanger.current = true;
    setConfirm(false);
  }

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);

  useEffect(() => {
    if (!confirm && returnToDanger.current) {
      dangerButton.current?.focus();
      returnToDanger.current = false;
    }
  }, [confirm]);

  return (
    <>
      <div className={styles.editorTrigger}>
        <button ref={trigger} type="button" className={primary ? styles.primary : styles.button} aria-haspopup="dialog"
          onClick={() => { setNotice(""); setOpen(true); }}>
          {icon} {label}
        </button>
        <p className={styles.feedback} role="status">{notice}</p>
      </div>
      <dialog ref={ref} className={styles.editor} aria-labelledby={heading} aria-describedby={confirm ? descriptionId : undefined}
        onClose={() => { setOpen(false); setConfirm(false); trigger.current?.focus(); }}
        onCancel={(event) => {
          if (isSaving()) event.preventDefault();
          else if (confirm) { event.preventDefault(); cancelConfirmation(); }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (isSaving()) return;
          if (confirm) cancelConfirmation();
          else close();
        }}>
        {open && (
          <>
            <header className={styles.editorHeader}><h2 id={heading}>{confirm && danger ? danger.label : title}</h2></header>
            <div hidden={confirm}>
              {children(close, saved)}
              {danger && (
                <div className={styles.editorDanger}>
                  <button ref={dangerButton} type="button" className={styles.dangerLink} onClick={() => { if (!isSaving()) setConfirm(true); }}>
                    <Trash2 size={16} aria-hidden /> {danger.label}
                  </button>
                </div>
              )}
            </div>
            {confirm && danger && <ConfirmChange danger={danger} descriptionId={descriptionId} cancel={cancelConfirmation}
              done={() => saved("Livro removido.")} />}
          </>
        )}
      </dialog>
    </>
  );
}

function RenameForm({ id, name, close, saved }: { id: string; name: string; close: () => void; saved: () => void }) {
  const [value, setValue] = useState(name);
  const [state, action, pending] = useActionState(async (state: { error?: string }, form: FormData) => {
    const result = await renameClub(id, state, form);
    if (result.saved) saved();
    return result;
  }, {});
  return (
    <form action={action} className={styles.editorForm} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="rename-club">Nome do clube</label>
        <input id="rename-club" name="name" value={value} onChange={(event) => setValue(event.target.value)}
          required maxLength={60} readOnly={pending} />
      </div>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <div className={styles.editorActions}>
        <button type="button" className={styles.button} onClick={close} disabled={pending}>Cancelar</button>
        <button className={styles.primary} disabled={pending || !value.trim() || value.trim() === name}>
          {pending ? "Salvando…" : "Salvar nome"}
        </button>
      </div>
    </form>
  );
}

export function ClubSettings({ id, name }: { id: string; name: string }) {
  return (
    <ManagementDialog label="Editar clube" title="Configurações do clube" icon={<Settings size={17} aria-hidden />}
      danger={{
        label: "Excluir clube",
        description: `Excluir “${name}” é definitivo. A exclusão remove os vínculos e o progresso dos membros e invalida o convite.`,
        action: deleteClub.bind(null, id),
      }}>
      {(close, saved) => <RenameForm id={id} name={name} close={close} saved={() => saved("Nome atualizado.")} />}
    </ManagementDialog>
  );
}

export function ReadingEditor({ reading }: { reading: ReadingEdit }) {
  const { book, clubId, revision } = reading;
  const label = book ? "Editar livro do mês" : "Adicionar livro";
  return (
    <ManagementDialog label={label} title={label} primary={!book}
      icon={book ? <Pencil size={16} aria-hidden /> : <Plus size={18} aria-hidden />}
      danger={book ? {
        label: "Remover livro",
        description: `Remover “${book.title}” apaga o progresso desta leitura para todos os membros.`,
        action: removeReading.bind(null, clubId),
        revision,
      } : undefined}>
      {(close, saved) => <CreateClubForm reading={reading} onCancel={close} onSaved={() => saved("Livro do mês atualizado.")} />}
    </ManagementDialog>
  );
}
