-- Cores configuraveis das tags/selos e do card do animal no Ao Vivo (Excl.
-- Marcha, Entre os 7, 8 a 13, Retirado, Marcha) - config em JSON, singleton
-- (id=1), mesmo padrao de nm_banner_config/nm_sobre. Guarda so os campos
-- que o admin de fato customizou (o front mescla com o default no
-- lib/temaCores.ts) - comeca vazio, ou seja, igual a aparencia atual.

create table if not exists nm_tema_cores (
  id smallint primary key default 1,
  config jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  constraint nm_tema_cores_singleton check (id = 1)
);
insert into nm_tema_cores (id) values (1) on conflict (id) do nothing;

alter table nm_tema_cores enable row level security;
-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.

create or replace function nm_get_tema_cores()
returns jsonb
language sql security definer set search_path = public
as $$ select config from nm_tema_cores where id = 1; $$;
grant execute on function nm_get_tema_cores() to anon, authenticated;

create or replace function nm_admin_set_tema_cores(p_config jsonb)
returns void
language sql security definer set search_path = public
as $$ update nm_tema_cores set config = coalesce(p_config, '{}'::jsonb), atualizado_em = now() where id = 1; $$;
grant execute on function nm_admin_set_tema_cores(jsonb) to anon, authenticated;
