-- nm_daily_views so aceitava "ultimos N dias" (o admin usava days=7 fixo) -
-- nao dava pra ver o historico completo nem escolher um intervalo
-- especifico. Esta funcao substitui o uso no Analytics: data_inicio/
-- data_fim NULL = sem limite naquela ponta (NULL nos dois = historico
-- completo, desde o primeiro registro ate hoje). Mesmo agrupamento por dia
-- civil em horario de Brasilia da nm_daily_views (evita o mesmo bug de
-- deslocamento de 1 dia por fuso).
create or replace function nm_daily_views_range(data_inicio date, data_fim date)
returns table(dia date, total bigint)
language sql security definer set search_path = public
as $$
  select (created_at at time zone 'America/Sao_Paulo')::date as dia, count(*) as total
  from nm_page_views
  where (data_inicio is null or (created_at at time zone 'America/Sao_Paulo')::date >= data_inicio)
    and (data_fim is null or (created_at at time zone 'America/Sao_Paulo')::date <= data_fim)
  group by dia
  order by dia;
$$;
grant execute on function nm_daily_views_range(date, date) to anon, authenticated;
