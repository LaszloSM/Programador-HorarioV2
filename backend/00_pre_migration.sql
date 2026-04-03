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
