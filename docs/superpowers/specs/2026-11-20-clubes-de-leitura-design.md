# Clubes de leitura

A área autenticada permite que cada pessoa crie ou participe de vários clubes. Cada clube tem um nome, um líder e uma leitura do mês. A lista Meus clubes fica acessível pela conta.

## Criar e entrar

- Na criação, o usuário informa o nome e escolhe a primeira leitura em um autocomplete por título, autor ou ISBN. As sugestões mostram capa, título, autoria, editora, ano, ISBN e páginas quando disponíveis. Edições com ISBNs diferentes aparecem separadas.
- A busca usa Google Books. Após selecionar uma edição, o servidor consulta os detalhes do volume no Google Books e tenta buscar seu sumário na Open Library em paralelo quando já dispõe do ISBN. Só usa o sumário se o ISBN corresponder ao volume canônico.
- A contagem do sumário é uma sugestão. O líder confirma ou informa o total para usar capítulos concluídos. Com o campo de capítulos vazio, vale a contagem de páginas da edição. Se o catálogo não informar páginas, o líder pode informar o total manualmente.
- Quem cria vira líder automaticamente e recebe um código alfanumérico de seis caracteres. O código aparece na página do clube para o líder e pode ser copiado. Para entrar, o convidado informa o código, confere nome, líder e leitura e confirma a adesão.
- A criação inclui a associação do líder em uma única operação. A entrada repetida leva ao mesmo clube e preserva o progresso existente.

## Leitura e progresso

- Cada membro arrasta a própria barra em passos inteiros ou digita um valor. O botão Salvar confirma o registro. O valor vai de zero até o total definido para a leitura.
- A página do clube mostra uma barra, nome e posição de cada membro. Ela distingue um registro de zero de uma leitura ainda sem registro. Alterações ficam visíveis ao abrir ou atualizar a página.
- O servidor confirma a sessão e a associação antes de ler a página do clube ou editar progresso. A atualização só alcança o registro do próprio usuário.
- Os estados de busca, gravação e confirmação têm feedback explícito. A barra de leitura responde diretamente à interação. Transições curtas respeitam a preferência por movimento reduzido.

## Escolhas de escopo

O clube guarda uma cópia dos dados da edição escolhida para manter a referência de leitura estável. Esta entrega cobre a primeira leitura. A troca de livro, o histórico, a gestão de membros e a rotação do convite ficam para um fluxo próprio.

Buscar em ambos os catálogos durante a digitação ampliaria os resultados, mas exigiria unificar edições a cada tecla e consumiria o limite da Open Library. O fluxo usa Google Books para sugestão e enriquece somente a edição selecionada. Quando os detalhes externos falham, o formulário informa o ocorrido e permite retomar o fluxo, com entrada manual para a contagem de capítulos.
