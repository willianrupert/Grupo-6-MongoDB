# Projeto MongoDB — Sistema de Gestão de Farmácia

**Disciplina:** IF685 — Gerenciamento de Dados e Informação (2026.1)
**Professora:** Valéria Cesário Times
**Aluno:** Matheus (CC — CIn/UFPE)
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

| Collection | Tipo | Papel |
|---|---|---|
| `medicamentos` | substantivo (produto) | os itens vendidos pela farmácia |
| `clientes` | substantivo (pessoa) | quem compra os medicamentos |
| `vendas` | evento / transação | conecta cliente + medicamentos comprados |

### Por que essas 3 e não mais?
- **`$lookup` (item 29)** exige pelo menos 2 collections relacionadas → `vendas` aponta para `clientes`.
- Três collections cobrem a checklist inteira com folga, sem custo de manutenção desnecessário.

### Relacionamento principal
`vendas.cliente_id` → `clientes._id`  (destrava o `$lookup`: "cada venda com os dados de quem comprou")

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

| Campo | Tipo | Por que existe |
|---|---|---|
| `nome` | string | identidade do produto |
| `categoria` | string (1 valor) | a "gaveta"/corredor do produto. Destrava `$group` ("média de preço por categoria") |
| `preco` | número | número rei. Destrava `$avg`, `$max`, `$gte`, `$sum` |
| `estoque` | número | disponibilidade, muda a cada venda. Ótimo pro `$where` e `$cond` ("estoque baixo?") |
| `qtd_por_caixa` | número | quantos comprimidos vêm na caixa (característica do produto) |
| `dosagem_mg` | número | número de "identidade" (o peso em mg) |
| `principios_ativos` | array | o que tem dentro do remédio. Destrava `$size`, `$all`, `$addToSet` |
| `tags` | array (vários valores) | etiquetas "pra que serve". Destrava `$all`, `$size`, `$filter` |
| `descricao` | string (frase livre) | texto pra busca textual. Destrava índice `text` + `$search` |
| `fornecedor` | documento aninhado | mostra modelagem de estrutura embutida |
| `controlado` | boolean | **ausente de propósito em alguns docs** → destrava `$exists` |

**Decisões conscientes registradas:**
- `categoria` (1 valor) ≠ `tags` (vários valores). Não é redundância: categoria serve pra *agrupar* (`$group`); tags serve pra *filtrar por combinação* (`$all`/`$size`).
- `indicacoes` foi **cortado** pra evitar redundância — já está coberto por `descricao` (frase) + `tags` (palavras-chave).
- `controlado` será deixado **ausente em alguns documentos** de propósito, porque o `$exists` só demonstra algo se houver docs com e sem o campo (schema flexível do MongoDB usado a favor).
- `qtd_por_caixa` (o que o produto *é*) ≠ `estoque` (o que a farmácia *tem*).

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

| Campo | Tipo | Por que existe |
|---|---|---|
| `nome` | string | identidade; aparece no `$lookup` |
| `cpf` | string | identificador real do cliente (obrigatório p/ controlado) |
| `idade` | número | único número "de verdade". Destrava `$gte` ("clientes com mais de X anos") |
| `status` | string categórico (ouro/prata/platina) | campo de agrupamento. Destrava `$group` ("quantos clientes por status") |
| `telefone` | string | contato; aparece junto no `$lookup`, custo zero |

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

| Campo | Tipo | Por que existe |
|---|---|---|
| `cliente_id` | ObjectId (referência) | liga à collection `clientes`. Destrava `$lookup` |
| `data` | Date | filtrar/ordenar venda por período (`$sort`, `$match`) |
| `farmaceutico_responsavel` | string | profissional que atendeu (englobado na venda) |
| `medico_prescritor` | string | só quando há controlado → outro lugar natural p/ `$exists` |
| `itens` | array de objetos (snapshot) | o campo mais rico. Destrava agregação pesada com `$unwind`/`$group` |
| `total` | número | valor da venda. Destrava `$sum`, `$avg`, `$gte` |

**Conceito-chave registrado — Snapshot vs Referência** (a decisão mais "madura" do projeto):
- **itens da venda → SNAPSHOT** (copia `medicamento` + `preco_unit` pra dentro da venda).
  Motivo: o preço muda com o tempo. A venda tem que registrar o que o cliente *pagou de verdade* naquele dia. Buscar o preço atual faria a venda antiga "mentir". → desnormalização proposital (comum e correta em NoSQL).
- **cliente da venda → REFERÊNCIA** (`cliente_id`) + `$lookup`.
  Motivo: dados do cliente (nome, telefone) a gente quer sempre *atuais*. Se a Maria troca de telefone, queremos o novo.
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
- Ligação venda→cliente verificada manualmente no Compass (cliente_id bate com _id) → `$lookup` vai funcionar.
- **Acentuação:** dados em português correto. Cuidado registrado: na hora do `$text`/`$search`, configurar o índice com collation `strength: 1` (ou 2) pra busca ignorar acento.

### GitHub (Grupo-6-MongoDB)
Antes do 1º commit foram criados: `.gitignore` (bloqueia .env/credenciais) e `README.md` (sem string de conexão). Repo é público → senha JAMAIS no repositório.

---

## 3. Queries decididas

_(a preencher conforme o projeto avança)_

---

## 4. Tabela de rastreabilidade (checklist → query)

Os 31 itens obrigatórios. Marcar conforme cada um for coberto por uma query real.

| # | Item | Status | Query que cobre |
|---|---|---|---|
| 1 | USE | ✅ | `use farmacia_db` (script 00) |
| 2 | FIND | ⬜ | |
| 3 | SIZE | ⬜ | |
| 4 | AGGREGATE | ⬜ | |
| 5 | MATCH | ⬜ | |
| 6 | PROJECT | ⬜ | |
| 7 | GTE | ⬜ | |
| 8 | GROUP | ⬜ | |
| 9 | SUM | ⬜ | |
| 10 | COUNT (countDocuments) | ⬜ | |
| 11 | MAX | ⬜ | |
| 12 | AVG | ⬜ | |
| 13 | EXISTS | ⬜ | |
| 14 | SORT | ⬜ | |
| 15 | LIMIT | ⬜ | |
| 16 | $WHERE | ⬜ | |
| 17 | MAPREDUCE | ⬜ | |
| 18 | FUNCTION | ⬜ | |
| 19 | PRETTY | ⬜ | |
| 20 | ALL | ⬜ | |
| 21 | SET | ⬜ | |
| 22 | TEXT | ⬜ | |
| 23 | SEARCH | ⬜ | |
| 24 | FILTER | ⬜ | |
| 25 | UPDATE (updateOne/updateMany) | ⬜ | |
| 26 | SAVE (updateOne/insertOne) | ⬜ | |
| 27 | RENAMECOLLECTION | ⬜ | |
| 28 | COND | ⬜ | |
| 29 | LOOKUP | ⬜ | |
| 30 | FINDONE | ⬜ | |
| 31 | ADDTOSET | ⬜ | |
