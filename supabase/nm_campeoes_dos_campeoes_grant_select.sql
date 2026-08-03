-- A pagina de Campeonatos agora le nm_campeoes_dos_campeoes direto (pra
-- contar quantos animais cada um dos 10 campeonatos ja tem), nao so via
-- RPC - garante que o anon consegue ler a tabela (select simples, sem
-- dado sensivel - so numero de catalogo/tipo/ordem).
grant select on nm_campeoes_dos_campeoes to anon, authenticated;
