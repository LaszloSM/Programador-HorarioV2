-- ============================================================
-- 03_functions.sql
-- Planificador de Horarios — Metro Riohacha
-- NOTA ARQUITECTURAL: Los cálculos de negocio (computeWeeklyHours,
-- computeWeeklyPoliv, computeMonthlyPoliv, computeEndTimeWithMargin)
-- se mantienen en el frontend (React hooks) para exacta paridad
-- con la lógica JavaScript existente y evitar divergencias.
-- Este archivo solo confirma el trigger update_updated_at.
-- ============================================================

-- Confirmar que el trigger existe (ya creado en 01_schema.sql)
-- Si falla aquí, correr 01_schema.sql primero.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'schedule_entries_updated_at'
  ) THEN
    RAISE EXCEPTION 'Trigger schedule_entries_updated_at no existe. Ejecutar 01_schema.sql primero.';
  END IF;
  RAISE NOTICE 'OK: Trigger schedule_entries_updated_at existe.';
END $$;
