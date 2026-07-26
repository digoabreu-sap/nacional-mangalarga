-- nm_daily_views agrupava por dia em UTC, mas o front-end exibia a data sem
-- reconverter de volta - o navegador do usuario (fuso Brasil, UTC-3) renderizava
-- a "meia-noite UTC" como ainda sendo o dia anterior, deslocando o grafico em
-- 1 dia. Agrupa pelo dia civil no horario de Brasilia (bate com quando as
-- visitas realmente aconteceram pra quem esta no Brasil).
create or replace function nm_daily_views(days int)
returns table(dia date, total bigint)
language sql security definer set search_path = public
as $$
  select (created_at at time zone 'America/Sao_Paulo')::date as dia, count(*) as total
  from nm_page_views
  where created_at >= now() - (days || ' days')::interval
  group by dia
  order by dia;
$$;
grant execute on function nm_daily_views(int) to anon, authenticated;
