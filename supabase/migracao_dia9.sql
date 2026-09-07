-- DIA 9 - energia de batalha
-- roda no SQL Editor do Supabase (depois do migracao_dia8.sql)

-- energia é do DIA, nao acumula. sao dois numeros porque eles respondem
-- perguntas diferentes:
--   energia       = quantas tentativas ainda tenho agora
--   energia_ganha = quanto ja foi liberado hoje (é o que segura o teto,
--                   senao daria pra gastar e reganhar sem limite)
--   energia_data  = de que dia esses dois numeros sao. se nao for hoje,
--                   o app zera os dois antes de usar.
alter table usuario add column energia int not null default 0;
alter table usuario add column energia_ganha int not null default 0;
alter table usuario add column energia_data date;
alter table usuario add column if not exists energia int not null default 0;
alter table usuario add column if not exists energia_data date;