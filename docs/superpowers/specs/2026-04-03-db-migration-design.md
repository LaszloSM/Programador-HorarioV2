# Diseño: Migración de Esquema DB — Planificador Horarios Metro Riohacha

**Fecha:** 2026-04-03  
**Estado:** Aprobado (rev. 2)

---

## Contexto

La base de datos de Supabase tiene tablas legacy con esquemas incompatibles con el nuevo frontend React. Las tablas `employees` y `tasks` usan IDs `bigint` (secuencia), mientras que el nuevo frontend espera UUIDs. El `01_schema.sql` usa `CREATE TABLE IF NOT EXISTS`, lo que hace que esas tablas no se recreen y el sistema quede en estado inconsistente.

**Datos actuales en Supabase (inventario confirmado):**
- `app_state`: 9 departamentos con `plannerConfigV1` (empleados, tareas, config) y `globalSchedule` (horarios) — **fuente autoritativa**
- `employees` (legacy): 25 registros con ID bigint
- `tasks` (legacy): 13 registros con ID bigint, con FK a `groups`
- `schedule` (legacy): 697 entradas con FK bigint a `employees` y `tasks`
- `groups` (legacy): tabla de grupos de tareas con ID bigint — **confirmada presente en BD**

---

## Objetivo

Ejecutar los scripts `01_schema.sql` → `05_migration.sql` sin errores, preservando todos los datos de producción, y dejando la base de datos en el estado correcto para el frontend React.

---

## Solución

### Archivo nuevo: `backend/00_pre_migration.sql`

Se ejecuta **primero**, antes que cualquier otro script. Renombra las 4 tablas con esquemas incompatibles a versiones `_v1`. Las tablas `departments`, `profiles`, `holidays` y `app_state` **no se modifican**.

Las operaciones DDL de renombrado (ALTER TABLE RENAME) son **auto-commit** en PostgreSQL — no se pueden revertir con un ROLLBACK. Por eso el script usa condicionales: si se ejecuta dos veces (p.ej. tras un fallo parcial), no falla.

```sql
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees')
  THEN ALTER TABLE employees RENAME TO employees_v1; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks')
  THEN ALTER TABLE tasks RENAME TO tasks_v1; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule')
  THEN ALTER TABLE schedule RENAME TO schedule_v1; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups')
  THEN ALTER TABLE groups RENAME TO groups_v1; END IF;
END $$;
```

PostgreSQL actualiza automáticamente las referencias FK internas al renombrar tablas (por OID), por lo que la coherencia referencial entre `schedule_v1`, `employees_v1` y `tasks_v1` se mantiene.

### Tablas que NO se tocan

| Tabla | Razón |
|---|---|
| `departments` | Compatible, tiene los UUID que usa el resto del sistema |
| `profiles` | Compatible, conserva columnas extra (`full_name`, `email`) |
| `holidays` | No existe en nuevo esquema, se deja intacta |
| `app_state` | Fuente de datos para la migración |
| `app_state_history` / `app_state_snapshots` | Historial, se conservan |

### Verificación previa de `profiles`

Antes de ejecutar, confirmar columnas mínimas requeridas:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY column_name;
-- Esperado mínimo: id, department_id, role, created_at
```

---

## Orden de ejecución

**IMPORTANTE:** Los scripts deben ejecutarse estrictamente en este orden. Ejecutar `02` antes que `01` causaría que las políticas RLS apunten a `employees_v1` en lugar de a la nueva tabla UUID.

```
00_pre_migration.sql   ← nuevo (renombrar tablas conflictivas)
01_schema.sql          ← crea tablas nuevas con UUID
02_rls_policies.sql    ← aplica RLS sobre las nuevas tablas
03_functions.sql       ← verifica trigger
04_seed_shift_codes.sql← inserta 294 códigos de turno (NO ejecutar dos veces)
05_migration.sql       ← migra datos desde app_state → nuevas tablas
```

---

## Estado esperado tras la migración

### Tablas nuevas creadas por `01_schema.sql`

| Tabla | Descripción |
|---|---|
| `shift_codes` | 294 códigos de turno (insertados por `04`) |
| `employees` | UUID, con `jefatura`, por departamento |
| `tasks` | UUID, con `group_name` TEXT, por departamento |
| `schedule_entries` | UUID, entradas de horario por empleado/día |
| `pending_days` | Días compensatorios por empleado/mes |
| `dept_config` | Creada vacía — **requiere configuración manual** (ver nota) |

**Nota sobre `dept_config`:** El `05_migration.sql` **no** migra datos a esta tabla. Debe configurarse manualmente después para cada departamento con la clave `base_month` (formato `YYYY-MM`). Ejemplo:
```sql
INSERT INTO dept_config (department_id, key, value)
VALUES ('<uuid-departamento>', 'base_month', '2025-08');
```

### Datos migrados por `05_migration.sql`

Fuente: `app_state` con claves `plannerConfigV1` y `globalSchedule`

- **9 departamentos** procesados (uno omitido si no tiene `plannerConfigV1`)
- Empleados insertados en nueva tabla `employees` (UUID)
- Tareas insertadas en nueva tabla `tasks` (UUID + `group_name`)
- Entradas de horario insertadas en `schedule_entries`
- Días pendientes insertados en `pending_days`

**Idempotencia:** `schedule_entries` y `pending_days` tienen constraints UNIQUE explícitas, por lo que `ON CONFLICT DO NOTHING` funciona correctamente para ellas. Para `employees` y `tasks`, **no existe constraint UNIQUE sobre `(department_id, name)`** en `01_schema.sql`, por lo que una segunda ejecución de `05` insertaría registros duplicados en lugar de omitirlos. Si se necesita reejecutar `05`, limpiar primero:
```sql
DELETE FROM employees WHERE department_id = '<uuid-del-departamento>';
DELETE FROM tasks WHERE department_id = '<uuid-del-departamento>';
```

### Tablas legacy conservadas como backup

| Tabla backup | Datos conservados |
|---|---|
| `employees_v1` | 25 empleados (bigint) |
| `tasks_v1` | 13 tareas (bigint) |
| `schedule_v1` | 697 entradas (bigint) |
| `groups_v1` | Grupos de tareas (bigint) |

---

## Procedimiento de rollback

Si se necesita revertir después de correr `00_pre_migration.sql`:

```sql
-- Revertir renames (solo si las nuevas tablas aún no tienen datos importantes)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees')
  THEN ALTER TABLE employees_v1 RENAME TO employees; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks')
  THEN ALTER TABLE tasks_v1 RENAME TO tasks; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule')
  THEN ALTER TABLE schedule_v1 RENAME TO schedule; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups_v1')
    AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups')
  THEN ALTER TABLE groups_v1 RENAME TO groups; END IF;
END $$;
```

---

## Verificación post-migración

```sql
-- 1. Confirmar datos migrados por departamento
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

-- 2. Comparar con app_state (detecta migración silenciosa a 0 filas)
SELECT
  a.department_id,
  d.name,
  (SELECT COUNT(*) FROM employees WHERE department_id = a.department_id) AS emp_nuevos,
  (SELECT COUNT(*) FROM tasks WHERE department_id = a.department_id) AS tasks_nuevos
FROM app_state a
JOIN departments d ON d.id = a.department_id
WHERE a.key = 'plannerConfigV1'
ORDER BY d.name;

-- 3. Shift codes
SELECT COUNT(*) FROM shift_codes;
-- Esperado: 294
```

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `groups` no existe en BD | Script usa `IF EXISTS`, no falla |
| Script ejecutado dos veces | Cada rename tiene `IF EXISTS` + `AND NOT EXISTS` en rollback |
| `tasks` duplicados si `05` se corre dos veces | Documentado — limpiar `tasks` antes de reejecutar |
| `04_seed_shift_codes.sql` falla con PK violation si se ejecuta dos veces | Ejecutar solo una vez; si se necesita rerun, `DELETE FROM shift_codes` primero |
| Departamento sin `plannerConfigV1` | `05` lo omite con `RAISE NOTICE`, no falla |
| `dept_config` vacía tras migración | Requiere configuración manual post-migración |

---

## Archivos afectados

- **Nuevo:** `backend/00_pre_migration.sql`
- **Sin cambios:** `backend/01_schema.sql` al `05_migration.sql`
- **Sin cambios:** Todo el frontend React

---

*Spec aprobada por usuario el 2026-04-03 — rev. 2 tras spec review*
