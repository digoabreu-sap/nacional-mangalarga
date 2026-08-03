-- Permissoes por aba pro painel /admin: um Administrador Master pode
-- restringir outros admins a so algumas abas (ex: so Resultados, ou
-- Resultados + Categoria + Video). A aba "Admins" (gerenciar admins/
-- permissoes) fica de fora do esquema de permissoes por aba - so quem e
-- is_master mexe nela, pra ninguem restrito se autopromover.
--
-- Todo admin ja existente vira is_master=true nesta migracao, pra manter o
-- acesso total que ja tinha antes dessa feature existir (ninguem perde
-- acesso de surpresa). Dai em diante, quem for master decide o nivel de
-- acesso dos admins que forem criados.

alter table nm_admins add column if not exists is_master boolean not null default true;
alter table nm_admins add column if not exists permissoes text[] not null default '{}';

update nm_admins set is_master = true where is_master is distinct from true;

drop function if exists nm_admin_login(text, text);
create function nm_admin_login(p_email text, p_password text)
returns table(id bigint, email text, nome text, is_master boolean, permissoes text[])
language sql security definer set search_path = public, extensions
as $$
  select id, email, nome, is_master, permissoes from nm_admins
  where email = p_email and password_hash = crypt(p_password, password_hash);
$$;
grant execute on function nm_admin_login(text, text) to anon, authenticated;

drop function if exists nm_admin_list_admins();
create function nm_admin_list_admins()
returns table(id bigint, email text, nome text, is_master boolean, permissoes text[])
language sql security definer set search_path = public
as $$ select id, email, nome, is_master, permissoes from nm_admins order by nome; $$;
grant execute on function nm_admin_list_admins() to anon, authenticated;

drop function if exists nm_add_admin(text, text, text);
create function nm_add_admin(
  p_email text, p_password text, p_nome text,
  p_is_master boolean default false, p_permissoes text[] default '{}'
)
returns void
language sql security definer set search_path = public, extensions
as $$
  insert into nm_admins (email, password_hash, nome, is_master, permissoes)
  values (p_email, crypt(p_password, gen_salt('bf')), p_nome, p_is_master, p_permissoes);
$$;
grant execute on function nm_add_admin(text, text, text, boolean, text[]) to anon, authenticated;

create or replace function nm_admin_set_permissoes(p_id bigint, p_is_master boolean, p_permissoes text[])
returns void
language sql security definer set search_path = public
as $$
  update nm_admins set is_master = p_is_master, permissoes = p_permissoes where id = p_id;
$$;
grant execute on function nm_admin_set_permissoes(bigint, boolean, text[]) to anon, authenticated;
