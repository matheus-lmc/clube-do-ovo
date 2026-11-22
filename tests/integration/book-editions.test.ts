import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GET } from "@/app/api/livros/route";
import { getBookEdition, toBookEdition } from "@/lib/book-editions";
import { getClubUser } from "@/lib/club-session";
import { getVolume, searchVolumes, type GoogleBooksVolume } from "@/lib/google-books";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/club-session", () => ({ getClubUser: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const url = "http://localhost/api/livros";
const isbn = "9786580309313";
const volume: GoogleBooksVolume = {
  id: "torto-arado",
  volumeInfo: {
    title: "Torto Arado", authors: ["Itamar Vieira Junior"], publisher: "Todavia", publishedDate: "2019-07-01",
    industryIdentifiers: [{ type: "ISBN_10", identifier: "6580309318" }, { type: "ISBN_13", identifier: isbn }],
    imageLinks: { thumbnail: "http://books.google.com/books/content?id=test" }, pageCount: 264,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-only");
  vi.mocked(getClubUser).mockResolvedValue({ id: "reader", name: "Marina" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("keeps the edition metadata and cover, and handles partial or untrusted records", () => {
  expect(toBookEdition(volume)).toEqual({
    id: "torto-arado", title: "Torto Arado", authors: "Itamar Vieira Junior", publisher: "Todavia", year: "2019",
    isbn, pages: 264, cover: "https://books.google.com/books/content?id=test",
  });
  const info = { title: "Catálogo parcial", pageCount: 0, publishedDate: "s.d." };
  expect(toBookEdition({ id: "partial", volumeInfo: { ...info, imageLinks: {
    thumbnail: "invalid", smallThumbnail: "https://other.example/cover",
  } } })).toMatchObject({ authors: null, publisher: null, year: null, isbn: null, cover: null, pages: null });
  expect(toBookEdition({ id: "small", volumeInfo: { ...info, imageLinks: {
    thumbnail: "https://misleading@books.google.com/cover", smallThumbnail: "https://books.googleusercontent.com/cover",
  } } }).cover).toBe("https://books.googleusercontent.com/cover");
  expect(toBookEdition({ id: "none", volumeInfo: info }).cover).toBeNull();
});

test("requiring session and validating query protects both catalog calls", async () => {
  vi.mocked(getClubUser).mockResolvedValueOnce(null);
  expect((await GET(new Request(`${url}?q=livro`))).status).toBe(401);
  for (const search of ["", "?q=a", `?q=${"a".repeat(121)}`, "?volume=.."]) {
    expect((await GET(new Request(url + search))).status).toBe(400);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

test("searches by ISBN and exposes separate ISBNs with covers", async () => {
  const modern = { ...volume, id: "special", volumeInfo: { ...volume.volumeInfo,
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9786556927190" }] } };
  fetchMock.mockResolvedValue(Response.json({ items: [volume, { ...volume, id: "duplicate" }, modern] }));
  const response = await GET(new Request(`${url}?q=978-65-80309-31-3`));
  expect(await response.json()).toMatchObject([{ id: volume.id, isbn, cover: expect.stringMatching(/^https:/) },
    { id: modern.id, isbn: "9786556927190" }]);
  expect(fetchMock.mock.calls[0][0]).toMatchObject({ search: expect.stringContaining("q=isbn%3A9786580309313") });
});

test("queries providers together and only uses chapters from the same edition", async () => {
  let resolveGoogle!: (value: Response) => void;
  fetchMock.mockImplementation((input) => String(input).includes("googleapis")
    ? new Promise((resolve) => { resolveGoogle = resolve; })
    : Promise.resolve(Response.json({
      isbn_10: ["6580309318"], table_of_contents: [{ title: "Prefácio" }, { title: "Capítulo 1" }, { label: "Capítulo 2" }],
    })));
  const result = getBookEdition(volume.id, "6580309318");
  expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
    expect.stringContaining("googleapis"), "https://openlibrary.org/isbn/6580309318.json",
  ]);
  resolveGoogle(Response.json(volume));
  await expect(result).resolves.toMatchObject({ book: { isbn }, chapters: 2, titles: ["Capítulo 1", "Capítulo 2"] });
});

test("degrades to pages for unavailable or mismatched chapter information", async () => {
  const details = (openLibrary: () => Promise<Response>, isbnForRequest = isbn) => {
    fetchMock.mockImplementation((input) => String(input).includes("googleapis") ? Promise.resolve(Response.json(volume)) : openLibrary());
    return getBookEdition(volume.id, isbnForRequest);
  };
  await expect(details(() => Promise.reject(new Error("offline")))).resolves.toMatchObject({ chapters: null, book: { pages: 264 } });
  await expect(details(() => Promise.resolve(new Response(null, { status: 404 })))).resolves.toMatchObject({ chapters: null });
  await expect(details(() => Promise.resolve(Response.json({ isbn_13: [], table_of_contents: [{ title: "Capítulo 1" }] })))).resolves.toMatchObject({ chapters: null });
  await expect(details(() => Promise.resolve(Response.json({
    isbn_13: ["9786556927190"], table_of_contents: [{ title: "Capítulo 1" }],
  })), "9786556927190")).resolves.toMatchObject({ chapters: null });
  fetchMock.mockResolvedValue(Response.json(volume));
  await expect((await GET(new Request(`${url}?volume=torto-arado`))).json()).resolves.toMatchObject({ chapters: null });
});

test("returns a clean failure when the search provider fails", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
  expect((await GET(new Request(`${url}?q=torto`))).status).toBe(502);
  vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");
  await expect(getVolume("sample")).rejects.toThrow("GOOGLE_BOOKS_API_KEY");
});

test("Google Books validates documented search options and empty catalog responses", async () => {
  await expect(searchVolumes(" ")).rejects.toThrow();
  await expect(searchVolumes("livro", { startIndex: -1 })).rejects.toThrow(RangeError);
  await expect(searchVolumes("livro", { maxResults: 41 })).rejects.toThrow(RangeError);
  await expect(getVolume("..")).rejects.toThrow();
  fetchMock.mockResolvedValue(Response.json({ totalItems: 0 }));
  await expect(searchVolumes("livro")).resolves.toEqual({ totalItems: 0, items: [] });
});
