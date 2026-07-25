-- Habilita realtime em nm_categoria_atual - a Home escuta mudancas aqui pra
-- mostrar um aviso ("Agora na pista: X") quando o admin troca de categoria
-- com a pagina ja aberta no celular de alguem. Idempotente.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nm_categoria_atual'
  ) then
    alter publication supabase_realtime add table nm_categoria_atual;
  end if;
end $$;
