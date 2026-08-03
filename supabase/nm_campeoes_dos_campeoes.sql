-- Campeao dos Campeoes / Campea das Campeas (Machos, Femeas e Castrado, MB
-- e MP - 6 campeonatos no total). Diferente dos campeonatos normais (que
-- agrupam por categoria+idade), esses juntam animais de VARIAS categorias
-- (os campeoes de marcha de cada categoria voltam a pista - Art. 76 do
-- regulamento) - por isso precisam de uma tabela propria, com o admin
-- inserindo/removendo cada animal manualmente pelo numero de catalogo, em
-- vez de calcular automaticamente por categoria+marcha como o resto do site.

create table if not exists nm_campeoes_dos_campeoes (
  id bigserial primary key,
  tipo text not null check (tipo in ('castrado', 'macho', 'femea')),
  tipo_marcha text not null check (tipo_marcha in ('MB', 'MP')),
  num_catalogo text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (tipo, tipo_marcha, num_catalogo)
);

-- Leitura publica (mesmo padrao de nm_get_categoria_atual) - da pra mostrar
-- isso numa tela publica futuramente sem precisar de outra migracao.
create or replace function nm_campeoes_dos_campeoes_listar(p_tipo text, p_tipo_marcha text)
returns table(
  num_catalogo text, nome text, categoria text, tipo_marcha text,
  registro text, haras text, expositor text, ordem int
)
language sql
security definer
set search_path = public
as $$
  select c.num_catalogo, a.nome, a.categoria, a.tipo_marcha, a.registro, a.haras, a.expositor, c.ordem
  from nm_campeoes_dos_campeoes c
  join nm_animais a on a.num_catalogo = c.num_catalogo
  where c.tipo = p_tipo and c.tipo_marcha = p_tipo_marcha
  order by c.ordem;
$$;
grant execute on function nm_campeoes_dos_campeoes_listar(text, text) to anon, authenticated;

create or replace function nm_admin_add_campeao_dos_campeoes(p_tipo text, p_tipo_marcha text, p_num_catalogo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
begin
  if not exists (select 1 from nm_animais where num_catalogo = p_num_catalogo) then
    raise exception 'Animal com catalogo % nao encontrado', p_num_catalogo;
  end if;
  select coalesce(max(ordem), 0) into v_max
    from nm_campeoes_dos_campeoes where tipo = p_tipo and tipo_marcha = p_tipo_marcha;
  insert into nm_campeoes_dos_campeoes (tipo, tipo_marcha, num_catalogo, ordem)
  values (p_tipo, p_tipo_marcha, p_num_catalogo, v_max + 1)
  on conflict (tipo, tipo_marcha, num_catalogo) do nothing;
end;
$$;
grant execute on function nm_admin_add_campeao_dos_campeoes(text, text, text) to anon, authenticated;

create or replace function nm_admin_remove_campeao_dos_campeoes(p_tipo text, p_tipo_marcha text, p_num_catalogo text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from nm_campeoes_dos_campeoes
  where tipo = p_tipo and tipo_marcha = p_tipo_marcha and num_catalogo = p_num_catalogo;
$$;
grant execute on function nm_admin_remove_campeao_dos_campeoes(text, text, text) to anon, authenticated;
