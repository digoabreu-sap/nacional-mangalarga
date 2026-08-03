-- Botao "Compre" (WhatsApp) no animal: numero e mensagem configurados no
-- admin (linha unica, id fixo = 1), + tracking de clique por animal pra
-- reportar ao patrocinador.

create table if not exists nm_whatsapp_config (
  id smallint primary key default 1,
  numero text,
  mensagem_template text,
  atualizado_em timestamptz not null default now(),
  constraint nm_whatsapp_config_singleton check (id = 1)
);
insert into nm_whatsapp_config (id) values (1) on conflict (id) do nothing;

alter table nm_whatsapp_config enable row level security;
-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.

create or replace function nm_get_whatsapp_config()
returns table(numero text, mensagem_template text)
language sql security definer set search_path = public
as $$ select numero, mensagem_template from nm_whatsapp_config where id = 1; $$;
grant execute on function nm_get_whatsapp_config() to anon, authenticated;

create or replace function nm_admin_set_whatsapp_config(p_numero text, p_mensagem_template text)
returns void
language sql security definer set search_path = public
as $$
  update nm_whatsapp_config
  set numero = p_numero, mensagem_template = p_mensagem_template, atualizado_em = now()
  where id = 1;
$$;
grant execute on function nm_admin_set_whatsapp_config(text, text) to anon, authenticated;

-- Tracking de clique (mesmo padrao de nm_banner_cliques/nm_analytics).
create table if not exists nm_whatsapp_cliques (
  id bigserial primary key,
  animal_id bigint references nm_animais (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists nm_whatsapp_cliques_animal_idx on nm_whatsapp_cliques (animal_id);

alter table nm_whatsapp_cliques enable row level security;

drop policy if exists nm_whatsapp_cliques_insert_public on nm_whatsapp_cliques;
create policy nm_whatsapp_cliques_insert_public on nm_whatsapp_cliques
  for insert to anon, authenticated with check (true);

grant insert on nm_whatsapp_cliques to anon, authenticated;
-- Sem policy de select: leitura agregada so via as funcoes abaixo.

create or replace function nm_whatsapp_cliques_total()
returns bigint
language sql security definer set search_path = public
as $$ select count(*) from nm_whatsapp_cliques; $$;
grant execute on function nm_whatsapp_cliques_total() to anon, authenticated;

create or replace function nm_whatsapp_cliques_top(limit_count int)
returns table(animal_id bigint, nome text, num_catalogo text, categoria text, tipo_marcha text, cliques bigint)
language sql security definer set search_path = public
as $$
  select a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha, count(w.id) as cliques
  from nm_whatsapp_cliques w
  join nm_animais a on a.id = w.animal_id
  group by a.id, a.nome, a.num_catalogo, a.categoria, a.tipo_marcha
  order by cliques desc
  limit limit_count;
$$;
grant execute on function nm_whatsapp_cliques_top(int) to anon, authenticated;
