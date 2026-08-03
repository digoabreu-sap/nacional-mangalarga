-- Ao Vivo (Campeao dos Campeoes / Grande Campeonato): Pai e Mae nao
-- apareciam no card porque a RPC de listagem nao trazia essas colunas de
-- nm_animais (so nome/categoria/registro/haras/expositor) - o front
-- preenchia o card com string vazia. Precisa dropar porque o retorno
-- (colunas) muda - CREATE OR REPLACE nao permite trocar as colunas de saida.
drop function if exists nm_campeoes_dos_campeoes_listar(text, text);

create or replace function nm_campeoes_dos_campeoes_listar(p_tipo text, p_tipo_marcha text)
returns table(
  num_catalogo text, nome text, categoria text, tipo_marcha text,
  registro text, haras text, expositor text, ordem int,
  pai text, pai_registro text, mae text, mae_registro text
)
language sql
security definer
set search_path = public
as $$
  select c.num_catalogo, a.nome, a.categoria, a.tipo_marcha, a.registro, a.haras, a.expositor, c.ordem,
         a.pai, a.pai_registro, a.mae, a.mae_registro
  from nm_campeoes_dos_campeoes c
  join nm_animais a on a.num_catalogo = c.num_catalogo
  where c.tipo = p_tipo and c.tipo_marcha = p_tipo_marcha
  order by c.ordem;
$$;
grant execute on function nm_campeoes_dos_campeoes_listar(text, text) to anon, authenticated;
