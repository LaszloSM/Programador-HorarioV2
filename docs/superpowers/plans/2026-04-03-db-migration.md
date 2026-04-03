# DB Migration — Tablas Legacy a Esquema UUID Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear `backend/00_pre_migration.sql` y ejecutar los 6 scripts en Supabase para migrar el esquema legacy (bigint) al nuevo esquema UUID sin perder datos.

**Architecture:** Un único archivo SQL nuevo (`00_pre_migration.sql`) renombra las tablas conflictivas a versiones `_v1` usando guards `IF EXISTS`. Después los scripts `01`–`05` existentes corren sin conflictos y el `05_migration.sql` migra los datos desde `app_state` (JSON) hacia las nuevas tablas UUID normalizadas.

**Tech Stack:** PostgreSQL / Supabase SQL Editor, scripts SQL existentes en `backend/`

---

## Chunk 1: Crear `00_pre_migration.sql`

**Files:**
- Create: `backend/00_pre_migration.sql`

- [ ] **Step 1: Crear el archivo `backend/00_pre_migration.sql`**

Contenido completo del archivo:

```sql
-- ============================================================
-- 00_pre_migration.sql
-- Planificador de Horarios — Metro Riohacha
-- EJECUTAR PRIMERO, antes de 01_schema.sql
-- Renombra tablas legacy con esquemas incompatibles a _v1
-- Es idempotente: usa IF EXISTS para no fallar si ya se ejecutó
-- ============================================================

-- employees: bigint id → necesita UUID id + columna jefatura
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees'
  ) THEN
    ALTER TABLE employees RENAME TO employees_v1;
    RAISE NOTICE 'OK: employees renombrada a employees_v1';
  ELSE
    RAISE NOTICE 'SKIP: employees no existe (ya renombrada o nunca existió)';
  END IF;
END $$;

-- tasks: bigint id + group_id FK → necesita UUID id + group_name TEXT
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER TABLE tasks RENAME TO tasks_v1;
    RAISE NOTICE 'OK: tasks renombrada a tasks_v1';
  ELSE
    RAISE NOTICE 'SKIP: tasks no existe (ya renombrada o nunca existió)';
  END IF;
END $$;

-- schedule: tabla legacy, el nuevo sistema usa schedule_entries
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule'
  ) THEN
    ALTER TABLE schedule RENAME TO schedule_v1;
    RAISE NOTICE 'OK: schedule renombrada a schedule_v1';
  ELSE
    RAISE NOTICE 'SKIP: schedule no existe (ya renombrada o nunca existió)';
  END IF;
END $$;

-- groups: tabla legacy de grupos, no existe en nuevo esquema
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups'
  ) THEN
    ALTER TABLE groups RENAME TO groups_v1;
    RAISE NOTICE 'OK: groups renombrada a groups_v1';
  ELSE
    RAISE NOTICE 'SKIP: groups no existe (ya renombrada o nunca existió)';
  END IF;
END $$;

-- ============================================================
-- Verificación
-- ============================================================
-- Correr después para confirmar:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('employees','tasks','schedule','groups',
--                     'employees_v1','tasks_v1','schedule_v1','groups_v1')
-- ORDER BY tablename;
-- Esperado: employees_v1, groups_v1, schedule_v1, tasks_v1
-- (sin las versiones sin _v1)
```

- [ ] **Step 2: Verificar el archivo se creó correctamente**

Abrir `backend/00_pre_migration.sql` y confirmar que tiene los 4 bloques `DO $$ BEGIN ... END $$` con sus `IF EXISTS`.

---

## Chunk 2: Ejecutar los scripts en Supabase

> Estos pasos se realizan en el **SQL Editor de Supabase** en orden estricto.
> Abrir el proyecto en https://supabase.com → SQL Editor → New query.
> Copiar y pegar el contenido de cada archivo, ejecutar, confirmar los mensajes `NOTICE` antes de continuar.

- [ ] **Step 3: Ejecutar `00_pre_migration.sql`**

Copiar el contenido de `backend/00_pre_migration.sql` y ejecutar en el SQL Editor.

Salida esperada en los mensajes:
```
NOTICE: OK: employees renombrada a employees_v1
NOTICE: OK: tasks renombrada a tasks_v1
NOTICE: OK: schedule renombrada a schedule_v1
NOTICE: OK: groups renombrada a groups_v1
```

Si algún mensaje dice `SKIP` en lugar de `OK`, significa que esa tabla ya estaba renombrada — es correcto, continuar.

- [ ] **Step 4: Verificar estado de tablas tras `00`**

Ejecutar en SQL Editor:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('employees','tasks','schedule','groups',
                    'employees_v1','tasks_v1','schedule_v1','groups_v1')
ORDER BY tablename;
```

Resultado esperado (4 filas):
```
employees_v1
groups_v1
schedule_v1
tasks_v1
```

Si aparecen las versiones sin `_v1`, el paso anterior no se ejecutó completo. No continuar hasta que el resultado sea correcto.

- [ ] **Step 5: Ejecutar `01_schema.sql`**

Copiar el contenido de `backend/01_schema.sql` y ejecutar.

Verificar éxito:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('employees','tasks','schedule_entries','shift_codes','pending_days','dept_config')
ORDER BY table_name;
```
Esperado: 6 filas con todos esos nombres.

- [ ] **Step 6: Ejecutar `02_rls_policies.sql`**

Copiar el contenido de `backend/02_rls_policies.sql` y ejecutar.

Verificar éxito:
```sql
SELECT tablename, COUNT(*) AS num_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('employees','tasks','schedule_entries','pending_days','dept_config')
GROUP BY tablename
ORDER BY tablename;
```
Esperado: 5 filas, cada una con `num_policies = 4`.

- [ ] **Step 7: Ejecutar `03_functions.sql`**

Copiar el contenido de `backend/03_functions.sql` y ejecutar.

Salida esperada:
```
NOTICE: OK: Trigger schedule_entries_updated_at existe.
```

Si lanza `EXCEPTION`, significa que `01_schema.sql` no se ejecutó correctamente. Volver al Step 5.

- [ ] **Step 8: Ejecutar `04_seed_shift_codes.sql`**

Copiar el contenido de `backend/04_seed_shift_codes.sql` y ejecutar.

**IMPORTANTE:** Este script falla con error de PK si se ejecuta dos veces. Ejecutar solo una vez.

Verificar:
```sql
SELECT COUNT(*) FROM shift_codes;
```
Esperado: `294`

- [ ] **Step 9: Ejecutar `05_migration.sql`**

Copiar el contenido de `backend/05_migration.sql` y ejecutar.

Salida esperada (9 líneas similares a):
```
NOTICE: Encontrados 9 registros de configuración para migrar.
NOTICE: Procesando departamento: d145e238-...
NOTICE: Departamento d145e238-... procesado correctamente.
...
NOTICE: Migración completada.
```

Si un departamento muestra `SKIP` o `nula`, tiene datos incompletos en `app_state` — es esperado y no es un error crítico.

---

## Chunk 3: Verificación final y configuración manual

- [ ] **Step 10: Verificar datos migrados**

```sql
-- Conteo por departamento
SELECT
  d.name AS departamento,
  COUNT(DISTINCT e.id) AS empleados,
  COUNT(DISTINCT t.id) AS tareas,
  COUNT(se.id) AS entradas_horario
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
LEFT JOIN tasks t ON t.department_id = d.id
LEFT JOIN schedule_entries se ON se.department_id = d.id
GROUP BY d.name
ORDER BY d.name;
```

Resultado esperado: los departamentos que tenían datos en `app_state` deben mostrar valores > 0 en `empleados` y `tareas`. Departamentos sin `plannerConfigV1` mostrarán 0.

- [ ] **Step 11: Verificar contra app_state (detecta migración a cero filas)**

```sql
SELECT
  a.department_id,
  d.name,
  (SELECT COUNT(*) FROM employees WHERE department_id = a.department_id) AS emp_nuevos,
  (SELECT COUNT(*) FROM tasks WHERE department_id = a.department_id) AS tasks_nuevos,
  (SELECT COUNT(*) FROM schedule_entries WHERE department_id = a.department_id) AS horario_nuevos
FROM app_state a
JOIN departments d ON d.id = a.department_id
WHERE a.key = 'plannerConfigV1'
ORDER BY d.name;
```

Si algún departamento tiene `emp_nuevos = 0` pero tenía empleados en `plannerConfigV1`, hay un problema en la migración. Revisar el contenido de `app_state` para ese `department_id`.

- [ ] **Step 12: Configurar `dept_config` con `base_month` por departamento**

El `05_migration.sql` no puebla `dept_config`. Insertar manualmente para cada departamento el mes base de compensatorios. Sustituir los UUIDs con los reales de tu BD:

```sql
-- Ver departamentos disponibles
SELECT id, name FROM departments ORDER BY name;

-- Insertar base_month para cada departamento
-- Ejemplo (repetir para cada departamento):
INSERT INTO dept_config (department_id, key, value)
VALUES
  ('<uuid-dept-1>', 'base_month', '2025-08'),
  ('<uuid-dept-2>', 'base_month', '2025-08')
  -- ... continuar para cada departamento
ON CONFLICT (department_id, key) DO UPDATE SET value = EXCLUDED.value;
```

El formato de `base_month` es `YYYY-MM` (ej: `'2025-08'`).

- [ ] **Step 13: Confirmar tablas legacy conservadas**

```sql
SELECT tablename, 
       (SELECT COUNT(*) FROM employees_v1) AS filas
FROM pg_tables WHERE tablename = 'employees_v1' AND schemaname = 'public'
UNION ALL
SELECT tablename, 
       (SELECT COUNT(*) FROM tasks_v1)
FROM pg_tables WHERE tablename = 'tasks_v1' AND schemaname = 'public'
UNION ALL
SELECT tablename, 
       (SELECT COUNT(*) FROM schedule_v1)
FROM pg_tables WHERE tablename = 'schedule_v1' AND schemaname = 'public';
```

Esperado: 3 filas con los conteos originales (25, 13, 697).

---

## Rollback (solo si algo sale muy mal)

Si necesitas revertir después de `00_pre_migration.sql` pero antes de que los datos estén correctos:

```sql
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='employees_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='employees')
  THEN ALTER TABLE employees_v1 RENAME TO employees; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='tasks_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='tasks')
  THEN ALTER TABLE tasks_v1 RENAME TO tasks; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='schedule_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='schedule')
  THEN ALTER TABLE schedule_v1 RENAME TO schedule; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='groups_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='groups')
  THEN ALTER TABLE groups_v1 RENAME TO groups; END IF;
END $$;
```
