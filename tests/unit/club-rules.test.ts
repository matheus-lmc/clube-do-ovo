import { describe, expect, it } from "vitest";
import { chapterSuggestion, editionSearchQuery, inviteCode, progressValue, uniqueEditions } from "@/lib/club-rules";

describe("club rules", () => {
  it("accepts six alphanumeric invite characters and normalizes case", () => {
    expect(inviteCode("  folh42 ")).toBe("FOLH42");
    expect(inviteCode("FOLH4")).toBeNull();
    expect(inviteCode("FOR@42")).toBeNull();
  });

  it("normalizes a formatted ISBN for a dedicated edition search", () => {
    expect(editionSearchQuery("978-65-80309-31-3")).toBe("isbn:9786580309313");
    expect(editionSearchQuery("  Torto Arado  ")).toBe("Torto Arado");
  });

  it("groups duplicate ISBNs while preserving distinct or unidentified editions", () => {
    const editions = [{ id: "a", isbn: "1" }, { id: "b", isbn: "1" }, { id: "c", isbn: "2" }, { id: "d", isbn: null }];
    expect(uniqueEditions(editions)).toEqual([editions[0], editions[2], editions[3]]);
  });

  it("suggests the count of explicit chapters and excludes headings without certainty", () => {
    expect(chapterSuggestion([{ title: "Prefácio" }, { title: "Capítulo 1" }, { label: "Chapter II", title: "Início" }, { title: "Apêndice" }])).toBe(2);
    expect(chapterSuggestion([{ title: "Parte I" }, { title: "Parte II" }])).toBeNull();
    expect(chapterSuggestion([{ title: "  " }, null])).toBeNull();
  });

  it("accepts exact integer progress including zero and the last page", () => {
    expect(progressValue("0", 264)).toBe(0);
    expect(progressValue("264", 264)).toBe(264);
    for (const invalid of ["", " ", "-1", "2.5", "1e2", "265"]) expect(progressValue(invalid, 264)).toBeNull();
  });
});

it("extrai títulos do sumário e valida a lista manual", async () => {
  const { contentsTitles, parseChapterTitles } = await import("@/lib/club-rules");
  expect(contentsTitles([{ title: "O encontro" }, { title: "O retorno" }])).toEqual(["O encontro", "O retorno"]);
  expect(parseChapterTitles(" O encontro \r\n\nO retorno ")).toEqual(["O encontro", "O retorno"]);
  expect(parseChapterTitles("x".repeat(301))).toBeNull();
});

it("usa apenas páginas de início informadas no sumário e dentro da edição", async () => {
  const { chapterShortcuts } = await import("@/lib/club-rules");
  expect(chapterShortcuts([
    { title: "Prefácio", pagenum: "2" },
    { title: "Primeiro capítulo", pagenum: "7" },
    { label: "Capítulo 2", pagenum: 23 },
    { title: "Sem página", pagenum: "" },
    { title: "Fora da edição", pagenum: "101" },
    { title: "Página romana", pagenum: "iv" },
  ], 100)).toEqual([{ title: "Primeiro capítulo", page: 7 }, { title: "Capítulo 2", page: 23 }]);
});

it("prioriza o capítulo atual sem empilhar cards quando o sumário é denso", async () => {
  const { layoutChapterShortcuts } = await import("@/lib/club-rules");
  const pages = Array.from({ length: 100 }, (_, index) => index + 1);
  const cards = layoutChapterShortcuts(pages, 100, 320, 80, 49);
  expect(cards.some(({ index }) => index === 49)).toBe(true);
  expect(cards.length).toBeLessThanOrEqual(3);
  expect(cards.every(({ left }, index) => index === 0 || left >= cards[index - 1].left + 88)).toBe(true);
});
