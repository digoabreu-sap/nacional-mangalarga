-- Ferramenta de divergencias: compara o resultado OFICIAL ja sincronizado
-- (origem='abccmm') contra o "Resumo Parcial" (PDF da ABCCMM com o mapa de
-- premiacao ainda nao-oficial) e deixa o admin escolher qual esta certo.
-- As duas fontes sao da propria ABCCMM - as vezes a sincronizacao pega uma
-- categoria com erro de digitacao/publicacao que o Resumo Parcial nao tem
-- (ou vice-versa), entao aqui o admin pode CORRIGIR o valor oficial
-- diretamente (diferente do paliativo de "destravar", que so libera uma
-- linha vazia pra edicao manual - aqui o valor pode estar preenchido mas
-- errado, e o campo e sobrescrito direto, mantendo origem='abccmm' pra
-- continuar contando como oficial).
--
-- Dois campos porque o dado da colocacao (secao "Categoria" do PDF) e da
-- marcha (secao "Marcha") sao independentes - o admin pode corrigir um sem
-- mexer no outro.
create or replace function nm_admin_corrigir_colocacao_oficial(
  p_tipo_campeonato text, p_tipo_marcha text, p_categoria text, p_num_catalogo text, p_colocacao text
)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_resultados
  set colocacao = p_colocacao, atualizado_em = now()
  where tipo_campeonato = p_tipo_campeonato
    and tipo_marcha = p_tipo_marcha
    and categoria = p_categoria
    and tipo_prova = 'final'
    and num_catalogo = p_num_catalogo;
$$;
grant execute on function nm_admin_corrigir_colocacao_oficial(text, text, text, text, text) to anon, authenticated;

create or replace function nm_admin_corrigir_marcha_oficial(
  p_tipo_campeonato text, p_tipo_marcha text, p_categoria text, p_num_catalogo text, p_pontuacao_andamento text
)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_resultados
  set pontuacao_andamento = p_pontuacao_andamento, atualizado_em = now()
  where tipo_campeonato = p_tipo_campeonato
    and tipo_marcha = p_tipo_marcha
    and categoria = p_categoria
    and tipo_prova = 'final'
    and num_catalogo = p_num_catalogo;
$$;
grant execute on function nm_admin_corrigir_marcha_oficial(text, text, text, text, text) to anon, authenticated;
