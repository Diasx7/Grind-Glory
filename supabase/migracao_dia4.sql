-- ETAPA 0 - conserto do modelo de dados (antes do dia 4)
-- roda no SQL Editor do Supabase, de cima pra baixo, tudo de uma vez

-- ---------------------------------------------------------------
-- 0) limpeza dos testes do dia 2
-- as tarefas antigas foram salvas com categoria 'geral', que nao existe
-- mais e nao aponta pra nenhum atributo. melhor apagar do que arrastar.
-- ---------------------------------------------------------------
delete from tarefa where categoria is null or categoria = 'geral';

-- ---------------------------------------------------------------
-- 1) a tarefa passa a ter a data de referencia (pra quando ela é)
-- ---------------------------------------------------------------
alter table tarefa add column data_ref date;

-- as tarefas que ja existem herdam o dia em que foram criadas,
-- convertido pro fuso do Brasil (nao UTC)
update tarefa
set data_ref = (criada_em at time zone 'America/Sao_Paulo')::date
where data_ref is null;

alter table tarefa alter column data_ref set not null;

-- se o app esquecer de mandar a data, o banco usa o hoje do Brasil.
-- sem o "at time zone" o Supabase usaria UTC e o dia viraria as 21h.
alter table tarefa
  alter column data_ref set default (now() at time zone 'America/Sao_Paulo')::date;

-- dificuldade so pode ser 1, 2 ou 3
alter table tarefa
  add constraint dificuldade_valida check (dificuldade between 1 and 3);

-- ---------------------------------------------------------------
-- 2) tabela nova: uma linha por tarefa concluida por dia,
--    guardando o que aquela conclusao rendeu
-- ---------------------------------------------------------------
create table conclusao (
  id bigint generated always as identity primary key,
  tarefa_id bigint not null references tarefa (id) on delete cascade,
  usuario_id uuid not null references usuario (id) on delete cascade,
  data date not null,
  moedas int not null default 0,
  xp int not null default 0,
  atributo text,
  pontos_atributo int not null default 0,
  criada_em timestamptz not null default now(),
  -- a mesma tarefa nao pode ser concluida duas vezes no mesmo dia.
  -- isso é o que trava o farm de marcar/desmarcar em duplicidade.
  unique (tarefa_id, data)
);

-- a tela sempre busca "as conclusoes desse usuario nesse dia"
create index conclusao_usuario_data on conclusao (usuario_id, data);

-- ---------------------------------------------------------------
-- 3) o feita_hoje antigo vira linha de conclusao (com recompensa zero,
--    porque na epoca nao existia recompensa) e depois some
-- ---------------------------------------------------------------
insert into conclusao (tarefa_id, usuario_id, data, moedas, xp)
select id, usuario_id, data_ref, 0, 0
from tarefa
where feita_hoje = true;

alter table tarefa drop column feita_hoje;

-- ---------------------------------------------------------------
-- 4) RLS da tabela nova, mesma ideia das outras
-- nao tem policy de update de proposito: conclusao é criada e apagada,
-- nunca editada.
-- ---------------------------------------------------------------
alter table conclusao enable row level security;

create policy "usuario ve as proprias conclusoes"
  on conclusao for select
  using (auth.uid() = usuario_id);

create policy "usuario cria a propria conclusao"
  on conclusao for insert
  with check (auth.uid() = usuario_id);

create policy "usuario apaga a propria conclusao"
  on conclusao for delete
  using (auth.uid() = usuario_id);

-- ---------------------------------------------------------------
-- 5) a dificuldade vem da categoria, sempre.
-- o banco reescreve o que o app mandar, entao nao adianta chamar a API
-- na mao com dificuldade 3 pra ganhar mais moeda.
-- ATENCAO: essa tabelinha tem que bater com a lista `categorias` do
-- jogo.js. mexeu num lugar, mexe no outro.
-- ---------------------------------------------------------------
create or replace function aplicar_dificuldade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.dificuldade := case new.categoria
    when 'estudo' then 3
    when 'exercicio' then 3
    when 'leitura' then 2
    when 'trabalho' then 2
    when 'saude' then 1
    when 'organizacao' then 1
    else 1
  end;
  return new;
end;
$$;

create trigger tarefa_dificuldade
  before insert or update on tarefa
  for each row execute function aplicar_dificuldade();

-- toca em todas as tarefas que ja existem so pra o trigger acordar e
-- recalcular a dificuldade delas (o valor 1 aqui é ignorado)
update tarefa set dificuldade = 1;
