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
 * Exports monthly summary to Excel (.xlsx) using SheetJS (xlsx) — browser-compatible.
 * Sheet 1: "Malla_Mensual"   — monthly schedule grid
 * Sheet 2: "Compensatorios"  — compensation table
 * Sheet 3: "Programacion"    — per-day detail with autofilter
 */
export function exportToExcel(year, month, summaryData, globalSchedule, config) {
  import('xlsx').then(mod => {
    const XLSX = mod.default || mod

    const { rows, dayCounts, totalPend, totalClosure, daysInMonth } = summaryData
    const yearStr  = String(year).padStart(4, '0')
    const monthStr = String(month).padStart(2, '0')
    const monthLabel = new Date(year, month - 1, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      .toUpperCase()

    const wb = XLSX.utils.book_new()


    // ===================================================
    // SHEET 1 — Malla Mensual
    // ===================================================
    {
      const aoa = []

      // Title row
      const titleRow = [`MALLA MENSUAL — ${monthLabel}`]
      aoa.push(titleRow)

      // Header row: Nombre | Poliv. | Pend. | 01…31 | Saldo
      const hdr = ['Nombre', 'Poliv.', 'Pend.']
      for (let d = 1; d <= daysInMonth; d++) {
        const wd = new Date(year, month - 1, d)
          .toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 2).toUpperCase()
        hdr.push(`${wd}\n${String(d).padStart(2, '0')}`)
      }
      hdr.push('Saldo')
      aoa.push(hdr)

      // Employee rows
      rows.forEach(row => {
        const r = [row.emp, `${row.poliv}%`, row.pend]
        row.codes.forEach(code => r.push(code === '0' ? '' : code))
        r.push(row.closure)
        aoa.push(r)
      })

      // Total row
      const tot = ['TOTAL', '', totalPend]
      dayCounts.forEach(c => tot.push(c || ''))
      tot.push(totalClosure)
      aoa.push(tot)

      const ws = XLSX.utils.aoa_to_sheet(aoa)

      // Column widths
      const colW = [{ wch: 24 }, { wch: 7 }, { wch: 6 }]
      for (let i = 0; i < daysInMonth; i++) colW.push({ wch: 4 })
      colW.push({ wch: 7 })
      ws['!cols'] = colW

      // Merge title across all columns
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 + daysInMonth } }]

      // AutoFilter on header row
      ws['!autofilter'] = { ref: `A2:${XLSX.utils.encode_col(3 + daysInMonth)}2` }

      XLSX.utils.book_append_sheet(wb, ws, 'Malla_Mensual')
    }

    // ===================================================
    // SHEET 2 — Compensatorios
    // ===================================================
    {
      const aoa = []
      aoa.push([`COMPENSATORIOS ${monthLabel}`])
      aoa.push(['NOMBRE', 'SALDO', '# CAUSADOS', 'FECHAS CAUSADAS', '# PAGADOS', 'FECHAS PAGADAS', '# PENDIENTE'])

      rows.forEach(row => {
        aoa.push([
          row.emp,
          row.pend,
          row.caused > 0 ? row.caused : 0,
          row.causedStr || '',
          row.paid > 0 ? row.paid : 0,
          row.paidStr || '',
          row.closure,
        ])
      })

      aoa.push(['TOTAL COMPENSATORIOS', '', '', '', '', '', totalClosure])

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 10 }]
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: rows.length + 2, c: 0 }, e: { r: rows.length + 2, c: 5 } },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Compensatorios')
    }

    // ===================================================
    // SHEET 3 — Programacion (detail per day)
    // ===================================================
    {
      const aoa = []
      aoa.push(['PROGRAMACION DE HORARIOS'])
      aoa.push(['Fecha', 'Empleado', 'Cod Tur', 'H. Entrada', 'H. Salida', 'Duración', 'Tarea'])

      if (globalSchedule && config) {
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
          const fechaStr = new Date(year, month - 1, d)
            .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

          config.employees.forEach(emp => {
            const entry = globalSchedule[emp.name]?.[ds]
            if (!entry || (!entry.duration && !entry.startTime && !entry.code)) return

            const isAbs = entry.duration && absenceCodes.includes(entry.duration)
            if (isAbs) {
              const label    = absenceLabels[entry.duration] ?? entry.duration
              const durHours = { 36: 6, 42: 7, 44: 8 }[emp.maxHours] ?? 8
              aoa.push([fechaStr, emp.name, entry.duration, '', '', `${label} ${durHours}H`, 'Ausente'])
            } else {
              const codeInfo  = entry.code ? SHIFT_CODE_INFO[entry.code] : null
              const hours     = codeInfo ? codeInfo.hours : (parseInt(entry.duration) || 0)
              const startTime = entry.startTime || (codeInfo ? codeInfo.start : '')
              const endTime   = startTime && hours > 0
                ? computeEndTimeWithMargin(startTime, hours, emp.jefatura ?? false)
                : ''
              aoa.push([
                fechaStr, emp.name,
                entry.code || entry.duration || '',
                startTime, endTime,
                hours > 0 ? `${hours}h` : '',
                entry.task || '',
              ])
            }
          })
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 15 }, { wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 20 }]
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]
      ws['!autofilter'] = { ref: 'A2:G2' }
      XLSX.utils.book_append_sheet(wb, ws, 'Programacion')
    }

    // Download
    XLSX.writeFile(wb, `Resumen_${yearStr}-${monthStr}.xlsx`)
  }).catch(err => {
    console.error('Error exportando Excel:', err)
    alert('Error al exportar. Revisa la consola.')
  })
}
