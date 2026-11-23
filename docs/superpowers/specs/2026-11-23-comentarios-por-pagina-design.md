# Comentários por página na leitura do clube

**Status** Proposta de design
**Data** 23 de novembro de 2026

## Objetivo

Cada membro pode comentar uma página da edição que o clube está lendo. As fotos dos autores marcam as páginas acima da barra de progresso e os capítulos ficam abaixo. Ao passar o mouse sobre uma foto, o comentário se abre para o lado, ancorado na própria barra. Na abertura da página, o cabeçalho de **Progresso dos membros** e a primeira linha do ranking aparecem na dobra de referência.

A primeira versão atende leituras cujo progresso é medido em páginas. Qualquer membro do clube, incluindo o líder, pode publicar em qualquer página válida da edição cadastrada.

## Marcadores

- Exibir a foto do autor em um círculo de cerca de 28 px, com alvo de pelo menos 44 × 44 px. Usar as iniciais quando a foto estiver indisponível. Anunciar autor, página e quantidade em caso de grupo. Um pequeno traço liga cada página comentada ao eixo da barra.
- Posicionar os traços proporcionalmente entre o centro do seletor em 0 e o centro em `bookPages`. Quando comentários dividirem a mesma página ou os alvos colidirem, mostrar o primeiro autor com um selo **+N**, onde N é a quantidade de comentários adicionais. Manter os traços nas páginas exatas e recalcular os grupos ao redimensionar.
- Reservar no máximo uma faixa de 44 px e até 4 px de espaçamento. Com a trilha vazia, recolher a faixa e manter **Comentar** na linha de **Página atual**. Em telas estreitas, preservar o nome acessível do botão quando aparecer apenas o ícone.
- Na primeira carga, cada marcador aparece recolhido. Em telas estreitas, manter os controles do líder nas linhas do cabeçalho do clube e do livro para acomodar a primeira linha do ranking.

## Leitura junto à barra

- **Mouse.** Ao passar o ponteiro sobre o avatar, abrir uma prévia lateral com autor, página e texto. A prévia permanece aberta enquanto o ponteiro estiver sobre o avatar ou o conteúdo. Fora dos dois, fechar após cerca de 110 ms. Clicar no avatar fixa a prévia. Um novo clique no mesmo avatar ou um clique fora a fecha.
- **Toque e teclado.** Tocar no avatar abre ou fecha a prévia. O foco por teclado também abre, e Tab alcança os controles da prévia antes de seguir para o próximo marcador. Esc fecha e devolve o foco ao avatar. Ao sair do conjunto por teclado, recolher a prévia.
- **Posição.** Usar o lado direito quando houver espaço para a largura preferida. Caso contrário, usar o lado com mais espaço e quebrar o texto na largura disponível. A prévia cresce a partir do avatar em cerca de 150 ms e aparece de imediato quando a pessoa prefere movimento reduzido. Ela ocupa uma camada sobre a área acima da barra, com rolagem local para mensagens longas. A barra, os capítulos e o ranking mantêm suas posições.
- **Grupos.** Mostrar um comentário de cada vez, com setas e indicador de posição na mesma prévia. Ordenar primeiro pela página e depois pela publicação, com os mais antigos primeiro. Atualizar a foto conforme o comentário selecionado. Toda leitura acontece nessa faixa lateral.
- **Spoilers.** Para comentários marcados pelo autor ou em páginas à frente do progresso salvo, mostrar autor, página e a ação **Mostrar spoiler**. A revelação vale para aquele comentário durante a abertura da prévia. O autor vê seu próprio texto de imediato. Alterações na barra passam a valer para spoilers depois de salvar o progresso.
- **Falha de carregamento.** Mostrar **Tentar novamente** dentro da prévia. O membro continua podendo usar o progresso e o ranking.

## Publicação

1. **Comentar** abre um formulário ancorado no próprio cartão de progresso, com página editável e campo de texto e a opção **Marcar como spoiler**, desmarcada por padrão. Sugerir a página selecionada na barra. Para posição 0, sugerir a página 1.
2. Aceitar página inteira entre 1 e o total da edição e texto de 1 a 500 caracteres após remover espaços das extremidades. Exibir o comentário como texto simples e preservar quebras de linha.
3. Durante o envio, desabilitar **Publicar**. Em caso de erro, conservar a página e o rascunho e anunciar o erro junto do formulário. Ao publicar, fechar o formulário, devolver o foco ao botão **Comentar**, anunciar a página e atualizar o avatar ou o selo do grupo. A publicação mantém os valores de progresso.
4. **Cancelar** e Esc fecham o formulário e devolvem o foco a **Comentar**.

## Integração com a leitura atual

- Em `/clubes/[id]`, integrar a trilha ao `ReadingProgress`. A tela inicial recebe metadados de página, autoria e contagem da leitura ativa. Buscar os corpos quando a pessoa abrir a prévia e omitir os textos protegidos até a revelação explícita.
- Persistir cada comentário em `ReadingComment` com `id`, `clubId`, `readingId`, `authorId`, `page`, `body`, `isSpoiler` e `createdAt`. Indexar por clube, leitura, página e ordem de publicação, com o ID como desempate. Derivar a autoria da sessão e resolver nome e foto pelo cadastro do membro no clube.
- Registrar uma foto opcional em `ClubMember`, a partir dos metadados da sessão quando o membro cria ou entra no clube. Aceitar somente URLs HTTPS de origens configuradas para os provedores de login e usar iniciais para perfis sem foto ou imagens indisponíveis. Membros antigos podem receber a foto na próxima visita autenticada.
- Dar à leitura ativa um `readingId` estável e preencher esse campo na migração para clubes que já têm livro. Preservar o identificador em correções de total e mudanças de modo de progresso. Uma troca de livro inicia outro identificador, e remover o livro desativa o identificador. A consulta do clube usa apenas a leitura ativa.
- Validar sessão, vínculo com o clube e leitura ativa em cada acesso. Na publicação, reutilizar o bloqueio do clube e a verificação de `readingRevision` de `saveProgress`. Se a revisão mudou, conservar o rascunho e pedir atualização. Usar um UUID estável por envio como ID do comentário. Uma repetição com a mesma leitura, autoria e conteúdo devolve o sucesso original.
- Impedir a redução do total abaixo da página do último comentário, seguindo a validação do progresso salvo. Em modo por capítulos, recolher a trilha e manter os comentários para eventual retorno ao modo por páginas. A interface depende de um livro com total válido.

## Critérios de aceite

- Em 320 × 568, 390 × 844 e 1280 × 800, ver o cabeçalho e a primeira linha completa do ranking ao abrir o clube. Validar com trilha, capítulos e controles do líder quando aplicáveis. Medir a posição da barra, dos capítulos e do ranking antes e depois de abrir uma prévia.
- Abrir a prévia por hover, toque e teclado. Mover o ponteiro do avatar para o conteúdo, percorrer os controles com Tab e fechar com Esc. Confirmar a expansão para o lado disponível, a leitura de texto longo, o foco de retorno e a preferência de movimento reduzido.
- Testar trilha vazia, avatares ausentes, primeira e última páginas, páginas vizinhas e vários comentários de autores diferentes na mesma página. Percorrer todos os comentários do grupo sem sair da área de progresso.
- Testar spoiler com progresso sem registro, avanço ainda não salvo, avanço salvo e revelação explícita. Verificar que as respostas omitem textos protegidos antes da revelação.
- Publicar e cancelar com a página sugerida e com uma página alterada. Cobrir página 0, página fracionária, página acima do total, texto em branco, falta de vínculo, revisão antiga, repetição do envio e redução incompatível do total.
