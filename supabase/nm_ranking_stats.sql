-- Estatisticas publicas pra pagina de Ranking: quem mais recebe clique
-- (interesse do publico) e quem mais recebe premio (resultado oficial),
-- agrupado por animal/criador/expositor/cidade, alem de KPIs gerais do
-- catalogo. Tudo leitura agregada via security definer (mesmo padrao de
-- nm_top_animals) - nao expoe nenhuma linha crua de nm_analytics/nm_votos.

create or replace function nm_ranking_animais_cliques(limit_count int)
returns table(
  animal_id bigint, nome text, num_catalogo text, categoria text, tipo_marcha text,
  haras text, criador text, expositor text, cidade text, uf text, cliques bigint
)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha,
         a.haras, a.criador, a.expositor, a.cidade, a.uf, count(an.id) as cliques
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  group by a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha, a.haras, a.criador, a.expositor, a.cidade, a.uf
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_ranking_animais_cliques(int) to anon, authenticated;

create or replace function nm_ranking_criadores_cliques(limit_count int)
returns table(criador text, cliques bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.criador, count(an.id) as cliques, count(distinct a.id) as animais
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  where a.criador is not null and a.criador <> ''
  group by a.criador
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_ranking_criadores_cliques(int) to anon, authenticated;

create or replace function nm_ranking_expositores_cliques(limit_count int)
returns table(expositor text, cliques bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.expositor, count(an.id) as cliques, count(distinct a.id) as animais
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  where a.expositor is not null and a.expositor <> ''
  group by a.expositor
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_ranking_expositores_cliques(int) to anon, authenticated;

create or replace function nm_ranking_cidades_cliques(limit_count int)
returns table(cidade text, uf text, cliques bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.cidade, a.uf, count(an.id) as cliques, count(distinct a.id) as animais
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  where a.cidade is not null and a.cidade <> ''
  group by a.cidade, a.uf
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_ranking_cidades_cliques(int) to anon, authenticated;

-- "Premio" = qualquer colocacao registrada na prova Final (Campeao, Reserva,
-- Mencao Honrosa etc.) - cada linha ja e 1 animal por categoria/campeonato.
create or replace function nm_ranking_criadores_premios(limit_count int)
returns table(criador text, premios bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.criador, count(r.id) as premios, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and r.colocacao is not null and r.colocacao <> ''
    and a.criador is not null and a.criador <> ''
  group by a.criador
  order by premios desc
  limit limit_count;
$$;
grant execute on function nm_ranking_criadores_premios(int) to anon, authenticated;

create or replace function nm_ranking_expositores_premios(limit_count int)
returns table(expositor text, premios bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.expositor, count(r.id) as premios, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and r.colocacao is not null and r.colocacao <> ''
    and a.expositor is not null and a.expositor <> ''
  group by a.expositor
  order by premios desc
  limit limit_count;
$$;
grant execute on function nm_ranking_expositores_premios(int) to anon, authenticated;

create or replace function nm_ranking_cidades_premios(limit_count int)
returns table(cidade text, uf text, premios bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.cidade, a.uf, count(r.id) as premios, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and r.colocacao is not null and r.colocacao <> ''
    and a.cidade is not null and a.cidade <> ''
  group by a.cidade, a.uf
  order by premios desc
  limit limit_count;
$$;
grant execute on function nm_ranking_cidades_premios(int) to anon, authenticated;

create or replace function nm_ranking_kpis()
returns jsonb
language sql security definer set search_path = public
as $$
  select jsonb_build_object(
    'total_animais', (select count(*) from nm_animais),
    'total_cliques', (select count(*) from nm_analytics),
    'total_votos', (select count(*) from nm_votos),
    'total_visitas', (select count(*) from nm_page_views),
    'animais_premiados', (select count(distinct a.id) from nm_resultados r join nm_animais a on a.num_catalogo = r.num_catalogo where r.tipo_prova = 'final' and r.colocacao is not null and r.colocacao <> ''),
    'categorias_julgadas', (select count(distinct (tipo_campeonato, tipo_marcha, categoria)) from nm_resultados where tipo_prova = 'final' and colocacao is not null and colocacao <> '')
  );
$$;
grant execute on function nm_ranking_kpis() to anon, authenticated;
