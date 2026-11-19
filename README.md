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

## Prisma e PostgreSQL

No painel do Supabase, abra **Connect** e copie a string PostgreSQL do **Session pooler** (porta 5432). Defina `DATABASE_URL` no `.env` ou no `.env.local`, substitua o marcador pela senha do banco e use `sslmode=require`. Codifique caracteres especiais da senha no formato de URL. Se quiser uma conexão dedicada para os comandos do Prisma, configure também `DIRECT_URL` com a string de conexão direta. [Conexões do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

Importe `prisma` de `@/lib/prisma` em código do servidor que execute no runtime Node.js. O schema inicial está em `prisma/schema.prisma`. Se o banco já tiver tabelas, use `npx prisma db pull` para importar os modelos. Rode `npm run db:generate` depois de alterar o schema.

## shadcn/ui

O projeto usa o preset Nova com Base UI. O componente `Button` está em `src/components/ui/button.tsx`. Para adicionar outro componente, por exemplo:

```bash
npx shadcn@latest add input
```

## Verificações

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy na Vercel

Importe o repositório na Vercel com o preset Next.js e configure as duas variáveis públicas do Supabase nos ambientes em que serão usadas antes do build. Para usar Prisma na Vercel, configure também `DATABASE_URL` com a string do **Transaction pooler** (porta 6543) e `DIRECT_URL` com a string do **Session pooler** (porta 5432) para a CLI. [Prisma no Supabase](https://supabase.com/docs/guides/database/prisma) · [Variáveis de ambiente na Vercel](https://vercel.com/docs/environment-variables)
