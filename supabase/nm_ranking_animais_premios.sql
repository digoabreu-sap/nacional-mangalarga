-- Complementa nm_ranking_stats.sql: "Animais em Destaque" so aparecia na
-- aba Mais Clicados. Faltava o equivalente pra Mais Premiados (animal com
-- mais colocacoes na prova Final - Campeao, Reserva, Mencao Honrosa etc).
create or replace function nm_ranking_animais_premios(limit_count int)
returns table(
  animal_id bigint, nome text, num_catalogo text, categoria text, tipo_marcha text,
  haras text, criador text, expositor text, cidade text, uf text, premios bigint
)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha,
         a.haras, a.criador, a.expositor, a.cidade, a.uf, count(r.id) as premios
  from nm_resultados r
  join nm_animais a on a.num_catalogo = r.num_catalogo
  where r.tipo_prova = 'final' and r.colocacao is not null and r.colocacao <> ''
  group by a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha, a.haras, a.criador, a.expositor, a.cidade, a.uf
  order by premios desc
  limit limit_count;
$$;
grant execute on function nm_ranking_animais_premios(int) to anon, authenticated;
