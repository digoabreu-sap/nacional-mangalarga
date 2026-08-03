-- Correcao pontual (rode SO UMA VEZ): remove os 80 cliques mais recentes
-- registrados pro animal "IRADA DMN DA ILHA", que foram gerados em teste e
-- estao inflando a contagem de cliques dele no Ranking/Analytics.
-- Rodar de novo depois de hoje vai remover cliques reais de visitantes.

delete from nm_analytics
where id in (
  select an.id
  from nm_analytics an
  join nm_animais a on a.id = an.animal_id
  where a.nome ilike 'IRADA DMN DA ILHA'
  order by an.created_at desc
  limit 80
);
