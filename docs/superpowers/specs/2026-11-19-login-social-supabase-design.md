# Login com Google e Apple pelo Supabase Auth

## Objetivo

Permitir que leitores entrem no Clube do Ovo com uma conta Google ou Apple. A página inicial continua aberta a visitantes. A proposta assume cadastro aberto no primeiro login, com a criação da conta feita pelo Supabase Auth. Entrar no site não concede permissões administrativas nem representa inscrição em encontros.

O projeto usa Next.js 16.4.6 com App Router e Cache Components. Já existem clientes Supabase para navegador e servidor e um proxy que renova a sessão por cookies. A home ainda não tem entrada para login. O recurso usa as dependências atuais e dispensa alterações no Prisma, perfis, vinculação manual de identidades, senhas e aplicativo nativo.

## Abordagem

- **OAuth iniciado no servidor, com PKCE.** É a abordagem proposta. Reaproveita o cliente SSR, mantém o início e a troca do código em pontos que podem escrever cookies e usa o mesmo fluxo para ambos os provedores.
- **OAuth iniciado no navegador, com PKCE.** Também reaproveita o cliente existente e exige o mesmo callback para concluir a sessão. É uma opção caso a interface precise controlar a navegação no cliente. Para formulários simples, a Server Action permite iniciar o login sem JavaScript.

## Fluxo

1. O link **Entrar** no cabeçalho da home leva a `/entrar`. A página exibe **Entrar com Google** e, quando habilitado, **Entrar com Apple**. Os controles funcionam com teclado e mantêm o foco visível. Com a autenticação sem configuração, a página informa **Login indisponível no momento.** e oferece um caminho de volta à home.
2. A opção escolhida envia um formulário à Server Action. O servidor aceita apenas `google` e `apple`, confere se o provedor está disponível, pede a URL de autorização ao Supabase com `signInWithOAuth` e redireciona o navegador. O cookie do verificador PKCE sai na mesma resposta.
3. O provedor retorna ao Supabase, que encaminha o navegador a `/auth/callback` no mesmo endereço do site que iniciou o login. O handler troca o código por uma sessão com `exchangeCodeForSession` e encaminha para `/conta`. Cancelamento, código ausente ou inválido e falha no início ou na troca voltam a `/entrar?erro=login`, que exibe **Não foi possível entrar. Tente novamente.**
4. `/conta` exige uma sessão verificada no servidor. Uma visita anônima retorna a `/entrar`. A tela apresenta **Minha conta**, **Você está conectado.** e **Sair**. Visitar `/entrar` com sessão válida leva diretamente a `/conta`.
5. **Sair** envia um formulário que encerra apenas a sessão do navegador atual com `signOut({ scope: "local" })` e volta a `/entrar`. Uma falha inesperada ao limpar a sessão usa `/conta?erro=saida` com **Não foi possível sair. Tente novamente.** Em uma falha apenas na revogação remota, quando a sessão local já foi limpa, a visita a `/conta` continua exigindo novo login.

## Sessão e configuração

- `AUTH_APP_URL` define uma origem canônica por ambiente. Use HTTPS fora de `localhost`. O início do login exige que a origem do formulário corresponda à origem canônica. O callback usa destinos fixos do próprio site e ignora destinos informados em parâmetros.
- `AUTH_APPLE_ENABLED=true` exibe e libera o provedor Apple no aplicativo. Ausência ou qualquer outro valor mantém a opção desativada. A ativação depende do cadastro e do teste real com a Apple. Google fica disponível quando o ambiente tem as variáveis públicas do Supabase e uma origem canônica válida. Antes da publicação, o Google também precisa estar configurado no Supabase.
- O cliente SSR existente grava os cookies no início e no callback. O proxy existente continua responsável pela renovação. A conta verifica `getClaims()` e exige um `sub` válido. A home pode ser pré-renderizada. A leitura da sessão e dos parâmetros de erro ocorre por requisição, dentro de `Suspense` nas páginas de autenticação. A resposta do callback usa `Cache-Control: no-store`.
- A interface apresenta mensagens fixas em português. Códigos OAuth, tokens, cookies, segredos e detalhes de erro do provedor ficam fora das páginas e dos logs adicionados pelo recurso. Só são solicitadas as permissões padrão de login.
- O ID durável da conta é o `sub` do Supabase. A vinculação automática segue as regras do Supabase para e-mails coincidentes. Se a Apple fornecer um endereço privado diferente do e-mail já usado no Google, os logins podem representar contas distintas. O fluxo também funciona sem nome completo. [Vinculação de identidades](https://supabase.com/docs/guides/auth/auth-identity-linking) · [Supabase e Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)

## Configuração nos painéis

- **Supabase.** Configure a Site URL de produção e inclua cada URL exata do app, no formato `<origem-do-app>/auth/callback`, na lista de redirecionamento. Em desenvolvimento, use `http://localhost:3000/auth/callback` com as mesmas origem e porta no início e no callback. Confirme que novos cadastros estão habilitados para o fluxo aberto. [URLs de redirecionamento do Supabase](https://supabase.com/docs/guides/auth/redirect-urls)
- **Google.** Crie um cliente OAuth do tipo Web, configure a tela de consentimento e cadastre a URL **do Supabase** exibida no painel do provedor, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`. Coloque o client ID e o client secret no painel do Supabase. Em modo de teste, inclua as contas de teste quando exigido. [Supabase e Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- **Apple.** A configuração web exige um Services ID associado a um App ID primário com Sign in with Apple. A documentação da Apple também indica um aplicativo existente na App Store que usa o recurso. Confirme esse pré-requisito antes de ativar a opção. Cadastre o domínio e o callback HTTPS **do Supabase**, configure o Services ID e o client secret no Supabase e guarde a chave `.p8` fora do repositório. Renove o client secret antes de expirar, dentro do limite de seis meses. [Apple Developer](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple) · [Supabase e Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)

## Aceite

- Google e Apple habilitados completam o primeiro acesso e o retorno subsequente à mesma conta para a mesma identidade. A sessão persiste ao recarregar `/conta`.
- O aceite da Apple inclui **Ocultar Meu E-mail**. Se o pré-requisito externo estiver pendente, Google pode ser liberado com a opção Apple oculta. O aceite da Apple fica pendente até o teste real.
- Cancelar, repetir um código já usado ou perder o cookie PKCE leva a uma tela que permite tentar de novo. Cada tentativa começa no mesmo navegador em que será concluída.
- Sair em um navegador preserva a sessão da mesma conta em outro. A home e a página de login abrem sem credenciais em desenvolvimento.
- As rotas e o callback funcionam no build de produção com Cache Components. O link de entrada e os formulários funcionam em desktop, em tela estreita e com teclado.
