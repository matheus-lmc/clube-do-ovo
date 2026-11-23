# Implementação dos comentários por página

Spec em `../specs/2026-11-23-comentarios-por-pagina-design.md`.

- [x] Persistência. Migrar o identificador da leitura ativa, fotos opcionais e comentários. Preservar o identificador em ajustes, atualizar em trocas e bloquear redução incompatível.
- [x] Servidor. Buscar metadados junto da leitura e verificar vínculo, leitura ativa e spoilers na busca dos textos. Publicar sob bloqueio do clube com revisão e UUID de envio.
- [x] Interface. Integrar a trilha acima da barra. Agrupar por espaço, abrir lateralmente e oferecer publicação junto ao progresso. Validar teclado, toque e primeira dobra.
- [x] Verificação. Executar geração Prisma, testes, lint e typecheck. Exercitar a migração e a tela em ambiente local quando disponível.

## Verificação executada

- 63 testes unitários e de integração, incluindo publicação idempotente, spoilers e troca da leitura no PostgreSQL 17 descartável.
- 9 testes no navegador. O teste de comentários publica na tela do clube, abre a prévia por mouse e toque, fecha com Esc e verifica a primeira linha do ranking em 320 × 568.
- Geração do Prisma Client, aplicação das quatro migrações no banco de teste, build do Next.js, lint, typecheck e `git diff --check`.
