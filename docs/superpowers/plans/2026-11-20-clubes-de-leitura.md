# Plano de implementação dos clubes de leitura

> Executar as tarefas na ordem e registrar as verificações antes de concluir.

**Objetivo.** Disponibilizar criação, ingresso e acompanhamento da primeira leitura de clubes privados.

**Arquitetura.** Server Components leem a sessão e o PostgreSQL. Server Actions cuidam das mutações. Rotas autenticadas mediam os catálogos. Componentes cliente oferecem autocomplete, confirmação, cópia de convite e edição de progresso.

**Stack.** Next.js App Router, React, Prisma, PostgreSQL, Supabase Auth, Google Books e Open Library.

**Especificação.** [Clubes de leitura](../specs/2026-11-20-clubes-de-leitura-design.md).

## Tarefas

- [x] Escrever testes dos formatos de código e ISBN, dados parciais de catálogos, sugestão de capítulos e limites do progresso. Rodar antes de implementar.
- [x] Adicionar modelos e migração Prisma. Criar clube e associação inicial juntos. Exigir associação nas leituras e atualizações. Garantir ingresso idempotente. Testar ações com autenticação e dependências simuladas.
- [x] Implementar a busca por edição com capa e ISBN, autenticação em ambas as rotas, consulta paralela de detalhes e sumário por ISBN validado e alternativa manual quando faltar informação.
- [x] Criar lista, formulários e detalhes a partir dos mockups. Usar autocomplete acessível, ações com feedback e controle de progresso por teclado, toque ou digitação. Respeitar movimento reduzido.
- [x] Gerar cliente Prisma, validar migração, rodar lint, tipos, testes e build. Conferir os fluxos em navegador e documentar como preparar o banco e as integrações.

## Casos de revisão

- Sessão ausente e usuário que não pertence ao clube.
- Convite repetido e progresso já registrado.
- ISBN formatado, capas ou contagens ausentes, catálogos indisponíveis e dados de edições distintas.
- Valores vazios, fracionários ou acima do total.
- Sugestões que chegam fora de ordem e escolha via teclado ou toque.

## Verificação da execução

- Migração aplicada a um PostgreSQL 16 descartável. O build de produção e os testes usaram dados locais.
- O fluxo autenticado passou no Chromium em desktop e em celular. Conferimos seleção por ISBN com capa, sugestão de capítulos, criação do clube, convite, ingresso repetido e progresso persistido por página e capítulo.
- O Supabase Auth e os catálogos devolveram respostas simuladas no teste de navegador. A configuração e a migração do ambiente de destino estão descritas no README.
