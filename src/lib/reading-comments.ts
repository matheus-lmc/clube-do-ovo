import { progressValue } from "./club-rules";

export function parseComment(rawPage: FormDataEntryValue | null, rawBody: FormDataEntryValue | null, total: number) {
  const page = progressValue(rawPage, total);
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  return page && body.length >= 1 && body.length <= 500 ? { page, body } : null;
}

export function groupCommentPages(pages: number[], total: number, width: number) {
  const groups: { center: number; pages: number[] }[] = [];
  for (const page of [...new Set(pages)].sort((a, b) => a - b)) {
    const center = Math.max(24, Math.min(width - 24, 10 + (width - 20) * page / total));
    const previous = groups.at(-1);
    if (previous && center - previous.center < 50) previous.pages.push(page);
    else groups.push({ center, pages: [page] });
  }
  return groups;
}

export function profilePhoto(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    const allowed = ["lh3.googleusercontent.com"];
    if (url.protocol === "https:" && !url.port && !url.username && !url.password && allowed.includes(url.hostname)) return url.href;
  } catch {
    return undefined;
  }
}
