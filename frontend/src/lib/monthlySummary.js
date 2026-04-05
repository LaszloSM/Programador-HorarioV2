/**
 * monthlySummary.js
 * Pure computation for the monthly schedule summary.
 * Ported from app.html computeMonthlySummary (lines 4060-4136).
 */
import { absenceCodes, absenceCodeToAbbr, absenceLabels, isHoliday, SHIFT_CODE_INFO, computeEndTimeWithMargin } from './shiftCodes'

function previousMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

/**
 * Computes full monthly summary data for all employees.
 *
 * @param {number} year
 * @param {number} month  1-12
 * @param {object} globalSchedule  { [empName]: { [dateKey]: entry } }
 * @param {object} config  { employees, tasks, initialPending }
 * @param {string} baseMonth  'YYYY-MM'
 * @param {object} [cache]  internal memoization cache, pass {} on first call
 * @returns {{ rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth }}
 */
export function computeMonthlySummaryData(year, month, globalSchedule, config, baseMonth, cache = {}) {
  const yearStr = String(year).padStart(4, '0')
  const monthStr = String(month).padStart(2, '0')
  const monthKey = `${yearStr}-${monthStr}`

  if (cache[monthKey]) return cache[monthKey]

  // Build taskGroupMap
  const taskGroupMap = {}
  config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })

  const daysInMonth = new Date(year, month, 0).getDate()

  // Resolve initialPendings for this month
  let initialPendings = {}
  if (monthKey === baseMonth) {
    config.employees.forEach(emp => {
      initialPendings[emp.name] = config.initialPending?.[emp.name] ?? 0
    })
  } else {
    const prevKey = previousMonthKey(monthKey)
    if (prevKey < baseMonth) {
      config.employees.forEach(emp => { initialPendings[emp.name] = 0 })
    } else {
      const [prevY, prevM] = prevKey.split('-').map(Number)
      const prevResult = computeMonthlySummaryData(prevY, prevM, globalSchedule, config, baseMonth, cache)
      prevResult.rows.forEach(r => { initialPendings[r.emp] = r.closure })
      // Fill any missing employees
      config.employees.forEach(emp => {
        if (!(emp.name in initialPendings)) initialPendings[emp.name] = 0
      })
    }
  }

  const rows = []
  const dayCounts = new Array(daysInMonth).fill(0)
  let totalPend = 0, totalClosure = 0, totalCaused = 0, totalPaid = 0

  config.employees.forEach(emp => {
    const pendStart = initialPendings[emp.name] ?? 0
    let causeCount = 0, paidCount = 0, cajasCount = 0
    const codes = []
    const causedDates = []
    const paidDates = []

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
      const entry = globalSchedule[emp.name]?.[ds]
      let code = '0'

      if (entry?.duration) {
        const durStr = entry.duration
        const num = parseInt(durStr)
        const isAbsCode = absenceCodes.includes(durStr)

        if (!Number.isNaN(num) && !isAbsCode) {
          // Working shift — categorize by start time
          if (entry.startTime) {
            const [hh, mm] = entry.startTime.split(':').map(Number)
            const minutes = hh * 60 + mm
            code = minutes < 600 ? 'AM' : minutes < 720 ? 'INT' : 'PM'
          } else {
            code = 'T' // turno sin hora
          }
          // Caused: working on a holiday
          if (isHoliday(ds)) {
            causeCount++
            causedDates.push(String(d).padStart(2, '0'))
          }
          // CAJAS polivalencia count
          if (entry.task && taskGroupMap[entry.task] === 'CAJAS') cajasCount++
          // Day coverage count
          dayCounts[d - 1]++
        } else {
          // Absence
          let abbr = durStr
          if (!Number.isNaN(num) && isAbsCode) {
            abbr = absenceCodeToAbbr[durStr] ?? durStr
          }
          code = abbr
          if (abbr === 'C') {
            paidCount++
            paidDates.push(String(d).padStart(2, '0'))
          }
        }
      }

      codes.push(code)
    }

    const closure = pendStart + causeCount - paidCount
    const polivPercent = cajasCount > 0 ? Math.min((cajasCount / 11) * 100, 100) : 0

    // Format date strings as "dd,dd/MM/YYYY"
    const causedStr = causedDates.length
      ? `${causedDates.join(',')}/${monthStr}/${yearStr}`
      : ''
    const paidStr = paidDates.length
      ? `${paidDates.join(',')}/${monthStr}/${yearStr}`
      : ''

    rows.push({ emp: emp.name, pend: pendStart, poliv: Math.round(polivPercent), codes, caused: causeCount, paid: paidCount, closure, causedStr, paidStr })
    totalPend += pendStart
    totalClosure += closure
    totalCaused += causeCount
    totalPaid += paidCount
  })

  const result = { rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth, year, month }
  cache[monthKey] = result
  return result
}

/**
 * Exports monthly summary to Excel (.xlsx).
 * Sheet 1: "Malla_Mensual" — full month grid
 * Sheet 2: "Compensatorios" — compensation table
 * Sheet 3: "Programacion" — legacy per-day-per-employee format
 *
 * @param {number} year
 * @param {number} month
 * @param {object} summaryData  output of computeMonthlySummaryData
 * @param {object} [globalSchedule]  { [empName]: { [dateKey]: entry } }
 * @param {object} [config]  { employees, tasks }
 */
export function exportToExcel(year, month, summaryData, globalSchedule, config) {
  // Dynamic import to avoid SSR issues (xlsx is CJS)
  import('xlsx').then(XLSX => {
    const { rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth } = summaryData
    const yearStr = String(year).padStart(4, '0')
    const monthStr = String(month).padStart(2, '0')
    const monthLabel = new Date(year, month - 1, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      .toUpperCase()

    // ── Sheet 1: Malla Mensual ──────────────────────────────
    const dayHeaders = []
    for (let d = 1; d <= daysInMonth; d++) {
      dayHeaders.push(String(d).padStart(2, '0'))
    }

    const mallaRows = [
      // Title row
      [`MALLA MENSUAL — ${monthLabel}`],
      // Header
      ['Nombre', 'Poliv.', 'Pend.', ...dayHeaders, 'Comp. Cierre'],
      // Employee rows
      ...rows.map(r => [r.emp, `${r.poliv}%`, r.pend, ...r.codes, r.closure]),
      // Total row
      ['TOTAL', '', totalPend, ...dayCounts, totalClosure],
    ]

    // ── Sheet 2: Compensatorios ─────────────────────────────
    const compRows = [
      [`COMPENSATORIOS — ${monthLabel}`],
      ['NOMBRE', 'SALDO', '# DIAS CAUSADOS', 'FECHAS CAUSADAS', '# DIAS PAGADOS', 'FECHAS PAGADAS', '# DIAS PEND'],
      ...rows.map(r => [r.emp, r.pend, r.caused, r.causedStr, r.paid, r.paidStr, r.closure]),
      ['TOTAL COMPENSATORIOS', '', totalCaused, '', totalPaid, '', totalClosure],
    ]

    // ── Sheet 3: Programacion (legacy format) ───────────────
    const progRows = [['PROGRAMACION DE HORARIOS']]
    progRows.push(['Fecha', 'Empleado', 'Cod Tur', 'H. Entrada', 'H. Salida', 'Duración', 'Tarea'])

    if (globalSchedule && config) {
      const empMap = {}
      config.employees.forEach(e => { empMap[e.name] = e })

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
        const dateObj = new Date(year, month - 1, d)
        const fechaStr = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')

        config.employees.forEach(emp => {
          const entry = globalSchedule[emp.name]?.[ds]
          if (!entry) return
          if (!entry.duration && !entry.startTime && !entry.code) return

          const isAbsence = entry.duration && absenceCodes.includes(entry.duration)
          if (isAbsence) {
            const label = absenceLabels[entry.duration] ?? entry.duration
            const absenceHour = { 36: 6, 42: 7, 44: 8 }
            const durHours = absenceHour[emp.maxHours] ?? 8
            progRows.push([fechaStr, emp.name, entry.duration, '', '', `${label} ${durHours}H`, 'Ausente'])
          } else {
            const codeInfo = entry.code ? SHIFT_CODE_INFO[entry.code] : null
            const hours = codeInfo ? codeInfo.hours : (parseInt(entry.duration) || 0)
            const startTime = entry.startTime || (codeInfo ? codeInfo.start : '')
            const isJefatura = emp.jefatura ?? false
            const endTime = startTime && hours > 0
              ? computeEndTimeWithMargin(startTime, hours, isJefatura)
              : ''
            progRows.push([
              fechaStr,
              emp.name,
              entry.code || entry.duration || '',
              startTime,
              endTime,
              hours > 0 ? `${hours}h` : '',
              entry.task || '',
            ])
          }
        })
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mallaRows), 'Malla_Mensual')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(compRows), 'Compensatorios')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(progRows), 'Programacion')
    XLSX.writeFile(wb, `Resumen_${yearStr}-${monthStr}.xlsx`)
  })
}
