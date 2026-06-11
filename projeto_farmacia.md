# Projeto MongoDB — Sistema de Gestão de Farmácia

**Disciplina:** IF685 — Gerenciamento de Dados e Informação (2026.1)
**Professora:** Valéria Cesário Times
**Integrantes:** Amanda Trinity, Maria Eduarda Torres, Mirella Fontinelle, Maria Luisa Brandão, Matheus Vieira, Willian Rupert
**Stack:** MongoDB Atlas (cluster M0) + Compass
**Banco:** `farmacia_db`

---

## 1. Descrição da aplicação

Sistema de gestão de uma farmácia. O sistema controla os **medicamentos** disponíveis
(produtos, estoque, preço), os **clientes** que compram, e as **vendas** realizadas
(o evento que conecta cliente e produtos).

A perspectiva do sistema é a da **farmácia**. Por isso quem consome o medicamento é
modelado como `cliente` (quem compra no balcão), e não como "paciente" — embora possa
ser a mesma pessoa, o chapéu que ela veste no nosso sistema é o de cliente.

Profissionais como **médico prescritor** e **farmacêutico responsável** não viraram
collections próprias: eles aparecem como **campos dentro da venda**, pois só fazem
sentido no contexto de um atendimento específico. Decisão tomada para não inflar o
modelo com collections que precisariam ser mantidas sem necessidade.

---

## 2. Modelagem das collections

O projeto tem **3 collections**:

| Collection     | Tipo                  | Papel                                    |
| -------------- | --------------------- | ---------------------------------------- |
| `medicamentos` | substantivo (produto) | os itens vendidos pela farmácia          |
| `clientes`     | substantivo (pessoa)  | quem compra os medicamentos              |
| `vendas`       | evento / transação    | conecta cliente + medicamentos comprados |

### Por que essas 3 e não mais?

- **`$lookup` (item 29)** exige pelo menos 2 collections relacionadas → `vendas` aponta para `clientes`.
- Três collections cobrem a checklist inteira com folga, sem custo de manutenção desnecessário.

### Relacionamento principal

`vendas.cliente_id` → `clientes._id` (destrava o `$lookup`: "cada venda com os dados de quem comprou")

### 2.1 — Collection `medicamentos` (estrutura definida)

```js
{
  nome: 'Dipirona 500mg',
  categoria: 'analgesico',
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

**Justificativa campo a campo** (cada campo existe por um motivo de checklist ou de domínio):

| Campo               | Tipo                   | Por que existe                                                                      |
| ------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| `nome`              | string                 | identidade do produto                                                               |
| `categoria`         | string (1 valor)       | a "gaveta"/corredor do produto. Destrava `$group` ("média de preço por categoria")  |
| `preco`             | número                 | número rei. Destrava `$avg`, `$max`, `$gte`, `$sum`                                 |
| `estoque`           | número                 | disponibilidade, muda a cada venda. Ótimo pro `$where` e `$cond` ("estoque baixo?") |
| `qtd_por_caixa`     | número                 | quantos comprimidos vêm na caixa (característica do produto)                        |
| `dosagem_mg`        | número                 | número de "identidade" (o peso em mg)                                               |
| `principios_ativos` | array                  | o que tem dentro do remédio. Destrava `$size`, `$all`, `$addToSet`                  |
| `tags`              | array (vários valores) | etiquetas "pra que serve". Destrava `$all`, `$size`, `$filter`                      |
| `descricao`         | string (frase livre)   | texto pra busca textual. Destrava índice `text` + `$search`                         |
| `fornecedor`        | documento aninhado     | mostra modelagem de estrutura embutida                                              |
| `controlado`        | boolean                | **ausente de propósito em alguns docs** → destrava `$exists`                        |

**Decisões conscientes registradas:**

- `categoria` (1 valor) ≠ `tags` (vários valores). Não é redundância: categoria serve pra _agrupar_ (`$group`); tags serve pra _filtrar por combinação_ (`$all`/`$size`).
- `indicacoes` foi **cortado** pra evitar redundância — já está coberto por `descricao` (frase) + `tags` (palavras-chave).
- `controlado` será deixado **ausente em alguns documentos** de propósito, porque o `$exists` só demonstra algo se houver docs com e sem o campo (schema flexível do MongoDB usado a favor).
- `qtd_por_caixa` (o que o produto _é_) ≠ `estoque` (o que a farmácia _tem_).

> Próximo: modelar os campos das collections `clientes` e `vendas`.

### 2.2 — Collection `clientes` (estrutura definida)

```js
{
  nome: 'Maria Silva',
  cpf: '000.000.000-00',
  idade: 34,
  status: 'ouro',
  telefone: '81 99999-9999'
}
```

| Campo      | Tipo                                   | Por que existe                                                             |
| ---------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `nome`     | string                                 | identidade; aparece no `$lookup`                                           |
| `cpf`      | string                                 | identificador real do cliente (obrigatório p/ controlado)                  |
| `idade`    | número                                 | único número "de verdade". Destrava `$gte` ("clientes com mais de X anos") |
| `status`   | string categórico (ouro/prata/platina) | campo de agrupamento. Destrava `$group` ("quantos clientes por status")    |
| `telefone` | string                                 | contato; aparece junto no `$lookup`, custo zero                            |

**Decisões registradas:**

- `endereco` ficou **de fora** (opcional). Tem pouca utilidade pras queries e o papel de "documento aninhado" já está coberto pelo `fornecedor` do medicamento. Pode ser trazido depois se faltar exemplo de aninhamento.
- 💡 **Semente p/ `$cond` (item 28):** calcular desconto condicional baseado no `status` ("se ouro → 10%; senão → 0%"). Guardar pra usar numa query de agregação mais à frente.

> Próximo: modelar a collection `vendas` (a mais complexa — é o evento que conecta tudo).

### 2.3 — Collection `vendas` (estrutura definida)

```js
{
  cliente_id: ObjectId('...'),          // referência → $lookup (dados sempre atuais)
  data: ISODate('2026-06-10'),
  farmaceutico_responsavel: 'João Souza',
  medico_prescritor: 'Dra. Ana Lima',   // só quando há item controlado
  itens: [
    { medicamento: 'Dipirona 500mg', qtd: 2, preco_unit: 12.50 },
    { medicamento: 'Paracetamol 750mg', qtd: 1, preco_unit: 9.00 }
  ],
  total: 34.00
}
```

| Campo                      | Tipo                        | Por que existe                                                      |
| -------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `cliente_id`               | ObjectId (referência)       | liga à collection `clientes`. Destrava `$lookup`                    |
| `data`                     | Date                        | filtrar/ordenar venda por período (`$sort`, `$match`)               |
| `farmaceutico_responsavel` | string                      | profissional que atendeu (englobado na venda)                       |
| `medico_prescritor`        | string                      | só quando há controlado → outro lugar natural p/ `$exists`          |
| `itens`                    | array de objetos (snapshot) | o campo mais rico. Destrava agregação pesada com `$unwind`/`$group` |
| `total`                    | número                      | valor da venda. Destrava `$sum`, `$avg`, `$gte`                     |

**Conceito-chave registrado — Snapshot vs Referência** (a decisão mais "madura" do projeto):

- **itens da venda → SNAPSHOT** (copia `medicamento` + `preco_unit` pra dentro da venda).
  Motivo: o preço muda com o tempo. A venda tem que registrar o que o cliente _pagou de verdade_ naquele dia. Buscar o preço atual faria a venda antiga "mentir". → desnormalização proposital (comum e correta em NoSQL).
- **cliente da venda → REFERÊNCIA** (`cliente_id`) + `$lookup`.
  Motivo: dados do cliente (nome, telefone) a gente quer sempre _atuais_. Se a Maria troca de telefone, queremos o novo.
- 💡 **Semente:** `itens` ser array de objetos destrava o `$unwind` (desmonta o array pra somar/agrupar item a item) → permite "medicamento mais vendido", "faturamento por produto".

---

### ✅ Modelagem fechada — as 3 collections estão definidas.

Próximo passo: inserir dados de exemplo realistas na `medicamentos` (com `insertMany`), lembrando de deixar `controlado` ausente em alguns docs de propósito (p/ `$exists`).

---

## Organização do trabalho (grupo)

**Fluxo:** queries nascem em arquivos `.js` (testadas no shell) → resultado confirmado é colado neste `.md` → o `.md` vira o `.docx` final.

- `.js` = "a cozinha" (onde testa e versiona no GitHub do grupo)
- `.md` = "o prato servido" (o que vai pra professora)

**Estrutura de arquivos:**

```
/scripts
  00_insert_dados.js      → insertMany das 3 collections (FEITO)
  01_crud.js              → insert, update, delete, addToSet, save
  02_selecao_filtros.js   → find, findOne, project, gte, exists, size, all...
  03_agregacao.js         → aggregate, match, group, sum, avg, max, cond, lookup
  04_outros.js            → mapReduce, $where, renameCollection, text/search
projeto_farmacia.md       → documento vivo (vira o .docx)
README.md                 → como conectar (SEM a string de conexão!)
.gitignore
```

**Convenção de estilo dos scripts (seguir em todos):**

- Cabeçalho e blocos em comentário de bloco `/* ... */` (não `//` de linha cheia).
- Blocos numerados por extenso ("Primeiro Bloco", "Segundo Bloco"...) com título + descrição em bullets `-`.
- Comentários curtos inline com `//`.
- Aspas duplas `"..."`, trailing comma, indentação estilo Prettier.

### Acesso do grupo ao banco (Atlas)

- **Network Access** (site cloud.mongodb.com → Security → Network Access): liberado `0.0.0.0/0` (qualquer IP), toggle "temporary" DESLIGADO (permanente). Permite os colegas conectarem de casa.
- **String de conexão** compartilhada por canal privado (NUNCA no GitHub — contém a senha do banco).
- Distinção: **Compass** = rodar queries · **Atlas (site)** = administrar cluster (IPs, usuários).

### O que vai / não vai pro GitHub

- ✅ VAI: scripts `.js`, este `.md`, README (sem string), `.gitignore`
- ❌ NÃO VAI: string de conexão / senha do banco (repo é público!)

> Conceito MongoDB: não existe "declarar estrutura" como no SQL. A estrutura nasce com o primeiro documento inserido. "Configurar" = criar collections + inserir dados.

---

## Dados inseridos (script 00_insert_dados.js) ✅ RODADO

- **medicamentos:** 12 docs, 6 categorias (2 cada). `controlado` true/false/ausente de propósito; estoques baixos plantados; tags repetidas.
- **clientes:** 5 docs, status variado (ouro/prata/platina), idade 27–61.
- **vendas:** 5 docs, ligadas por `cliente_id` real (`.insertedId`), itens como snapshot, 2 com `medico_prescritor`.
- Confirmado no shell: `medicamentos: 12 · clientes: 5 · vendas: 5`.
- Ligação venda→cliente verificada manualmente no Compass (cliente_id bate com \_id) → `$lookup` vai funcionar.
- **Acentuação:** dados em português correto. Cuidado registrado: na hora do `$text`/`$search`, configurar o índice com collation `strength: 1` (ou 2) pra busca ignorar acento.

### GitHub (Grupo-6-MongoDB)

Antes do 1º commit foram criados: `.gitignore` (bloqueia .env/credenciais) e `README.md` (sem string de conexão). Repo é público → senha JAMAIS no repositório.

---

## CRUD (script 01_crud.js)

Operações decididas em cima de situações reais de farmácia:

| Operação          | Comando                   | Situação                                | Item(ns)           |
| ----------------- | ------------------------- | --------------------------------------- | ------------------ |
| Reajuste de preço | `updateOne` + `$set`      | Dipirona 12,50 → 13,00                  | 25, 21             |
| Baixa de estoque  | `updateOne` + `$inc`      | vendeu 1 Paracetamol, estoque 8→7       | 25 (+`$inc` bônus) |
| Marcar promoção   | `updateOne` + `$addToSet` | Dipirona entra em campanha              | 31                 |
| "SAVE" (salvar)   | `updateOne` + `upsert`    | garantir Vitamina C cadastrada (insere) | 26, 21             |
| Atualizar vários  | `updateMany` + `$set`     | marcar todos antibióticos               | 25                 |
| Remoção           | `deleteOne`               | apaga "Produto Teste" descartável       | (CRUD-D)           |

**Conceitos registrados:**

- `$set` ("valor agora é X", p/ preço) ≠ `$inc` ("soma/subtrai do atual", p/ estoque). Os dois são update, naturezas diferentes.
- `$addToSet` adiciona ao array só se não existir → array se comporta como **conjunto** (sem duplicata). Importa porque o `$size` contaria errado e dados duplicados sujam filtros.
- "SAVE" não existe mais como comando próprio → equivale a `updateOne` com `upsert:true` (atualiza se existe, insere se não).
- Delete demonstrado num "Produto Teste" descartável → mantém os 12 medicamentos planejados intactos.

**Estado após o script:** 13 medicamentos (12 + Vitamina C via upsert). Antibióticos ganharam `exige_receita: true`.

> **Dica de execução (registrada):** no shell do mongosh, rodar **um comando por vez**, não colar blocos grandes com comentários. Colar várias chamadas juntas causa `SyntaxError: Unexpected token` (o shell se confunde ao separar os comandos). Os `.js` são referência/documentação; no shell vai linha a linha.

> **Estratégia p/ o .docx final (registrada):** cada query no documento terá: (1) o código, (2) explicação curta do que faz, (3) print do resultado real. O print prova que rodou de verdade. Ir guardando prints dos resultados conforme roda. Focar nos resultados que mostram a query funcionando (não printar tudo).

**Validado no Compass (CRUD):** preço Dipirona 12,5→13 ✅ · estoque Paracetamol 8→7 (`$inc`) ✅ · tag `promoção` adicionada sem duplicar ✅ · upsert Vitamina C criou (`upsertedCount:1`, `matchedCount:0`) ✅ · updateMany 2 antibióticos (`matchedCount:2`) ✅ · delete Produto Teste (`deletedCount:1`) ✅ · **total final: 13 medicamentos** ✅

> Prints guardados para o .docx: retorno do upsert (contraste upsertedCount 1 vs 0) e do updateMany (matchedCount 2).

---

## Seleção e Filtros (script 02_selecao_filtros.js) ✅ VALIDADO

PREP: criada variação em `principios_ativos` (Nimesulida→2, Antigripal Trifásico→3 via upsert). Total agora: **14 medicamentos**.

Validado no Compass (13 itens):

- **find** analgésicos · **findOne** Dipirona · **project** (nome+preco só) · **pretty** antibióticos
- **gte** preço≥20 (5 docs) · **exists** false→Loratadina+Cetirizina, true→resto · **size** 1 (vários) e 3 (só Antigripal)
- **all** tags febre+dor · **sort** preço desc + **limit** 5 · **count** analgésicos=2, controlados=4
- **text/search**: índice `descricao_text` criado (default_language portuguese); search "febre"→Paracetamol+Dipirona, "gripe"→Antigripal

**Conceitos registrados:**

- **"campo ausente" ≠ "campo com valor false"**: `exists` pergunta se o campo está presente, não o valor. `controlado:false` existe (aparece em exists:true). Só Loratadina/Cetirizina não têm o campo.
- `$text` busca **palavras inteiras** (não pedaços), ignora maiúscula e acento (via collation/idioma).
- Só pode haver **1 índice de texto** por collection.

---

## Agregação (script 03_agregacao.js) ✅ VALIDADO

Agregação = esteira de estágios (pipeline). Documento entra, passa por estágios que transformam, sai transformado. 4 "perguntas de negócio":

| #   | Pergunta de negócio                      | Pipeline                                    | Itens        |
| --- | ---------------------------------------- | ------------------------------------------- | ------------ |
| P1  | medicamentos e preço médio por categoria | `group` + `sum:1` + `avg` + `sort`          | 4, 8, 9, 12  |
| P2  | controlado mais caro + média             | `match` + `group(_id:null)` + `max` + `avg` | 4, 5, 11, 12 |
| P3  | vendas com dados do cliente              | `lookup` (vendas→clientes) + `project`      | 4, 29        |
| P4  | quais medicamentos repor                 | `cond` (if estoque<10 'repor' else 'ok')    | 4, 28        |

**Conceitos registrados:**

- `$group` com `_id: "$campo"` → um grupo por valor. Com `_id: null` → um grupo só com tudo (pra cálculos globais).
- `$sum: 1` = contar (soma 1 por doc). `$sum: "$campo"` = somar o valor do campo.
- `$match` = "where" da agregação, filtra ANTES de calcular (bom pra performance e lógica).
- `$lookup` = o "join". 4 chaves: `from` (collection), `localField` (campo daqui), `foreignField` (campo de lá), `as` (array resultado). Justifica a modelagem `cliente_id` → `clientes._id`.
- `$cond` = if/else dentro da query, cria campo calculado. Regra de reposição: estoque < 10.
- Resultados esperados: P2 mais caro = Sertralina (42); P4 'repor' = Fluoxetina(4), Nimesulida(5), Enalapril(7), Paracetamol(7).

---

## 3. Queries decididas

_(a preencher conforme o projeto avança)_

---

## Outros comandos (script 04_outros.js) ✅ VALIDADO (com ressalva Atlas)

Os 5 itens que não se encaixam nos grupos anteriores:

| Item                | Comando                       | Situação                                     | Resultado                                                            |
| ------------------- | ----------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| 24 FILTER           | `$filter` na agregação        | itens da venda com preço > 15                | ✅ rodou (venda de 34 deu `itens_caros:[]` vazio — prova o conceito) |
| 18 FUNCTION         | `forEach(function(doc){...})` | imprime nome+preço dos analgésicos           | ✅ rodou                                                             |
| 27 RENAMECOLLECTION | `renameCollection`            | collection descartável (cria→renomeia→apaga) | ✅ rodou                                                             |
| 16 $WHERE           | `find({$where:...})`          | filtro com expressão JS                      | ⚠️ Atlas M0 bloqueia → `$expr` equivalente                           |
| 17 MAPREDUCE        | `mapReduce(map, reduce)`      | contar por categoria                         | ⚠️ Atlas M0 bloqueia → aggregate+group equivalente                   |

**Restrição do Atlas M0 + solução (importante para o documento):**
O cluster gratuito (M0) **bloqueia `$where` e `mapReduce`** por política de segurança/performance:

- `$where` → erro `$where not allowed in this atlas tier`
- `mapReduce` → erro `CMD_NOT_ALLOWED: mapReduce` (+ DeprecationWarning: "use an aggregation instead")

**Solução adotada:** os dois comandos foram rodados num **MongoDB Community local** (`mongodb://localhost:27017`), onde não há essa restrição. Lá:

- `$where: "this.estoque < 10"` → retornou os 4 de estoque baixo (Paracetamol, Nimesulida, Fluoxetina, Enalapril) ✅
- `mapReduce` (emit categoria→1, reduce soma) → contagem 2 por categoria, só com DeprecationWarning (como a professora indicou que é esperado) ✅

**Observações úteis p/ o .docx:**

- O resultado do `mapReduce` é idêntico ao do `aggregate`+`group` (script 03-P1) — dois caminhos, mesmo resultado. Bom pra mostrar que aggregation é o substituto moderno do mapReduce.
- Equivalente do `$where` que roda no próprio M0: `find({$expr: {$lt: ["$estoque", 10]}})`.
- Comandos deprecated tratados conforme orientação recebida: SAVE→`updateOne+upsert`, COUNT→`countDocuments`, UPDATE→`updateOne/updateMany`.

**Conceitos registrados:**

- `$filter` peneira elementos DENTRO do array (≠ `$all`/`$size` que filtram o documento). `input`=array, `cond`=condição, `$$item`=cada elemento. Array vazio quando nada passa.
- `renameCollection` renomeia a COLLECTION inteira (≠ `$rename` que renomeia um CAMPO). Feito em collection descartável.
- `$where` e `mapReduce` são recursos legados/pesados; o Atlas M0 os bloqueia. Rodados em local; a agregação é o substituto recomendado.

---

## ✅ CHECKLIST COMPLETA: 31/31 itens — TODOS RODADOS

- 29 no Atlas M0 (Compass)
- 2 ($where, mapReduce) no MongoDB local, pois o M0 os bloqueia — com prints comprovando

---

## 4. Tabela de rastreabilidade (checklist → query)

Os 31 itens obrigatórios. Marcar conforme cada um for coberto por uma query real.
**Legenda:** ✅ rodado e validado · ⬜ não feito · (obs: $where e mapReduce rodados em MongoDB local pois o Atlas M0 os bloqueia)

| #   | Item                          | Status | Query que cobre                                                                                                                                                           |
| --- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | USE                           | ✅     | `use farmacia_db` (script 00)                                                                                                                                             |
| 2   | FIND                          | ✅     | `find({categoria:"analgésico"})` (script 02)                                                                                                                              |
| 3   | SIZE                          | ✅     | `find({principios_ativos:{$size:3}})` → só Antigripal (script 02)                                                                                                         |
| 4   | AGGREGATE                     | ✅     | `aggregate([...])` 4 pipelines (script 03)                                                                                                                                |
| 5   | MATCH                         | ✅     | `{$match:{controlado:true}}` (script 03)                                                                                                                                  |
| 6   | PROJECT                       | ✅     | `find({}, {nome:1, preco:1, _id:0})` (script 02)                                                                                                                          |
| 7   | GTE                           | ✅     | `find({preco:{$gte:20}})` (script 02)                                                                                                                                     |
| 8   | GROUP                         | ✅     | `{$group:{_id:"$categoria",...}}` → 8 categorias (script 03)                                                                                                              |
| 9   | SUM                           | ✅     | `{$sum:1}` contagem por categoria (script 03)                                                                                                                             |
| 10  | COUNT (countDocuments)        | ✅     | `countDocuments({categoria:"analgésico"})` → 2 (script 02)                                                                                                                |
| 11  | MAX                           | ✅     | `{$max:"$preco"}` → 42 Sertralina (script 03)                                                                                                                             |
| 12  | AVG                           | ✅     | `{$avg:"$preco"}` (script 03)                                                                                                                                             |
| 13  | EXISTS                        | ✅     | `find({controlado:{$exists:false}})` → Loratadina+Cetirizina (script 02)                                                                                                  |
| 14  | SORT                          | ✅     | `.sort({preco:-1})` (script 02)                                                                                                                                           |
| 15  | LIMIT                         | ✅     | `.limit(5)` 5 mais caros (script 02)                                                                                                                                      |
| 16  | $WHERE                        | ✅     | `find({$where:"this.estoque<10"})` → 4 de estoque baixo. Rodado no **MongoDB local** (Atlas M0 bloqueia; equivalente `$expr` também documentado). (script 04)             |
| 17  | MAPREDUCE                     | ✅     | `mapReduce(map,reduce)` → contagem por categoria (2 cada). Rodado no **MongoDB local** (Atlas M0 bloqueia). Mesmo resultado que aggregate+group do script 03. (script 04) |
| 18  | FUNCTION                      | ✅     | `forEach(function(doc){...})` (script 04)                                                                                                                                 |
| 19  | PRETTY                        | ✅     | `find(...).pretty()` (script 02)                                                                                                                                          |
| 20  | ALL                           | ✅     | `find({tags:{$all:["febre","dor"]}})` (script 02)                                                                                                                         |
| 21  | SET                           | ✅     | `updateOne(..., {$set:{preco:13.00}})` (script 01-A)                                                                                                                      |
| 22  | TEXT                          | ✅     | `createIndex({descricao:"text"})` → descricao_text (script 02)                                                                                                            |
| 23  | SEARCH                        | ✅     | `find({$text:{$search:"febre"}})` → Paracetamol+Dipirona (script 02)                                                                                                      |
| 24  | FILTER                        | ✅     | `{$filter:{input:"$itens",cond:{$gt:["$$item.preco_unit",15]}}}` → itens_caros (script 04)                                                                                |
| 25  | UPDATE (updateOne/updateMany) | ✅     | `updateOne` reajuste preço / `updateMany` antibióticos (script 01-A/E)                                                                                                    |
| 26  | SAVE (updateOne/insertOne)    | ✅     | `updateOne(..., {upsert:true})` Vitamina C (script 01-D)                                                                                                                  |
| 27  | RENAMECOLLECTION              | ✅     | `renameCollection("colecao_renomeada")` (script 04)                                                                                                                       |
| 28  | COND                          | ✅     | `{$cond:{if:{$lt:["$estoque",10]}...}}` → 4 repor (script 03)                                                                                                             |
| 29  | LOOKUP                        | ✅     | `{$lookup:{from:"clientes"...}}` vendas→clientes ✓ join (script 03)                                                                                                       |
| 30  | FINDONE                       | ✅     | `findOne({nome:"Dipirona 500mg"})` (script 02)                                                                                                                            |
| 31  | ADDTOSET                      | ✅     | `updateOne(..., {$addToSet:{tags:"promoção"}})` (script 01-C)                                                                                                             |
