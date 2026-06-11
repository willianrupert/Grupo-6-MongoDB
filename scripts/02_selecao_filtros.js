/*
Seleção, Projeção e Filtros
Pré-requisito: ter rodado 00_insert_dados.js e 01_crud.js antes
Rodar um comando por vez no shell

Itens da checklist cobertos aqui:
2 FIND 
30 FINDONE 
6 PROJECT 
19 PRETTY 
7 GTE 
13 EXISTS
3 SIZE  
20 ALL  
14 SORT  
15 LIMIT 
10 COUNT (countDocuments)
22 TEXT 
23 SEARCH
*/

/*
Bloco de Preparação: criar variação em principios_ativos (pro SIZE ter o que mostrar)
- hoje quase todo medicamento tem 1 princípio ativo
- vamos dar 2 e 3 princípios a alguns, usando $addToSet (sem duplicar - reaproveita item 31)
- situação real: medicamentos combinados (associações de princípios)
*/

// Nimesulida ganha um 2º princípio (vira associação):
db.medicamentos.updateOne(
  { nome: "Nimesulida 100mg" },
  { $addToSet: { principios_ativos: "cafeína" } },
);

// inserir/garantir um antigripal com 3 princípios (upsert de novo):
db.medicamentos.updateOne(
  { nome: "Antigripal Trifásico" },
  {
    $set: {
      categoria: "antigripal",
      preco: 21.0,
      estoque: 40,
      qtd_por_caixa: 12,
      dosagem_mg: 0,
      principios_ativos: ["paracetamol", "cafeína", "clorfeniramina"],
      tags: ["gripe", "febre", "dor"],
      descricao:
        "Antigripal com associação de três princípios ativos para sintomas de gripe.",
      fornecedor: { nome: "Cimed", cnpj: "55.555.555/0001-55" },
      controlado: false,
    },
  },
  { upsert: true },
);
// agora: maioria tem size 1, Nimesulida tem 2, Antigripal tem 3

/*
Primeiro Bloco: FIND (seleção básica)
- Item 2: FIND
*/

// todos os analgésicos:
db.medicamentos.find({ categoria: "analgésico" });

/*
Segundo Bloco: FINDONE (retorna só o primeiro que bate)
- Item 30: FINDONE
*/

db.medicamentos.findOne({ nome: "Dipirona 500mg" });

/*
Terceiro Bloco: PROJECT (escolher quais campos aparecem, projeção)
- o 2º argumento do find diz quais campos mostrar: 1 = mostra, 0 = esconde
- Item 6: PROJECT
*/

// só nome e preço, sem o _id:
db.medicamentos.find(
  { categoria: "analgésico" },
  { nome: 1, preco: 1, _id: 0 },
);

/*
Quarto Bloco: PRETTY (formata a saída pra ficar legível)
- Item 19: PRETTY
- no Compass a saída já vem formatada, mas o comando conta pra checklist
*/

db.medicamentos.find({ categoria: "antibiótico" }).pretty();

/*
Quinto Bloco: GTE (maior ou igual, filtro numérico)
- Item 7: GTE
*/

// medicamentos com preço >= 20 reais:
db.medicamentos.find({ preco: { $gte: 20 } }, { nome: 1, preco: 1, _id: 0 });

/*
Sexto Bloco: EXISTS (filtra docs que TÊM ou não têm um campo)
- Item 13: EXISTS
- lembra: deixamos 'controlado' AUSENTE em Loratadina e Cetirizina
*/

// medicamentos que NÃO têm o campo 'controlado' (devem ser 2):
db.medicamentos.find({ controlado: { $exists: false } }, { nome: 1, _id: 0 });

// medicamentos que TÊM o campo 'controlado':
db.medicamentos.find(
  { controlado: { $exists: true } },
  { nome: 1, controlado: 1, _id: 0 },
);

/*
Sétimo Bloco: SIZE (array com tamanho EXATO)
- Item 3: SIZE
*/

// medicamentos com exatamente 1 princípio ativo:
db.medicamentos.find(
  { principios_ativos: { $size: 1 } },
  { nome: 1, principios_ativos: 1, _id: 0 },
);

// com exatamente 3 princípios ativos (deve achar o Antigripal):
db.medicamentos.find(
  { principios_ativos: { $size: 3 } },
  { nome: 1, principios_ativos: 1, _id: 0 },
);

/*
Oitavo Bloco: ALL (array contém TODOS os itens listados)
- Item 20: ALL
*/

// medicamentos cujas tags contêm 'febre' E 'dor' (as duas):
db.medicamentos.find(
  { tags: { $all: ["febre", "dor"] } },
  { nome: 1, tags: 1, _id: 0 },
);

/*
Nono Bloco: SORT + LIMIT (ordenar e limitar)
- Itens 14 (SORT) e 15 (LIMIT)
*/

// 5 medicamentos mais caros (ordena por preço desc, pega os 5 primeiros):
db.medicamentos
  .find({}, { nome: 1, preco: 1, _id: 0 })
  .sort({ preco: -1 })
  .limit(5);

/*
Décimo Bloco: COUNT (countDocuments, contar)
- Item 10: COUNT
*/

// quantos medicamentos são da categoria analgésico:
db.medicamentos.countDocuments({ categoria: "analgésico" });

// quantos são controlados:
db.medicamentos.countDocuments({ controlado: true });

/*
Décimo Primeiro Bloco: TEXT + SEARCH (busca textual)
- Itens 22 (TEXT) e 23 (SEARCH)
- PASSO 1: criar um índice de texto no campo 'descricao' (roda UMA vez só)
- PASSO 2: usar $text + $search
- default_language portuguese ajuda o Mongo a entender o idioma na busca
*/

// PASSO 1 - criar o índice (roda UMA vez só):
db.medicamentos.createIndex(
  { descricao: "text" },
  { default_language: "portuguese" },
);

// PASSO 2 - buscar a palavra 'febre' na descrição:
db.medicamentos.find(
  { $text: { $search: "febre" } },
  { nome: 1, descricao: 1, _id: 0 },
);

// buscar 'gripe':
db.medicamentos.find(
  { $text: { $search: "gripe" } },
  { nome: 1, descricao: 1, _id: 0 },
);

/*
Fim do script de seleção e filtros
Itens cobertos: 2, 3, 6, 7, 10, 13, 14, 15, 19, 20, 22, 23, 30
*/
