-- =============================================================================
-- RECONSTRUCAO do schema "core" que ja existia no projeto Supabase original
-- (nm_animais, nm_campeonatos, nm_votos, nm_usuarios, nm_admins, nm_banners,
-- nm_analytics, nm_page_views + as funcoes RPC que o app chama) e que NAO
-- estava versionado neste repositorio.
--
-- Isto NAO e um dump do banco original — ninguem aqui tem acesso a ele no
-- momento. E uma reconstrucao feita lendo todo o codigo do app (toda chamada
-- a supabase.from(...) e supabase.rpc(...)) e inferindo tabelas, colunas e
-- assinaturas de funcao a partir de como cada uma e usada.
--
-- Ou seja: os NOMES de tabela/coluna/funcao e os TIPOS de retorno das RPCs
-- batem com o que o app espera (senao o app quebra). O que pode divergir do
-- banco original: tipos de coluna exatos, constraints/indices extras,
-- defaults, e nao inclui os DADOS (animais do catalogo, votos, leads,
-- banners ja cadastrados) — isso so existe no projeto original.
--
-- RODE ESTE ARQUIVO PRIMEIRO, antes dos outros 4 arquivos desta pasta
-- (eles fazem ALTER/CREATE em cima destas tabelas):
--   0. nm_00_schema_base_reconstruido.sql   <- este arquivo
--   1. nm_categoria_atual.sql
--   2. nm_resultados.sql
--   3. nm_animais_num_catalogo_int.sql
--   4. nm_categoria_atual_marcha.sql
--
-- Revise antes de rodar em producao, especialmente RLS e o hashing de senha
-- dos admins (aqui usa pgcrypto/bcrypt).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------
-- nm_animais — catalogo de animais da exposicao
-- -----------------------------------------------------------------------
create table if not exists nm_animais (
  id bigserial primary key,
  id_catalogo bigint,
  nome text not null,
  num_catalogo text,
  registro text,
  chip text,
  data_nascimento text,
  idade text,
  campeonato text,
  tipo_campeonato text,
  tipo_marcha text,
  categoria text,
  pai text,
  pai_registro text,
  mae text,
  mae_registro text,
  criador text,
  expositor text,
  haras text,
  cidade text,
  uf text,
  destaque boolean not null default false,
  tambem_excl_marcha boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists nm_animais_haras_idx on nm_animais (haras);
create index if not exists nm_animais_criador_idx on nm_animais (criador);
create index if not exists nm_animais_expositor_idx on nm_animais (expositor);
create index if not exists nm_animais_categoria_idx on nm_animais (categoria);
create index if not exists nm_animais_campeonato_idx on nm_animais (campeonato);
create index if not exists nm_animais_tipo_marcha_idx on nm_animais (tipo_marcha);
create index if not exists nm_animais_num_catalogo_idx on nm_animais (num_catalogo);
create index if not exists nm_animais_registro_idx on nm_animais (registro);
create index if not exists nm_animais_chip_idx on nm_animais (chip);

alter table nm_animais enable row level security;

drop policy if exists nm_animais_select_public on nm_animais;
create policy nm_animais_select_public on nm_animais
  for select to anon, authenticated using (true);

grant select on nm_animais to anon, authenticated;

-- -----------------------------------------------------------------------
-- nm_campeonatos — lista de campeonatos/categorias com total de animais
-- -----------------------------------------------------------------------
create table if not exists nm_campeonatos (
  id bigserial primary key,
  nome text not null,
  tipo_campeonato text,
  tipo_marcha text,
  categoria text,
  total_animais int not null default 0
);

alter table nm_campeonatos enable row level security;

drop policy if exists nm_campeonatos_select_public on nm_campeonatos;
create policy nm_campeonatos_select_public on nm_campeonatos
  for select to anon, authenticated using (true);

grant select on nm_campeonatos to anon, authenticated;

-- -----------------------------------------------------------------------
-- nm_usuarios — cadastro simples (nome + email OU telefone) para votar
-- -----------------------------------------------------------------------
create table if not exists nm_usuarios (
  id bigserial primary key,
  nome text not null,
  email text,
  telefone text,
  created_at timestamptz not null default now()
);

create unique index if not exists nm_usuarios_email_uq on nm_usuarios (email) where email is not null;
create unique index if not exists nm_usuarios_telefone_uq on nm_usuarios (telefone) where telefone is not null;

alter table nm_usuarios enable row level security;
-- Sem policies: acesso somente via funcoes security definer abaixo.

-- -----------------------------------------------------------------------
-- nm_votos — 1 voto por usuario por campeonato (trocavel)
-- -----------------------------------------------------------------------
create table if not exists nm_votos (
  id bigserial primary key,
  usuario_id bigint not null references nm_usuarios (id) on delete cascade,
  animal_id bigint not null references nm_animais (id) on delete cascade,
  campeonato text not null,
  created_at timestamptz not null default now(),
  unique (usuario_id, campeonato)
);

create index if not exists nm_votos_campeonato_idx on nm_votos (campeonato);
create index if not exists nm_votos_animal_idx on nm_votos (animal_id);

alter table nm_votos enable row level security;

-- Pagina de Ranking le a coluna campeonato direto da tabela (com a anon key)
-- so para descobrir quais campeonatos tem voto; o ranking em si vem da RPC.
drop policy if exists nm_votos_select_public on nm_votos;
create policy nm_votos_select_public on nm_votos
  for select to anon, authenticated using (true);

grant select on nm_votos to anon, authenticated;
-- Insert/update/delete somente via nm_toggle_voto (security definer).

-- -----------------------------------------------------------------------
-- nm_admins — usuarios do painel /admin
-- -----------------------------------------------------------------------
create table if not exists nm_admins (
  id bigserial primary key,
  email text not null unique,
  nome text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table nm_admins enable row level security;
-- Sem policies: acesso somente via funcoes security definer abaixo.

-- -----------------------------------------------------------------------
-- nm_banners — banners exibidos no app (topo/rodape/etc)
-- -----------------------------------------------------------------------
create table if not exists nm_banners (
  id bigserial primary key,
  posicao text not null check (posicao in ('topo', 'rodape', 'header_topo', 'nav_rodape')),
  titulo text,
  imagem_url text,
  link_url text,
  html_content text,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists nm_banners_posicao_idx on nm_banners (posicao);

alter table nm_banners enable row level security;

-- O componente publico so busca banners ativos direto da tabela; o admin
-- ve tudo (inclusive inativos) via nm_admin_list_banners (security definer).
drop policy if exists nm_banners_select_public on nm_banners;
create policy nm_banners_select_public on nm_banners
  for select to anon, authenticated using (ativo = true);

grant select on nm_banners to anon, authenticated;

-- -----------------------------------------------------------------------
-- nm_analytics — cliques em animais (tracking)
-- -----------------------------------------------------------------------
create table if not exists nm_analytics (
  id bigserial primary key,
  animal_id bigint references nm_animais (id) on delete cascade,
  session_id text,
  ip_address text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists nm_analytics_animal_idx on nm_analytics (animal_id);
create index if not exists nm_analytics_created_at_idx on nm_analytics (created_at);

alter table nm_analytics enable row level security;

drop policy if exists nm_analytics_insert_public on nm_analytics;
create policy nm_analytics_insert_public on nm_analytics
  for insert to anon, authenticated with check (true);

grant insert on nm_analytics to anon, authenticated;
-- Sem policy de select: leitura agregada so via nm_top_animals/nm_total_clicks.

-- -----------------------------------------------------------------------
-- nm_page_views — page views (tracking)
-- -----------------------------------------------------------------------
create table if not exists nm_page_views (
  id bigserial primary key,
  page text,
  session_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists nm_page_views_created_at_idx on nm_page_views (created_at);

alter table nm_page_views enable row level security;

drop policy if exists nm_page_views_insert_public on nm_page_views;
create policy nm_page_views_insert_public on nm_page_views
  for insert to anon, authenticated with check (true);

grant insert on nm_page_views to anon, authenticated;
-- Sem policy de select: leitura agregada so via nm_daily_views/nm_total_views_7d.

-- =============================================================================
-- FUNCOES RPC
-- =============================================================================

-- Listas para os filtros da Home -------------------------------------------
create or replace function nm_distinct_categorias()
returns table(categoria text)
language sql security definer set search_path = public
as $$ select distinct categoria from nm_animais where categoria is not null order by categoria; $$;
grant execute on function nm_distinct_categorias() to anon, authenticated;

create or replace function nm_distinct_criadores()
returns table(criador text)
language sql security definer set search_path = public
as $$ select distinct criador from nm_animais where criador is not null order by criador; $$;
grant execute on function nm_distinct_criadores() to anon, authenticated;

create or replace function nm_distinct_expositores()
returns table(expositor text)
language sql security definer set search_path = public
as $$ select distinct expositor from nm_animais where expositor is not null order by expositor; $$;
grant execute on function nm_distinct_expositores() to anon, authenticated;

create or replace function nm_distinct_haras()
returns table(haras text)
language sql security definer set search_path = public
as $$ select distinct haras from nm_animais where haras is not null order by haras; $$;
grant execute on function nm_distinct_haras() to anon, authenticated;

-- Votacao popular -------------------------------------------------------------
create or replace function nm_ranking_simples(p_campeonato text)
returns table(id bigint, nome text, registro text, haras text, num_catalogo text, total_votos bigint)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.registro, a.haras, a.num_catalogo, count(v.id) as total_votos
  from nm_animais a
  join nm_votos v on v.animal_id = a.id and v.campeonato = p_campeonato
  group by a.id, a.nome, a.registro, a.haras, a.num_catalogo
  order by total_votos desc, a.nome asc;
$$;
grant execute on function nm_ranking_simples(text) to anon, authenticated;

create or replace function nm_meu_voto(p_usuario_id bigint, p_campeonato text)
returns table(animal_id bigint)
language sql security definer set search_path = public
as $$ select animal_id from nm_votos where usuario_id = p_usuario_id and campeonato = p_campeonato; $$;
grant execute on function nm_meu_voto(bigint, text) to anon, authenticated;

create or replace function nm_toggle_voto(p_usuario_id bigint, p_animal_id bigint, p_campeonato text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_existing_animal bigint;
  v_voted boolean;
begin
  select animal_id into v_existing_animal
  from nm_votos where usuario_id = p_usuario_id and campeonato = p_campeonato;

  if v_existing_animal is null then
    insert into nm_votos (usuario_id, animal_id, campeonato) values (p_usuario_id, p_animal_id, p_campeonato);
    v_voted := true;
  elsif v_existing_animal = p_animal_id then
    delete from nm_votos where usuario_id = p_usuario_id and campeonato = p_campeonato;
    v_voted := false;
  else
    update nm_votos set animal_id = p_animal_id, created_at = now()
    where usuario_id = p_usuario_id and campeonato = p_campeonato;
    v_voted := true;
  end if;

  return jsonb_build_object('voted', v_voted);
end;
$$;
grant execute on function nm_toggle_voto(bigint, bigint, text) to anon, authenticated;

-- Login simples (sem senha, so identifica/cria o usuario) ----------------------
create or replace function nm_login_simples(p_nome text, p_tipo text, p_destino text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_usuario nm_usuarios;
begin
  if p_tipo = 'email' then
    select * into v_usuario from nm_usuarios where email = p_destino limit 1;
  else
    select * into v_usuario from nm_usuarios where telefone = p_destino limit 1;
  end if;

  if v_usuario.id is null then
    insert into nm_usuarios (nome, email, telefone)
    values (
      p_nome,
      case when p_tipo = 'email' then p_destino else null end,
      case when p_tipo = 'telefone' then p_destino else null end
    )
    returning * into v_usuario;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object('id', v_usuario.id, 'nome', v_usuario.nome, 'email', v_usuario.email, 'telefone', v_usuario.telefone)
  );
end;
$$;
grant execute on function nm_login_simples(text, text, text) to anon, authenticated;

-- Admin: autenticacao e CRUD de admins ------------------------------------------
create or replace function nm_admin_login(p_email text, p_password text)
returns table(id bigint, email text, nome text)
language sql security definer set search_path = public
as $$
  select id, email, nome from nm_admins
  where email = p_email and password_hash = crypt(p_password, password_hash);
$$;
grant execute on function nm_admin_login(text, text) to anon, authenticated;

create or replace function nm_admin_list_admins()
returns table(id bigint, email text, nome text)
language sql security definer set search_path = public
as $$ select id, email, nome from nm_admins order by nome; $$;
grant execute on function nm_admin_list_admins() to anon, authenticated;

create or replace function nm_add_admin(p_email text, p_password text, p_nome text)
returns void
language sql security definer set search_path = public
as $$
  insert into nm_admins (email, password_hash, nome)
  values (p_email, crypt(p_password, gen_salt('bf')), p_nome);
$$;
grant execute on function nm_add_admin(text, text, text) to anon, authenticated;

create or replace function nm_admin_delete_admin(p_id bigint)
returns void
language sql security definer set search_path = public
as $$ delete from nm_admins where id = p_id; $$;
grant execute on function nm_admin_delete_admin(bigint) to anon, authenticated;

-- Admin: CRUD de banners ---------------------------------------------------------
create or replace function nm_admin_list_banners()
returns setof nm_banners
language sql security definer set search_path = public
as $$ select * from nm_banners order by posicao, ordem; $$;
grant execute on function nm_admin_list_banners() to anon, authenticated;

create or replace function nm_admin_create_banner(
  p_posicao text, p_titulo text, p_imagem_url text, p_link_url text,
  p_html_content text, p_ativo boolean, p_ordem int
)
returns nm_banners
language sql security definer set search_path = public
as $$
  insert into nm_banners (posicao, titulo, imagem_url, link_url, html_content, ativo, ordem)
  values (p_posicao, p_titulo, p_imagem_url, p_link_url, p_html_content, coalesce(p_ativo, true), coalesce(p_ordem, 0))
  returning *;
$$;
grant execute on function nm_admin_create_banner(text, text, text, text, text, boolean, int) to anon, authenticated;

create or replace function nm_admin_update_banner(
  p_id bigint, p_posicao text, p_titulo text, p_imagem_url text, p_link_url text,
  p_html_content text, p_ativo boolean, p_ordem int
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
    ordem = coalesce(p_ordem, ordem)
  where id = p_id
  returning *;
$$;
grant execute on function nm_admin_update_banner(bigint, text, text, text, text, text, boolean, int) to anon, authenticated;

create or replace function nm_admin_delete_banner(p_id bigint)
returns void
language sql security definer set search_path = public
as $$ delete from nm_banners where id = p_id; $$;
grant execute on function nm_admin_delete_banner(bigint) to anon, authenticated;

-- Admin: leads (usuarios cadastrados) -----------------------------------------
create or replace function nm_list_usuarios()
returns table(id bigint, nome text, email text, telefone text, created_at timestamptz, total_votos bigint)
language sql security definer set search_path = public
as $$
  select u.id, u.nome, u.email, u.telefone, u.created_at, count(v.id) as total_votos
  from nm_usuarios u
  left join nm_votos v on v.usuario_id = u.id
  group by u.id, u.nome, u.email, u.telefone, u.created_at
  order by u.created_at desc;
$$;
grant execute on function nm_list_usuarios() to anon, authenticated;

-- Admin: analytics ------------------------------------------------------------
create or replace function nm_top_animals(limit_count int)
returns table(animal_id bigint, nome text, categoria text, tipo_marcha text, click_count bigint)
language sql security definer set search_path = public
as $$
  select a.id as animal_id, a.nome, a.categoria, a.tipo_marcha, count(an.id) as click_count
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  group by a.id, a.nome, a.categoria, a.tipo_marcha
  order by click_count desc
  limit limit_count;
$$;
grant execute on function nm_top_animals(int) to anon, authenticated;

create or replace function nm_daily_views(days int)
returns table(dia date, total bigint)
language sql security definer set search_path = public
as $$
  select date_trunc('day', created_at)::date as dia, count(*) as total
  from nm_page_views
  where created_at >= now() - (days || ' days')::interval
  group by dia
  order by dia;
$$;
grant execute on function nm_daily_views(int) to anon, authenticated;

create or replace function nm_total_views_7d()
returns bigint
language sql security definer set search_path = public
as $$ select count(*) from nm_page_views where created_at >= now() - interval '7 days'; $$;
grant execute on function nm_total_views_7d() to anon, authenticated;

create or replace function nm_total_clicks()
returns bigint
language sql security definer set search_path = public
as $$ select count(*) from nm_analytics; $$;
grant execute on function nm_total_clicks() to anon, authenticated;

-- Cria o primeiro admin de acesso ao painel (troque o email/senha abaixo
-- e rode manualmente — nao deixe credenciais padrao em producao).
-- select nm_add_admin('seu-email@exemplo.com', 'uma-senha-forte', 'Seu Nome');
