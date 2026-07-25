-- Categoria em julgamento no momento (linha unica, id fixo = 1)
create table if not exists nm_categoria_atual (
  id smallint primary key default 1,
  categoria text,
  updated_at timestamptz not null default now(),
  constraint nm_categoria_atual_singleton check (id = 1)
);

insert into nm_categoria_atual (id, categoria)
values (1, null)
on conflict (id) do nothing;

-- RLS ligado e sem policies: ninguem le/escreve a tabela direto com a anon
-- key, so pelas funcoes security definer abaixo.
alter table nm_categoria_atual enable row level security;

-- Leitura publica: usada na Home para exibir "Agora na Pista"
create or replace function nm_get_categoria_atual()
returns text
language sql
security definer
set search_path = public
as $$
  select categoria from nm_categoria_atual where id = 1;
$$;

grant execute on function nm_get_categoria_atual() to anon, authenticated;

-- Escrita: usada pelo painel admin (protegida pelo token de admin na API route)
create or replace function nm_admin_set_categoria_atual(p_categoria text)
returns void
language sql
security definer
set search_path = public
as $$
  update nm_categoria_atual set categoria = p_categoria, updated_at = now() where id = 1;
$$;

grant execute on function nm_admin_set_categoria_atual(text) to anon, authenticated;
