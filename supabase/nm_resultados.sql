-- Resultados dos campeonatos (Marcha / Morfologia / Funcional / Final-Categoria)
-- espelhados de https://resultados.abccmm.org.br/, uma linha por animal por prova.
create table if not exists nm_resultados (
  id bigserial primary key,
  tipo_campeonato text not null,
  tipo_marcha text not null,
  categoria text not null,
  tipo_prova text not null check (tipo_prova in ('marcha', 'morfologia', 'funcional', 'final')),
  num_catalogo text not null,
  nome_animal text,
  id_animal_abccmm bigint,
  categoria_abccmm int,
  campeonato_abccmm int,
  evento_abccmm int,
  pontuacao text,
  colocacao text,
  atualizado_em timestamptz not null default now(),
  unique (tipo_campeonato, tipo_marcha, categoria, tipo_prova, num_catalogo)
);

create index if not exists nm_resultados_lookup
  on nm_resultados (tipo_campeonato, tipo_marcha, categoria, num_catalogo);

alter table nm_resultados enable row level security;

drop policy if exists nm_resultados_select_public on nm_resultados;
create policy nm_resultados_select_public on nm_resultados
  for select
  to anon, authenticated
  using (true);

-- Upsert em lote, usado apenas pela rotina de sincronizacao (via API admin).
-- security definer contorna a RLS (que so libera leitura para anon).
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
    pontuacao, colocacao, atualizado_em
  )
  select
    r->>'tipo_campeonato', r->>'tipo_marcha', r->>'categoria', r->>'tipo_prova', r->>'num_catalogo',
    r->>'nome_animal', (r->>'id_animal_abccmm')::bigint, (r->>'categoria_abccmm')::int,
    (r->>'campeonato_abccmm')::int, (r->>'evento_abccmm')::int,
    r->>'pontuacao', r->>'colocacao', now()
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
    atualizado_em = now();
end;
$$;

grant execute on function nm_admin_upsert_resultados(jsonb) to anon, authenticated;

-- Status da ultima sincronizacao (linha unica, id fixo = 1), exibido no admin.
create table if not exists nm_resultados_sync (
  id smallint primary key default 1,
  ultima_sincronizacao timestamptz,
  classes_processadas int,
  linhas_atualizadas int,
  erro text,
  constraint nm_resultados_sync_singleton check (id = 1)
);

insert into nm_resultados_sync (id) values (1) on conflict (id) do nothing;

-- RLS ligado e sem policies: ninguem le/escreve a tabela direto com a anon
-- key, so pelas funcoes security definer abaixo.
alter table nm_resultados_sync enable row level security;

create or replace function nm_get_resultados_sync()
returns table(ultima_sincronizacao timestamptz, classes_processadas int, linhas_atualizadas int, erro text)
language sql
security definer
set search_path = public
as $$
  select ultima_sincronizacao, classes_processadas, linhas_atualizadas, erro
  from nm_resultados_sync where id = 1;
$$;

grant execute on function nm_get_resultados_sync() to anon, authenticated;

create or replace function nm_admin_set_resultados_sync(p_classes int, p_linhas int, p_erro text)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_resultados_sync
  set ultima_sincronizacao = now(),
      classes_processadas = p_classes,
      linhas_atualizadas = p_linhas,
      erro = p_erro
  where id = 1;
$$;

grant execute on function nm_admin_set_resultados_sync(int, int, text) to anon, authenticated;
