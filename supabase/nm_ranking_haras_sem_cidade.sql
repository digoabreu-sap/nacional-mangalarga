-- Adiciona estatistica por Haras, remove por Cidade/Estado, e estende "e XX
-- faixas" (colocacoes premiadas, categoria+marcha) pra Criadores e
-- Expositores tambem (ja existia so em Pais/Maes).
-- Rode depois de nm_ranking_marcha_e_detalhe.sql e
-- nm_ranking_pais_maes_faixas.sql (usa nm_eh_premiado_categoria/_marcha).

-- Remove estatistica por cidade/estado ------------------------------------
drop function if exists nm_ranking_cidades_pontos(int);
drop function if exists nm_ranking_cidades_cliques(int);

-- Estatistica por Haras -----------------------------------------------------
create or replace function nm_ranking_haras_cliques(limit_count int)
returns table(haras text, cliques bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.haras, count(an.id) as cliques, count(distinct a.id) as animais
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  where a.haras is not null and a.haras <> ''
  group by a.haras
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_ranking_haras_cliques(int) to anon, authenticated;

create or replace function nm_ranking_haras_pontos(limit_count int)
returns table(haras text, pontos bigint, animais bigint, faixas bigint)
language sql security definer set search_path = public
as $$
  select a.haras,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais,
         sum(
           (case when nm_eh_premiado_categoria(r.colocacao) then 1 else 0 end) +
           (case when nm_eh_premiado_marcha(r.pontuacao_andamento) then 1 else 0 end)
         ) as faixas
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.haras is not null and a.haras <> ''
  group by a.haras
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_haras_pontos(int) to anon, authenticated;

-- "e XX faixas" tambem pra Criadores e Expositores (muda o retorno, precisa dropar) ---
drop function if exists nm_ranking_criadores_pontos(int);
create function nm_ranking_criadores_pontos(limit_count int)
returns table(criador text, pontos bigint, animais bigint, faixas bigint)
language sql security definer set search_path = public
as $$
  select a.criador,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais,
         sum(
           (case when nm_eh_premiado_categoria(r.colocacao) then 1 else 0 end) +
           (case when nm_eh_premiado_marcha(r.pontuacao_andamento) then 1 else 0 end)
         ) as faixas
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.criador is not null and a.criador <> ''
  group by a.criador
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_criadores_pontos(int) to anon, authenticated;

drop function if exists nm_ranking_expositores_pontos(int);
create function nm_ranking_expositores_pontos(limit_count int)
returns table(expositor text, pontos bigint, animais bigint, faixas bigint)
language sql security definer set search_path = public
as $$
  select a.expositor,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais,
         sum(
           (case when nm_eh_premiado_categoria(r.colocacao) then 1 else 0 end) +
           (case when nm_eh_premiado_marcha(r.pontuacao_andamento) then 1 else 0 end)
         ) as faixas
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.expositor is not null and a.expositor <> ''
  group by a.expositor
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_expositores_pontos(int) to anon, authenticated;

-- Drill-down: troca a dimensao "cidade" por "haras", e o parametro de UF
-- (que so servia pra cidade) sai da assinatura.
drop function if exists nm_ranking_detalhe(text, text, text);
create function nm_ranking_detalhe(p_dimensao text, p_valor text)
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
      (p_dimensao = 'haras' and a.haras = p_valor) or
      (p_dimensao = 'pai' and a.pai = p_valor) or
      (p_dimensao = 'mae' and a.mae = p_valor)
    )
  order by pontos desc, a.nome;
$$;
grant execute on function nm_ranking_detalhe(text, text) to anon, authenticated;
