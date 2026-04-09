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

// ─── Date helper ──────────────────────────────────────────────────────────────
const MONTH_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatDateEs(year, month, day) {
  return `${String(day).padStart(2, '0')}-${MONTH_ABBR[month - 1]}-${year}`
}

// ─── Style helpers for ExcelJS ───────────────────────────────────────────────
const AZUL       = 'FF0E3B75'
const AZUL_50    = 'FFE8F0FB'
const BORDE      = 'FFC5D6E3'
const WHITE      = 'FFFFFFFF'
const GRAY_ROW   = 'FFF5F8FC'

const THIN_BORDER = {
  top:    { style: 'thin', color: { argb: BORDE } },
  left:   { style: 'thin', color: { argb: BORDE } },
  bottom: { style: 'thin', color: { argb: BORDE } },
  right:  { style: 'thin', color: { argb: BORDE } },
}

function applyHeaderStyle(cell) {
  cell.font      = { bold: true, color: { argb: WHITE }, size: 11, name: 'Calibri' }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
  cell.border    = {
    top:    { style: 'medium', color: { argb: AZUL } },
    left:   { style: 'thin',   color: { argb: AZUL } },
    bottom: { style: 'medium', color: { argb: AZUL } },
    right:  { style: 'thin',   color: { argb: AZUL } },
  }
}

function applyTitleStyle(cell) {
  cell.font      = { bold: true, size: 13, color: { argb: AZUL }, name: 'Calibri' }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function applyDataStyle(cell, rowIndex) {
  const even = rowIndex % 2 === 0
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? GRAY_ROW : WHITE } }
  cell.border = THIN_BORDER
  cell.font   = { name: 'Calibri', size: 10 }
  cell.alignment = { vertical: 'middle' }
}

function applyTotalStyle(cell) {
  cell.font   = { bold: true, name: 'Calibri', size: 10, color: { argb: AZUL } }
  cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_50 } }
  cell.border = {
    top:    { style: 'medium', color: { argb: AZUL } },
    left:   { style: 'thin',   color: { argb: BORDE } },
    bottom: { style: 'medium', color: { argb: AZUL } },
    right:  { style: 'thin',   color: { argb: BORDE } },
  }
}

/**
 * Exports monthly summary to Excel (.xlsx) using ExcelJS — browser-compatible.
 * Sheet 1: "Malla_Mensual"   — monthly schedule grid
 * Sheet 2: "Compensatorios"  — compensation table
 * Sheet 3: "Programacion"    — per-day detail with autofilter
 */
export function exportToExcel(year, month, summaryData, globalSchedule, config) {
  import('exceljs').then(mod => {
    const ExcelJS = mod.default || mod
    _buildAndDownload(ExcelJS, year, month, summaryData, globalSchedule, config)
      .catch(err => {
        console.error('Error exportando Excel:', err)
        alert('Error al exportar. Revisa la consola.')
      })
  }).catch(err => {
    console.error('Error cargando ExcelJS:', err)
    alert('Error al exportar. Revisa la consola.')
  })
}

async function _buildAndDownload(ExcelJS, year, month, summaryData, globalSchedule, config) {
  const { rows, dayCounts, totalPend, totalClosure, daysInMonth } = summaryData
  const yearStr  = String(year).padStart(4, '0')
  const monthStr = String(month).padStart(2, '0')
  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Programador Horarios'
  wb.created = new Date()

  // ===================================================
  // SHEET 1 — Malla Mensual
  // ===================================================
  {
    const ws = wb.addWorksheet('Malla_Mensual')

    const totalCols = 3 + daysInMonth + 1 // Nombre + Poliv + Pend + days + Saldo

    // Row 1 — Title
    ws.addRow([`MALLA MENSUAL — ${monthLabel}`])
    ws.mergeCells(1, 1, 1, totalCols)
    applyTitleStyle(ws.getCell(1, 1))
    ws.getRow(1).height = 22

    // Row 2 — Headers
    const dayHeaders = []
    for (let d = 1; d <= daysInMonth; d++) {
      const wd = new Date(year, month - 1, d)
        .toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 2).toUpperCase()
      dayHeaders.push(`${wd}\n${String(d).padStart(2, '0')}`)
    }
    const hdrRow = ws.addRow(['Nombre', 'Poliv.', 'Pend.', ...dayHeaders, 'Saldo'])
    hdrRow.height = 30
    hdrRow.eachCell({ includeEmpty: true }, cell => applyHeaderStyle(cell))

    // Column widths
    ws.getColumn(1).width = 24
    ws.getColumn(2).width = 7
    ws.getColumn(3).width = 6
    for (let i = 0; i < daysInMonth; i++) ws.getColumn(4 + i).width = 4.5
    ws.getColumn(4 + daysInMonth).width = 7

    // Autofilter
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } }

    // Employee rows
    rows.forEach((row, idx) => {
      const data = [row.emp, `${row.poliv}%`, row.pend]
      row.codes.forEach(code => data.push(code === '0' ? '' : code))
      data.push(row.closure)
      const wsRow = ws.addRow(data)
      wsRow.eachCell({ includeEmpty: true }, cell => applyDataStyle(cell, idx))
    })

    // Total row
    const totData = ['TOTAL', '', totalPend]
    dayCounts.forEach(c => totData.push(c || ''))
    totData.push(totalClosure)
    const totRow = ws.addRow(totData)
    totRow.eachCell({ includeEmpty: true }, cell => applyTotalStyle(cell))

    // Freeze header rows
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
  }

  // ===================================================
  // SHEET 2 — Compensatorios
  // ===================================================
  {
    const ws = wb.addWorksheet('Compensatorios')
    const totalCols = 7

    // Title
    ws.addRow([`COMPENSATORIOS ${monthLabel}`])
    ws.mergeCells(1, 1, 1, totalCols)
    applyTitleStyle(ws.getCell(1, 1))
    ws.getRow(1).height = 22

    // Headers
    const hdrRow = ws.addRow(['NOMBRE', 'SALDO', '# CAUSADOS', 'FECHAS CAUSADAS', '# PAGADOS', 'FECHAS PAGADAS', '# PENDIENTE'])
    hdrRow.height = 22
    hdrRow.eachCell({ includeEmpty: true }, cell => applyHeaderStyle(cell))

    // Column widths
    ws.getColumn(1).width = 24
    ws.getColumn(2).width = 8
    ws.getColumn(3).width = 12
    ws.getColumn(4).width = 30
    ws.getColumn(5).width = 12
    ws.getColumn(6).width = 30
    ws.getColumn(7).width = 12

    // Data rows
    rows.forEach((row, idx) => {
      const wsRow = ws.addRow([
        row.emp,
        row.pend,
        row.caused > 0 ? row.caused : 0,
        row.causedStr || '',
        row.paid > 0 ? row.paid : 0,
        row.paidStr || '',
        row.closure,
      ])
      wsRow.eachCell({ includeEmpty: true }, cell => applyDataStyle(cell, idx))
    })

    // Total row
    const totRow = ws.addRow(['TOTAL COMPENSATORIOS', '', '', '', '', '', totalClosure])
    ws.mergeCells(rows.length + 3, 1, rows.length + 3, 6)
    totRow.eachCell({ includeEmpty: true }, cell => applyTotalStyle(cell))
  }

  // ===================================================
  // SHEET 3 — Programacion (detail per day)
  // ===================================================
  {
    const ws = wb.addWorksheet('Programacion')
    const totalCols = 7

    // Title
    ws.addRow(['PROGRAMACION DE HORARIOS'])
    ws.mergeCells(1, 1, 1, totalCols)
    applyTitleStyle(ws.getCell(1, 1))
    ws.getRow(1).height = 22

    // Headers
    const hdrRow = ws.addRow(['Fecha', 'Empleado', 'Cod Turno', 'H. Entrada', 'H. Salida', 'Duración', 'Tarea'])
    hdrRow.height = 22
    hdrRow.eachCell({ includeEmpty: true }, cell => applyHeaderStyle(cell))

    // Column widths
    ws.getColumn(1).width = 14
    ws.getColumn(2).width = 24
    ws.getColumn(3).width = 11
    ws.getColumn(4).width = 16
    ws.getColumn(5).width = 11
    ws.getColumn(6).width = 11
    ws.getColumn(7).width = 18

    // Autofilter
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } }

    let dataRowIdx = 0

    if (globalSchedule && config) {
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
        const fechaStr = formatDateEs(year, month, d)

        config.employees.forEach(emp => {
          const entry = globalSchedule[emp.name]?.[ds]
          if (!entry || (!entry.duration && !entry.startTime && !entry.code)) return

          const isAbs = entry.duration && absenceCodes.includes(entry.duration)
          let rowData
          if (isAbs) {
            const label    = absenceLabels[entry.duration] ?? entry.duration
            const durHours = { 36: 6, 42: 7, 44: 8 }[emp.maxHours] ?? 8
            rowData = [fechaStr, emp.name, entry.duration, `${label} ${durHours}H`, '', `${durHours}h`, 'Ausente']
          } else {
            const codeInfo  = entry.code ? SHIFT_CODE_INFO[entry.code] : null
            const hours     = codeInfo ? codeInfo.hours : (parseInt(entry.duration) || 0)
            const startTime = entry.startTime || (codeInfo ? codeInfo.start : '')
            const endTime   = startTime && hours > 0
              ? computeEndTimeWithMargin(startTime, hours, emp.jefatura ?? false)
              : ''
            rowData = [
              fechaStr, emp.name,
              entry.code || entry.duration || '',
              startTime, endTime,
              hours > 0 ? `${hours}h` : '',
              entry.task || '',
            ]
          }

          const wsRow = ws.addRow(rowData)
          wsRow.eachCell({ includeEmpty: true }, cell => applyDataStyle(cell, dataRowIdx))
          dataRowIdx++
        })
      }
    }

    // Freeze header rows
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
  }

  // ─── Download ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Resumen_${yearStr}-${monthStr}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
