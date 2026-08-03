-- Dentro de uma categoria os quesitos sao julgados em momentos diferentes
-- (Morfologia -> Marcha -> Prova Funcional) e so depois o resultado da
-- categoria e somado/computado. Este campo deixa o admin sinalizar pro
-- publico qual quesito esta sendo julgado agora em cada pista - e so
-- informativo, nao afeta calculo de pontuacao/colocacao nenhum.

alter table nm_categoria_atual
  add column if not exists fase_julgamento text
  check (fase_julgamento in ('morfologia', 'marcha', 'funcional'));

-- Precisa dropar: mudou o shape do retorno (ganhou a coluna nova).
drop function if exists nm_get_categoria_atual();
create function nm_get_categoria_atual()
returns table(id smallint, categoria text, tipo_marcha text, fase_julgamento text)
language sql
security definer
set search_path = public
as $$
  select id, categoria, tipo_marcha, fase_julgamento from nm_categoria_atual
  where id in (1, 2) and categoria is not null
  order by id;
$$;
grant execute on function nm_get_categoria_atual() to anon, authenticated;

drop function if exists nm_admin_set_categoria_atual(smallint, text, text);
create function nm_admin_set_categoria_atual(p_id smallint, p_categoria text, p_tipo_marcha text, p_fase_julgamento text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_categoria_atual
  set categoria = p_categoria, tipo_marcha = p_tipo_marcha,
      fase_julgamento = case when p_categoria is null then null else p_fase_julgamento end,
      updated_at = now()
  where id = p_id;
$$;
grant execute on function nm_admin_set_categoria_atual(smallint, text, text, text) to anon, authenticated;
