# Grind & Glory

App web gamificado onde suas tarefas da vida real viram XP e evoluem um herói de RPG.

- **Dia 1:** setup do projeto e tela inicial
- **Dia 2:** login por email e salvar/ler tarefa no banco (esse aqui)

Ainda não tem lista de tarefas de verdade, herói ou batalha — isso vem nos
próximos dias. Hoje é só provar que dá pra logar e que a tarefa salva e
volta do banco.

## Stack

- React
- Vite
- [Supabase](https://supabase.com) (login + banco de dados)

## Como rodar local

### 1. Instalar

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Cria uma conta em [supabase.com](https://supabase.com) e faz login
2. Clica em **New Project**, escolhe um nome (ex: `grind-and-glory`), uma
   senha de banco (guarda ela em algum lugar) e a região
3. Espera uns 2 minutos o projeto terminar de criar

### 3. Criar as tabelas

1. No menu da esquerda, entra em **SQL Editor**
2. Abre o arquivo [`supabase/schema.sql`](supabase/schema.sql) desse
   projeto, copia tudo e cola lá
3. Clica em **Run**

Isso cria a tabela `usuario` (perfil do jogador) e a tabela `tarefa`, já
com as regras de segurança (cada pessoa só vê e mexe nas próprias
tarefas).

### 4. Pegar a URL e a chave

1. No menu da esquerda, entra em **Project Settings > API**
2. Copia o **Project URL** e a chave **anon public**

### 5. Colar no `.env`

Esse projeto já tem um arquivo `.env` (ele **não** vai pro git, chave não
pode vazar). Abre ele na raiz do projeto e troca os valores:

```
VITE_SUPABASE_URL=cole_aqui_a_project_url
VITE_SUPABASE_ANON_KEY=cole_aqui_a_anon_key
```

Se o arquivo `.env` não existir por algum motivo, copia o
`.env.example` e renomeia pra `.env`.

### 6. Rodar

```bash
npm run dev
```

Abre o link que aparece no terminal (geralmente
`http://localhost:5173`).

## Como testar login e salvar tarefa

1. Com o app aberto, digita seu email e clica em **entrar com email**
2. Vai no seu email, abre o "link mágico" que o Supabase mandou
3. Isso te leva de volta pro app já logado
4. Digita um título no campo de tarefa e clica em **salvar**
5. A tarefa deve aparecer na lista embaixo — se recarregar a página e
   ela continuar lá, é sinal que salvou certo no banco
6. Pra conferir direto no banco: no Supabase, vai em **Table Editor >
   tarefa** e vê se a linha apareceu

Se der erro de "site não configurado" no link do email, vai em
**Authentication > URL Configuration** no Supabase e confere se o
**Site URL** está como `http://localhost:5173`.

## Deploy

Projeto pronto pra subir na [Vercel](https://vercel.com), sem configuração
extra de build (ela já reconhece projeto Vite sozinha). Só não esquece
de adicionar as mesmas variáveis do `.env` (`VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`) em **Project Settings > Environment
Variables** lá na Vercel, senão o app não acha as chaves no ar.
