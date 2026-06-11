/*
Operações CRUD (Create, Read, Update, Delete)
Pré-requisito: ter rodado 00_insert_dados.js antes
Rodar no shell do Compass, bloco por bloco, pra ver o efeito de cada operação

Itens da checklist cobertos aqui:
25 UPDATE (updateOne/updateMany) · 21 SET · 31 ADDTOSET · 26 SAVE (upsert)
+ bônus: operador $inc 
*/

/* 
Primeiro Bloco: UPDATE + SET (reajuste de preço)
- a Dipirona vai de R$12,50 para R$13,00
- $set = "o valor agora é X" (define um valor novo)
- Itens: 25 (UPDATE/updateOne) + 21 (SET)
*/

// antes (pra você comparar):
db.medicamentos.findOne(
  { nome: "Dipirona 500mg" },
  { nome: 1, preco: 1, _id: 0 },
);

db.medicamentos.updateOne(
  { nome: "Dipirona 500mg" }, // filtro
  { $set: { preco: 13.0 } }, // define o novo preço
);

// depois (preco deve estar 13.00):
db.medicamentos.findOne(
  { nome: "Dipirona 500mg" },
  { nome: 1, preco: 1, _id: 0 },
);

/*
Segundo Bloco: UPDATE + INC  →  baixa de estoque ao vender
- vendeu 1 caixa de Paracetamol, estoque cai de 8 para 7.
- $inc = "soma/subtrai do que já tem" (Com $inc só dizer "-1" e o Mongo faz a conta)
- Item: 25 (UPDATE) · operador $inc (bônus - não tava no checklist)
*/

db.medicamentos.updateOne(
  { nome: "Paracetamol 750mg" },
  { $inc: { estoque: -1 } }, // -1 = deu baixa de uma unidade
);

// confere (estoque deve estar 7):
db.medicamentos.findOne(
  { nome: "Paracetamol 750mg" },
  { nome: 1, estoque: 1, _id: 0 },
);

/*
Terceiro Bloco: UPDATE + ADDTOSET  (marcar medicamento em promoção)
- a Dipirona entrou numa campanha de promoção.
- $addToSet adiciona a tag SÓ se ela ainda não existir (sem duplicar)
- Item: 31 (ADDTOSET)
*/

// antes (tags atuais):
db.medicamentos.findOne(
  { nome: "Dipirona 500mg" },
  { nome: 1, tags: 1, _id: 0 },
);

db.medicamentos.updateOne(
  { nome: "Dipirona 500mg" },
  { $addToSet: { tags: "promoção" } },
);

// depois (tags deve ter aparecido 'promoção'):
db.medicamentos.findOne(
  { nome: "Dipirona 500mg" },
  { nome: 1, tags: 1, _id: 0 },
);

// prova do sem duplicar: rodar a MESMA linha de novo
// 'promoção' já existe, o array NÃO muda
db.medicamentos.updateOne(
  { nome: "Dipirona 500mg" },
  { $addToSet: { tags: "promoção" } },
);
db.medicamentos.findOne(
  { nome: "Dipirona 500mg" },
  { nome: 1, tags: 1, _id: 0 },
);
// tags continua ['febre', 'dor', 'promoção'], sem 'promoção' repetido

/*
Quarto Bloco: UPDATE com UPSERT  →  o "SAVE" (item 26)
- "SAVE" antigo = salvar um doc: se existe, atualiza; se não, insere.
- Hoje isso se faz com updateOne + { upsert: true }.
- Situação: garantir que 'Vitamina C 1g' esteja cadastrada.
- Como ela NÃO existe ainda, o upsert vai INSERIR.
- Item: 26 (SAVE via upsert) + 21 (SET)
*/

db.medicamentos.updateOne(
  { nome: "Vitamina C 1g" }, // filtro: existe esse medicamento?
  {
    $set: {
      // o que salvar
      categoria: "suplemento",
      preco: 19.9,
      estoque: 50,
      qtd_por_caixa: 10,
      dosagem_mg: 1000,
      principios_ativos: ["ácido ascórbico"],
      tags: ["imunidade", "vitamina"],
      descricao: "Suplemento vitamínico para reforço da imunidade.",
      fornecedor: { nome: "Sanofi", cnpj: "44.444.444/0001-44" },
      controlado: false,
    },
  },
  { upsert: true }, // <- a mágica: não existe? então cria.
);

// confere (a Vitamina C foi criada):
db.medicamentos.findOne(
  { nome: "Vitamina C 1g" },
  { nome: 1, categoria: 1, preco: 1, _id: 0 },
);
// Agora temos 13 medicamentos (12 + Vitamina C).

/*
Quinto Bloco: UPDATEMANY + SET  →  atualizar vários de uma vez
- marcar TODOS os antibióticos com um aviso de receita.
- updateMany aplica a mudança a todos os docs que batem no filtro.
- Item: 25 (UPDATE, variante updateMany)
*/

db.medicamentos.updateMany(
  { categoria: "antibiótico" },
  { $set: { exige_receita: true } },
);

// confere (os 2 antibióticos ganharam o campo):
db.medicamentos.find(
  { categoria: "antibiótico" },
  { nome: 1, exige_receita: 1, _id: 0 },
);

/*
Quinto Bloco: DELETE  →  remoção (a parte "D" do CRUD)
- Pra não apagar nenhum dos medicamentos "de verdade", primeiro
- inserimos um descartável e depois apagamos ele.
- Item: remoção (deleteOne) — completa o CRUD
*/

// insere um produto só pra demonstrar o delete:
db.medicamentos.insertOne({
  nome: "Produto Teste",
  categoria: "teste",
  preco: 0.01,
  estoque: 1,
  tags: ["descartável"],
});

// confere que ele existe:
db.medicamentos.findOne({ nome: "Produto Teste" }, { nome: 1, _id: 0 });

// agora remove:
db.medicamentos.deleteOne({ nome: "Produto Teste" });

// confere que sumiu (deve retornar null):
db.medicamentos.findOne({ nome: "Produto Teste" }, { nome: 1, _id: 0 });

// =============================================================
// Estado final esperado dos medicamentos:
//   12 originais + Vitamina C (upsert) = 13
//   (o Produto Teste foi inserido e removido, não conta)
// =============================================================
print("total de medicamentos: " + db.medicamentos.countDocuments()); // esperado: 13
