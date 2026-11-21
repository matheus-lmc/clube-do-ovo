import "server-only";

const volumesUrl = "https://www.googleapis.com/books/v1/volumes";

export type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    categories?: string[];
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    language?: string;
    infoLink?: string;
  };
};

export type GoogleBooksSearchResult = {
  totalItems: number;
  items: GoogleBooksVolume[];
};

type SearchOptions = {
  startIndex?: number;
  maxResults?: number;
};

async function request<T>(url: URL): Promise<T> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Defina GOOGLE_BOOKS_API_KEY para consultar o Google Books.");
  }

  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`Google Books retornou HTTP ${response.status}.`);
  }

  return response.json();
}

export async function searchVolumes(
  query: string,
  { startIndex = 0, maxResults = 10 }: SearchOptions = {},
): Promise<GoogleBooksSearchResult> {
  const term = query.trim();

  if (!term) {
    throw new Error("Informe um termo de busca.");
  }
  if (!Number.isSafeInteger(startIndex) || startIndex < 0) {
    throw new RangeError("startIndex deve ser um inteiro não negativo.");
  }
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 40) {
    throw new RangeError("maxResults deve ser um inteiro entre 1 e 40.");
  }

  const url = new URL(volumesUrl);
  url.searchParams.set("q", term);
  url.searchParams.set("printType", "books");
  url.searchParams.set("startIndex", String(startIndex));
  url.searchParams.set("maxResults", String(maxResults));

  const { totalItems, items = [] } =
    await request<Omit<GoogleBooksSearchResult, "items"> & { items?: GoogleBooksVolume[] }>(url);

  return { totalItems, items };
}

export async function getVolume(volumeId: string): Promise<GoogleBooksVolume> {
  const id = volumeId.trim();

  if (!id || id === "." || id === "..") {
    throw new Error("Informe um ID de volume válido.");
  }

  return request<GoogleBooksVolume>(new URL(`${volumesUrl}/${encodeURIComponent(id)}`));
}
