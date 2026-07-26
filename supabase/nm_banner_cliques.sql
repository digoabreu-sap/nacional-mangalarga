-- Tracking de cliques em banners (mesmo padrao de nm_analytics, so que pra
-- banner em vez de animal) + agregado pro painel admin.

create table if not exists nm_banner_cliques (
  id bigserial primary key,
  banner_id bigint references nm_banners (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists nm_banner_cliques_banner_idx on nm_banner_cliques (banner_id);

alter table nm_banner_cliques enable row level security;

drop policy if exists nm_banner_cliques_insert_public on nm_banner_cliques;
create policy nm_banner_cliques_insert_public on nm_banner_cliques
  for insert to anon, authenticated with check (true);

grant insert on nm_banner_cliques to anon, authenticated;
-- Sem policy de select: leitura agregada so via nm_banner_cliques_stats.

create or replace function nm_banner_cliques_stats()
returns table(banner_id bigint, titulo text, posicao text, cliques bigint)
language sql security definer set search_path = public
as $$
  select b.id, b.titulo, b.posicao, count(bc.id) as cliques
  from nm_banners b
  left join nm_banner_cliques bc on bc.banner_id = b.id
  group by b.id, b.titulo, b.posicao
  order by cliques desc;
$$;
grant execute on function nm_banner_cliques_stats() to anon, authenticated;
