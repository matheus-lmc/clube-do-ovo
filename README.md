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

Importe o repositório na Vercel com o preset Next.js e configure as duas variáveis do Supabase nos ambientes em que serão usadas antes do build. [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) · [Variáveis de ambiente](https://vercel.com/docs/environment-variables)
