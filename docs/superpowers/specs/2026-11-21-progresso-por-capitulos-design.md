# Progresso por capítulos em edições brasileiras

## Objetivo

Quando o líder escolher uma edição, o Clube do Ovo tenta obter seu sumário pelo ISBN. O líder confirma os capítulos que o clube vai acompanhar. Cada membro indica o último capítulo concluído e vê seu avanço na barra.

O app já oferece progresso por páginas ou pelo total de capítulos. A consulta atual à Open Library sugere apenas a contagem quando identifica rótulos como “Capítulo”. Esta mudança acrescenta uma lista revisável e reaproveita o registro de progresso por posição.

## Opções de catálogo

| Fonte | Uso proposto | Limite |
| --- | --- | --- |
| Biblioteca Universitária da UFSC | Primeira candidata nacional para sumários. Oferece registros MARC em ISO 2709 sob CC0, além de acesso por Z39.50. O ISBN válido vem do campo 020 e o sumário pode constar no campo 505. | A cobertura de sumários para os livros do clube ainda precisa ser medida. A atualização do acervo aberto é anual. |
| BrasilAPI com CBL e Mercado Editorial | Opção nacional para enriquecer dados da edição em outra etapa, se houver necessidade. | A resposta documentada da consulta por ISBN não oferece um campo de sumário ou uma lista de capítulos. |
| Open Library | Reaproveitar como fonte complementar quando a consulta nacional estiver indisponível ou não trouxer um sumário aproveitável. | O campo `table_of_contents` depende da edição e pode conter partes, apêndices ou entradas sem numeração. |

[Dados abertos da UFSC](https://decti.bu.ufsc.br/catalogacao/dados-abertos/) · [BrasilAPI](https://brasilapi.com.br/docs) · [MARC 020](https://www.loc.gov/marc/bibliographic/bd020.html) · [MARC 505](https://www.loc.gov/marc/bibliographic/bd505.html) · [Open Library](https://openlibrary.org/dev/docs/api/books)

## Validação da fonte nacional

Antes da integração, testar a UFSC e a Open Library com a mesma amostra de 20 ISBNs de edições brasileiras em português, priorizando leituras já cadastradas ou na fila dos clubes. Incluir autores brasileiros, traduções e edições recentes. Registrar por fonte quantas edições têm ISBN correspondente, quantas têm sumário e quantas permitem montar uma lista confiável após revisão. Conferir os resultados contra o sumário do exemplar ou da editora quando disponível. Se houver menos de 20 ISBNs reais, registrar o tamanho e as limitações da amostra.

Se a UFSC acrescentar sumários úteis que faltam na Open Library, importar os campos necessários do arquivo CC0 para um índice por ISBN no PostgreSQL. Processar o arquivo fora do deploy e carregar somente ISBNs e sumários aproveitáveis. A consulta na Vercel usa o índice local ao app no banco. Se a amostra não mostrar ganho de cobertura, lançar o seletor com a Open Library e a entrada manual. A escolha da fonte nacional fica registrada junto com os resultados da amostra.

## Fluxo do líder

1. Ao selecionar uma edição, consultar o sumário pelo ISBN normalizado. Tratar ISBN-10 e ISBN-13 equivalentes como a mesma edição e descartar correspondências de outras edições.
2. Exibir os títulos encontrados em ordem, com a fonte. Permitir adicionar, remover, renomear e reordenar itens antes de salvar. Tratar partes e apêndices conforme a revisão do líder. Sumários parciais exigem revisão e complemento antes da confirmação.
3. Sem um sumário útil, oferecer entrada manual dos títulos, preenchimento apenas do total ou acompanhamento por páginas. A consulta roda enquanto o formulário permanece utilizável e termina com tempo limite. Trocar de edição descarta uma sugestão antiga que ainda esteja em trânsito.
4. Ao salvar uma lista, usar seu comprimento como total de capítulos. Validar no servidor a autorização do líder e a lista de 1 a 1.000 títulos não vazios. Guardar os títulos ordenados junto à leitura e registrar a origem da sugestão quando houver. Atualizações de catálogo não alteram listas que o clube já confirmou.

## Fluxo do leitor e compatibilidade

Com uma lista confirmada, mostrar um seletor de último capítulo concluído, com a opção “Ainda não comecei”. Ao escolher o quarto de doze capítulos, a barra exibe “4 de 12 capítulos”. Cada capítulo vale uma posição, independentemente do número de páginas. Mostrar o título apenas no seletor do próprio leitor para evitar spoilers na lista de membros.

Reaproveitar o valor numérico existente, de zero até o total, e validar a revisão da leitura ao salvar. Clubes com total de capítulos e sem lista continuam usando o controle numérico. Clubes por páginas continuam com a unidade atual. O líder pode anexar títulos a posições existentes sem apagar o progresso se o total e a correspondência por posição forem preservados. Para mudar a unidade, o total ou a ordem das posições depois que membros registrarem progresso, usar o fluxo existente de substituição da leitura, com aviso e confirmação antes de zerar os registros.

## Critérios de aceitação

- Um ISBN com sumário da edição correta oferece capítulos editáveis e identifica a fonte. Um sumário com entradas apenas por título também pode ser revisado.
- ISBN inválido, edição divergente, sumário ausente e falha do catálogo deixam disponíveis as opções manuais.
- Uma lista confirmada com 12 capítulos permite salvar 0, 4 e 12 capítulos concluídos. A barra mostra 0%, cerca de 33% e 100%, respectivamente.
- Um clube existente com progresso por páginas ou por total de capítulos mantém seus registros após a atualização. Um formulário aberto para uma revisão antiga não consegue gravar progresso na leitura nova.
