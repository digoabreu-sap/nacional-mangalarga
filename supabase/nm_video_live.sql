-- Video do YouTube exibido de forma flutuante na Home enquanto uma
-- categoria esta "em pista" (linha unica, id fixo = 1).
create table if not exists nm_video_live (
  id smallint primary key default 1,
  ativo boolean not null default false,
  fonte_tipo text check (fonte_tipo in ('video', 'canal')),
  fonte_valor text,
  embed_url text,
  updated_at timestamptz not null default now(),
  constraint nm_video_live_singleton check (id = 1)
);

insert into nm_video_live (id, ativo) values (1, false) on conflict (id) do nothing;

alter table nm_video_live enable row level security;
-- Sem policies: acesso somente via funcoes security definer abaixo.

-- Leitura publica: usada na Home. embed_url so tem valor quando o admin
-- configurou algo - nao ha dado sensivel aqui (vira publico de qualquer jeito
-- assim que o video aparece embutido na pagina).
create or replace function nm_get_video_live()
returns table(ativo boolean, embed_url text, fonte_tipo text, fonte_valor text)
language sql security definer set search_path = public
as $$
  select ativo, embed_url, fonte_tipo, fonte_valor from nm_video_live where id = 1;
$$;
grant execute on function nm_get_video_live() to anon, authenticated;

-- Escrita: usada pelo painel admin (protegida pelo token de admin na API route).
create or replace function nm_admin_set_video_live(p_ativo boolean, p_embed_url text, p_fonte_tipo text, p_fonte_valor text)
returns void
language sql security definer set search_path = public
as $$
  update nm_video_live
  set ativo = p_ativo, embed_url = p_embed_url, fonte_tipo = p_fonte_tipo, fonte_valor = p_fonte_valor, updated_at = now()
  where id = 1;
$$;
grant execute on function nm_admin_set_video_live(boolean, text, text, text) to anon, authenticated;
