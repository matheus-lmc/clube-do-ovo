// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ReadingComments } from "@/app/clubes/[id]/reading-comments";
import { publishReadingComment, readReadingComment } from "@/app/clubes/actions";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/clubes/actions", () => ({ publishReadingComment: vi.fn(), readReadingComment: vi.fn() }));

let root: Root;
let host: HTMLDivElement;
const comments = [
  { id: "note-1", page: 26, authorId: "marina" },
  { id: "note-2", page: 27, authorId: "rafael" },
  { id: "note-3", page: 90, authorId: "unknown" },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 320 } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    disconnect() {}
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function render(items: typeof comments | null = comments, selected = 25) {
  await act(async () => root.render(<ReadingComments clubId="club" readingId="reading" revision={3} total={120}
    selected={selected} comments={items} members={[
      { id: "marina", name: "Marina Costa", avatarUrl: "https://lh3.googleusercontent.com/portrait" },
      { id: "rafael", name: "Rafael Lima", avatarUrl: null },
    ]} />));
}

function button(name: string) {
  const match = [...host.querySelectorAll("button")].find(el => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name);
  expect(match).toBeDefined();
  return match!;
}

async function click(name: string) {
  await act(async () => button(name).click());
}

test("abre grupos, navega entre avatares e revela só o comentário escolhido", async () => {
  vi.mocked(readReadingComment).mockImplementation(async (_club, _reading, id, reveal) =>
    id === "note-2" && !reveal ? { spoiler: true } : { body: id === "note-2" ? "Segredo" : "Primeira nota" });
  await render();
  const pin = button("Marina Costa, página 26, grupo com 2 comentários");
  await act(async () => pin.click());
  expect(pin.getAttribute("aria-expanded")).toBe("true");
  expect(host.textContent).toContain("Primeira nota");
  await act(async () => host.querySelector("img")?.dispatchEvent(new Event("error")));
  expect(pin.textContent).toContain("MC");
  await click("Próximo comentário");
  expect(host.textContent).toContain("RL");
  expect(host.textContent).not.toContain("Segredo");
  await click("Mostrar spoiler");
  expect(readReadingComment).toHaveBeenLastCalledWith("club", "reading", "note-2", true);
  expect(host.textContent).toContain("Segredo");
  await click("Comentário anterior");
  await click("Próximo comentário");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
  expect(pin.getAttribute("aria-expanded")).toBe("false");
  await click("Marina Costa, página 26, grupo com 2 comentários");
  await click("Próximo comentário");
  expect(readReadingComment).toHaveBeenLastCalledWith("club", "reading", "note-2", false);
});

test("preserva o rascunho na falha e inclui a opção de spoiler na publicação", async () => {
  vi.mocked(publishReadingComment).mockResolvedValueOnce({ error: "Tente novamente." }).mockResolvedValueOnce({ saved: true });
  await render([], 0);
  await click("Comentar");
  expect(host.querySelector<HTMLInputElement>("#reading-comment-page")?.value).toBe("1");
  await act(async () => host.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
  await click("Publicar");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Tente novamente.");
  expect(host.querySelector<HTMLInputElement>('[type="checkbox"]')?.checked).toBe(true);
  await click("Publicar");
  const sent = vi.mocked(publishReadingComment).mock.calls[1][2];
  expect(sent.get("isSpoiler")).toBe("true");
  expect(sent.get("revision")).toBe("3");
  expect(sent.get("requestId")).toBe(vi.mocked(publishReadingComment).mock.calls[0][2].get("requestId"));
  expect(host.querySelector('[role="status"]')?.textContent).toContain("página 1");
  await click("Comentar");
  await click("Cancelar");
  expect(button("Comentar").getAttribute("aria-expanded")).toBe("false");
});

test("oferece nova tentativa para falhas de metadados e texto", async () => {
  await render(null);
  await click("Tentar carregar comentários");
  expect(refresh).toHaveBeenCalledOnce();
  await render();
  vi.mocked(readReadingComment).mockRejectedValueOnce(new Error("falha")).mockResolvedValueOnce({ body: "Recuperado" });
  await click("Membro do clube, página 90");
  await click("Tentar novamente");
  expect(host.textContent).toContain("Recuperado");
  await click("Membro do clube, página 90");
  expect(button("Membro do clube, página 90").getAttribute("aria-expanded")).toBe("false");
});
