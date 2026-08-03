-- Adiciona os 4 campeonatos do Grande Campeonato Jovem da Raça (Machos e
-- Femeas, MB e MP) na mesma tabela/tela de "Campeoes dos Campeoes" ja
-- criada (nm_campeoes_dos_campeoes.sql). E um campeonato diferente por
-- regulamento (Art. 73-75, Grande Campeonato da Raca, distinto do Campeao
-- dos Campeoes de Marcha do Art. 76), mas o cliente pediu pra gerenciar na
-- mesma lista/tela - so precisa liberar os 2 valores novos de "tipo".
--
-- Roda seguro tanto se nm_campeoes_dos_campeoes.sql ja rodou (ajusta o
-- constraint existente) quanto se ainda nao rodou (cria a tabela ja com o
-- constraint certo).

create table if not exists nm_campeoes_dos_campeoes (
  id bigserial primary key,
  tipo text not null,
  tipo_marcha text not null check (tipo_marcha in ('MB', 'MP')),
  num_catalogo text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (tipo, tipo_marcha, num_catalogo)
);

alter table nm_campeoes_dos_campeoes drop constraint if exists nm_campeoes_dos_campeoes_tipo_check;
alter table nm_campeoes_dos_campeoes add constraint nm_campeoes_dos_campeoes_tipo_check
  check (tipo in ('castrado', 'macho', 'femea', 'grande_jovem_macho', 'grande_jovem_femea'));
