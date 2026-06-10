# Grupo 6 — Projeto MongoDB (Sistema de Gestão de Farmácia) 💊

Projeto da disciplina **CIN0137 — Banco de Dados** (2026.1)
Tema: **Sistema de Gestão de Farmácia** · Banco: MongoDB Atlas + Compass

## Sobre o projeto

Sistema de gestão de uma farmácia com 3 collections:

- `medicamentos` — produtos (estoque, preço, categoria, tags)
- `clientes` — quem compra (status, idade)
- `vendas` — o evento que conecta cliente + medicamentos comprados

A entrega final é um documento (.docx) com a descrição da aplicação e os scripts de consulta, cobrindo a checklist obrigatória de 31 comandos.

## Estrutura do repositório

```
/scripts
  00_insert_dados.js      → inserção das 3 collections
  01_crud.js              → insert, update, delete, addToSet, save
  02_selecao_filtros.js   → find, findOne, project, gte, exists, size, all...
  03_agregacao.js         → aggregate, match, group, sum, avg, max, cond, lookup
  04_outros.js            → mapReduce, $where, renameCollection, text/search
projeto_farmacia.md       → documento vivo (base do .docx final)
README.md                 → este arquivo
.gitignore
```

## Como conectar (cada integrante)

1. Instale o **MongoDB Compass**.
2. Peça a **string de conexão** no grupo privado do WhatsApp/Discord.
   > ⚠️ A string contém a senha do banco. NUNCA cole ela aqui, em commits, prints ou chats públicos.
3. No Compass: **Add new connection** → cole a string no campo URI → **Save & Connect**.
4. Se der erro de conexão, provavelmente é o seu IP. Avise o grupo —
   o acesso de rede já está liberado para qualquer IP (0.0.0.0/0) no Atlas.

## Como rodar os scripts

1. Nos (canto superior direito).
2. Digite `use farmacia_db` e dê enter.
3. Cole o conteúdo do script desejado (a partir da primeira linha de comando,
   pulando a linha `use` que é só de shell).

## Ordem de execução (importante)

`00_insert_dados.js` precisa rodar **primeiro** — as vendas dependem dos `_id`
dos clientes gerados na inserção.
