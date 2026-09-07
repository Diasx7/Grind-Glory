# Grind & Glory

App web gamificado onde suas tarefas da vida real viram XP e evoluem um herói de RPG.

- **Dia 1:** setup do projeto e tela inicial
- **Dia 2:** login e salvar/ler tarefa no banco
- **Dia 3:** tela Hoje — criar, listar e marcar tarefa
- **Dia 4:** moeda e XP por dificuldade, com retorno decrescente
- **Dia 5:** atributos subindo por categoria
- **Dia 6:** tela do Herói — o espelho
- **Dia 7:** rotinas que voltam todo dia
- **Dia 8:** batalha automática movida pelos atributos
- **Dia 9:** energia — o jogo só anda se você cumprir coisas
- **Dia 10:** polimento — bugs, estados vazios/erro, virada de dia
- **Dia 11:** PWA instalável, revisão mobile e deploy na Vercel
- **Dia 12:** planejar o dia seguinte — aba Semana e seletor de dia (esse aqui)

Ainda não tem loja nem equipamento, nem a aba "Este Mês" — o que
decide a batalha é só o que você fez na vida real.

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

No menu da esquerda, entra em **SQL Editor** e roda os cinco arquivos
**nessa ordem**, um de cada vez (copia o conteúdo, cola e clica em
**Run**):

1. [`supabase/schema.sql`](supabase/schema.sql) — as tabelas `usuario` e
   `tarefa`, já com as regras de segurança (cada pessoa só vê e mexe nas
   próprias coisas)
2. [`supabase/migracao_dia4.sql`](supabase/migracao_dia4.sql) — a tabela
   `conclusao` (o histórico), o `data_ref` e o trigger da dificuldade
3. [`supabase/migracao_dia7.sql`](supabase/migracao_dia7.sql) — a coluna
   `arquivada`, pra parar uma rotina sem apagar o histórico dela
4. [`supabase/migracao_dia8.sql`](supabase/migracao_dia8.sql) — a coluna
   `fase`, que guarda até onde a batalha chegou
5. [`supabase/migracao_dia9.sql`](supabase/migracao_dia9.sql) — as colunas
   de energia, que é o que a batalha gasta pra tentar

Só o primeiro arquivo **não** deixa o banco atualizado — o app quebra sem
os outros quatro.

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

### 5.1. Desligar a confirmação de email

O login é por **email + senha**. Era link mágico antes, mas o limite de
email do Supabase é baixo demais pra testar o app todo dia.

No Supabase, em **Authentication > Sign In / Providers > Email**, deixa
**Confirm email** desligado. Assim a conta criada no botão *criar conta*
já entra direto, sem abrir email nenhum.

Como não tem mais link voltando pro app, não precisa configurar Site URL
nem Redirect URLs.

### 6. Rodar

```bash
npm run dev
```

Abre o link que aparece no terminal (geralmente
`http://localhost:5173`).

## Como testar login e salvar tarefa

1. Com o app aberto, digita um email e uma senha (mínimo 6 caracteres)
2. Na primeira vez, clica em **criar conta** — você entra direto
3. Nas próximas, é o mesmo email e senha no botão **entrar**
4. Já na tela Hoje, escreve um título, escolhe a categoria e clica no **+**
5. Marca a tarefa na bolinha: ela risca e o ganho aparece embaixo
6. Recarrega a página — se a tarefa continuar marcada e as moedas
   continuarem lá, salvou certo no banco
7. Pra conferir direto no banco: no Supabase, **Table Editor > tarefa**
   e **> conclusao**, e vê se as linhas apareceram

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

## Como testar o planejamento (aba Semana)

1. Na tela Hoje, cria uma tarefa deixando o seletor de dia em **Hoje**
   (o padrão) — ela aparece na lista e conta em "hoje" normalmente
2. Cria outra tarefa clicando em **Amanhã** antes do **+** — repare que
   ela **não aparece** na lista nem entra na contagem "X de Y" de hoje
3. Abre o painel **📅 planejar amanhã** (logo abaixo do formulário): a
   tarefa que você acabou de criar pra amanhã aparece ali na prévia
4. Clica em **+ adicionar pra amanhã** dentro desse painel: o seletor de
   dia pula sozinho pra "Amanhã" e o cursor volta pro campo de título —
   é o atalho pra planejar sem sair da tela Hoje
5. Vai na aba **Semana**: os 7 dias aparecem, cada um com suas tarefas.
   A tarefa que você criou pra amanhã deve aparecer no card "Amanhã"
6. Nessa aba, clica no **+** de qualquer card de um dia futuro (ex:
   "Quinta") pra abrir o formulário daquele dia especificamente e criar
   uma tarefa direto ali
7. Uma rotina (criada com **🔁 repete todo dia** ligado) aparece em
   **todos** os 7 cards da Semana, não só num dia

### Confirmando que tarefa futura não pode ser feita antes da hora

Tenta marcar uma tarefa de amanhã como feita: não tem como, porque ela
simplesmente não existe na tela Hoje até o dia chegar (nem o card
"Amanhã" da Semana tem bolinha de marcar — só a tela Hoje marca).

### Simulando a chegada do dia seguinte

A forma mais direta, já que o "hoje" do app vem do relógio do
computador/celular (`dataDeHoje()` em `jogo.js`):

1. Cria uma tarefa pra amanhã (pelo seletor de dia ou pelo painel)
2. Muda a data do sistema operacional pra amanhã (no Windows: clica no
   relógio na barra de tarefas > **Ajustar data e hora**)
3. Recarrega a página (ou só espera — o app detecta a virada de dia
   sozinho, ver "Sem tratamento de virada de dia" resolvido no dia 10)
4. A tarefa que estava em "amanhã" agora aparece na tela Hoje, contando
   normalmente e podendo ser marcada
5. **Não esquece de voltar a data do sistema pro normal depois** — muda
   de novo pela mesma tela, ou liga o "definir hora automaticamente"

### Confirmando que tarefa de ontem não vira pendência

No Supabase, **Table Editor > tarefa**, edita manualmente o `data_ref`
de uma tarefa (não recorrente) pra ontem e recarrega a tela Hoje: ela
simplesmente some da lista, sem nenhum aviso de atraso. Isso não é um
recurso escondido — é só a mesma busca (`data_ref = hoje`) que já existia
antes de hoje, aplicada com uma data diferente.

## Instalar no celular (PWA)

O app é um PWA: dá pra instalar na tela inicial do celular e ele abre
em tela cheia, sem barra de navegador.

- **Android (Chrome):** abre o site, toca no menu (⋮) e em **Instalar
  app** (ou **Adicionar à tela inicial**)
- **iPhone (Safari):** abre o site, toca no botão de compartilhar
  (o quadrado com a seta pra cima) e em **Adicionar à Tela de Início**

Isso só funciona no site publicado (https), não no `npm run dev` local.

## Deploy na Vercel

1. Cria uma conta em [vercel.com](https://vercel.com) (dá pra entrar
   direto com o GitHub)
2. Clica em **Add New > Project**
3. Escolhe o repositório `Grind-Glory` do GitHub e clica em **Import**
4. A Vercel já reconhece que é um projeto Vite sozinha (build
   `vite build`, saída em `dist`) — não precisa mudar nada nessa tela
5. Antes de clicar em Deploy, abre **Environment Variables** e adiciona
   as duas do `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Clica em **Deploy** e espera. Em ~1 minuto ela te dá um link tipo
   `grind-glory.vercel.app`

Pra atualizar depois: é só dar `git push` — a Vercel redeploya sozinha
a cada push na branch principal.

### Depois de publicar, ajusta isso no painel do Supabase

Hoje o login é por **email + senha** com confirmação de email
desligada (ver seção 5.1 acima), então nenhum link de email volta pro
app — por isso o Site URL não bloqueia o login em produção como
bloquearia com link mágico.

Mesmo assim vale configurar, porque o Supabase usa o Site URL em outras
telas de auth (recuperação de senha, por exemplo, ou se um dia vocês
ligar magic link/OAuth de novo):

1. No Supabase, vai em **Authentication > URL Configuration**
2. Troca o **Site URL** de `http://localhost:5173` pro domínio da
   Vercel (ex: `https://grind-glory.vercel.app`)
3. Em **Redirect URLs**, adiciona esse mesmo domínio (pode deixar o
   `localhost:5173` também na lista, pra continuar testando local)

## Dívida técnica (pra resolver depois)

### Recompensa é calculada no cliente
O trigger `aplicar_dificuldade()` garante que a **dificuldade** de uma
tarefa sempre venha da categoria, então não adianta chamar a API na mão
mandando `dificuldade: 3` numa tarefa fácil.

Mas os **valores** de moeda, XP e ponto de atributo ainda são calculados
no JS (`recompensas` no `TelaHoje.jsx`) e escritos pelo cliente. Quem
abrir o DevTools consegue inserir uma conclusão com `moedas: 9999`, e
o mesmo vale pra `usuario.moedas` direto.

O conserto de verdade é mover a conclusão inteira pra uma função Postgres
(`concluir_tarefa(tarefa_id)`) com `security definer`, que calcula a
recompensa no banco e aí sim é inviolável. Como hoje é um app de um
jogador só, o único que pode trapacear sou eu — fica pra quando tiver
mais gente usando.

### O preset de dificuldade vive em dois lugares
A lista `categorias` do `jogo.js` e o `case` do trigger
`aplicar_dificuldade()` precisam bater. Mexeu em um, mexe no outro.
Se saírem de sincronia, a tela mostra um ganho e o banco grava a
dificuldade de outro.

### ~~Sem tratamento de virada de dia com o app aberto~~ (resolvido no dia 10)
O "hoje" era calculado só quando a tela montava. Agora o `App.jsx` fica de
olho (`visibilitychange` + um intervalo de reforço) e, quando o dia muda,
avisa a `TelaHoje` via prop pra ela buscar tudo de novo e reseta a energia
do dia. `TelaHeroi` e `TelaBatalha` não recebem esse aviso — não é grave,
porque toda troca de aba já remonta a tela e busca os dados atuais.

### `gastarEnergia()` na batalha não segura o resultado
`comecarLuta()` chama `gastarEnergia()` sem esperar ela terminar, e a luta
roda mesmo que aquele `update` no banco falhe. Só acontece se a escrita
falhar bem naquela hora (raro), mas o resultado seria uma luta acontecendo
sem ter descontado a energia de verdade no banco. Não mexi porque exigiria
travar a luta até confirmar o gasto, e isso muda o "feel" de resposta
imediata do botão - fica pra quando isso incomodar de verdade.

### A coluna `usuario.nivel` está morta
Ela existe desde o dia 2 mas nunca foi escrita — está em `1` pra todo
mundo. O nível mostrado na tela do Herói é **derivado do XP** na hora
(`calcularNivel()` no `TelaHeroi.jsx`), pra não ter dois números dizendo
a mesma coisa e saindo de sincronia.

Ou a coluna some numa migração, ou passa a ser preenchida — mas ter as
duas coisas é pedir bug. Deixei derivado porque é o que não quebra nada
hoje.

### Na aba Semana só dá pra apagar tarefa de dias futuros
`apagarTarefa()` na tela Hoje devolve a recompensa (moeda/xp/atributo)
antes de apagar, porque a tarefa pode já estar concluída. Na Semana,
pra não duplicar essa lógica toda de novo, o botão ✕ só aparece nos
dias depois de hoje - dias futuros nunca têm conclusão (não dá pra
marcar tarefa antes da hora), então apagar ali nunca corre o risco de
sumir com uma recompensa já dada. Rotina foge dessa regra e pode ser
arquivada de qualquer dia, porque arquivar nunca mexe em conclusão.
Se um dia a tarefa de hoje precisar ser editável pela Semana também,
é só levar essa mesma lógica de devolução pra lá.
