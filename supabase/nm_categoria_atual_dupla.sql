-- Permite ate 2 categorias "em pista" simultaneas (2 rings julgando ao
-- mesmo tempo) em vez de 1 unica. A tabela passa de singleton (so id=1)
-- pra aceitar id 1 ou 2 - cada linha e uma pista independente.

alter table nm_categoria_atual drop constraint if exists nm_categoria_atual_singleton;
alter table nm_categoria_atual add constraint nm_categoria_atual_duas_pistas check (id in (1, 2));

insert into nm_categoria_atual (id, categoria, tipo_marcha)
values (2, null, null)
on conflict (id) do nothing;

-- Muda o retorno de 1 linha pra 0-2 linhas (so as pistas com categoria
-- definida) - precisa dropar antes de recriar.
drop function if exists nm_get_categoria_atual();
create function nm_get_categoria_atual()
returns table(id smallint, categoria text, tipo_marcha text)
language sql
security definer
set search_path = public
as $$
  select id, categoria, tipo_marcha from nm_categoria_atual
  where id in (1, 2) and categoria is not null
  order by id;
$$;
grant execute on function nm_get_categoria_atual() to anon, authenticated;

drop function if exists nm_admin_set_categoria_atual(text, text);
create function nm_admin_set_categoria_atual(p_id smallint, p_categoria text, p_tipo_marcha text)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_categoria_atual
  set categoria = p_categoria, tipo_marcha = p_tipo_marcha, updated_at = now()
  where id = p_id;
$$;
grant execute on function nm_admin_set_categoria_atual(smallint, text, text) to anon, authenticated;
