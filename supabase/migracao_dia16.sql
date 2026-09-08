-- DIA 16 - objetivos de longo prazo
-- roda no SQL Editor do Supabase (depois do migracao_dia9.sql)

-- ---------------------------------------------------------------
-- 1) tabela do objetivo
-- ---------------------------------------------------------------
-- tipo "etapas" (ex: 10 capitulos) ou "valor" (ex: juntar 5000). os dois
-- usam as mesmas colunas alvo/progresso - so muda o que elas significam.
create table if not exists objetivo (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuario (id) on delete cascade,
  titulo text not null,
  categoria text,
  tipo text not null check (tipo in ('etapas', 'valor')),
  alvo numeric not null check (alvo > 0),
  progresso numeric not null default 0,
  -- texto livre que aparece depois do numero: "capitulos", "aulas", "R$"...
  unidade text,
  status text not null default 'ativo' check (status in ('ativo', 'concluido', 'arquivado')),
  concluido_em timestamptz,
  -- ultimo dia que uma tarefa vinculada foi concluida - é o que decide se
  -- o objetivo ta "parado" pra sugerir um passo. so isso, nao precisa de
  -- historico completo (esse ja vive em conclusao via tarefa).
  ultima_atividade date,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 2) a tarefa pode vir vinculada a um objetivo
-- ---------------------------------------------------------------
-- se o objetivo for apagado no banco na mao, a tarefa nao quebra - so
-- perde o vinculo. em "etapas" o incremento é sempre 1 (o app preenche
-- sozinho); em "valor" é o app que pergunta "quanto isso adianta".
alter table tarefa add column if not exists objetivo_id bigint references objetivo (id) on delete set null;
alter table tarefa add column if not exists objetivo_incremento numeric check (objetivo_incremento is null or objetivo_incremento >= 0);

-- ---------------------------------------------------------------
-- 3) RLS, mesmo modelo das outras tabelas
-- sem policy de delete de proposito: objetivo nao se apaga, se arquiva
-- (ver status) - assim nunca fica pendencia nem "sumico" sem explicacao.
-- ---------------------------------------------------------------
alter table objetivo enable row level security;

drop policy if exists "usuario ve os proprios objetivos" on objetivo;
drop policy if exists "usuario cria objetivo pra ele mesmo" on objetivo;
drop policy if exists "usuario atualiza o proprio objetivo" on objetivo;

create policy "usuario ve os proprios objetivos"
  on objetivo for select
  using (auth.uid() = usuario_id);

create policy "usuario cria objetivo pra ele mesmo"
  on objetivo for insert
  with check (auth.uid() = usuario_id);

create policy "usuario atualiza o proprio objetivo"
  on objetivo for update
  using (auth.uid() = usuario_id);
