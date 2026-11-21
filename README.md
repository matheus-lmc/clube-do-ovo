# Clube do Ovo

Base do site em Next.js com App Router, TypeScript, Tailwind CSS 4, shadcn/ui e Supabase.

## Desenvolvimento local

Use Node.js 24 e npm.

```bash
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000). A página inicial fica em `src/app/page.tsx` e abre sem uma conta do Supabase configurada.

## Supabase

Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a URL e a chave publicável do seu projeto. Depois, reinicie o servidor de desenvolvimento. [Documentação do Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

Use `@/lib/supabase/client` em componentes do navegador e `@/lib/supabase/server` em código do servidor. O proxy em `src/proxy.ts` renova as sessões do Supabase Auth por cookies quando houver uma sessão.

## Login com Google e Apple

Defina `AUTH_APP_URL=http://localhost:3000` em desenvolvimento e a origem HTTPS do site em produção. Abra o app na mesma origem configurada. No Supabase, aponte a **Site URL** para a origem de produção e adicione cada URL exata do aplicativo terminada em `/auth/callback` à lista de redirecionamentos, inclusive `http://localhost:3000/auth/callback` para uso local. Mantenha novos cadastros habilitados para criar a conta no primeiro login. [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)

- **Google.** Crie um cliente OAuth Web e configure a tela de consentimento. Cadastre a URL de callback indicada pelo Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`. Adicione o client ID e o secret ao provedor Google no Supabase. Em modo de teste, inclua os usuários de teste quando exigido. [Supabase e Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- **Apple.** Confirme o pré-requisito da Apple de um app elegível com Sign in with Apple e associe o Services ID ao App ID primário. Cadastre o domínio e a URL HTTPS de callback **do Supabase** na Apple. Coloque o Services ID e o client secret no provedor Apple do Supabase. Guarde a chave `.p8` fora do repositório e renove o client secret antes de expirar, dentro do limite de seis meses. Depois de configurar o provedor, use `AUTH_APPLE_ENABLED=true` no ambiente de teste e valide o login antes de ativá-lo em produção. [Apple Developer](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple) · [Supabase e Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)

A home oferece o link **Entrar**. Após a autorização, `/conta` oferece acesso a **Meus clubes** e a opção de sair deste navegador.

## Prisma e PostgreSQL

No painel do Supabase, abra **Connect** e copie a string PostgreSQL do **Session pooler** (porta 5432). Defina `DATABASE_URL` no `.env` ou no `.env.local`, substitua o marcador pela senha do banco e use `sslmode=require`. Codifique caracteres especiais da senha no formato de URL. Se quiser uma conexão dedicada para os comandos do Prisma, configure também `DIRECT_URL` com a string de conexão direta. [Conexões do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

Use `getPrisma()` de `@/lib/prisma` em código do servidor que execute no runtime Node.js. O schema inicial está em `prisma/schema.prisma`. Se o banco já tiver tabelas, use `npx prisma db pull` para importar os modelos. Rode `npm run db:generate` depois de alterar o schema.

### Clubes de leitura

- Aplique a migração com `npx prisma migrate deploy` apontando para o banco do ambiente desejado.
- Defina `GOOGLE_BOOKS_API_KEY` para buscar livros. A Open Library é consultada por ISBN para sugerir capítulos. Configure `OPEN_LIBRARY_CONTACT_EMAIL` com o contato técnico da aplicação para identificar consultas frequentes.
- Acesse **Meus clubes** pela página da conta. O líder escolhe uma edição, confirma a contagem de capítulos quando quiser usar esse modo e recebe o código de convite. Cada membro salva seu próprio progresso.

## shadcn/ui

O projeto usa o preset Nova com Base UI. O componente `Button` está em `src/components/ui/button.tsx`. Para adicionar outro componente, por exemplo:

```bash
npx shadcn@latest add input
```

## Verificações

```bash
npm run lint
npm run typecheck
npm run test:coverage
npx playwright install chromium
npm run test:e2e
```

Use `npm run test:watch` no ciclo TDD. Escreva um teste para o comportamento esperado, veja a asserção falhar, implemente a mudança e rode a suíte antes de refatorar.

- `npm run test:unit` verifica as regras de configuração do login.
- `npm run test:integration` verifica o callback e seus redirecionamentos com o cliente Supabase simulado.
- `npm run test:e2e` compila o app e roda os fluxos de visitante no Chromium com credenciais de teste. O servidor usa a porta 3100.
- `npm run test:coverage` mede linhas, instruções, funções e ramificações de `src` nos testes unitários e de integração, excluindo código gerado. Abra `coverage/index.html` para ver o relatório por arquivo.

A cobertura inicial fixa mínimos de 28% de linhas, 29% de instruções, 16% de funções e 42% de ramificações. Aumente os mínimos conforme estes testes cobrirem mais fluxos.

O GitHub Actions roda as verificações em pushes e pull requests e disponibiliza o relatório de cobertura como artefato.

## Deploy na Vercel

Importe o repositório na Vercel com o preset Next.js e configure as duas variáveis públicas do Supabase nos ambientes em que serão usadas antes do build. Para usar Prisma na Vercel, configure também `DATABASE_URL` com a string do **Transaction pooler** (porta 6543) e `DIRECT_URL` com a string do **Session pooler** (porta 5432) para a CLI. [Prisma no Supabase](https://supabase.com/docs/guides/database/prisma) · [Variáveis de ambiente na Vercel](https://vercel.com/docs/environment-variables)
