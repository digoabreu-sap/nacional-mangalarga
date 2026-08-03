-- Cadastro manual de resultado (pra usar enquanto a ABCCMM ainda nao
-- publicou o oficial). O resultado raspado da ABCCMM SEMPRE prevalece: a
-- coluna "origem" marca quem escreveu cada linha, e o upsert manual so
-- grava quando a linha ainda nao e 'abccmm' (a clausula WHERE do ON
-- CONFLICT vira um no-op quando ja existe oficial, em vez de sobrescrever).

alter table nm_resultados add column if not exists origem text not null default 'abccmm';

-- O sync da ABCCMM sempre marca/mantem origem = 'abccmm' e sempre
-- sobrescreve (inclusive um cadastro manual anterior pra aquele animal).
create or replace function nm_admin_upsert_resultados(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into nm_resultados (
    tipo_campeonato, tipo_marcha, categoria, tipo_prova, num_catalogo,
    nome_animal, id_animal_abccmm, categoria_abccmm, campeonato_abccmm, evento_abccmm,
    pontuacao, colocacao, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, origem, atualizado_em
  )
  select
    r->>'tipo_campeonato', r->>'tipo_marcha', r->>'categoria', r->>'tipo_prova', r->>'num_catalogo',
    r->>'nome_animal', (r->>'id_animal_abccmm')::bigint, (r->>'categoria_abccmm')::int,
    (r->>'campeonato_abccmm')::int, (r->>'evento_abccmm')::int,
    r->>'pontuacao', r->>'colocacao', r->>'pontuacao_funcional', r->>'pontuacao_morfologia', r->>'pontuacao_andamento',
    'abccmm', now()
  from jsonb_array_elements(p_rows) as r
  on conflict (tipo_campeonato, tipo_marcha, categoria, tipo_prova, num_catalogo)
  do update set
    nome_animal = excluded.nome_animal,
    id_animal_abccmm = excluded.id_animal_abccmm,
    categoria_abccmm = excluded.categoria_abccmm,
    campeonato_abccmm = excluded.campeonato_abccmm,
    evento_abccmm = excluded.evento_abccmm,
    pontuacao = excluded.pontuacao,
    colocacao = excluded.colocacao,
    pontuacao_funcional = excluded.pontuacao_funcional,
    pontuacao_morfologia = excluded.pontuacao_morfologia,
    pontuacao_andamento = excluded.pontuacao_andamento,
    origem = 'abccmm',
    atualizado_em = now();
end;
$$;
grant execute on function nm_admin_upsert_resultados(jsonb) to anon, authenticated;

-- Cadastro manual (1 linha por vez, vindo do painel admin). Nunca
-- sobrescreve uma linha ja marcada 'abccmm' - a clausula WHERE faz o
-- upsert virar no-op nesse caso, entao o resultado buscado sempre prevalece.
create or replace function nm_admin_upsert_resultado_manual(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into nm_resultados (
    tipo_campeonato, tipo_marcha, categoria, tipo_prova, num_catalogo,
    nome_animal, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, colocacao,
    origem, atualizado_em
  )
  select
    r->>'tipo_campeonato', r->>'tipo_marcha', r->>'categoria', 'final', r->>'num_catalogo',
    r->>'nome_animal', r->>'pontuacao_funcional', r->>'pontuacao_morfologia', r->>'pontuacao_andamento', r->>'colocacao',
    'manual', now()
  from jsonb_array_elements(p_rows) as r
  on conflict (tipo_campeonato, tipo_marcha, categoria, tipo_prova, num_catalogo)
  do update set
    nome_animal = excluded.nome_animal,
    pontuacao_funcional = excluded.pontuacao_funcional,
    pontuacao_morfologia = excluded.pontuacao_morfologia,
    pontuacao_andamento = excluded.pontuacao_andamento,
    colocacao = excluded.colocacao,
    origem = 'manual',
    atualizado_em = now()
  where nm_resultados.origem <> 'abccmm';
end;
$$;
grant execute on function nm_admin_upsert_resultado_manual(jsonb) to anon, authenticated;

-- Exclui um cadastro manual (nunca apaga uma linha 'abccmm', por seguranca).
create or replace function nm_admin_delete_resultado_manual(
  p_tipo_campeonato text, p_tipo_marcha text, p_categoria text, p_num_catalogo text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from nm_resultados
  where tipo_campeonato = p_tipo_campeonato
    and tipo_marcha = p_tipo_marcha
    and categoria = p_categoria
    and tipo_prova = 'final'
    and num_catalogo = p_num_catalogo
    and origem = 'manual';
$$;
grant execute on function nm_admin_delete_resultado_manual(text, text, text, text) to anon, authenticated;
