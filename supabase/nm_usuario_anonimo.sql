-- Reduz friccao pra votar: cria/recupera um usuario "anonimo" identificado
-- so por um device_id gerado no navegador (localStorage), sem exigir nome,
-- telefone ou email antes de votar. O usuario pode completar o cadastro
-- depois (nm_completar_cadastro), o que atualiza o MESMO registro (preserva
-- o historico de votos) em vez de criar um usuario novo.

alter table nm_usuarios add column if not exists device_id text;
create unique index if not exists nm_usuarios_device_id_uq on nm_usuarios (device_id) where device_id is not null;

create or replace function nm_usuario_anonimo(p_device_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_usuario nm_usuarios;
begin
  select * into v_usuario from nm_usuarios where device_id = p_device_id limit 1;

  if v_usuario.id is null then
    insert into nm_usuarios (nome, device_id)
    values ('Visitante', p_device_id)
    returning * into v_usuario;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object('id', v_usuario.id, 'nome', v_usuario.nome, 'email', v_usuario.email, 'telefone', v_usuario.telefone)
  );
end;
$$;
grant execute on function nm_usuario_anonimo(text) to anon, authenticated;

-- Completa o cadastro de um usuario ja existente (normalmente um anonimo
-- que acabou de votar) com nome + contato, em vez de criar outro registro.
-- Se o contato informado ja pertencer a outro usuario, funde o historico de
-- votos nesse usuario existente e apaga o registro anonimo duplicado.
create or replace function nm_completar_cadastro(p_usuario_id bigint, p_nome text, p_tipo text, p_destino text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_dono nm_usuarios;
  v_final nm_usuarios;
begin
  if p_tipo = 'email' then
    select * into v_dono from nm_usuarios where email = p_destino and id <> p_usuario_id limit 1;
  else
    select * into v_dono from nm_usuarios where telefone = p_destino and id <> p_usuario_id limit 1;
  end if;

  if v_dono.id is not null then
    update nm_votos set usuario_id = v_dono.id
    where usuario_id = p_usuario_id
      and campeonato not in (select campeonato from nm_votos where usuario_id = v_dono.id);
    delete from nm_votos where usuario_id = p_usuario_id;
    delete from nm_usuarios where id = p_usuario_id;
    update nm_usuarios set nome = p_nome where id = v_dono.id returning * into v_final;
  else
    update nm_usuarios set
      nome = p_nome,
      email = case when p_tipo = 'email' then p_destino else email end,
      telefone = case when p_tipo = 'telefone' then p_destino else telefone end
    where id = p_usuario_id
    returning * into v_final;
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object('id', v_final.id, 'nome', v_final.nome, 'email', v_final.email, 'telefone', v_final.telefone)
  );
end;
$$;
grant execute on function nm_completar_cadastro(bigint, text, text, text) to anon, authenticated;
