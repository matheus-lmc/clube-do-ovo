import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

test("anuncia a espera e mantém as linhas fora da árvore de acessibilidade", async () => {
  const { Skeleton } = await import("@/components/ui/skeleton");
  const html = renderToStaticMarkup(createElement(Skeleton, { label: "Buscando edições…", rows: 3, cover: true }));
  expect(html).toContain('role="status"');
  expect(html).toContain("Buscando edições…");
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain('role="option"');
  expect(html.match(/data-skeleton-row/g)).toHaveLength(3);
});
