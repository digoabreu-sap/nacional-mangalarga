-- Liga/desliga, por pista, a simulacao publica ao vivo (tags Entre os
-- 7/8 a 13/Retirado + reordenar + marcha/classificacao calculados) quando o
-- admin nao definiu os finalistas oficiais. Default true pra nao mudar o
-- comportamento de quem ja esta usando a feature (o admin so passa a ter
-- um jeito de desligar quando quiser).

alter table nm_categoria_atual
  add column if not exists simulacao_habilitada boolean not null default true;

-- Precisa dropar: mudou o shape do retorno (ganhou a coluna nova).
drop function if exists nm_get_categoria_atual();
create function nm_get_categoria_atual()
returns table(id smallint, categoria text, tipo_marcha text, fase_julgamento text, simulacao_habilitada boolean)
language sql
security definer
set search_path = public
as $$
  select id, categoria, tipo_marcha, fase_julgamento, simulacao_habilitada from nm_categoria_atual
  where id in (1, 2) and categoria is not null
  order by id;
$$;
grant execute on function nm_get_categoria_atual() to anon, authenticated;

drop function if exists nm_admin_set_categoria_atual(smallint, text, text, text);
create function nm_admin_set_categoria_atual(
  p_id smallint, p_categoria text, p_tipo_marcha text, p_fase_julgamento text default null,
  p_simulacao_habilitada boolean default true
)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_categoria_atual
  set categoria = p_categoria, tipo_marcha = p_tipo_marcha,
      fase_julgamento = case when p_categoria is null then null else p_fase_julgamento end,
      simulacao_habilitada = coalesce(p_simulacao_habilitada, true),
      updated_at = now()
  where id = p_id;
$$;
grant execute on function nm_admin_set_categoria_atual(smallint, text, text, text, boolean) to anon, authenticated;
