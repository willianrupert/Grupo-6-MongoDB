# Projeto MongoDB — Sistema de Gestão de Farmácia

**Disciplina:** IF685 — Gerenciamento de Dados e Informação (2026.1)
**Professora:** Valéria Cesário Times
**Integrantes:** Amanda Trinity, Maria Eduarda Torres, Mirella Fontinelle, Maria Luisa Brandão, Matheus Vieira, Willian Rupert
**Stack:** MongoDB Atlas (cluster M0) + Compass
**Banco:** `farmacia_db`

---

## 1. Descrição da aplicação

A aplicação é um sistema de gestão de farmácia. O sistema controla os medicamentos disponíveis (produtos, com estoque e preço), os clientes que realizam compras e as vendas efetuadas, sendo a venda o evento que conecta o cliente aos medicamentos adquiridos.

A perspectiva adotada é a da farmácia. Por essa razão, quem consome o medicamento é modelado como `cliente` (quem compra no balcão) e não como paciente. Embora possa ser a mesma pessoa, no contexto deste sistema o papel relevante é o de cliente.

Profissionais como o médico prescritor e o farmacêutico responsável não foram modelados como collections próprias. Eles aparecem como campos dentro da venda, pois só fazem sentido no contexto de um atendimento específico. Essa decisão evita criar collections adicionais que precisariam ser mantidas sem necessidade real para o escopo do projeto.

---

## 2. Modelagem das collections

O projeto utiliza três collections:

| Collection     | Tipo               | Papel                                    |
| -------------- | ------------------ | ---------------------------------------- |
| `medicamentos` | entidade (produto) | os itens vendidos pela farmácia          |
| `clientes`     | entidade (pessoa)  | quem compra os medicamentos              |
| `vendas`       | evento / transação | conecta cliente e medicamentos comprados |

### 2.1. Justificativa do número de collections

Três collections foram suficientes para cobrir todos os requisitos da checklist. A operação `$lookup` (item 29) exige ao menos duas collections relacionadas, requisito atendido pela ligação entre `vendas` e `clientes`. Optou-se por não criar collections adicionais para manter o modelo enxuto e de fácil manutenção.

O relacionamento principal do modelo é `vendas.cliente_id` referenciando `clientes._id`, que viabiliza a operação de junção (`$lookup`) entre as vendas e os dados de quem comprou.

### 2.2. Collection `medicamentos`

```js
{
  nome: 'Dipirona 500mg',
  categoria: 'analgésico',
  preco: 12.50,
  estoque: 120,
  qtd_por_caixa: 20,
  dosagem_mg: 500,
  principios_ativos: ['dipirona sódica'],
  tags: ['febre', 'dor'],
  descricao: 'Analgésico e antitérmico indicado para alívio de dores e febre.',
  fornecedor: { nome: 'Bayer', cnpj: '00.000.000/0001-00' },
  controlado: false
}
```

Cada campo foi definido com um propósito de domínio e de cobertura da checklist:

| Campo               | Tipo                 | Justificativa                                                              |
| ------------------- | -------------------- | -------------------------------------------------------------------------- |
| `nome`              | string               | identidade do produto                                                      |
| `categoria`         | string (valor único) | classificação do produto; viabiliza o agrupamento (`$group`) por categoria |
| `preco`             | número               | valor monetário; viabiliza `$avg`, `$max`, `$gte` e `$sum`                 |
| `estoque`           | número               | disponibilidade, que varia a cada venda; usado em `$cond` para reposição   |
| `qtd_por_caixa`     | número               | quantidade de unidades por caixa (característica fixa do produto)          |
| `dosagem_mg`        | número               | dosagem do medicamento em miligramas                                       |
| `principios_ativos` | array                | composição do medicamento; viabiliza `$size`, `$all` e `$addToSet`         |
| `tags`              | array                | palavras-chave de indicação; viabiliza `$all`, `$size` e `$filter`         |
| `descricao`         | string               | texto livre para busca textual; viabiliza o índice de texto e `$search`    |
| `fornecedor`        | documento aninhado   | exemplo de estrutura embutida (documento dentro de documento)              |
| `controlado`        | booleano             | presente apenas em parte dos documentos, para demonstrar `$exists`         |

Decisões de modelagem relevantes:

A distinção entre `categoria` (valor único) e `tags` (vários valores) não é redundância. A categoria serve para agrupar os medicamentos, enquanto as tags servem para filtrar por combinação de critérios. São ferramentas para perguntas diferentes.

O campo `indicacoes`, inicialmente considerado, foi descartado por redundância, já que seu conteúdo está coberto pela combinação de `descricao` (frase) e `tags` (palavras-chave).

O campo `controlado` foi deixado ausente de propósito em alguns documentos. Isso é necessário porque a operação `$exists` só demonstra utilidade quando existem documentos com e sem o campo, aproveitando o esquema flexível do MongoDB.

Os campos `qtd_por_caixa` (característica do produto) e `estoque` (situação da farmácia) são conceitualmente distintos: um descreve o que o produto é, o outro o que a farmácia possui no momento.

### 2.3. Collection `clientes`

```js
{
  nome: 'Maria Silva',
  cpf: '000.000.000-00',
  idade: 34,
  status: 'ouro',
  telefone: '81 99999-9999'
}
```

| Campo      | Tipo                                   | Justificativa                                                               |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `nome`     | string                                 | identidade do cliente; exibido no resultado do `$lookup`                    |
| `cpf`      | string                                 | identificador real do cliente                                               |
| `idade`    | número                                 | valor numérico; viabiliza `$gte` (ex.: clientes acima de determinada idade) |
| `status`   | string categórica (ouro/prata/platina) | campo de agrupamento; viabiliza `$group` por status                         |
| `telefone` | string                                 | dado de contato exibido junto ao resultado do `$lookup`                     |

O campo `endereco` foi deixado de fora por ter pouca utilidade para as consultas previstas; o papel de documento aninhado já está representado pelo `fornecedor` na collection de medicamentos.

### 2.4. Collection `vendas`

```js
{
  cliente_id: ObjectId('...'),
  data: ISODate('2026-06-10'),
  farmaceutico_responsavel: 'João Souza',
  medico_prescritor: 'Dra. Ana Lima',
  itens: [
    { medicamento: 'Dipirona 500mg', qtd: 2, preco_unit: 12.50 },
    { medicamento: 'Paracetamol 750mg', qtd: 1, preco_unit: 9.00 }
  ],
  total: 34.00
}
```

| Campo                      | Tipo                  | Justificativa                                               |
| -------------------------- | --------------------- | ----------------------------------------------------------- |
| `cliente_id`               | ObjectId (referência) | liga a venda à collection `clientes`; viabiliza o `$lookup` |
| `data`                     | Date                  | permite filtrar e ordenar vendas por período                |
| `farmaceutico_responsavel` | string                | profissional que realizou o atendimento                     |
| `medico_prescritor`        | string                | presente apenas quando há item controlado                   |
| `itens`                    | array de documentos   | itens da venda, com snapshot do preço no momento da compra  |
| `total`                    | número                | valor total da venda                                        |

Uma decisão central do modelo é o tratamento diferenciado entre snapshot e referência:

Os itens da venda usam snapshot. O nome do medicamento e o preço unitário são copiados para dentro da venda. O motivo é que o preço muda com o tempo, e a venda precisa registrar o valor efetivamente pago naquele dia. Buscar o preço atual faria a venda antiga apresentar um valor incorreto. Trata-se de desnormalização proposital, prática comum e adequada em bancos NoSQL.

O cliente da venda usa referência (`cliente_id`) combinada com `$lookup`. O motivo é que os dados do cliente (nome, telefone) devem estar sempre atualizados; se o cliente alterar o telefone, a consulta deve refletir o dado novo.

---

## 3. Dados de carga

A carga inicial está no script `00_insert_dados.js`.

- **medicamentos:** 12 documentos em 6 categorias (2 por categoria). O campo `controlado` aparece como verdadeiro, falso ou ausente, de forma proposital. Há estoques baixos plantados e tags repetidas entre documentos, para viabilizar diferentes consultas.
- **clientes:** 5 documentos, com status variado (ouro, prata, platina) e idades entre 27 e 61.
- **vendas:** 5 documentos, ligados aos clientes pelo `_id` real (obtido via `.insertedId`), com itens em formato de snapshot. Duas vendas possuem `medico_prescritor`.

A inserção foi confirmada no shell com as contagens `medicamentos: 12`, `clientes: 5`, `vendas: 5`. A ligação entre venda e cliente foi verificada manualmente no Compass, confirmando que o `cliente_id` de cada venda corresponde ao `_id` de um cliente.

Os dados foram inseridos com acentuação correta em português. Para a busca textual (`$text` / `$search`), o índice de texto foi criado com idioma português, o que permite que a busca trate adequadamente os termos da língua.

---

## 4. Operações CRUD

Implementadas no script `01_crud.js`, com base em situações reais de uma farmácia.

| Operação          | Comando                     | Situação                                    | Itens da checklist |
| ----------------- | --------------------------- | ------------------------------------------- | ------------------ |
| Reajuste de preço | `updateOne` com `$set`      | Dipirona de R$ 12,50 para R$ 13,00          | 25, 21             |
| Baixa de estoque  | `updateOne` com `$inc`      | venda de 1 Paracetamol, estoque de 8 para 7 | 25                 |
| Marcar promoção   | `updateOne` com `$addToSet` | inclusão da tag de campanha na Dipirona     | 31                 |
| Salvar (save)     | `updateOne` com `upsert`    | garantir o cadastro da Vitamina C (insere)  | 26, 21             |
| Atualizar vários  | `updateMany` com `$set`     | marcar todos os antibióticos                | 25                 |
| Remoção           | `deleteOne`                 | remoção de um produto de teste              | —                  |

Observações conceituais:

O operador `$set` define um novo valor (usado no preço), enquanto o `$inc` soma ou subtrai do valor atual (usado no estoque). Ambos realizam atualização, mas são adequados a naturezas diferentes de mudança.

O operador `$addToSet` adiciona um elemento ao array apenas se ele ainda não existir, fazendo o array se comportar como um conjunto, sem duplicatas. Isso é importante porque duplicatas comprometeriam a contagem por `$size` e sujariam filtros posteriores.

A operação `save` foi descontinuada no MongoDB. Seu comportamento equivalente é obtido com `updateOne` e a opção `upsert: true`, que atualiza o documento se ele existir e o insere caso contrário.

A remoção foi demonstrada sobre um produto de teste, criado e removido em seguida, preservando os demais medicamentos.

Após a execução do script, a base passa a ter 13 medicamentos (os 12 originais mais a Vitamina C inserida via upsert), e os antibióticos recebem o campo `exige_receita`.

---

## 5. Seleção, projeção e filtros

Implementados no script `02_selecao_filtros.js`. Antes das consultas, foi criada variação no campo `principios_ativos` (a Nimesulida passou a ter 2 princípios e foi inserido um Antigripal com 3), o que eleva o total para 14 medicamentos e permite demonstrar o `$size` com resultados variados.

Consultas realizadas:

- `find` para listar analgésicos
- `findOne` para retornar um único medicamento
- projeção para exibir apenas nome e preço
- `pretty` para formatar a saída
- `$gte` para preços maiores ou iguais a 20
- `$exists` para identificar documentos com e sem o campo `controlado`
- `$size` para medicamentos com 1 e com 3 princípios ativos
- `$all` para medicamentos com as tags febre e dor simultaneamente
- `sort` e `limit` para os 5 medicamentos mais caros
- `countDocuments` para contagens por categoria e por situação de controle
- índice de texto e `$text` / `$search` para busca por termos na descrição

Observações conceituais:

A ausência de um campo é diferente de um campo com valor falso. O `$exists` verifica se o campo está presente, independentemente do valor. Um medicamento com `controlado: false` possui o campo, e por isso aparece na consulta `$exists: true`. Apenas os medicamentos sem o campo (Loratadina e Cetirizina) aparecem na consulta `$exists: false`.

A busca textual opera sobre palavras inteiras, não sobre fragmentos, e desconsidera maiúsculas e acentuação conforme a configuração de idioma. Cada collection admite apenas um índice de texto.

---

## 6. Agregação

Implementada no script `03_agregacao.js`. A agregação funciona como uma sequência de estágios (pipeline): os documentos entram, passam por estágios que os transformam, e o resultado de um estágio alimenta o próximo. Foram modeladas quatro perguntas de negócio.

| Consulta | Pergunta de negócio                            | Estágios principais                | Itens        |
| -------- | ---------------------------------------------- | ---------------------------------- | ------------ |
| P1       | quantidade e preço médio por categoria         | `$group`, `$sum`, `$avg`, `$sort`  | 4, 8, 9, 12  |
| P2       | medicamento controlado mais caro e preço médio | `$match`, `$group`, `$max`, `$avg` | 4, 5, 11, 12 |
| P3       | vendas com os dados do cliente                 | `$lookup`, `$project`              | 4, 29        |
| P4       | quais medicamentos precisam de reposição       | `$cond`                            | 4, 28        |

Observações conceituais:

No `$group`, usar `_id` igual a um campo gera um grupo por valor distinto; usar `_id: null` reúne todos os documentos em um único grupo, útil para cálculos globais. O `$sum: 1` realiza contagem, enquanto `$sum` sobre um campo soma os valores.

O `$match` funciona como o filtro da agregação, aplicado antes dos cálculos.

O `$lookup` realiza a junção entre collections. Possui quatro parâmetros: `from` (collection a juntar), `localField` (campo local), `foreignField` (campo correspondente na outra collection) e `as` (nome do resultado). Essa operação justifica a modelagem da referência `cliente_id` para `clientes._id`.

O `$cond` representa uma estrutura condicional (se/então/senão) dentro da consulta, criando um campo calculado. A regra de reposição adotada classifica como "repor" os medicamentos com estoque inferior a 10.

---

## 7. Demais comandos

Implementados no script `04_outros.js`, reunindo os comandos que não se enquadram nos grupos anteriores.

| Item | Comando                      | Situação                                                              |
| ---- | ---------------------------- | --------------------------------------------------------------------- |
| 24   | `$filter`                    | exibir, em cada venda, apenas os itens com preço unitário acima de 15 |
| 18   | `forEach` com função anônima | imprimir nome e preço de cada analgésico                              |
| 27   | `renameCollection`           | renomear uma collection de teste descartável                          |
| 16   | `$where`                     | filtrar medicamentos com estoque abaixo de 10                         |
| 17   | `mapReduce`                  | contar medicamentos por categoria                                     |

Observações conceituais:

O `$filter` seleciona elementos dentro de um array, diferentemente de `$all` e `$size`, que filtram o documento como um todo. Quando nenhum elemento atende à condição, o array resultante fica vazio, como ocorreu em uma das vendas demonstradas.

O `renameCollection` renomeia a collection inteira, diferente do `$rename`, que renomeia um campo. A demonstração usou uma collection descartável para não afetar as collections do projeto.

### 7.1. Restrição do Atlas M0 para `$where` e `mapReduce`

O cluster gratuito do Atlas (tier M0) bloqueia os comandos `$where` e `mapReduce` por motivos de segurança e desempenho. As mensagens de erro obtidas foram, respectivamente, `$where not allowed in this atlas tier` e `CMD_NOT_ALLOWED: mapReduce`.

Para atender à checklist, os dois comandos foram executados em uma instância local do MongoDB Community (`mongodb://localhost:27017`), onde não há essa restrição. Os resultados foram:

- `$where: "this.estoque < 10"` retornou os quatro medicamentos com estoque baixo (Paracetamol, Nimesulida, Fluoxetina e Enalapril).
- `mapReduce` retornou a contagem por categoria, acompanhado apenas do aviso de descontinuação (DeprecationWarning), conforme esperado.

O resultado do `mapReduce` é idêntico ao da consulta P1 da agregação, que realiza a mesma contagem por categoria. Isso evidencia que a agregação é a forma moderna recomendada em substituição ao `mapReduce`. Como alternativa que executa no próprio M0, a consulta `find({ $expr: { $lt: ["$estoque", 10] } })` produz o mesmo resultado do `$where`.

Os comandos descontinuados foram tratados conforme orientação recebida: `save` corresponde a `updateOne` com upsert, `count` corresponde a `countDocuments` e `update` corresponde a `updateOne` ou `updateMany`.

---

## 8. Tabela de rastreabilidade (checklist)

Todos os 31 itens obrigatórios foram cobertos por consultas executadas. Os comandos `$where` e `mapReduce` foram executados em instância local, conforme a seção 7.1.

| #   | Item                          | Consulta que cobre                                                            |
| --- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1   | USE                           | `use farmacia_db` (script 00)                                                 |
| 2   | FIND                          | `find({categoria:"analgésico"})` (script 02)                                  |
| 3   | SIZE                          | `find({principios_ativos:{$size:3}})` (script 02)                             |
| 4   | AGGREGATE                     | `aggregate([...])` (script 03)                                                |
| 5   | MATCH                         | `{$match:{controlado:true}}` (script 03)                                      |
| 6   | PROJECT                       | `find({}, {nome:1, preco:1, _id:0})` (script 02)                              |
| 7   | GTE                           | `find({preco:{$gte:20}})` (script 02)                                         |
| 8   | GROUP                         | `{$group:{_id:"$categoria",...}}` (script 03)                                 |
| 9   | SUM                           | `{$sum:1}` (script 03)                                                        |
| 10  | COUNT (countDocuments)        | `countDocuments({categoria:"analgésico"})` (script 02)                        |
| 11  | MAX                           | `{$max:"$preco"}` (script 03)                                                 |
| 12  | AVG                           | `{$avg:"$preco"}` (script 03)                                                 |
| 13  | EXISTS                        | `find({controlado:{$exists:false}})` (script 02)                              |
| 14  | SORT                          | `.sort({preco:-1})` (script 02)                                               |
| 15  | LIMIT                         | `.limit(5)` (script 02)                                                       |
| 16  | $WHERE                        | `find({$where:"this.estoque<10"})` — instância local (script 04)              |
| 17  | MAPREDUCE                     | `mapReduce(map, reduce)` — instância local (script 04)                        |
| 18  | FUNCTION                      | `forEach(function(doc){...})` (script 04)                                     |
| 19  | PRETTY                        | `find(...).pretty()` (script 02)                                              |
| 20  | ALL                           | `find({tags:{$all:["febre","dor"]}})` (script 02)                             |
| 21  | SET                           | `updateOne(..., {$set:{preco:13.00}})` (script 01)                            |
| 22  | TEXT                          | `createIndex({descricao:"text"})` (script 02)                                 |
| 23  | SEARCH                        | `find({$text:{$search:"febre"}})` (script 02)                                 |
| 24  | FILTER                        | `{$filter:{input:"$itens", cond:{$gt:["$$item.preco_unit",15]}}}` (script 04) |
| 25  | UPDATE (updateOne/updateMany) | `updateOne` / `updateMany` (script 01)                                        |
| 26  | SAVE (upsert)                 | `updateOne(..., {upsert:true})` (script 01)                                   |
| 27  | RENAMECOLLECTION              | `renameCollection("colecao_renomeada")` (script 04)                           |
| 28  | COND                          | `{$cond:{if:{$lt:["$estoque",10]}, then:"repor", else:"ok"}}` (script 03)     |
| 29  | LOOKUP                        | `{$lookup:{from:"clientes", ...}}` (script 03)                                |
| 30  | FINDONE                       | `findOne({nome:"Dipirona 500mg"})` (script 02)                                |
| 31  | ADDTOSET                      | `updateOne(..., {$addToSet:{tags:"promoção"}})` (script 01)                   |

---

## 9. Organização do repositório

Os scripts estão versionados no repositório do grupo (Grupo-6-MongoDB), na seguinte estrutura:

```
/scripts
  00_insert_dados.js
  01_crud.js
  02_selecao_filtros.js
  03_agregacao.js
  04_outros.js
projeto_farmacia.md
README.md
.gitignore
```

A string de conexão do banco não é versionada, por conter a senha de acesso; ela é compartilhada apenas por canal privado entre os integrantes. O arquivo `.gitignore` impede o envio acidental de credenciais ao repositório, que é público.
