-- DIA 9 - energia de batalha
-- roda no SQL Editor do Supabase (depois do migracao_dia8.sql)

-- energia é do DIA, nao acumula. sao tres numeros porque respondem
-- perguntas diferentes:
--   energia       = quantas tentativas ainda tenho agora
--   energia_ganha = quanto ja foi liberado hoje (segura o teto)
--   energia_data  = de que dia esses numeros sao. se nao for hoje,
--                   o app zera antes de usar.
alter table usuario add column if not exists energia int not null default 0;
alter table usuario add column if not exists energia_ganha int not null default 0;
alter table usuario add column if not exists energia_data date;