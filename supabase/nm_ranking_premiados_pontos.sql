-- Ranking de Premiados por pontos, seguindo a "Nova Tabela Oficial de
-- Pontos para Eventos Oficializados e Ranking Nacional da Raca Mangalarga
-- Marchador" (ABCCMM): Campeao=20, Reservado Campeao=17, 1o-5o Premio=
-- 14/12/10/8/6, 1a-3a Mencao Honrosa=4/2/1. So conta o resultado da prova
-- Final (tipo_prova='final') de cada campeonato/categoria - e a colocacao
-- geral do animal naquele campeonato, nao a prova de marcha/morfologia/
-- funcional isoladas.
--
-- O texto de colocacao vem raspado do site da ABCCMM (varia: "Campeão(ã) -
-- Jovem", "1 Menção Honrosa", "2º Prêmio"...), entao a pontuacao e inferida
-- por padrao de texto (mesma logica usada pra normalizar a exibicao em
-- lib/colocacao.ts).
create or replace function nm_colocacao_pontos(p_colocacao text)
returns int
language sql immutable
as $$
  select case
    when p_colocacao is null then 0
    when p_colocacao ~* 'reserv' then 17
    when p_colocacao ~* 'campe[aã]o' then 20
    when p_colocacao ~* '1\s*[ºo]?\s*pr[eê]mio' then 14
    when p_colocacao ~* '2\s*[ºo]?\s*pr[eê]mio' then 12
    when p_colocacao ~* '3\s*[ºo]?\s*pr[eê]mio' then 10
    when p_colocacao ~* '4\s*[ºo]?\s*pr[eê]mio' then 8
    when p_colocacao ~* '5\s*[ºo]?\s*pr[eê]mio' then 6
    when p_colocacao ~* '1\s*[ªa]?\s*men[cç][aã]o' then 4
    when p_colocacao ~* '2\s*[ªa]?\s*men[cç][aã]o' then 2
    when p_colocacao ~* '3\s*[ªa]?\s*men[cç][aã]o' then 1
    else 0
  end;
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
         sum(nm_colocacao_pontos(r.colocacao)) as pontos
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final'
  group by a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha, a.haras, a.criador, a.expositor, a.cidade, a.uf
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_animais_pontos(int) to anon, authenticated;

create or replace function nm_ranking_criadores_pontos(limit_count int)
returns table(criador text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.criador, sum(nm_colocacao_pontos(r.colocacao)) as pontos, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.criador is not null and a.criador <> ''
  group by a.criador
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_criadores_pontos(int) to anon, authenticated;

create or replace function nm_ranking_expositores_pontos(limit_count int)
returns table(expositor text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.expositor, sum(nm_colocacao_pontos(r.colocacao)) as pontos, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.expositor is not null and a.expositor <> ''
  group by a.expositor
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_expositores_pontos(int) to anon, authenticated;

create or replace function nm_ranking_cidades_pontos(limit_count int)
returns table(cidade text, uf text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.cidade, a.uf, sum(nm_colocacao_pontos(r.colocacao)) as pontos, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.cidade is not null and a.cidade <> ''
  group by a.cidade, a.uf
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_cidades_pontos(int) to anon, authenticated;

create or replace function nm_ranking_pais_pontos(limit_count int)
returns table(pai text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.pai, sum(nm_colocacao_pontos(r.colocacao)) as pontos, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.pai is not null and a.pai <> ''
  group by a.pai
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_pais_pontos(int) to anon, authenticated;

create or replace function nm_ranking_maes_pontos(limit_count int)
returns table(mae text, pontos bigint, animais bigint)
language sql security definer set search_path = public
as $$
  select a.mae, sum(nm_colocacao_pontos(r.colocacao)) as pontos, count(distinct a.id) as animais
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and a.mae is not null and a.mae <> ''
  group by a.mae
  having sum(nm_colocacao_pontos(r.colocacao)) > 0
  order by pontos desc
  limit limit_count;
$$;
grant execute on function nm_ranking_maes_pontos(int) to anon, authenticated;
