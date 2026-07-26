-- Muda a fonte dos resultados: em vez de raspar 4 paginas separadas por
-- categoria (Marcha/Morfologia/Funcional/Final - lento e a prova Funcional
-- raramente tinha link proprio), a pagina "Final" (DetalheFinal.aspx) ja
-- traz tudo isso numa tabela so: Nº, Competidor, Funcional, Morfologia,
-- Andamento (=marcha) e Classificação. 1 request por categoria em vez de
-- ate 4 - direto ataca tanto a demora quanto a falta de dado.
alter table nm_resultados add column if not exists pontuacao_funcional text;
alter table nm_resultados add column if not exists pontuacao_morfologia text;
alter table nm_resultados add column if not exists pontuacao_andamento text;

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
    pontuacao, colocacao, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, atualizado_em
  )
  select
    r->>'tipo_campeonato', r->>'tipo_marcha', r->>'categoria', r->>'tipo_prova', r->>'num_catalogo',
    r->>'nome_animal', (r->>'id_animal_abccmm')::bigint, (r->>'categoria_abccmm')::int,
    (r->>'campeonato_abccmm')::int, (r->>'evento_abccmm')::int,
    r->>'pontuacao', r->>'colocacao', r->>'pontuacao_funcional', r->>'pontuacao_morfologia', r->>'pontuacao_andamento', now()
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
    atualizado_em = now();
end;
$$;

grant execute on function nm_admin_upsert_resultados(jsonb) to anon, authenticated;
