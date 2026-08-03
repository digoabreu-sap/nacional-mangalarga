-- Texto livre da tela "Sobre" (desenvolvedores + contato pra parcerias),
-- editado pelo admin (aba Sobre) e lido publicamente. Linha unica (id fixo
-- = 1), mesmo padrao de nm_video_live/nm_resultados_sync.

create table if not exists nm_sobre (
  id smallint primary key default 1,
  texto text,
  atualizado_em timestamptz not null default now(),
  constraint nm_sobre_singleton check (id = 1)
);

insert into nm_sobre (id) values (1) on conflict (id) do nothing;

-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.
alter table nm_sobre enable row level security;

create or replace function nm_get_sobre()
returns table(texto text, atualizado_em timestamptz)
language sql security definer set search_path = public
as $$ select texto, atualizado_em from nm_sobre where id = 1; $$;
grant execute on function nm_get_sobre() to anon, authenticated;

create or replace function nm_admin_set_sobre(p_texto text)
returns void
language sql security definer set search_path = public
as $$ update nm_sobre set texto = p_texto, atualizado_em = now() where id = 1; $$;
grant execute on function nm_admin_set_sobre(text) to anon, authenticated;
