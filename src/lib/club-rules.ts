export function inviteCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^[A-Za-z0-9]{6}$/.test(code) ? code.toUpperCase() : null;
}

export function isbnValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();
  return /^(?:\d{13}|\d{9}[\dX])$/.test(isbn) ? isbn : null;
}

export function canonicalIsbn(isbn: string): string {
  if (isbn.length !== 10) return isbn;
  const prefix = `978${isbn.slice(0, -1)}`;
  const sum = Array.from(prefix, (digit, index) => Number(digit) * (index % 2 === 0 ? 1 : 3))
    .reduce((total, digit) => total + digit, 0);
  return prefix + ((10 - sum % 10) % 10);
}

export function editionSearchQuery(value: string) {
  const isbn = isbnValue(value);
  return isbn ? `isbn:${isbn}` : value.trim();
}

export function uniqueEditions<T extends { id: string; isbn: string | null }>(editions: T[]) {
  const seen = new Set<string>();
  return editions.filter((edition) => {
    const key = edition.isbn ? canonicalIsbn(edition.isbn) : `volume:${edition.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function chapterSuggestion(contents: unknown): number | null {
  if (!Array.isArray(contents)) return null;

  const chapterHeading = /^(?:cap[íi]tulo|chapter|chapitre)\s+[\p{L}\d]/iu;
  const chapters = contents.filter((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    return ["label", "title"].some((key) => {
      const value: unknown = Reflect.get(item, key);
      return typeof value === "string" && chapterHeading.test(value.trim());
    });
  });

  return chapters.length > 0 && chapters.length <= 1000 ? chapters.length : null;
}

export function progressValue(value: unknown, max: number): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const position = Number(value);
  return Number.isSafeInteger(position) && position <= max ? position : null;
}

export function parseChapterTitles(value: unknown): string[] | null {
  if (value === null) return [];
  if (typeof value !== "string" || value.length > 302_000) return null;
  const titles = value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
  return titles.length <= 1000 && titles.every((title) => title.length <= 300) ? titles : null;
}

function contentsEntries(contents: unknown) {
  if (!Array.isArray(contents)) return [];
  return contents.slice(0, 1000).flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const title = ["title", "label"].map((key) => Reflect.get(entry, key))
      .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    const clean = title?.replace(/\s+/g, " ").trim();
    if (!clean || /^(pref[áa]cio|sum[áa]rio|[íi]ndice|ap[êe]ndice|bibliografia|agradecimentos|preface|appendix|acknowledgments)(?:$|[\s:])/iu.test(clean)) return [];
    if (clean.length > 300) return [];
    const page: unknown = Reflect.get(entry, "pagenum");
    return [{ title: clean, page }];
  });
}

export function contentsTitles(contents: unknown): string[] {
  return contentsEntries(contents).map(({ title }) => title);
}

export function chapterShortcuts(contents: unknown, max: number) {
  return contentsEntries(contents).flatMap(({ title, page }) => {
    const number = progressValue(typeof page === "number" ? String(page) : page, max);
    return number ? [{ title, page: number }] : [];
  }).sort((first, second) => first.page - second.page);
}
