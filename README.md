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

No menu da esquerda, entra em **Project Settings > API Keys**:

- **Project URL** — algo tipo `https://abcdefgh.supabase.co`
- **Publishable key** — a chave que começa com `sb_publishable_`

Essa `sb_publishable_` é o formato novo da chave pública, ela substitui a
antiga `anon public` (aquele texto gigante começando com `eyJ`). As duas
funcionam igual pro app, é só usar a nova. Ela é pública mesmo, pode ir
pro navegador — quem protege os dados é o RLS lá no banco.

### 5. Colar no `.env`

Esse projeto já tem um arquivo `.env` na raiz (ele **não** vai pro git,
chave não pode vazar). Abre ele e troca os valores:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

- O **Project URL** vai em `VITE_SUPABASE_URL`
- A **Publishable key** (`sb_publishable_...`) vai em
  `VITE_SUPABASE_ANON_KEY`

O nome da variável continua `ANON_KEY` só pra não ter que mexer no
código — o que importa é o valor.

Sem aspas, sem espaço em volta do `=`. Depois de salvar o `.env` **para
o servidor e roda `npm run dev` de novo**, senão o Vite continua com os
valores velhos.

Se o arquivo `.env` não existir por algum motivo, copia o
`.env.example` e renomeia pra `.env`.

### 5.1. Liberar o endereço do link mágico

No Supabase, em **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:5173`
- Em **Redirect URLs**, adiciona `http://localhost:5173/**` (e depois a
  URL da Vercel, quando publicar)

Sem isso o link do email não te traz de volta pro app logado.

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

### Se a lista vier vazia

Abre o console do navegador (F12 > Console) e vê o que aparece:

- **`violates foreign key constraint`** ao salvar — a linha do perfil na
  tabela `usuario` não foi criada. Confere em **Table Editor > usuario**
  se tem uma linha com o seu id. Se não tiver, é a política de insert do
  `usuario` faltando: roda o `schema.sql` de novo.
- **`new row violates row-level security policy`** — o RLS bloqueou. Quer
  dizer que o `usuario_id` que o app mandou não bate com o usuário
  logado, ou as políticas não foram criadas.
- **Salva sem erro mas a lista fica vazia** — é a política de `select`
  faltando. O insert passou, o read não. Confere em **Table Editor >
  tarefa** se a linha existe: se existe no banco e não aparece no app, é
  RLS de leitura.
- **`Invalid API key`** — a chave no `.env` está errada, ou você não
  reiniciou o `npm run dev` depois de editar o `.env`.
- **Nada no console e nem carrega** — confere se o `.env` está na raiz do
  projeto (mesma pasta do `package.json`) e se as variáveis começam com
  `VITE_` (o Vite ignora as que não começam).

## Deploy

Projeto pronto pra subir na [Vercel](https://vercel.com), sem configuração
extra de build (ela já reconhece projeto Vite sozinha). Só não esquece
de adicionar as mesmas variáveis do `.env` (`VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`) em **Project Settings > Environment
Variables** lá na Vercel, senão o app não acha as chaves no ar.
