// Rodar no mongosh (Compass => "Open MongoDB shell")
// A ordem é importante: medicamentos => clientes => vendas (vendas precisa dos _id dos clientes, gerados na inserção)

// 'use farmacia_db' é um comando de SHELL, não é JavaScript. (Se colar o arquivo inteiro de uma vez, essa linha dá erro de sintaxe)
// Primeiro: digite a linha abaixo sozinha no shell e dê enter (o shell responde "switched to db farmacia_db")
// Sefundo: cole o restante do script (no Compass você já está conectado em farmacia_db, então o insert já cai no banco certo mesmo sem o 'use')

/*
medicamentos
- alguns 'controlado: true', outros false, e alguns sem o campo (para poder usar $exist)
- preços e estoques espalhados (baixos e altos) ($gte, $where, $cond, $max) 
- tags que se repetem entre docs ($all, $size)
*/
db.medicamentos.insertMany([
  {
    nome: "Dipirona 500mg",
    categoria: "analgésico",
    preco: 12.5,
    estoque: 120,
    qtd_por_caixa: 20,
    dosagem_mg: 500,
    principios_ativos: ["dipirona sódica"],
    tags: ["febre", "dor"],
    descricao:
      "Analgésico e antitérmico indicado para alívio de dores e febre.",
    fornecedor: { nome: "Bayer", cnpj: "00.000.000/0001-00" },
    controlado: false,
  },
  {
    nome: "Paracetamol 750mg",
    categoria: "analgésico",
    preco: 9.0,
    estoque: 8,
    qtd_por_caixa: 20,
    dosagem_mg: 750,
    principios_ativos: ["paracetamol"],
    tags: ["febre", "dor"],
    descricao: "Analgésico e antitérmico para dores leves a moderadas e febre.",
    fornecedor: { nome: "EMS", cnpj: "11.111.111/0001-11" },
    controlado: false,
  },
  {
    nome: "Ibuprofeno 600mg",
    categoria: "anti-inflamatório",
    preco: 18.9,
    estoque: 45,
    qtd_por_caixa: 30,
    dosagem_mg: 600,
    principios_ativos: ["ibuprofeno"],
    tags: ["inflamação", "dor"],
    descricao: "Anti-inflamatório não esteroidal para dor e inflamação.",
    fornecedor: { nome: "Medley", cnpj: "22.222.222/0001-22" },
    controlado: false,
  },
  {
    nome: "Nimesulida 100mg",
    categoria: "anti-inflamatório",
    preco: 14.3,
    estoque: 5,
    qtd_por_caixa: 12,
    dosagem_mg: 100,
    principios_ativos: ["nimesulida"],
    tags: ["inflamação", "dor", "febre"],
    descricao: "Anti-inflamatório indicado para processos inflamatórios e dor.",
    fornecedor: { nome: "EMS", cnpj: "11.111.111/0001-11" },
    controlado: false,
  },
  {
    nome: "Amoxicilina 500mg",
    categoria: "antibiótico",
    preco: 28.0,
    estoque: 60,
    qtd_por_caixa: 21,
    dosagem_mg: 500,
    principios_ativos: ["amoxicilina"],
    tags: ["infecção", "bactéria"],
    descricao: "Antibiótico de amplo espectro para infecções bacterianas.",
    fornecedor: { nome: "Eurofarma", cnpj: "33.333.333/0001-33" },
    controlado: true, // antibiótico: exige retenção de receita
  },
  {
    nome: "Azitromicina 500mg",
    categoria: "antibiótico",
    preco: 35.5,
    estoque: 25,
    qtd_por_caixa: 5,
    dosagem_mg: 500,
    principios_ativos: ["azitromicina"],
    tags: ["infecção", "bactéria"],
    descricao: "Antibiótico para infecções respiratórias e de pele.",
    fornecedor: { nome: "Eurofarma", cnpj: "33.333.333/0001-33" },
    controlado: true,
  },
  {
    nome: "Loratadina 10mg",
    categoria: "antialérgico",
    preco: 11.2,
    estoque: 90,
    qtd_por_caixa: 12,
    dosagem_mg: 10,
    principios_ativos: ["loratadina"],
    tags: ["alergia", "rinite"],
    descricao: "Antialérgico para rinite e urticária, não causa sonolência.",
    fornecedor: { nome: "Medley", cnpj: "22.222.222/0001-22" },
    // sem 'controlado' DE PROPÓSITO (demonstra $exists)
  },
  {
    nome: "Cetirizina 10mg",
    categoria: "antialérgico",
    preco: 13.8,
    estoque: 70,
    qtd_por_caixa: 12,
    dosagem_mg: 10,
    principios_ativos: ["cetirizina"],
    tags: ["alergia", "rinite", "coceira"],
    descricao: "Antialérgico indicado para rinite alérgica e coceira na pele.",
    fornecedor: { nome: "EMS", cnpj: "11.111.111/0001-11" },
    // sem 'controlado' DE PROPÓSITO (demonstra $exists)
  },
  {
    nome: "Sertralina 50mg",
    categoria: "antidepressivo",
    preco: 42.0,
    estoque: 30,
    qtd_por_caixa: 30,
    dosagem_mg: 50,
    principios_ativos: ["cloridrato de sertralina"],
    tags: ["depressão", "ansiedade"],
    descricao: "Antidepressivo da classe ISRS para depressão e ansiedade.",
    fornecedor: { nome: "Eurofarma", cnpj: "33.333.333/0001-33" },
    controlado: true, // tarja preta
  },
  {
    nome: "Fluoxetina 20mg",
    categoria: "antidepressivo",
    preco: 22.4,
    estoque: 4,
    qtd_por_caixa: 30,
    dosagem_mg: 20,
    principios_ativos: ["cloridrato de fluoxetina"],
    tags: ["depressão", "ansiedade"],
    descricao: "Antidepressivo ISRS usado no tratamento de depressão.",
    fornecedor: { nome: "Medley", cnpj: "22.222.222/0001-22" },
    controlado: true,
  },
  {
    nome: "Losartana 50mg",
    categoria: "anti-hipertensivo",
    preco: 16.7,
    estoque: 110,
    qtd_por_caixa: 30,
    dosagem_mg: 50,
    principios_ativos: ["losartana potássica"],
    tags: ["pressão", "hipertensão"],
    descricao: "Anti-hipertensivo para controle da pressão arterial.",
    fornecedor: { nome: "EMS", cnpj: "11.111.111/0001-11" },
    controlado: false,
  },
  {
    nome: "Enalapril 10mg",
    categoria: "anti-hipertensivo",
    preco: 15.0,
    estoque: 7,
    qtd_por_caixa: 30,
    dosagem_mg: 10,
    principios_ativos: ["maleato de enalapril"],
    tags: ["pressão", "hipertensão"],
    descricao:
      "Anti-hipertensivo indicado para hipertensão e insuficiência cardíaca.",
    fornecedor: { nome: "Medley", cnpj: "22.222.222/0001-22" },
    controlado: false,
  },
]);

/* -------------------------------------------------------------
clientes
- status variado (ouro/prata/platina) ($group)
- idade variada → ($gte) 
- guardamos cada retorno em variável pra pegar o _id sem copiar na mão
*/
var rMaria = db.clientes.insertOne({
  nome: "Maria Silva",
  cpf: "111.111.111-11",
  idade: 34,
  status: "ouro",
  telefone: "81 99999-0001",
});
var rJoao = db.clientes.insertOne({
  nome: "João Pereira",
  cpf: "222.222.222-22",
  idade: 61,
  status: "prata",
  telefone: "81 99999-0002",
});
var rAna = db.clientes.insertOne({
  nome: "Ana Costa",
  cpf: "333.333.333-33",
  idade: 27,
  status: "platina",
  telefone: "81 99999-0003",
});
var rCarlos = db.clientes.insertOne({
  nome: "Carlos Souza",
  cpf: "444.444.444-44",
  idade: 45,
  status: "prata",
  telefone: "81 99999-0004",
});
var rBeatriz = db.clientes.insertOne({
  nome: "Beatriz Lima",
  cpf: "555.555.555-55",
  idade: 52,
  status: "ouro",
  telefone: "81 99999-0005",
});

/*
vendas
- cliente_id pega o _id real do cliente via .insertedId 
- itens = array de objetos (snapshot do preço no momento da venda)
- medico_prescritor só aparece quando há item controlado (veremos usando $exists)
*/
db.vendas.insertMany([
  {
    cliente_id: rMaria.insertedId,
    data: new Date("2026-05-02"),
    farmaceutico_responsavel: "João Souza",
    itens: [
      { medicamento: "Dipirona 500mg", qtd: 2, preco_unit: 12.5 },
      { medicamento: "Paracetamol 750mg", qtd: 1, preco_unit: 9.0 },
    ],
    total: 34.0,
  },
  {
    cliente_id: rJoao.insertedId,
    data: new Date("2026-05-10"),
    farmaceutico_responsavel: "Carla Mendes",
    medico_prescritor: "Dra. Ana Lima", // venda com controlado
    itens: [
      { medicamento: "Amoxicilina 500mg", qtd: 1, preco_unit: 28.0 },
      { medicamento: "Loratadina 10mg", qtd: 2, preco_unit: 11.2 },
    ],
    total: 50.4,
  },
  {
    cliente_id: rAna.insertedId,
    data: new Date("2026-05-15"),
    farmaceutico_responsavel: "João Souza",
    medico_prescritor: "Dr. Paulo Reis",
    itens: [{ medicamento: "Sertralina 50mg", qtd: 1, preco_unit: 42.0 }],
    total: 42.0,
  },
  {
    cliente_id: rCarlos.insertedId,
    data: new Date("2026-05-20"),
    farmaceutico_responsavel: "Carla Mendes",
    itens: [
      { medicamento: "Ibuprofeno 600mg", qtd: 1, preco_unit: 18.9 },
      { medicamento: "Nimesulida 100mg", qtd: 1, preco_unit: 14.3 },
      { medicamento: "Losartana 50mg", qtd: 1, preco_unit: 16.7 },
    ],
    total: 49.9,
  },
  {
    cliente_id: rBeatriz.insertedId,
    data: new Date("2026-06-01"),
    farmaceutico_responsavel: "João Souza",
    itens: [
      { medicamento: "Losartana 50mg", qtd: 2, preco_unit: 16.7 },
      { medicamento: "Cetirizina 10mg", qtd: 1, preco_unit: 13.8 },
    ],
    total: 47.2,
  },
]);
