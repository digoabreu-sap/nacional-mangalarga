-- Contagem de votos por animal, agregada por categoria+marcha (nao por
-- campeonato especifico) - usado pra mostrar os votos direto na lista da
-- Home quando travada na "categoria em pista" (que e definida por
-- categoria+marcha, podendo abranger mais de um tipo_campeonato).
create or replace function nm_votos_por_categoria(p_categoria text, p_tipo_marcha text)
returns table(animal_id bigint, total_votos bigint)
language sql security definer set search_path = public
as $$
  select a.id as animal_id, count(v.id) as total_votos
  from nm_animais a
  join nm_votos v on v.animal_id = a.id
  where a.categoria = p_categoria and a.tipo_marcha = p_tipo_marcha
  group by a.id;
$$;
grant execute on function nm_votos_por_categoria(text, text) to anon, authenticated;

-- Habilita realtime na tabela de votos (a Home escuta mudanças aqui pra
-- atualizar a contagem sozinha, sem precisar de F5). Idempotente - nao
-- quebra se already estiver habilitado.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nm_votos'
  ) then
    alter publication supabase_realtime add table nm_votos;
  end if;
end $$;
