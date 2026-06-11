# Grupo 6 — Projeto MongoDB (Sistema de Gestão de Farmácia) 💊

Projeto da disciplina **CIN0137 — Banco de Dados** (2026.1) · Profa. Valéria Cesário Times
Tema: **Sistema de Gestão de Farmácia** · Banco: MongoDB Atlas + Compass
Integrantes: Amanda Trinity, Maria Eduarda Torres, Mirella Fontinelle, Maria Luisa Brandão, Matheus Vieira, Willian Rupert (Grupo 5)

## Sobre o projeto

Sistema de gestão de uma farmácia com 3 collections:

- `medicamentos` — produtos (estoque, preço, categoria, tags)
- `clientes` — quem compra (status, idade)
- `vendas` — o evento que conecta cliente e medicamentos comprados

A entrega final é um documento (.docx) com a descrição da aplicação e os scripts de consulta, cobrindo a checklist obrigatória de 31 comandos.

## Integrantes

Amanda Trinity · Maria Eduarda Torres · Mirella Fontinelle · Maria Luisa Brandão · Matheus Vieira · Willian Rupert

## Estrutura do repositório

```
/scripts
  00_insert_dados.js      inserção das 3 collections
  01_crud.js              insert, update, delete, addToSet, save (upsert)
  02_selecao_filtros.js   find, findOne, project, gte, exists, size, all, sort, limit, count, text/search
  03_agregacao.js         aggregate, match, group, sum, avg, max, cond, lookup
  04_outros.js            filter, function, renameCollection, $where, mapReduce
projeto_farmacia.md       documento base do .docx final
README.md                 este arquivo
.gitignore
```

## Como conectar (cada integrante)

1. Instale o **MongoDB Compass**.
2. Peça a **string de conexão** no grupo privado.
   A string contém a senha do banco. Não a inclua em commits, prints ou canais públicos.
3. No Compass: **Add new connection**, cole a string no campo URI e clique em **Save & Connect**.
4. Se ocorrer erro de conexão, geralmente é o IP. O acesso de rede já está liberado para qualquer IP (0.0.0.0/0) no Atlas; avise o grupo se persistir.

## Como rodar os scripts

1. No Compass, abra o **MongoDB shell** (botão no canto superior direito da janela).
2. Digite `use farmacia_db` e pressione Enter.
3. Cole o conteúdo do script desejado, a partir da primeira linha de comando (a linha `use` é um comando de shell e não precisa ser colada de novo).

Recomenda-se rodar um comando (ou um bloco) por vez, para acompanhar o resultado de cada operação.

## Ordem de execução

O script `00_insert_dados.js` deve ser executado **primeiro**, pois as vendas dependem dos `_id` dos clientes gerados na inserção.

## Observação sobre `$where` e `mapReduce`

O cluster gratuito do Atlas (tier M0) **bloqueia** os comandos `$where` e `mapReduce` por política de segurança. Para cumprir a checklist, esses dois comandos foram executados em uma instância local do MongoDB Community (`mongodb://localhost:27017`), onde funcionam normalmente. Os demais 29 comandos rodam diretamente no Atlas pelo Compass.
