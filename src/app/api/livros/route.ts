import { getBookEdition, getChapterShortcuts, searchBookEditions } from "@/lib/book-editions";
import { isbnValue, progressValue } from "@/lib/club-rules";
import { getClubUser } from "@/lib/club-session";

export async function GET(request: Request) {
  if (!await getClubUser()) return new Response(null, { status: 401 });

  const { searchParams } = new URL(request.url);
  if (searchParams.has("sumario")) {
    const isbn = isbnValue(searchParams.get("sumario"));
    const pages = progressValue(searchParams.get("paginas"), 100_000);
    if (!isbn || !pages) return new Response(null, { status: 400 });
    return Response.json(await getChapterShortcuts(isbn, pages));
  }
  const id = searchParams.get("volume");
  const query = searchParams.get("q")?.trim() ?? "";
  if (id !== null && !/^[\w-]{1,64}$/.test(id)) return new Response(null, { status: 400 });
  if (id === null && (query.length < 2 || query.length > 120)) return new Response(null, { status: 400 });

  try {
    return Response.json(id === null
      ? await searchBookEditions(query)
      : await getBookEdition(id, isbnValue(searchParams.get("isbn"))));
  } catch {
    return new Response(null, { status: 502 });
  }
}
