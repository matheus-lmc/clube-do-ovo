# Plano de implementação do progresso por capítulos

> Executar em etapas e verificar cada mudança antes de avançar.

**Objetivo** Oferecer uma lista editável de capítulos por edição e registrar o último capítulo concluído.

**Arquitetura** Reaproveitar o endpoint de detalhes do livro e o progresso numérico existente. Persistir a lista ordenada no registro do clube e proteger alterações de posição com a revisão atual.

**Tecnologias** Next.js, Prisma, PostgreSQL e Vitest.

- [x] Medir cobertura dos sumários nacionais e da Open Library com ISBNs brasileiros. Integrar a UFSC após confirmar ganho útil.
- [x] Testar extração de títulos e validação de entrada manual. Aproveitar sumários da Open Library que trazem títulos sem rótulos.
- [x] Adicionar uma coluna de títulos com valor padrão vazio, validar a lista nas ações e preservar o progresso ao acrescentar títulos a posições existentes.
- [x] Permitir editar sugestões e títulos manuais no formulário. Mostrar o seletor no progresso e manter as opções numéricas.
- [x] Rodar testes, lint e checagem de tipos. Registrar o resultado da avaliação do catálogo nacional.

## Resultado da avaliação em 21/11/2026

A base tinha um único ISBN brasileiro cadastrado. O arquivo MARC da UFSC trouxe zero registros com esse ISBN no campo 020, após normalizar ISBN-10 e ISBN-13. A Open Library retornou HTTP 404 para o mesmo ISBN. A amostra não demonstrou ganho com a UFSC e é pequena para estimar a cobertura geral. A entrega usa Open Library e entrada manual. Uma nova rodada depende de mais edições reais dos clubes.

A alteração inclui uma migração Prisma. A publicação deve aplicar a migração no banco do ambiente de destino antes de ativar a versão.
