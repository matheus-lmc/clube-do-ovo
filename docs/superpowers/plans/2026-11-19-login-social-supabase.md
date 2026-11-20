# Plano de implementação do login com Google e Apple

> **Para agentes de implementação** — use `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Execute as tarefas na ordem e marque os passos concluídos.

**Objetivo** — habilitar login e cadastro pelo Google e pela Apple via Supabase Auth e oferecer uma forma de sair da sessão atual.

**Arquitetura** — Server Actions iniciam o OAuth e encerram a sessão. Um Route Handler compartilhado conclui o fluxo PKCE. As páginas de entrada e conta verificam a sessão no servidor.

**Tecnologias** — Next.js 16.4.6 com App Router e Cache Components. React, TypeScript, `@supabase/ssr` e `@supabase/supabase-js` já instalados.

**Spec** — [Login com Google e Apple pelo Supabase Auth](../specs/2026-11-19-login-social-supabase-design.md)

## Restrições gerais

- A página inicial continua aberta a visitantes.
- A proposta assume cadastro aberto no primeiro login, com a criação da conta feita pelo Supabase Auth.
- `AUTH_APP_URL` define uma origem canônica por ambiente. Use HTTPS fora de `localhost`.
- `AUTH_APPLE_ENABLED=true` exibe e libera o provedor Apple no aplicativo.
- A interface apresenta mensagens fixas em português.
- O recurso usa as dependências atuais e dispensa alterações no Prisma, perfis, vinculação manual de identidades, senhas e aplicativo nativo.

## Pontos de revisão

- Cancelamento, código inválido, código repetido e falta do verificador PKCE voltam ao mesmo erro recuperável.
- Uma origem diferente da configurada falha antes de sair do site. Um destino recebido pelo callback não interfere no redirecionamento.
- Um formulário forjado com provedor desconhecido ou Apple desabilitada falha mesmo quando enviado diretamente à ação.
- Uma sessão iniciada em um navegador não aparece em outro. Sair de um deles preserva a sessão ativa no outro.
- A conta Apple com endereço privado e sem nome completa o fluxo. A validação do Google continua possível com Apple desativada.

## Mapa de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/supabase/auth-config.ts` | Interpretar a origem canônica e os provedores disponíveis |
| `src/app/auth/actions.ts` | Exportar as ações de iniciar login e sair |
| `src/app/auth/callback/route.ts` | Trocar o código PKCE e redirecionar |
| `src/app/entrar/page.tsx` e `src/app/conta/page.tsx` | Exibir os formulários e verificar a sessão |
| `src/app/auth/auth.module.css` | Estilos compartilhados das duas páginas |
| `src/app/page.tsx` | Adicionar o link **Entrar** à navegação |
| `.env.example` e `README.md` | Documentar a configuração local e a ativação dos provedores |

## Tarefa 1 — Configuração e fluxo no servidor

Interfaces para a tarefa 2

- `type SocialProvider = "google" | "apple"` e `getAuthConfig(): { origin: string; appleEnabled: boolean } | null` em `src/lib/supabase/auth-config.ts`.
- `startSocialSignIn(formData: FormData): Promise<never>` e `signOut(): Promise<never>` em `src/app/auth/actions.ts`, usando `redirect`.

- [ ] Leia as seções locais de Server Actions, `cookies()`, Route Handlers e Cache Components em `node_modules/next/dist/docs/01-app/`. Use Node.js 24 conforme o README.
- [ ] Com `npm run dev`, execute `curl -i 'http://localhost:3000/auth/callback'`. Registre o estado inicial de 404. Após as mudanças, o resultado esperado é 303, `Location: /entrar?erro=login` e `Cache-Control: no-store`.
- [ ] Implemente `getAuthConfig()` com as duas variáveis públicas já presentes em `supabaseConfig`. Normalize `AUTH_APP_URL` para `URL.origin` depois de aceitar um endereço com caminho raiz, sem credenciais, query ou fragmento. Aceite HTTPS ou HTTP com hostname exatamente `localhost`. Retorne `null` se faltar configuração ou a URL for inválida. Defina `appleEnabled` pela comparação exata com `"true"`.
- [ ] Implemente `startSocialSignIn(formData)` como Server Action. Leia `provider` do formulário e `origin` de `await headers()`. Direcione a `/entrar?erro=login` quando o valor não for `google` ou `apple`, Apple estiver desabilitada, faltar configuração ou a origem recebida divergir da canônica. Com entrada válida, chame `signInWithOAuth({ provider, options: { redirectTo } })` com `redirectTo` igual a `<origem-do-app>/auth/callback`. Em caso de sucesso, redirecione a `data.url` retornada pelo Supabase e preserve o cookie PKCE gravado pelo helper SSR. Em caso de erro, exceção da operação ou URL vazia, use o destino de erro fixo. Mantenha as chamadas a `redirect()` fora de blocos `try/catch` que tratam o Supabase.
- [ ] Implemente `GET(request: Request): Promise<Response>` em `src/app/auth/callback/route.ts`. Se faltar configuração ou `code`, ou se houver `error` ou `error_code` na query, responda com o destino de erro fixo. Aplique o mesmo destino se `exchangeCodeForSession(code)` retornar erro ou lançar exceção. Com sucesso, responda com `Location: /conta`. Use 303, `Location` relativa e `Cache-Control: no-store` em ambos os casos.
- [ ] Implemente `signOut()` como Server Action. Se faltar configuração, volte a `/entrar`. Chame `signOut({ scope: "local" })` no cliente SSR. Com sucesso, volte a `/entrar`. Se a chamada retornar erro ou lançar, use `/conta?erro=saida`; a proteção dessa página volta a `/entrar` quando a limpeza local já tiver ocorrido. Verifique a semântica de encerramento local na versão instalada de `@supabase/auth-js`. [Encerramento de sessão local](https://supabase.com/docs/reference/javascript/auth-signout)
- [ ] Repita o curl inicial e teste o callback com `?error=access_denied` e `?code=invalido`. Em cada caso, confirme 303, destino fixo e ausência do texto recebido na resposta. Repita com `&next=https%3A%2F%2Fexample.org` no teste de erro e confirme que o destino continua sendo `/entrar?erro=login`.

## Tarefa 2 — Navegação, entrada e conta

- [ ] Antes da mudança, confirme em `npm run dev` que a home ainda não oferece **Entrar** e que `/entrar` e `/conta` retornam 404.
- [ ] Em `src/app/entrar/page.tsx`, adicione a página com um componente assíncrono sob `Suspense`. Aguarde `searchParams` nesse componente e use a configuração da tarefa 1. Quando houver configuração, redirecione a `/conta` se `getClaims()` devolver `sub` válido. Para visitantes, mostre os botões habilitados e submeta `provider` com valor `google` ou `apple` para `startSocialSignIn`. Sem configuração, mostre **Login indisponível no momento.** e link para a home. Exiba **Não foi possível entrar. Tente novamente.** quando `erro=login`.
- [ ] Em `src/app/conta/page.tsx`, adicione a página com a leitura de `searchParams` e `getClaims()` sob `Suspense`. Sem configuração, com erro de verificação ou sem `sub` válido, redirecione a `/entrar`. Com sessão válida, mostre **Minha conta**, **Você está conectado.** e um formulário **Sair** ligado a `signOut`. Para `erro=saida`, exiba **Não foi possível sair. Tente novamente.**
- [ ] Use `src/app/auth/auth.module.css` para aplicar o papel, a tipografia e o foco visível do site aos dois formulários. Reuse `Button` para as ações e adicione um `Link` **Entrar** a `/entrar` na navegação de `src/app/page.tsx`. A home continua sem leitura de sessão.
- [ ] Teste em desenvolvimento sem as variáveis do Supabase e com `AUTH_APP_URL` inválida. Confirme home aberta, mensagem de indisponibilidade em `/entrar`, ausência dos botões e retorno a `/entrar` ao visitar `/conta`. Em ambiente configurado com Apple desabilitada, reproduza o POST do formulário com `provider=apple` e `provider=github` em testes controlados. As duas submissões retornam a `/entrar?erro=login` sem iniciar OAuth. Com o app aberto em um host diferente de `AUTH_APP_URL`, o envio de Google deve falhar da mesma forma. Teste navegação com teclado e largura de 320 px.

## Tarefa 3 — Configuração dos provedores e aceite

- [ ] Acrescente `AUTH_APP_URL=` e `AUTH_APPLE_ENABLED=false` ao `.env.example`, preservando as variáveis existentes. No README, documente a Site URL, a lista de URLs de retorno do aplicativo, o callback distinto do Supabase para Google e Apple, o cadastro aberto assumido na spec e a configuração por ambiente. Registre o pré-requisito externo da Apple, como ativar a opção depois da configuração e o prazo de renovação do client secret. Use as instruções e fontes da spec.
- [ ] Rode `npm run lint`, `npm run typecheck` e `npm run build`. Os três comandos devem terminar com código 0. Verifique que a home aparece como pré-renderizada e que a conta não usa cache compartilhado. Faça smoke test de `/entrar`, `/conta` e `/auth/callback` com `npm run start` após o build.
- [ ] Em um projeto Supabase de teste com Google habilitado, faça o primeiro login, recarregue `/conta`, visite `/entrar` com sessão e confirme o retorno a `/conta`. Em um segundo navegador, visite `/conta` como anônimo e confirme o retorno a `/entrar`. Entre com a mesma identidade nesse segundo navegador. Confira que há um usuário no painel, saia da primeira sessão e confirme que só a segunda continua autenticada. Cancele um consentimento e confirme que a interface permite tentar de novo.
- [ ] Em teste controlado de callback, confirme que a resposta de início da ação inclui o cookie do verificador e que o callback bem-sucedido grava a sessão. Repita o callback já usado e tente concluir uma nova autorização depois de remover o cookie do verificador. As duas trocas falham e redirecionam a `/entrar?erro=login`. Execute esses casos sem registrar os valores de códigos e cookies.
- [ ] Com os pré-requisitos Apple satisfeitos, configure o provedor em teste e habilite a opção no app. Repita o primeiro acesso, recarga, cancelamento e saída com Apple e teste **Ocultar Meu E-mail**. Confirme que a conta funciona sem nome completo e que um segundo acesso com a mesma identidade Apple reutiliza o mesmo usuário. Com o requisito externo pendente, mantenha Apple desabilitada e registre o teste real da Apple como pendente no aceite.
- [ ] Antes da publicação, confira as origens e os callbacks do ambiente final, a situação de publicação do cliente Google e, quando Apple estiver habilitada, a data de expiração do client secret. Teste o login de cada opção publicada no domínio final.
