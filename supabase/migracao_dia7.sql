-- DIA 7 - rotinas recorrentes
-- roda no SQL Editor do Supabase (depois do migracao_dia4.sql)

-- parar uma rotina NAO pode apagar a tarefa: o "on delete cascade" da
-- conclusao levaria junto todo o historico dela, e o heroi vive desse
-- historico. entao em vez de deletar, arquiva - a tarefa some da tela
-- Hoje e as conclusoes antigas ficam onde estao.
alter table tarefa add column arquivada boolean not null default false;
