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
- **Dia 12:** planejar o dia seguinte — aba Semana e seletor de dia
- **Dia 13:** nome de verdade na saudação, em vez do pedaço do email
- **Dia 14:** reduzir o atrito de planejar — repetir plano de ontem e lembrete à noite
- **Dia 15:** o espelho sugerindo tarefa, editar tarefa e revisão da edição de nome
- **Dia 16:** objetivos de longo prazo — o grande vira passos pequenos (esse aqui)

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

No menu da esquerda, entra em **SQL Editor** e roda os seis arquivos
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
6. [`supabase/migracao_dia16.sql`](supabase/migracao_dia16.sql) — a tabela
   `objetivo` e o vínculo da tarefa com ele

Só o primeiro arquivo **não** deixa o banco atualizado — o app quebra sem
os outros cinco.

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

1. Com o app aberto, digita seu **nome**, um email e uma senha (mínimo 6
   caracteres)
2. Na primeira vez, clica em **criar conta** — você entra direto, e a
   saudação na tela Hoje mostra o nome que você digitou (não o email)
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
- **`email rate limit exceeded`** ao criar conta — o Supabase free tier
  tem um teto baixo de emails por hora (conta de confirmação, mesmo com
  **Confirm email** desligado ele ainda tenta mandar algo às vezes).
  Espera um pouco e tenta de novo, ou confere se **Confirm email** em
  **Authentication > Sign In / Providers > Email** está mesmo desligado
  (ver seção 5.1) — se estiver ligado, toda conta nova depende de um
  email que pode nunca chegar por causa desse teto.

### Corrigindo o nome de uma conta antiga

Contas criadas antes do dia 13 ficaram com o **email inteiro** salvo em
`usuario.nome` (era assim que o `App.jsx` preenchia essa coluna antes).
Pra corrigir: entra com essa conta, vai na aba **Herói**, toca no nome
(tem um ✏️ do lado) e digita o nome de verdade. Salva uma vez só, fica
guardado no banco pra sempre.

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

## Como testar "repetir plano de ontem" e o lembrete

### Repetir plano de um dia anterior

1. Marca (ou só cria) algumas tarefas hoje
2. Na tela Hoje, abre o painel **📅 planejar amanhã**
3. Dentro dele tem **🔁 repetir tarefas de**, já em "ontem" por padrão,
   com as tarefas daquele dia listadas e **todas marcadas** — é assim que
   o caminho de um toque só funciona: sem mudar nada, já aperta **🔁
   copiar pra amanhã**
4. As tarefas copiadas aparecem na prévia "planejado pra amanhã" ali em
   cima, e a lista de "repetir" fica vazia (já copiou o que tinha)
5. Pra copiar de um dia diferente (não só ontem), troca a data ali do
   lado de "repetir tarefas de" — qualquer dia passado serve
6. Desmarca uma tarefa da lista antes de copiar pra levar só algumas,
   não todas

### Lembrete de planejar à noite

1. Vai na aba **Herói**, desce até **lembretes**
2. Liga o interruptor — o navegador vai pedir permissão de notificação
   (só pede porque você pediu, não sozinho)
3. Escolhe o horário (padrão 21h)
4. **Pra testar sem esperar até a hora**: muda a hora do computador pra
   depois do horário escolhido (ou escolhe um horário que já passou hoje)
   e volta pro app — dentro de um minuto (ou ao trocar de aba/voltar pro
   navegador) a notificação aparece, **contanto que amanhã ainda não
   tenha nenhuma tarefa planejada** (se já tiver, o app não avisa de
   novo — não é cobrança)
5. Desliga o interruptor a qualquer momento: para na hora, sem pedir nada

**Limitação importante:** isso não é push de verdade. Só funciona com o
app aberto em alguma aba do navegador (mesmo em segundo plano) — com o
navegador todo fechado, o aviso não chega. Fazer chegar de verdade com
o app fechado exigiria infraestrutura de servidor (VAPID, tabela de
inscrição, Edge Function, cron) que esse projeto não tem hoje.

## Como testar a sugestão do espelho e editar tarefa

### Sugestão a partir do histórico

1. Marca umas tarefas de categorias diferentes por uns dias, deixando
   pelo menos uma categoria (ex: Saúde) sem marcar nada por mais de 2 dias
2. Abre o painel **📅 planejar amanhã** na tela Hoje — se tiver algum
   atributo esquecido, aparece um cartão roxo em cima de tudo: "faz X
   dias sem nada de [atributo] — [convite]"
3. Toca em **+ adicionar pra amanhã** dentro do cartão: cria a tarefa
   pra amanhã direto, com a categoria certa, sem abrir formulário nenhum
4. O cartão some depois de atendido (não fica insistindo na mesma
   sugestão) — só volta a aparecer se, na próxima busca, ainda houver
   algo esquecido
5. Se o texto sugerido não for bem o que você quer fazer, edita a
   tarefa depois (é literalmente pra isso que o item de editar serve)

### Editar tarefa

1. Na tela Hoje, toca no ✏️ ao lado de qualquer tarefa (fica entre o
   texto e o ✕)
2. Muda o título, a categoria e/ou o dia, e salva
3. **Numa tarefa já marcada como feita hoje**: o seletor de dia some e
   vira um aviso "concluída hoje — não dá pra mudar o dia" — o título e
   a categoria ainda dão pra editar. É de propósito: mudar o dia de uma
   tarefa que já rendeu recompensa deixaria ela "sem conclusão" no dia
   novo, como se nunca tivesse sido feita
4. Muda a categoria de uma tarefa: confere em **Table Editor > tarefa**
   no Supabase que a `dificuldade` mudou sozinha (é o trigger
   `aplicar_dificuldade()` fazendo isso, não o app)

## Como testar objetivos de longo prazo

### Criar um objetivo e vincular tarefa

1. Vai na aba **Objetivos** e toca em **+ novo objetivo**
2. Preenche o título, escolhe a categoria, e o tipo:
   - **por etapas** (ex: "ler 10 capítulos") — o alvo é a quantidade,
     cada tarefa concluída soma **1** sozinha, sem perguntar nada
   - **por valor** (ex: "juntar 5000 pra viagem") — o alvo é o número
     final; ao vincular uma tarefa a esse objetivo, o app pergunta
     "quanto isso adianta?" e você digita o valor daquela tarefa
     específica (ex: 100)
3. Preenche o alvo (e a unidade, tipo "capítulos" ou "R$") e cria
4. Na tela **Hoje**, cria uma tarefa nova: aparece um seletor **🎯
   vincular a um objetivo (opcional)** logo abaixo das categorias.
   Escolhe o objetivo que você criou
5. Marca essa tarefa como feita: volta na aba Objetivos e confere que a
   barra andou (1 etapa, ou o valor que você digitou)
6. Desmarca a mesma tarefa: o progresso volta pro que era antes —
   nunca fica "emprestado"

### Objetivo concluído (comemoração) e voltando atrás

1. Repete o passo acima até o progresso bater o alvo (crie e conclua
   tarefas suficientes)
2. Ao bater o alvo, aparece uma tela de comemoração 🎉 por cima de
   tudo — toca em **continuar** (ou em qualquer lugar fora do cartão)
   pra fechar
3. Na aba Objetivos, ele não aparece mais na lista principal — foi pra
   **🏆 concluídos**, com a data. Ele não some de verdade, só sai do
   caminho
4. Se desmarcar a última tarefa que completou o objetivo (lá na tela
   Hoje), ele volta sozinho pra lista de ativos — o status sempre
   reflete o progresso de verdade, nunca fica "mentindo"

### Objetivo parado sugerindo um passo (o espelho agindo)

1. Cria um objetivo e não vincula nenhuma tarefa a ele por alguns dias
   (ou edita `ultima_atividade` pra uma data antiga direto no **Table
   Editor > objetivo**, pra não precisar esperar)
2. Passados mais de 4 dias sem nenhuma tarefa vinculada concluída, abre
   o painel **📅 planejar amanhã** na tela Hoje: aparece um cartão "faz
   X dias sem avançar em '[objetivo]' — que tal um passo pequeno pra
   amanhã?"
3. Toca em **+ criar um passo pra isso**: pula pro formulário com
   "amanhã" e o objetivo já selecionados, só falta escrever o passo em
   si (de propósito — o passo é pessoal demais pra vir pronto, ao
   contrário do convite de atributo que é sempre a mesma frase)

### Arquivar sem culpa

Na aba Objetivos, toca no ✕ do cartão. Confirma, e ele simplesmente sai
da tela — não vira "objetivo abandonado" em lugar nenhum visível, não
some o que já tinha avançado no banco (fica lá, só o status muda pra
`arquivado`), e não tem um segundo aviso de "tem certeza mesmo?".

### Poucos objetivos de cada vez

Cria um quarto objetivo ativo (o limite sugerido é 3): aparece um aviso
gentil "você já tem N objetivos ativos — poucos de cada vez funciona
melhor". Não bloqueia nada, é só um lembrete.

## Sobre o nome de usuário (dia 13, revisado)

Isso já existe desde o dia 13 — **Herói**, toca no nome (✏️ do lado),
edita e salva. Continua funcionando igual; só reforçando aqui porque é
fácil não notar o ✏️ discreto do lado do nome na primeira olhada.

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

### Lembrete de planejar não é push de verdade
`verificarLembrete()` no `App.jsx` roda enquanto o app tá aberto (aba
ativa ou em segundo plano) e mostra a notificação local pelo
`Notification`/`showNotification`. Isso não acorda o navegador se ele
estiver fechado - é a diferença entre notificação **local** e **push**
de verdade (que precisa de servidor mandando na hora certa).

O conserto de verdade seria: par de chaves VAPID, uma tabela pra
guardar a inscrição push de cada navegador, uma Supabase Edge Function
que manda o push, e um `pg_cron` conferindo o horário de cada um. Fica
pra quando isso incomodar de verdade - hoje o app de uma pessoa só
aberta às vezes já cobre o caso comum (celular com o app instalado,
aberto em algum momento da noite).

### Objetivo: vínculo só se escolhe na criação, e só na tela Hoje
Depois de criar a tarefa vinculada a um objetivo, não dá pra trocar
esse vínculo editando ela (o formulário de editar mexe só em
título/categoria/dia, não em objetivo/incremento) - se errou o
objetivo, o jeito é apagar e criar de novo. Também só dá pra vincular
tarefa a objetivo pelo formulário da tela Hoje; a aba Semana e o
"repetir tarefas de ontem" ainda não têm esse seletor. Nenhuma tarefa
antiga fica "presa" por causa disso - só não tem o atalho ainda.

### Objetivo arquivado não tem como reativar pela tela
Arquivar muda o `status` pra `arquivado` e ele some da aba Objetivos de
propósito (é o "sem culpa" do pedido). Mas hoje não tem um jeito de ver
os arquivados de novo e voltar pra ativo - só editando a linha direto
no **Table Editor** do Supabase. Se um dia isso incomodar (arquivou
sem querer, por exemplo), é uma tela de "arquivados" simples de
adicionar.

### `objetivo.progresso` tem a mesma dívida da recompensa
`mexerNoObjetivo()` no `TelaHoje.jsx` segue exatamente o mesmo padrão
do `mexerNoPerfil()` (documentado acima em "recompensa é calculada no
cliente") - quem abrir o DevTools consegue mandar um `update` direto na
tabela `objetivo` e forjar progresso. Mesmo raciocínio: só quem pode
trapacear hoje é quem já é dono dos próprios dados, então fica pra
quando tiver mais gente usando o app.
