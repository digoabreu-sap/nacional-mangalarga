-- Corrige o Ranking de Pontos pra considerar TAMBEM a colocacao na marcha
-- (coluna pontuacao_andamento, que guarda a POSICAO do animal naquela prova,
-- ex: "1" = campeao da marcha), alem da colocacao geral da categoria
-- (nm_resultados.colocacao). Um animal pode pontuar nas duas classificacoes
-- ao mesmo tempo (ex: Campeao da categoria + Campeao da marcha = 20+20=40).
--
-- Tambem redefine o que conta como "premiado" (usado nas contagens tipo "44
-- filhos premiados"): so os 3 primeiros colocados de categoria (Campeao,
-- Reservado, 1o Premio) OU os 3 primeiros da marcha - nao toda a hierarquia
-- de pontos (que vai ate 3a Mencao Honrosa).
--
-- Rode isto DEPOIS de nm_ranking_premiados_pontos.sql e
-- nm_resultados_final_unificado.sql (precisa da coluna pontuacao_andamento).

create or replace function nm_colocacao_pontos_marcha(p_rank text)
returns int
language sql immutable
as $$
  select case
    when p_rank !~ '^\d+$' then 0
    else case p_rank::int
      when 1 then 20
      when 2 then 17
      when 3 then 14
      when 4 then 12
      when 5 then 10
      when 6 then 8
      when 7 then 6
      when 8 then 4
      when 9 then 2
      when 10 then 1
      else 0
    end
  end;
$$;

create or replace function nm_eh_premiado(p_colocacao text, p_rank_marcha text)
returns boolean
language sql immutable
as $$
  select
    coalesce(p_colocacao ~* 'campe[aã]o', false)
    or coalesce(p_colocacao ~* 'reserv', false)
    or coalesce(p_colocacao ~* '1\s*[ºo]?\s*pr[eê]mio', false)
    or (p_rank_marcha ~ '^\d+$' and p_rank_marcha::int between 1 and 3);
$$;

create or replace function nm_ranking_animais_pontos(limit_count int)
returns table(
  animal_id bigint, nome text, num_catalogo text, categoria text, tipo_marcha text,
  haras text, criador text, expositor text, cidade text, uf text, pontos bigint
)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha,
         a.haras, a.criador, a.expositor, a.cidade, a.uf,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final'
  group by a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha, a.haras, a.criador, a.expositor, a.cidade, a.uf
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_animais_pontos(int) to anon, authenticated;

create or replace function nm_ranking_criadores_pontos(limit_count int)
returns table(criador text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.criador,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.criador is not null and a.criador <> ''
  group by a.criador
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_criadores_pontos(int) to anon, authenticated;

create or replace function nm_ranking_expositores_pontos(limit_count int)
returns table(expositor text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.expositor,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.expositor is not null and a.expositor <> ''
  group by a.expositor
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_expositores_pontos(int) to anon, authenticated;

create or replace function nm_ranking_cidades_pontos(limit_count int)
returns table(cidade text, uf text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.cidade, a.uf,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.cidade is not null and a.cidade <> ''
  group by a.cidade, a.uf
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_cidades_pontos(int) to anon, authenticated;

create or replace function nm_ranking_pais_pontos(limit_count int)
returns table(pai text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.pai,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.pai is not null and a.pai <> ''
  group by a.pai
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_pais_pontos(int) to anon, authenticated;

create or replace function nm_ranking_maes_pontos(limit_count int)
returns table(mae text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.mae,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.mae is not null and a.mae <> ''
  group by a.mae
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_maes_pontos(int) to anon, authenticated;

-- KPI "Animais Premiados": mesma regra de top-3 categoria/marcha.
create or replace function nm_ranking_kpis()
returns jsonb
language sql security definer set search_path = public
as $$
  select jsonb_build_object(
    'total_animais', (select count(*) from nm_animais),
    'total_cliques', (select count(*) from nm_analytics),
    'total_votos', (select count(*) from nm_votos),
    'total_visitas', (select count(*) from nm_page_views),
    'animais_premiados', (
      select count(distinct a.id) from nm_resultados r join nm_animais a on a.num_catalogo = r.num_catalogo
      where r.tipo_prova = 'final' and nm_eh_premiado(r.colocacao, r.pontuacao_andamento)
    ),
    'categorias_julgadas', (select count(distinct (tipo_campeonato, tipo_marcha, categoria)) from nm_resultados where tipo_prova = 'final' and colocacao is not null and colocacao <> '')
  );
$$;
grant execute on function nm_ranking_kpis() to anon, authenticated;

-- Drill-down: lista os animais "premiados" (top-3 categoria ou marcha) por
-- tras de uma linha do Ranking de Pontos (criador/expositor/cidade/pai/mae).
create or replace function nm_ranking_detalhe(p_dimensao text, p_valor text, p_uf text default null)
returns table(
  animal_id bigint, nome text, num_catalogo text, categoria text, tipo_marcha text,
  colocacao text, pontuacao_andamento text, pontos bigint
)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha,
         r.colocacao, r.pontuacao_andamento,
         (nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento))::bigint as pontos
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final'
    and nm_eh_premiado(r.colocacao, r.pontuacao_andamento)
    and (
      (p_dimensao = 'criador' and a.criador = p_valor) or
      (p_dimensao = 'expositor' and a.expositor = p_valor) or
      (p_dimensao = 'cidade' and a.cidade = p_valor and (p_uf is null or a.uf = p_uf)) or
      (p_dimensao = 'pai' and a.pai = p_valor) or
      (p_dimensao = 'mae' and a.mae = p_valor)
    )
  order by pontos desc, a.nome;
$$;
grant execute on function nm_ranking_detalhe(text, text, text) to anon, authenticated;
