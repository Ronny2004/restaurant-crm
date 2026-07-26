# Despliegue a producción

## Estado verificado

La base local y los archivos de migración contienen siete versiones:

1. `20260725175500_esquema_inicial.sql`
2. `20260725203000_fix_handle_new_user.sql`
3. `20260725213000_secure_user_management.sql`
4. `20260725223000_operational_security_transactions.sql`
5. `20260725233000_authentication_user_module.sql`
6. `20260725234000_active_account_rls.sql`
7. `20260726003000_campaigns_module.sql`

La primera es una fotografía del esquema que ya existe en producción. No debe
ejecutarse sobre esa base.

## Orden de publicación

1. Respaldar nuevamente esquema y datos de producción.
2. Confirmar que el repositorio y el lockfile que se desplegarán están
   versionados.
3. Marcar solamente la fotografía inicial como aplicada:

   ```powershell
   npx supabase migration repair 20260725175500 --status applied --linked
   ```

4. Revisar el resultado:

   ```powershell
   npx supabase migration list --linked
   npx supabase db push --linked --dry-run
   ```

   El `dry-run` debe mostrar únicamente las seis migraciones posteriores a la
   fotografía inicial.

5. Aplicar las migraciones pendientes:

   ```powershell
   npx supabase db push --linked
   ```

6. Verificar en producción:

   - creación y login de una cuenta de prueba por rol;
   - cambio de estado de un pedido;
   - edición de artículos;
   - cobro;
   - actualización Realtime;
   - creación y cierre de una campaña;
   - políticas RLS y auditoría.

7. Configurar en Vercel las variables privadas documentadas en
   `env.example.txt` y desplegar Next.js después de la base.

## Importante

No ejecutar `migration repair` para las otras seis versiones antes del push:
esas sí representan cambios que producción todavía no tiene.

No utilizar `db reset` ni ejecutar manualmente
`20260725175500_esquema_inicial.sql` contra producción.
