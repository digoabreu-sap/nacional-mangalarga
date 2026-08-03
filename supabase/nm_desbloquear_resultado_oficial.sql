-- Paliativo pro caso de a ABCCMM publicar uma linha "oficial" vazia (sem
-- nenhuma nota/colocacao - ex: roster da categoria publicado antes do
-- julgamento). Linhas origem='abccmm' ficam sempre travadas pro cadastro
-- manual (nm_admin_upsert_resultado_manual vira no-op nelas de proposito -
-- "oficial sempre prevalece"), entao uma linha oficial vazia travava o
-- admin sem alternativa nenhuma ate a ABCCMM publicar o dado de verdade.
--
-- Essa funcao so "destrava": rebaixa a linha de volta pra origem='manual',
-- sem mexer nos valores. Dai o fluxo de cadastro manual (que ja existia)
-- passa a tratar ela como editavel normalmente. Assim que a proxima
-- sincronizacao da ABCCMM trouxer o resultado de verdade,
-- nm_admin_upsert_resultados (usado so pelo sync) sempre sobrescreve e
-- marca origem='abccmm' de novo - o "paliativo" nunca compete com o
-- oficial real, so preenche o vazio ate ele chegar.
create or replace function nm_admin_desbloquear_resultado_oficial(
  p_tipo_campeonato text, p_tipo_marcha text, p_categoria text, p_num_catalogo text
)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_resultados
  set origem = 'manual', atualizado_em = now()
  where tipo_campeonato = p_tipo_campeonato
    and tipo_marcha = p_tipo_marcha
    and categoria = p_categoria
    and tipo_prova = 'final'
    and num_catalogo = p_num_catalogo;
$$;
grant execute on function nm_admin_desbloquear_resultado_oficial(text, text, text, text) to anon, authenticated;
