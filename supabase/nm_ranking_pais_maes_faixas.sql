-- Adiciona a contagem de "faixas" (colocacoes premiadas) em Pais/Maes em
-- Destaque - um filho pode contar 2 faixas (categoria + marcha), entao isso
-- e diferente do numero de "filhos premiados" (animais distintos).
-- Rode depois de nm_ranking_marcha_e_detalhe.sql (usa nm_colocacao_pontos_marcha).

create or replace function nm_eh_premiado_categoria(p_colocacao text)
returns boolean
language sql immutable
as $$
  select coalesce(p_colocacao ~* 'campe[aã]o', false)
      or coalesce(p_colocacao ~* 'reserv', false)
      or coalesce(p_colocacao ~* '1\s*[ºo]?\s*pr[eê]mio', false);
$$;

create or replace function nm_eh_premiado_marcha(p_rank_marcha text)
returns boolean
language sql immutable
as $$
  select p_rank_marcha ~ '^\d+$' and p_rank_marcha::int between 1 and 3;
$$;

create or replace function nm_eh_premiado(p_colocacao text, p_rank_marcha text)
returns boolean
language sql immutable
as $$
  select nm_eh_premiado_categoria(p_colocacao) or coalesce(nm_eh_premiado_marcha(p_rank_marcha), false);
$$;

-- Muda o tipo de retorno (coluna faixas nova) - precisa dropar antes de recriar.
drop function if exists nm_ranking_pais_pontos(int);
create function nm_ranking_pais_pontos(limit_count int)
returns table(pai text, pontos bigint, animais bigint, faixas bigint)
language sql security definer set search_path = public
as $$
  select a.pai,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais,
         sum(
           (case when nm_eh_premiado_categoria(r.colocacao) then 1 else 0 end) +
           (case when nm_eh_premiado_marcha(r.pontuacao_andamento) then 1 else 0 end)
         ) as faixas
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.pai is not null and a.pai <> ''
  group by a.pai
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_pais_pontos(int) to anon, authenticated;

drop function if exists nm_ranking_maes_pontos(int);
create function nm_ranking_maes_pontos(limit_count int)
returns table(mae text, pontos bigint, animais bigint, faixas bigint)
language sql security definer set search_path = public
as $$
  select a.mae,
         sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) as pontos,
         count(distinct a.id) filter (where nm_eh_premiado(r.colocacao, r.pontuacao_andamento)) as animais,
         sum(
           (case when nm_eh_premiado_categoria(r.colocacao) then 1 else 0 end) +
           (case when nm_eh_premiado_marcha(r.pontuacao_andamento) then 1 else 0 end)
         ) as faixas
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.mae is not null and a.mae <> ''
  group by a.mae
  having sum(nm_colocacao_pontos(r.colocacao) + nm_colocacao_pontos_marcha(r.pontuacao_andamento)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_maes_pontos(int) to anon, authenticated;
