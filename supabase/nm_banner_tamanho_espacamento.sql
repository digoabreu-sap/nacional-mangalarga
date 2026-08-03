-- Letreiro digital (Banner.tsx): admin pode redimensionar cada banner (%)
-- pra nenhum ficar maior que outro, e configurar o espacamento entre eles.

alter table nm_banners add column if not exists tamanho_pct int not null default 100;
alter table nm_banners drop constraint if exists nm_banners_tamanho_pct_check;
alter table nm_banners add constraint nm_banners_tamanho_pct_check check (tamanho_pct between 20 and 200);

create table if not exists nm_banner_config (
  id smallint primary key default 1,
  espacamento_px int not null default 12,
  constraint nm_banner_config_singleton check (id = 1),
  constraint nm_banner_config_espacamento_check check (espacamento_px between 0 and 80)
);
insert into nm_banner_config (id) values (1) on conflict (id) do nothing;

alter table nm_banner_config enable row level security;
-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.

create or replace function nm_get_banner_config()
returns table(espacamento_px int)
language sql security definer set search_path = public
as $$ select espacamento_px from nm_banner_config where id = 1; $$;
grant execute on function nm_get_banner_config() to anon, authenticated;

create or replace function nm_admin_set_banner_config(p_espacamento_px int)
returns void
language sql security definer set search_path = public
as $$
  update nm_banner_config set espacamento_px = coalesce(p_espacamento_px, espacamento_px) where id = 1;
$$;
grant execute on function nm_admin_set_banner_config(int) to anon, authenticated;

-- Recria list/create/update de banner incluindo tamanho_pct (precisa dropar
-- primeiro: mudou o shape do retorno, que agora inclui a coluna nova).
drop function if exists nm_admin_list_banners();
create or replace function nm_admin_list_banners()
returns setof nm_banners
language sql security definer set search_path = public
as $$ select * from nm_banners order by posicao, ordem; $$;
grant execute on function nm_admin_list_banners() to anon, authenticated;

drop function if exists nm_admin_create_banner(text, text, text, text, text, boolean, int);
create or replace function nm_admin_create_banner(
  p_posicao text, p_titulo text, p_imagem_url text, p_link_url text,
  p_html_content text, p_ativo boolean, p_ordem int, p_tamanho_pct int default 100
)
returns nm_banners
language sql security definer set search_path = public
as $$
  insert into nm_banners (posicao, titulo, imagem_url, link_url, html_content, ativo, ordem, tamanho_pct)
  values (p_posicao, p_titulo, p_imagem_url, p_link_url, p_html_content, coalesce(p_ativo, true), coalesce(p_ordem, 0), coalesce(p_tamanho_pct, 100))
  returning *;
$$;
grant execute on function nm_admin_create_banner(text, text, text, text, text, boolean, int, int) to anon, authenticated;

drop function if exists nm_admin_update_banner(bigint, text, text, text, text, text, boolean, int);
create or replace function nm_admin_update_banner(
  p_id bigint, p_posicao text, p_titulo text, p_imagem_url text, p_link_url text,
  p_html_content text, p_ativo boolean, p_ordem int, p_tamanho_pct int default null
)
returns nm_banners
language sql security definer set search_path = public
as $$
  update nm_banners set
    posicao = coalesce(p_posicao, posicao),
    titulo = coalesce(p_titulo, titulo),
    imagem_url = coalesce(p_imagem_url, imagem_url),
    link_url = coalesce(p_link_url, link_url),
    html_content = coalesce(p_html_content, html_content),
    ativo = coalesce(p_ativo, ativo),
    ordem = coalesce(p_ordem, ordem),
    tamanho_pct = coalesce(p_tamanho_pct, tamanho_pct)
  where id = p_id
  returning *;
$$;
grant execute on function nm_admin_update_banner(bigint, text, text, text, text, text, boolean, int, int) to anon, authenticated;
