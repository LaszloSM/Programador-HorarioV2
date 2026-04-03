# Backend — Base de Datos Supabase

## Qué es esto

Esta carpeta contiene los scripts SQL que configuran la base de datos del **Planificador de Horarios de Metro Riohacha** en Supabase (PostgreSQL).

Cada archivo debe ejecutarse manualmente en el **Editor SQL de Supabase**, en el orden indicado. Los scripts crean las tablas, políticas de seguridad, funciones, datos iniciales y, opcionalmente, migran datos legados desde el almacenamiento JSON anterior (`app_state`).

---

## Prerequisitos

- Tener acceso al proyecto en [Supabase](https://supabase.com) con permisos de administrador.
- Abrir el **Editor SQL** desde el panel lateral: `SQL Editor > New query`.
- No es necesario instalar ninguna herramienta local; todo se ejecuta directamente en el navegador.

---

## Orden de ejecución

Ejecuta los archivos **en el orden de la tabla**. No omitas pasos obligatorios ni alteres el orden, ya que cada script puede depender de objetos creados por el anterior.

| # | Archivo | Descripción | Obligatorio |
|---|---------|-------------|-------------|
| 1 | `01_schema.sql` | Crea todas las tablas normalizadas: `departments`, `profiles`, `shift_codes`, `employees`, `tasks`, `schedule_entries`, `pending_days`, `dept_config` | SI |
| 2 | `02_rls_policies.sql` | Habilita Row Level Security (RLS) y define las políticas de acceso por departamento | SI |
| 3 | `03_functions.sql` | Crea el trigger `update_updated_at()` que mantiene actualizada la columna `updated_at` en todas las tablas | SI |
| 4 | `04_seed_shift_codes.sql` | Inserta los 200+ códigos de turno predefinidos en la tabla `shift_codes` | SI |
| 5 | `05_migration.sql` | Migra datos existentes desde el campo JSON `app_state` hacia las tablas normalizadas | OPCIONAL |

---

## Advertencias importantes

> **El orden es critico.** Ejecutar los scripts fuera de orden provocara errores de referencias a tablas o funciones inexistentes. Siempre sigue la secuencia 01 → 02 → 03 → 04 y, solo si aplica, 05.

> **`05_migration.sql` es opcional.** Ejecuta este script UNICAMENTE si tienes datos previos almacenados en el campo JSON `app_state` que necesitas trasladar a las nuevas tablas normalizadas. Si el proyecto es nuevo o no hay datos legados, omite este paso por completo.

> **No ejecutes el script de migracion mas de una vez.** Hacerlo podria duplicar registros. Si necesitas repetirlo, limpia primero las tablas destino o ajusta el script para manejar duplicados.

> **Haz una copia de seguridad** antes de ejecutar `05_migration.sql` si tienes datos en produccion que no quieres perder.

---

## Verificacion

Despues de ejecutar cada script, usa las siguientes queries en el Editor SQL para confirmar que el paso funciono correctamente.

### Despues de `01_schema.sql` — Verificar que las tablas existen

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'departments', 'profiles', 'shift_codes', 'employees',
    'tasks', 'schedule_entries', 'pending_days', 'dept_config'
  )
ORDER BY table_name;
```

Debes ver las 8 tablas listadas en el resultado.

---

### Despues de `02_rls_policies.sql` — Verificar que RLS esta habilitado

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'departments', 'profiles', 'shift_codes', 'employees',
    'tasks', 'schedule_entries', 'pending_days', 'dept_config'
  )
ORDER BY tablename;
```

La columna `rowsecurity` debe mostrar `true` en todas las tablas.

Para ver las politicas creadas:

```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

### Despues de `03_functions.sql` — Verificar que el trigger existe

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_updated_at';
```

Debe devolver una fila con `routine_type = 'FUNCTION'`.

Para ver los triggers asociados:

```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

### Despues de `04_seed_shift_codes.sql` — Verificar los codigos de turno

```sql
SELECT COUNT(*) AS total_codigos FROM shift_codes;
```

El resultado debe ser 200 o mas filas.

Para ver una muestra:

```sql
SELECT code, label, color
FROM shift_codes
ORDER BY code
LIMIT 10;
```

---

### Despues de `05_migration.sql` (opcional) — Verificar la migracion

```sql
-- Contar empleados migrados
SELECT COUNT(*) AS empleados FROM employees;

-- Contar entradas de horario migradas
SELECT COUNT(*) AS entradas FROM schedule_entries;

-- Verificar que no hay empleados sin departamento asignado
SELECT COUNT(*) AS empleados_sin_departamento
FROM employees
WHERE department_id IS NULL;
```

El ultimo query debe devolver `0`.
