-- schema base (dia 2) - versao que pode rodar de novo sem quebrar

create table if not exists usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  moedas int not null default 0,
  xp int not null default 0,
  nivel int not null default 1,
  inteligencia int not null default 0,
  forca int not null default 0,
  agilidade int not null default 0
);

create table if not exists tarefa (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuario (id) on delete cascade,
  titulo text not null,
  categoria text,
  dificuldade int not null default 1,
  recorrente boolean not null default false,
  feita_hoje boolean not null default false,
  criada_em timestamptz not null default now()
);

alter table usuario enable row level security;
alter table tarefa enable row level security;

-- apaga as politicas antes de criar, pra poder rodar de novo
drop policy if exists "usuario ve o proprio perfil" on usuario;
drop policy if exists "usuario cria o proprio perfil" on usuario;
drop policy if exists "usuario atualiza o proprio perfil" on usuario;
drop policy if exists "usuario ve as proprias tarefas" on tarefa;
drop policy if exists "usuario cria tarefa pra ele mesmo" on tarefa;
drop policy if exists "usuario atualiza a propria tarefa" on tarefa;
drop policy if exists "usuario apaga a propria tarefa" on tarefa;

create policy "usuario ve o proprio perfil"
  on usuario for select
  using (auth.uid() = id);

create policy "usuario cria o proprio perfil"
  on usuario for insert
  with check (auth.uid() = id);

create policy "usuario atualiza o proprio perfil"
  on usuario for update
  using (auth.uid() = id);

create policy "usuario ve as proprias tarefas"
  on tarefa for select
  using (auth.uid() = usuario_id);

create policy "usuario cria tarefa pra ele mesmo"
  on tarefa for insert
  with check (auth.uid() = usuario_id);

create policy "usuario atualiza a propria tarefa"
  on tarefa for update
  using (auth.uid() = usuario_id);

create policy "usuario apaga a propria tarefa"
  on tarefa for delete
  using (auth.uid() = usuario_id);