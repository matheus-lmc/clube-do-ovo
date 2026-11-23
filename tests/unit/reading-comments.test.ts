import { expect, it } from "vitest";
import { groupCommentPages, parseComment, profilePhoto } from "@/lib/reading-comments";

it("valida páginas e texto de comentários", () => {
  expect(parseComment("12", "  Minha nota  ", 12)).toEqual({ page: 12, body: "Minha nota" });
  for (const page of ["0", "13", "1.5"]) expect(parseComment(page, "Nota", 12)).toBeNull();
  expect(parseComment("12", " ", 12)).toBeNull();
});

it("agrupa páginas com alvos sobrepostos", () => {
  expect(groupCommentPages([74, 1, 74, 81, 192], 192, 280).map(group => group.pages)).toEqual([[1], [74, 81], [192]]);
});

it("aceita só as fotos HTTPS do provedor configurado", () => {
  expect(profilePhoto("https://lh3.googleusercontent.com/photo")).toBe("https://lh3.googleusercontent.com/photo");
  for (const value of [null, "x".repeat(2049), "invalid", "http://lh3.googleusercontent.com/photo",
    "https://lh3.googleusercontent.com:444/photo", "https://user:pass@lh3.googleusercontent.com/photo",
    "https://other.example/photo", "https://user@lh3.googleusercontent.com/photo"]) {
    expect(profilePhoto(value)).toBeUndefined();
  }
});
