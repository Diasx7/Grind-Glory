-- DIA 8 - batalha automatica
-- roda no SQL Editor do Supabase (depois do migracao_dia7.sql)

-- em que fase o jogador esta. sobe de 1 em 1 cada vez que ele vence.
-- perder nao mexe nessa coluna: derrota nao tira progresso.
alter table usuario add column fase int not null default 1;
