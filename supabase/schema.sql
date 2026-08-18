-- roda isso no SQL Editor do Supabase (dia 2)
-- ATENCAO: depois desse arquivo, roda tambem o migracao_dia4.sql (modelo novo
-- de conclusao + data_ref). so esse aqui nao deixa o banco atualizado.

-- tabela do usuario (perfil do jogador)
-- o id é o mesmo id que o supabase auth cria quando a pessoa loga
create table usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  moedas int not null default 0,
  xp int not null default 0,
  nivel int not null default 1,
  inteligencia int not null default 0,
  forca int not null default 0,
  agilidade int not null default 0
);

-- tabela de tarefa
create table tarefa (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuario (id) on delete cascade,
  titulo text not null,
  categoria text,
  dificuldade int not null default 1,
  recorrente boolean not null default false,
  feita_hoje boolean not null default false,
  criada_em timestamptz not null default now()
);

-- liga a seguranca por linha, assim cada um só mexe no que é dele
alter table usuario enable row level security;
alter table tarefa enable row level security;

-- usuario só ve e edita o proprio perfil
create policy "usuario ve o proprio perfil"
  on usuario for select
  using (auth.uid() = id);

create policy "usuario cria o proprio perfil"
  on usuario for insert
  with check (auth.uid() = id);

create policy "usuario atualiza o proprio perfil"
  on usuario for update
  using (auth.uid() = id);

-- usuario só ve e mexe nas proprias tarefas
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
