/*
Outros comandos da checklist (os que não se encaixam nos grupos anteriores)
Pré-requisito: ter rodado 00, 01, 02 e 03 antes
RODAR UM COMANDO/BLOCO POR VEZ no shell

Itens da checklist cobertos aqui:
24 FILTER
18 FUNCTION
27 RENAMECOLLECTION
16 $WHERE
17 MAPREDUCE
*/

/*
Primeiro Bloco: FILTER (filtra elementos DENTRO de um array)
- diferente de $all/$size (que filtram o documento): $filter peneira o conteúdo do array
- situação: em cada venda, mostrar só os itens que custaram mais de R$15
- input = o array · cond = a condição · as = nome de cada elemento ($$item)
- Item 24: FILTER
*/

db.vendas.aggregate([
  {
    $project: {
      _id: 0,
      data: 1,
      total: 1,
      itens_caros: {
        $filter: {
          input: "$itens", // o array a filtrar
          as: "item", // cada elemento vira $$item
          cond: { $gt: ["$$item.preco_unit", 15] }, // mantém só preco_unit > 15
        },
      },
    },
  },
]);

/*
Segundo Bloco: FUNCTION (função anônima em JavaScript)
- o caso clássico: forEach percorrendo os resultados com uma function(doc)
- aqui: imprime nome e preço de cada analgésico
- Item 18: FUNCTION
*/

db.medicamentos.find({ categoria: "analgésico" }).forEach(function (doc) {
  print(doc.nome + " custa R$ " + doc.preco);
});

/*
Terceiro Bloco: RENAMECOLLECTION (renomeia a collection inteira)
- CUIDADO: renomear 'medicamentos' quebraria todas as queries
- por isso criamos uma collection descartável, renomeamos e apagamos
- diferente de $rename (que renomeia CAMPO); aqui renomeia a COLLECTION
- Item 27: RENAMECOLLECTION
*/

// cria uma collection de teste com 1 doc:
db.colecao_teste.insertOne({ exemplo: "renomear depois" });

// renomeia colecao_teste -> colecao_renomeada:
db.colecao_teste.renameCollection("colecao_renomeada");

// confere (a nova existe):
db.colecao_renomeada.findOne();

// limpa (apaga a collection de teste pra não sujar o banco):
db.colecao_renomeada.drop();

/*
Quarto Bloco: $WHERE (filtro com expressão JavaScript)
- permite uma condição em JS dentro do find
- situação: medicamentos com estoque abaixo de 10 (precisam repor)
- Item 16: $WHERE
- ATENÇÃO: o Atlas M0 (gratuito) BLOQUEIA $where por segurança:
    erro -> "$where not allowed in this atlas tier"
  Por isso este comando foi rodado num MongoDB Community LOCAL
  , onde funciona normalmente.
- ALTERNATIVA que roda no proprio M0 (mesmo resultado, sem JS no servidor):
    db.medicamentos.find({ $expr: { $lt: ["$estoque", 10] } });
*/

db.medicamentos.find({
  $where: "this.estoque < 10",
});

/*
Quinto Bloco: MAPREDUCE (processamento map/reduce)
- map = emite (chave, valor) por documento · reduce = combina os valores da mesma chave
- situação: contar quantos medicamentos há por categoria (via map/reduce)
- Item 17: MAPREDUCE
- ATENÇÃO: mapReduce está deprecated (dá DeprecationWarning, mas ainda funciona).
- O Atlas M0 (gratuito) BLOQUEIA mapReduce: erro "CMD_NOT_ALLOWED: mapReduce".
  Por isso foi rodado num MongoDB Community LOCAL, onde funciona (só com o warning).
- O MESMO resultado (contagem por categoria) também foi obtido via
  aggregate + group no script 03 (P1) - a forma moderna de fazer.
*/

db.medicamentos.mapReduce(
  // map: pra cada doc, emite (categoria, 1)
  function () {
    emit(this.categoria, 1);
  },
  // reduce: soma os 1 de cada categoria
  function (chave, valores) {
    return Array.sum(valores);
  },
  {
    out: { inline: 1 }, // resultado direto na tela (não cria collection)
  },
);

/*
Fim do script de outros comandos
Itens cobertos: 16, 17, 18, 24, 27
Observação: FILTER, FUNCTION e RENAMECOLLECTION rodam no Atlas M0.
$WHERE e MAPREDUCE foram rodados em MongoDB local (o M0 os bloqueia).
*/
