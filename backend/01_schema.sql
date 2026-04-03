-- ============================================================
-- 01_schema.sql
-- Planificador de Horarios — Metro Riohacha
-- Tablas normalizadas para Supabase PostgreSQL
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Departamentos (puede ya existir)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (puede ya existir — vinculado a auth.users)
-- Schema esperado: id UUID PK (= auth.uid()), department_id UUID, role TEXT
-- VERIFICAR antes de ejecutar:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Catálogo de códigos de turno (200+ códigos)
-- start_time DEFAULT '' para códigos sin hora inicio
CREATE TABLE IF NOT EXISTS shift_codes (
  code TEXT PRIMARY KEY,
  hours INT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  break_minutes INT NOT NULL DEFAULT 0
);

-- Empleados por departamento
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_hours INT NOT NULL CHECK (max_hours IN (36, 42, 44)),
  jefatura BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Catálogo de tareas por departamento
-- group_name: CAJAS | GESTION | PGC | OTROS | AUSENTE
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  color TEXT,
  CONSTRAINT tasks_group_check CHECK (
    group_name IN ('CAJAS', 'GESTION', 'PGC', 'OTROS', 'AUSENTE')
  )
);

-- Entradas de horario (turno asignado por empleado por día)
-- duration: horas numéricas '0'-'9' OR código de ausencia ('C','D','I',etc.)
-- shift_code: referencia suave (soft reference) a shift_codes.code
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT,
  duration TEXT,
  task_id UUID REFERENCES tasks(id),
  shift_code TEXT,
  department_id UUID REFERENCES departments(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Días compensatorios pendientes iniciales por empleado/mes
-- month: formato 'YYYY-MM' (ej: '2025-03')
CREATE TABLE IF NOT EXISTS pending_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  initial_pending INT DEFAULT 0,
  department_id UUID REFERENCES departments(id),
  UNIQUE(employee_id, month)
);

-- Configuración general por departamento (key-value)
-- Ejemplo: key='base_month', value='2025-08'
CREATE TABLE IF NOT EXISTS dept_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(department_id, key)
);

-- ============================================================
-- Trigger: actualiza updated_at automáticamente en schedule_entries
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si ya existe antes de recrear
DROP TRIGGER IF EXISTS schedule_entries_updated_at ON schedule_entries;

CREATE TRIGGER schedule_entries_updated_at
  BEFORE UPDATE ON schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Verificación: correr después de este script
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
-- Esperado: dept_config, departments, employees, pending_days,
--           profiles, schedule_entries, shift_codes, tasks
