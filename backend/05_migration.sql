-- ============================================================
-- 05_migration.sql
-- Planificador de Horarios — Metro Riohacha
-- Migración desde app_state (key-value JSON) → tablas normalizadas
-- EJECUTAR SOLO UNA VEZ y solo si hay datos en app_state a migrar
-- Prerequisito: haber ejecutado 01_schema.sql, 02_rls_policies.sql,
--               03_functions.sql, 04_seed_shift_codes.sql
-- ============================================================

-- ADVERTENCIA: Este script itera todos los departamentos en app_state
-- y migra sus datos. Usar ON CONFLICT DO NOTHING para idempotencia.
-- Si ya ejecutaste antes, no duplicará datos.

-- Verificar que app_state tiene datos antes de migrar
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app_state WHERE key = 'plannerConfigV1';
  IF v_count = 0 THEN
    RAISE NOTICE 'No hay datos en app_state con key plannerConfigV1. Migración omitida.';
    RETURN;
  END IF;
  RAISE NOTICE 'Encontrados % registros de configuración para migrar.', v_count;
END $$;

-- ============================================================
-- Migración principal
-- ============================================================
DO $$
DECLARE
  v_dept_id UUID;
  v_config JSONB;
  v_schedule JSONB;
  v_emp_name TEXT;
  v_emp_id UUID;
  v_date TEXT;
  v_entry JSONB;
  v_task_id UUID;
  v_month TEXT;
  v_pending_val INT;
  v_jefatura BOOLEAN;
  v_max_hours INT;
BEGIN

  -- Iterar por cada departamento con configuración en app_state
  FOR v_dept_id IN
    SELECT DISTINCT department_id
    FROM app_state
    WHERE key = 'plannerConfigV1'
      AND department_id IS NOT NULL
  LOOP

    RAISE NOTICE 'Procesando departamento: %', v_dept_id;

    -- Cargar configuración del departamento
    SELECT value::JSONB INTO v_config
    FROM app_state
    WHERE key = 'plannerConfigV1'
      AND department_id = v_dept_id;

    IF v_config IS NULL THEN
      RAISE NOTICE 'Config nula para dept %, omitiendo.', v_dept_id;
      CONTINUE;
    END IF;

    -- ---- Insertar tareas ----
    INSERT INTO tasks (department_id, name, group_name, color)
    SELECT
      v_dept_id,
      t->>'name',
      t->>'group',
      v_config->'groupColors'->>(t->>'group')
    FROM jsonb_array_elements(v_config->'tasks') t
    WHERE t->>'name' IS NOT NULL
      AND t->>'group' IN ('CAJAS', 'GESTION', 'PGC', 'OTROS', 'AUSENTE')
    ON CONFLICT DO NOTHING;

    -- ---- Insertar empleados ----
    -- NOTA: max_hours está en employeeMaxHours map (NO dentro del array employees)
    FOR v_emp_name IN
      SELECT jsonb_array_elements(v_config->'employees')->>'name'
    LOOP
      IF v_emp_name IS NULL OR v_emp_name = '' THEN CONTINUE; END IF;

      -- Extraer max_hours del mapa separado
      v_max_hours := COALESCE(
        (v_config->'employeeMaxHours'->>v_emp_name)::INT,
        44
      );

      -- Validar que max_hours sea 36, 42 o 44
      IF v_max_hours NOT IN (36, 42, 44) THEN
        v_max_hours := 44;
      END IF;

      -- Extraer jefatura del array employees
      SELECT COALESCE(
        (e->>'jefatura')::BOOLEAN,
        false
      ) INTO v_jefatura
      FROM jsonb_array_elements(v_config->'employees') e
      WHERE e->>'name' = v_emp_name
      LIMIT 1;

      INSERT INTO employees (department_id, name, max_hours, jefatura)
      VALUES (v_dept_id, v_emp_name, v_max_hours, COALESCE(v_jefatura, false))
      ON CONFLICT DO NOTHING;

      -- Obtener el ID del empleado (recién insertado o ya existente)
      SELECT id INTO v_emp_id
      FROM employees
      WHERE name = v_emp_name AND department_id = v_dept_id
      LIMIT 1;

      IF v_emp_id IS NULL THEN CONTINUE; END IF;

      -- ---- Insertar pending_days para este empleado ----
      -- initialPending shape: { "empName": { "2025-03": 2 } }
      IF v_config->'initialPending'->v_emp_name IS NOT NULL
         AND jsonb_typeof(v_config->'initialPending'->v_emp_name) = 'object' THEN
        FOR v_month IN
          SELECT jsonb_object_keys(v_config->'initialPending'->v_emp_name)
        LOOP
          v_pending_val := COALESCE(
            (v_config->'initialPending'->v_emp_name->>v_month)::INT,
            0
          );

          INSERT INTO pending_days (employee_id, month, initial_pending, department_id)
          VALUES (v_emp_id, v_month, v_pending_val, v_dept_id)
          ON CONFLICT (employee_id, month) DO NOTHING;
        END LOOP;
      END IF;

    END LOOP; -- fin loop empleados

    -- ---- Migrar schedule entries ----
    SELECT value::JSONB INTO v_schedule
    FROM app_state
    WHERE key = 'globalSchedule'
      AND department_id = v_dept_id;

    IF v_schedule IS NULL THEN
      RAISE NOTICE 'No hay globalSchedule para dept %, omitiendo entradas.', v_dept_id;
      CONTINUE;
    END IF;

    FOR v_emp_name IN SELECT jsonb_object_keys(v_schedule) LOOP

      SELECT id INTO v_emp_id
      FROM employees
      WHERE name = v_emp_name AND department_id = v_dept_id
      LIMIT 1;

      IF v_emp_id IS NULL THEN
        RAISE NOTICE 'Empleado % no encontrado en dept %, omitiendo.', v_emp_name, v_dept_id;
        CONTINUE;
      END IF;

      -- Saltar si el valor del empleado no es un objeto JSON
      IF jsonb_typeof(v_schedule->v_emp_name) <> 'object' THEN
        CONTINUE;
      END IF;

      FOR v_date IN SELECT jsonb_object_keys(v_schedule->v_emp_name) LOOP

        v_entry := v_schedule->v_emp_name->v_date;

        -- Resolver task_id por nombre de tarea
        SELECT id INTO v_task_id
        FROM tasks
        WHERE name = v_entry->>'task' AND department_id = v_dept_id
        LIMIT 1;

        INSERT INTO schedule_entries (
          employee_id, date, start_time, duration,
          task_id, shift_code, department_id
        ) VALUES (
          v_emp_id,
          v_date::DATE,
          NULLIF(v_entry->>'startTime', ''),
          NULLIF(v_entry->>'duration', ''),
          v_task_id,
          NULLIF(v_entry->>'code', ''),
          v_dept_id
        )
        ON CONFLICT (employee_id, date) DO NOTHING;

      END LOOP; -- fin loop fechas
    END LOOP; -- fin loop empleados en schedule

    RAISE NOTICE 'Departamento % procesado correctamente.', v_dept_id;

  END LOOP; -- fin loop departamentos

  RAISE NOTICE 'Migración completada.';

END $$;

-- ============================================================
-- Verificación post-migración
-- ============================================================
-- SELECT
--   d.name AS departamento,
--   COUNT(DISTINCT e.id) AS empleados,
--   COUNT(DISTINCT t.id) AS tareas,
--   COUNT(se.id) AS entradas_horario
-- FROM departments d
-- LEFT JOIN employees e ON e.department_id = d.id
-- LEFT JOIN tasks t ON t.department_id = d.id
-- LEFT JOIN schedule_entries se ON se.department_id = d.id
-- GROUP BY d.name
-- ORDER BY d.name;
