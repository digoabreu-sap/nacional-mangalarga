-- Cadastro de Haras - alimentado inicialmente com a base ja existente
-- (nm_animais.haras + cidade/uf/expositor mais comuns por haras), editado
-- dai em diante pelo admin (aba Haras). Casa com o animal pelo NOME (mesmo
-- texto livre ja usado em nm_animais.haras - nao muda o schema de
-- nm_animais, so cria o cadastro por cima) - por isso "nome" e unico.

create table if not exists nm_haras (
  id bigserial primary key,
  nome text not null unique,
  cidade text,
  uf text,
  expositor text,
  site_url text,
  instagram_url text,
  telefone text,
  created_at timestamptz not null default now()
);

-- Seed: um haras por nome distinto ja usado em nm_animais, puxando o
-- primeiro cidade/uf/expositor nao vazio encontrado entre os animais dele
-- (podem variar por animal - so um ponto de partida, o admin revisa depois).
insert into nm_haras (nome, cidade, uf, expositor)
select
  a.haras,
  (array_agg(a.cidade) filter (where a.cidade is not null and a.cidade <> ''))[1],
  (array_agg(a.uf) filter (where a.uf is not null and a.uf <> ''))[1],
  (array_agg(a.expositor) filter (where a.expositor is not null and a.expositor <> ''))[1]
from nm_animais a
where a.haras is not null and a.haras <> ''
group by a.haras
on conflict (nome) do nothing;

alter table nm_haras enable row level security;
-- RLS ligado e sem policies: leitura/escrita so pelas funcoes abaixo.

create or replace function nm_get_haras_by_nome(p_nome text)
returns nm_haras
language sql security definer set search_path = public
as $$ select * from nm_haras where lower(nome) = lower(p_nome) limit 1; $$;
grant execute on function nm_get_haras_by_nome(text) to anon, authenticated;

create or replace function nm_admin_list_haras()
returns setof nm_haras
language sql security definer set search_path = public
as $$ select * from nm_haras order by nome; $$;
grant execute on function nm_admin_list_haras() to anon, authenticated;

create or replace function nm_admin_upsert_haras(
  p_id bigint, p_nome text, p_cidade text, p_uf text, p_expositor text,
  p_site_url text, p_instagram_url text, p_telefone text
)
returns nm_haras
language plpgsql security definer set search_path = public
as $$
declare
  v_result nm_haras;
begin
  if p_id is null then
    insert into nm_haras (nome, cidade, uf, expositor, site_url, instagram_url, telefone)
    values (p_nome, p_cidade, p_uf, p_expositor, p_site_url, p_instagram_url, p_telefone)
    returning * into v_result;
  else
    update nm_haras set
      nome = coalesce(p_nome, nome),
      cidade = p_cidade, uf = p_uf, expositor = p_expositor,
      site_url = p_site_url, instagram_url = p_instagram_url, telefone = p_telefone
    where id = p_id
    returning * into v_result;
  end if;
  return v_result;
end;
$$;
grant execute on function nm_admin_upsert_haras(bigint, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function nm_admin_delete_haras(p_id bigint)
returns void
language sql security definer set search_path = public
as $$ delete from nm_haras where id = p_id; $$;
grant execute on function nm_admin_delete_haras(bigint) to anon, authenticated;

-- Pre-preenchimento BEST-EFFORT do Instagram via busca na internet, so
-- pros ~40 haras mais frequentes no catalogo parcial disponivel ate
-- 30/07 (nao cobre a base completa, que so existe no banco de producao).
-- Sao "melhor palpite" a partir do nome + cidade/UF (o Instagram bloqueia
-- scraping automatizado, entao nao da pra confirmar contra a bio do
-- perfil) - REVISE pela aba Haras do admin antes de divulgar. So
-- preenche quem ainda estiver com instagram_url vazio (nunca sobrescreve
-- o que o admin ja tiver cadastrado na mao).
update nm_haras set instagram_url = v.instagram_url
from (values
  ('Haras MAR DO SUL', 'https://www.instagram.com/harasmardosul/'),
  ('Haras MISK', 'https://www.instagram.com/harasmisk/'),
  ('Fazenda BENTO VELHO', 'https://www.instagram.com/harasbentovelho/'),
  ('Haras LOTUS SAGRADO', 'https://www.instagram.com/haraslotussagrado/'),
  ('Haras SUCUPIRA', 'https://www.instagram.com/harassucupira/'),
  ('Haras ESCURO', 'https://www.instagram.com/harasescuro/'),
  ('Haras YURI', 'https://www.instagram.com/harasyuri/'),
  ('Haras MONTEIRO', 'https://www.instagram.com/harasmonteiro/'),
  ('Haras MORADA NOVA', 'https://www.instagram.com/harasmoradanovaoficial/'),
  ('Haras TRÊS CORAÇÕES', 'https://www.instagram.com/harastrescoracoes/'),
  ('Haras ARJ', 'https://www.instagram.com/harasarj/'),
  ('Haras DA PIL', 'https://www.instagram.com/harasdapil/'),
  ('Haras BAVÁRIA', 'https://www.instagram.com/harasbavaria/'),
  ('Haras MURALHA DE PEDRA', 'https://www.instagram.com/harasmuralhadepedra/'),
  ('Haras FBC', 'https://www.instagram.com/harasfbc/'),
  ('Haras PIXAÓ', 'https://www.instagram.com/haraspixao/'),
  ('Fazenda BANDEIRANTE', 'https://www.instagram.com/harasbandeirante/'),
  ('Haras PORTEIRA AZUL', 'https://www.instagram.com/harasporteiraazul/'),
  ('Haras MH2', 'https://www.instagram.com/harasmh2/'),
  ('Haras TANDY', 'https://www.instagram.com/haras_tandy/'),
  ('Haras TONHO', 'https://www.instagram.com/harastonho/'),
  ('Haras LIMEIRA DA FLOR', 'https://www.instagram.com/haraslimeiradaflor/'),
  ('Fazenda RODEIO GAÚCHO', 'https://www.instagram.com/harasrodeio/'),
  ('Haras TERRA DO CACAU', 'https://www.instagram.com/harasterradocacau/'),
  ('Agropecuária LUEKIM', 'https://www.instagram.com/haras_luekim/'),
  ('Haras FORUM', 'https://www.instagram.com/harasforumoficial/'),
  ('Fazenda SANTA ESMERALDA', 'https://www.instagram.com/harassantaesmeralda_mm/'),
  ('Haras RANCHO DO ALTO', 'https://www.instagram.com/ranchodoalto_/'),
  ('Haras SLIM', 'https://instagram.com/haras_slim'),
  ('Haras CABURÉ', 'https://instagram.com/haras.cabure'),
  ('Haras DA ILHA', 'https://instagram.com/harasdailha'),
  ('Haras GADU', 'https://instagram.com/haras_gadu'),
  ('Haras SERRA BELA', 'https://instagram.com/harasserrabela'),
  ('Haras MS', 'https://instagram.com/harasmspernambuco'),
  ('Fazenda HARAS VJR', 'https://instagram.com/haras.vjr'),
  ('Fazenda MORRO ALTO', 'https://instagram.com/fazendamorroalto'),
  ('Haras FORTALEZA FARACO', 'https://instagram.com/harasfortalezafaracooficial'),
  ('Haras NANDO COSTA', 'https://instagram.com/haras.nandocosta'),
  ('Haras LUCCHESE', 'https://instagram.com/haraslucchese'),
  ('Haras ALCATRUZ', 'https://instagram.com/haras_alcatruz'),
  ('Haras LUA DE PRATA', 'https://instagram.com/harasluadeprata'),
  ('Haras NA ROÇA', 'https://instagram.com/harasnaroca')
) as v(nome, instagram_url)
where lower(nm_haras.nome) = lower(v.nome) and nm_haras.instagram_url is null;
