/*
Agregação (Aggregation Pipeline)
Pré-requisito: ter rodado 00, 01 e 02 antes
RODAR UM PIPELINE POR VEZ no shell

A agregação são estágios: o resultado de um estágio entra no
próximo. Cada [ {estágio1}, {estágio2}, ... ] é como uma esteira.

Itens da checklist cobertos aqui:
4 AGGREGATE
5 MATCH 
8 GROUP 
9 SUM 
11 MAX 
12 AVG 
28 COND 
29 LOOKUP
*/

/*
Primeira Pergunta: "Quantos medicamentos e qual o preço médio por categoria?"
- agrupa os medicamentos por categoria e calcula
- $group = agrupa por um campo 
- $sum: 1 = conta
- $avg = média
- ordena por quantidade (mais itens primeiro)
- Itens: 4 (AGGREGATE) + 8 (GROUP) + 9 (SUM) + 12 (AVG)
*/

db.medicamentos.aggregate([
  {
    // estágio 1: agrupa por categoria
    $group: {
      _id: "$categoria", // o campo pelo qual agrupar
      quantidade: { $sum: 1 }, // soma 1 por documento = contagem
      preco_medio: { $avg: "$preco" }, // média dos preços do grupo
    },
  },
  {
    // estágio 2: ordena por quantidade (desc)
    $sort: { quantidade: -1 },
  },
]);

/*
Segunda Pergunta: "Entre os medicamentos controlados, qual o mais caro e a média de preço?"
- filtra só os controlados, depois calcula máximo e média
- $match = o "where" da agregação (filtra antes de calcular)
- $max = maior valor · $avg = média
- Itens: 4 (AGGREGATE) + 5 (MATCH) + 11 (MAX) + 12 (AVG)
*/

db.medicamentos.aggregate([
  {
    // estágio 1: filtra só os controlados
    $match: { controlado: true },
  },
  {
    // estágio 2: agrupa TODOS num só grupo (_id: null) e calcula
    $group: {
      _id: null, // null = um único grupo com todos
      preco_mais_caro: { $max: "$preco" },
      preco_medio: { $avg: "$preco" },
      total_controlados: { $sum: 1 },
    },
  },
]);

/*
Terceira Pergunta: "Quais vendas houve e quem foram os clientes?"
- liga a collection 'vendas' à collection 'clientes' (o "join")
- $lookup = busca, pra cada venda, o cliente correspondente pelo _id
- Item: 4 (AGGREGATE) + 29 (LOOKUP)
*/

db.vendas.aggregate([
  {
    // estágio 1: traz os dados do cliente de cada venda
    $lookup: {
      from: "clientes", // collection a juntar
      localField: "cliente_id", // campo na venda
      foreignField: "_id", // campo no cliente que corresponde
      as: "dados_cliente", // nome do array de resultado
    },
  },
  {
    // estágio 2: mostra só o que interessa
    $project: {
      _id: 0,
      data: 1,
      total: 1,
      "dados_cliente.nome": 1,
      "dados_cliente.status": 1,
    },
  },
]);

/*
Quarta Pergunta: "Quais medicamentos precisam de reposição?"
- classifica cada medicamento como 'repor' ou 'ok' conforme o estoque
- $cond = condição if/else DENTRO da agregação
- regra: estoque < 10 => 'repor', senão 'ok'
- Itens: 4 (AGGREGATE) + 28 (COND)
*/

db.medicamentos.aggregate([
  {
    // estágio único: projeta nome, estoque e a situação calculada
    $project: {
      _id: 0,
      nome: 1,
      estoque: 1,
      situacao: {
        $cond: {
          if: { $lt: ["$estoque", 10] }, // se estoque < 10
          then: "repor", // então
          else: "ok", // senão
        },
      },
    },
  },
  {
    // ordena pra ver os 'repor' agrupados
    $sort: { estoque: 1 },
  },
]);

/*
Fim do script de agregação
Itens cobertos: 4, 5, 8, 9, 11, 12, 28, 29
*/
