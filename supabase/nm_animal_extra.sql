-- Dados adicionais do animal (Instagram, YouTube, texto livre), mantidos
-- pelo admin. A chave e o REGISTRO (numero de registro na ABCCMM), nao o
-- numero de catalogo nem o id de nm_animais - o catalogo muda a cada
-- evento novo, e este cadastro precisa sobreviver entre eventos.
--
-- "visivel" e um flag individual (por animal) pra ocultar esses dados
-- "fora catalogo" da pagina publica sem apagar o cadastro - junto com a
-- funcao de alteracao em massa (Ocultar/Exibir Todos) da aba Animais.

create table if not exists nm_animal_extra (
  registro text primary key,
  instagram_url text,
  youtube_url text,
  texto text,
  visivel boolean not null default true,
  atualizado_em timestamptz not null default now()
);

alter table nm_animal_extra enable row level security;
-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.

-- Leitura PUBLICA (pagina do animal) - so retorna se visivel=true.
create or replace function nm_get_animal_extra(p_registro text)
returns nm_animal_extra
language sql security definer set search_path = public
as $$ select * from nm_animal_extra where registro = p_registro and visivel = true; $$;
grant execute on function nm_get_animal_extra(text) to anon, authenticated;

-- Leitura pelo ADMIN (aba Animais) - ve mesmo o que estiver oculto, pra
-- poder editar/reexibir depois.
create or replace function nm_admin_get_animal_extra(p_registro text)
returns nm_animal_extra
language sql security definer set search_path = public
as $$ select * from nm_animal_extra where registro = p_registro; $$;
grant execute on function nm_admin_get_animal_extra(text) to anon, authenticated;

create or replace function nm_admin_set_animal_extra(
  p_registro text, p_instagram_url text, p_youtube_url text, p_texto text, p_visivel boolean default true
)
returns nm_animal_extra
language plpgsql security definer set search_path = public
as $$
declare
  v_result nm_animal_extra;
begin
  insert into nm_animal_extra (registro, instagram_url, youtube_url, texto, visivel, atualizado_em)
  values (p_registro, p_instagram_url, p_youtube_url, p_texto, coalesce(p_visivel, true), now())
  on conflict (registro) do update set
    instagram_url = excluded.instagram_url,
    youtube_url = excluded.youtube_url,
    texto = excluded.texto,
    visivel = excluded.visivel,
    atualizado_em = now()
  returning * into v_result;
  return v_result;
end;
$$;
grant execute on function nm_admin_set_animal_extra(text, text, text, text, boolean) to anon, authenticated;

-- Ferramenta de alteracao em massa (aba Animais): Ocultar/Exibir Todos de
-- uma vez, sem precisar editar registro por registro.
create or replace function nm_admin_set_todos_animal_extra_visivel(p_visivel boolean)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_afetados int;
begin
  update nm_animal_extra set visivel = p_visivel, atualizado_em = now() where visivel is distinct from p_visivel;
  get diagnostics v_afetados = row_count;
  return v_afetados;
end;
$$;
grant execute on function nm_admin_set_todos_animal_extra_visivel(boolean) to anon, authenticated;

-- Lista todos os cadastros (aba Animais) - pra mostrar quantos tem, quantos
-- visiveis, e permitir a ferramenta de alteracao em massa saber o estado atual.
create or replace function nm_admin_list_animal_extra()
returns setof nm_animal_extra
language sql security definer set search_path = public
as $$ select * from nm_animal_extra order by atualizado_em desc; $$;
grant execute on function nm_admin_list_animal_extra() to anon, authenticated;
