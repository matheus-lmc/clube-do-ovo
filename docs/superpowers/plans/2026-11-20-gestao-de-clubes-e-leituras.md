# Plano de gestão de clubes e leituras

Referência [spec](../specs/2026-11-20-gestao-de-clubes-e-leituras-design.md).

1. Em `tests/integration/club-actions.test.ts`, testar antes as ações `renameClub` e `deleteClub` com líder, não líder, nome inválido e confirmação ausente. Implementar em `src/app/clubes/actions.ts` com filtro por líder na própria gravação, revalidação e retorno à lista na exclusão.
2. Testar revisão obsoleta, leitura ausente, remoção confirmada e regras de edição. Migrar `Club` para leitura opcional com `readingStartedAt` e `readingRevision`. Serializar mudanças, gravação de progresso e adesão via bloqueio da linha do clube em transação. Validar a migração e a concorrência com PostgreSQL descartável.
3. Exercitar no Playwright os controles de líder, cancelamento e os estados sem leitura. Reusar o seletor da criação em um formulário de leitura e atualizar detalhe, lista, home e convite.
4. Testar as transições de carregamento com respostas controladas. Reusar uma base de skeleton na busca, sugestão de sumário, prévia do convite e fallbacks de Suspense. Manter a navegação por teclado e respeitar movimento reduzido.
5. Rodar testes, typecheck, lint e build. Registrar verificações que dependam de infraestrutura indisponível.
