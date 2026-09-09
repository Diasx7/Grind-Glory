-- DIA 17 - onboarding: aparencia do heroi
-- roda no SQL Editor do Supabase (depois do migracao_dia16.sql)

-- so estetico (um emoji escolhido no onboarding) - NUNCA mexe em atributo.
-- quem faz o heroi crescer de verdade continua sendo so o que a pessoa
-- cumpriu (ver carinhaDoHeroi() em jogo.js, que é totalmente separado disso).
alter table usuario add column if not exists avatar text;
