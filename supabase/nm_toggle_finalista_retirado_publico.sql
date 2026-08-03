-- "Entre os 7" e "Retirado" deixam de ser controlados so pelo admin: durante
-- o evento ao vivo, qualquer usuario pode marcar/desmarcar direto na lista
-- (mesmo espirito da votacao popular - clique publico, sem exigir login).
-- Regras aplicadas aqui, no banco, pra valer sempre (nao so na UI):
--   - Maximo de 7 animais "Entre os 7" por categoria+marcha.
--   - Um animal nunca fica "Entre os 7" e "Retirado" ao mesmo tempo - marcar
--     um desliga o outro automaticamente.

create or replace function nm_toggle_finalista_marcha(p_animal_id bigint)
returns table(finalista_marcha boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categoria text;
  v_tipo_marcha text;
  v_atual boolean;
  v_total int;
begin
  select categoria, tipo_marcha, finalista_marcha
    into v_categoria, v_tipo_marcha, v_atual
  from nm_animais where id = p_animal_id;

  if not found then
    raise exception 'Animal nao encontrado';
  end if;

  if v_atual then
    update nm_animais set finalista_marcha = false where id = p_animal_id;
    return query select false;
  else
    select count(*) into v_total from nm_animais
    where categoria = v_categoria and tipo_marcha = v_tipo_marcha and finalista_marcha = true;

    if v_total >= 7 then
      raise exception 'Ja tem 7 animais entre os 7 nessa categoria';
    end if;

    update nm_animais set finalista_marcha = true, retirado = false where id = p_animal_id;
    return query select true;
  end if;
end;
$$;
grant execute on function nm_toggle_finalista_marcha(bigint) to anon, authenticated;

create or replace function nm_toggle_retirado(p_animal_id bigint)
returns table(retirado boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual boolean;
begin
  select retirado into v_atual from nm_animais where id = p_animal_id;

  if not found then
    raise exception 'Animal nao encontrado';
  end if;

  update nm_animais
  set retirado = not v_atual,
      finalista_marcha = case when not v_atual then false else finalista_marcha end
  where id = p_animal_id;

  return query select not v_atual;
end;
$$;
grant execute on function nm_toggle_retirado(bigint) to anon, authenticated;
