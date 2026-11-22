import "server-only";

import { canonicalIsbn, chapterShortcuts, contentsTitles, editionSearchQuery, isbnValue, uniqueEditions } from "@/lib/club-rules";
import { getVolume, searchVolumes, type GoogleBooksVolume } from "@/lib/google-books";

export type BookEdition = {
  id: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  year: string | null;
  isbn: string | null;
  cover: string | null;
  pages: number | null;
};

function coverUrl(info: GoogleBooksVolume["volumeInfo"]) {
  for (const image of [info.imageLinks?.thumbnail, info.imageLinks?.smallThumbnail]) {
    if (!image) continue;
    try {
      const url = new URL(image);
      const hosts = ["books.google.com", "books.googleusercontent.com"];
      if (!hosts.includes(url.hostname) || !["http:", "https:"].includes(url.protocol) ||
        url.port || url.username || url.password) continue;
      url.protocol = "https:";
      return url.href;
    } catch {
      // Try the smaller image if the primary URL is malformed.
    }
  }
  return null;
}

export function toBookEdition({ id, volumeInfo: info }: GoogleBooksVolume): BookEdition {
  const identifiers = info.industryIdentifiers ?? [];
  const isbn13 = isbnValue(identifiers.find(({ type }) => type === "ISBN_13")?.identifier);
  const isbn10 = isbnValue(identifiers.find(({ type }) => type === "ISBN_10")?.identifier);
  const pages = info.pageCount ?? 0;

  return {
    id,
    title: info.title,
    authors: info.authors?.join(", ") || null,
    publisher: info.publisher || null,
    year: info.publishedDate?.match(/^\d{4}/)?.[0] ?? null,
    isbn: isbn13 ?? isbn10,
    cover: coverUrl(info),
    pages: Number.isSafeInteger(pages) && pages > 0 && pages <= 100_000 ? pages : null,
  };
}

export async function searchBookEditions(query: string) {
  const { items } = await searchVolumes(editionSearchQuery(query), { maxResults: 20 });
  return uniqueEditions(items.map(toBookEdition)).slice(0, 8);
}

async function openLibraryContents(isbn: string): Promise<unknown> {
  try {
    const headers = new Headers({ Accept: "application/json" });
    const contact = process.env.OPEN_LIBRARY_CONTACT_EMAIL?.trim();
    if (contact) headers.set("User-Agent", `ClubeDoOvo (${contact})`);
    const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
      headers,
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    const edition = await response.json();
    const identifiers = [...(edition.isbn_10 ?? []), ...(edition.isbn_13 ?? [])];
    const expected = canonicalIsbn(isbn);
    return identifiers.some((identifier) => {
      const value = isbnValue(identifier);
      return value && canonicalIsbn(value) === expected;
    }) ? edition.table_of_contents : null;
  } catch {
    return null;
  }
}

export async function getChapterShortcuts(isbn: string | null, total: number) {
  const validIsbn = isbnValue(isbn);
  return validIsbn ? chapterShortcuts(await openLibraryContents(validIsbn), total) : [];
}

export async function getBookEdition(id: string, isbn: string | null = null) {
  const [volume, lookup] = await Promise.all([getVolume(id), isbn ? openLibraryContents(isbn) : null]);
  const book = toBookEdition(volume);
  const contents = !book.isbn ? null : isbn
    ? canonicalIsbn(book.isbn) === canonicalIsbn(isbn) ? lookup : null
    : await openLibraryContents(book.isbn);
  const titles = contentsTitles(contents);
  return { book, chapters: titles.length || null, titles, shortcuts: chapterShortcuts(contents, book.pages ?? 100_000) };
}
