-- ============================================================
-- 02_rls_policies.sql
-- Planificador de Horarios — Metro Riohacha
-- Row Level Security por departamento
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================

-- ============================================================
-- Funciones helper de autenticación
-- ============================================================

-- Obtiene el department_id del usuario autenticado desde profiles
CREATE OR REPLACE FUNCTION auth_user_dept_id()
RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica si el usuario tiene rol admin (via app_metadata JWT)
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Habilitar RLS en todas las tablas protegidas
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE dept_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas: employees
-- ============================================================

DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "employees_insert" ON employees
  FOR INSERT WITH CHECK (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "employees_update" ON employees
  FOR UPDATE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "employees_delete" ON employees
  FOR DELETE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

-- ============================================================
-- Políticas: tasks
-- ============================================================

DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

-- ============================================================
-- Políticas: schedule_entries
-- ============================================================

DROP POLICY IF EXISTS "schedule_select" ON schedule_entries;
DROP POLICY IF EXISTS "schedule_insert" ON schedule_entries;
DROP POLICY IF EXISTS "schedule_update" ON schedule_entries;
DROP POLICY IF EXISTS "schedule_delete" ON schedule_entries;

CREATE POLICY "schedule_select" ON schedule_entries
  FOR SELECT USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "schedule_insert" ON schedule_entries
  FOR INSERT WITH CHECK (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "schedule_update" ON schedule_entries
  FOR UPDATE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "schedule_delete" ON schedule_entries
  FOR DELETE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

-- ============================================================
-- Políticas: pending_days
-- ============================================================

DROP POLICY IF EXISTS "pending_days_select" ON pending_days;
DROP POLICY IF EXISTS "pending_days_insert" ON pending_days;
DROP POLICY IF EXISTS "pending_days_update" ON pending_days;
DROP POLICY IF EXISTS "pending_days_delete" ON pending_days;

CREATE POLICY "pending_days_select" ON pending_days
  FOR SELECT USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "pending_days_insert" ON pending_days
  FOR INSERT WITH CHECK (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "pending_days_update" ON pending_days
  FOR UPDATE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "pending_days_delete" ON pending_days
  FOR DELETE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

-- ============================================================
-- Políticas: dept_config
-- ============================================================

DROP POLICY IF EXISTS "dept_config_select" ON dept_config;
DROP POLICY IF EXISTS "dept_config_insert" ON dept_config;
DROP POLICY IF EXISTS "dept_config_update" ON dept_config;
DROP POLICY IF EXISTS "dept_config_delete" ON dept_config;

CREATE POLICY "dept_config_select" ON dept_config
  FOR SELECT USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "dept_config_insert" ON dept_config
  FOR INSERT WITH CHECK (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "dept_config_update" ON dept_config
  FOR UPDATE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

CREATE POLICY "dept_config_delete" ON dept_config
  FOR DELETE USING (
    auth_is_admin() OR department_id = auth_user_dept_id()
  );

-- ============================================================
-- Verificación
-- ============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
