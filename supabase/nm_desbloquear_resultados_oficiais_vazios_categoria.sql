-- Complemento do paliativo anterior (nm_admin_desbloquear_resultado_oficial,
-- que destrava 1 animal por vez): quando a categoria inteira veio com o
-- roster oficial vazio (ex: "Cavalo Castrado Adulto (MB)" com todas as 16
-- linhas OFICIAIS mas sem nenhuma nota), destravar animal por animal antes
-- de importar o Resumo Parcial/PDF nao e viavel. Essa funcao destrava TODAS
-- as linhas vazias de uma categoria+marcha de uma vez.
--
-- So mexe em linhas SEM NENHUM dado real (colocacao e todas as notas
-- vazias) - uma linha oficial com pelo menos um valor preenchido nunca e
-- tocada, mesmo no modo em lote (protege contra apagar/destravar resultado
-- oficial de verdade por engano).
create or replace function nm_admin_desbloquear_resultados_oficiais_vazios_categoria(
  p_tipo_campeonato text, p_tipo_marcha text, p_categoria text
)
returns int
language sql
security definer
set search_path = public
as $$
  with atualizados as (
    update nm_resultados
    set origem = 'manual', atualizado_em = now()
    where tipo_campeonato = p_tipo_campeonato
      and tipo_marcha = p_tipo_marcha
      and categoria = p_categoria
      and tipo_prova = 'final'
      and origem = 'abccmm'
      and colocacao is null
      and pontuacao_funcional is null
      and pontuacao_morfologia is null
      and pontuacao_andamento is null
    returning 1
  )
  select count(*)::int from atualizados;
$$;
grant execute on function nm_admin_desbloquear_resultados_oficiais_vazios_categoria(text, text, text) to anon, authenticated;
