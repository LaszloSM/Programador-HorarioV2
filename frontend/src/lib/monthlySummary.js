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
 * Exports monthly summary to Excel (.xlsx) with full formatting via ExcelJS.
 * Sheet 1: "Malla_Mensual" — monthly grid with colors
 * Sheet 2: "Compensatorios" — compensation table
 * Sheet 3: "Programacion" — legacy per-day-per-employee format with autofilter
 */
export function exportToExcel(year, month, summaryData, globalSchedule, config) {
  import(/* @vite-ignore */ 'exceljs').then(mod => {
    const ExcelJS = mod.default || mod
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Programador Metro'
    wb.created = new Date()

    const { rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth } = summaryData
    const yearStr = String(year).padStart(4, '0')
    const monthStr = String(month).padStart(2, '0')
    const monthLabel = new Date(year, month - 1, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      .toUpperCase()

    // ── Palette ────────────────────────────────────────────
    const C = {
      TITLE_BG:   '1F3864', TITLE_FG:   'FFFFFF',
      HEAD_BG:    '2E75B6', HEAD_FG:    'FFFFFF',
      TOTAL_BG:   'C2DDF2',
      WORK_BG:    'EBF3FB',  // AM / PM / INT — light blue
      VAC_BG:     'FFF2CC',  // V — yellow
      DSC_BG:     'EAEAEA',  // D — gray
      CMP_BG:     'FFD7D7',  // C — light pink
      OTH_BG:     'FFE8CC',  // other absences — light orange
      ABS_FG:     'CC0000',  // red text for absences
      WORK_FG:    '003366',
      ALT_BG:     'F0F7FF',
      BORDER:     'BFBFBF',
      HOL_HEAD:   '8B0000',  // festivo column header bg
    }

    const ABSENCE_SET = new Set(['C','D','I','S','V','DF','LC','F','B',
      '268','22443','267','22444','100','22445','289','22446',
      '269','22474','272','273','22475'])

    function codeFill(code) {
      if (!code || code === '0') return null
      if (['AM','PM','INT','T'].includes(code)) return C.WORK_BG
      if (['V','273','22475'].includes(code)) return C.VAC_BG
      if (['D','267','22444'].includes(code)) return C.DSC_BG
      if (['C','268','22443'].includes(code)) return C.CMP_BG
      if (ABSENCE_SET.has(code)) return C.OTH_BG
      return null
    }

    const thinBorder = (color) => ({ style: 'thin', color: { argb: 'FF' + color } })
    const allBorders = (color = C.BORDER) => ({
      top: thinBorder(color), left: thinBorder(color),
      bottom: thinBorder(color), right: thinBorder(color),
    })

    /** Write a styled cell. */
    function sc(ws, row, col, value, {
      bold = false, size = 10, fgColor = '000000', bg = null,
      align = 'center', valign = 'middle', wrap = false,
      borders = true,
    } = {}) {
      const cell = ws.getCell(row, col)
      cell.value = value
      cell.font = { name: 'Calibri', bold, size, color: { argb: 'FF' + fgColor } }
      cell.alignment = { horizontal: align, vertical: valign, wrapText: wrap }
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } }
      if (borders) cell.border = allBorders()
      return cell
    }

    // ===================================================
    // SHEET 1 — Malla Mensual
    // ===================================================
    const ws1 = wb.addWorksheet('Malla_Mensual')
    const totalCols = 3 + daysInMonth + 1

    // Column widths
    ws1.getColumn(1).width = 24
    ws1.getColumn(2).width = 7
    ws1.getColumn(3).width = 6
    for (let c = 4; c <= 3 + daysInMonth; c++) ws1.getColumn(c).width = 4.2
    ws1.getColumn(4 + daysInMonth).width = 8

    // Row 1 — Title
    ws1.mergeCells(1, 1, 1, totalCols)
    const t1 = ws1.getCell(1, 1)
    t1.value = `MALLA MENSUAL — ${monthLabel}`
    t1.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + C.TITLE_FG } }
    t1.alignment = { horizontal: 'center', vertical: 'middle' }
    t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.TITLE_BG } }
    ws1.getRow(1).height = 24

    // Row 2 — Headers (weekday + day number)
    ws1.getRow(2).height = 30
    sc(ws1, 2, 1, 'Nombre',       { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG, align: 'left' })
    sc(ws1, 2, 2, 'Poliv.',       { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG })
    sc(ws1, 2, 3, 'Pend.',        { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG })

    for (let d = 1; d <= daysInMonth; d++) {
      const ds  = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
      const hol = isHoliday(ds)
      const wd  = new Date(year, month - 1, d)
        .toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 2).toUpperCase()
      const cell = ws1.getCell(2, 3 + d)
      cell.value = `${wd}\n${String(d).padStart(2, '0')}`
      cell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: hol ? 'FFFFFFFF' : 'FF' + C.HEAD_FG } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (hol ? C.HOL_HEAD : C.HEAD_BG) } }
      cell.border = allBorders()
    }
    sc(ws1, 2, 4 + daysInMonth, 'Comp.\nCierre', { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG, wrap: true })

    // Employee rows
    rows.forEach((row, idx) => {
      const r  = 3 + idx
      const bg = idx % 2 !== 0 ? C.ALT_BG : null
      ws1.getRow(r).height = 15

      sc(ws1, r, 1, row.emp,        { align: 'left', bg })
      sc(ws1, r, 2, `${row.poliv}%`,{ bg })
      sc(ws1, r, 3, row.pend,       { bg })

      row.codes.forEach((code, i) => {
        const display = code === '0' ? '' : code
        const isAbs   = ABSENCE_SET.has(code)
        const cellBg  = codeFill(code) || bg
        sc(ws1, r, 4 + i, display, {
          size: 8,
          fgColor: isAbs ? C.ABS_FG : C.WORK_FG,
          bold: isAbs,
          bg: cellBg,
        })
      })

      sc(ws1, r, 4 + daysInMonth, row.closure, {
        bold: true,
        fgColor: row.closure < 0 ? C.ABS_FG : C.WORK_FG,
        bg,
      })
    })

    // Total row
    const totR = 3 + rows.length
    ws1.getRow(totR).height = 16
    sc(ws1, totR, 1, 'TOTAL', { bold: true, bg: C.TOTAL_BG, align: 'left' })
    sc(ws1, totR, 2, '',       { bg: C.TOTAL_BG })
    sc(ws1, totR, 3, totalPend,{ bold: true, bg: C.TOTAL_BG })
    dayCounts.forEach((cnt, i) => sc(ws1, totR, 4 + i, cnt || '', { bold: true, bg: C.TOTAL_BG }))
    sc(ws1, totR, 4 + daysInMonth, totalClosure, { bold: true, bg: C.TOTAL_BG })

    // ===================================================
    // SHEET 2 — Compensatorios
    // ===================================================
    const ws2 = wb.addWorksheet('Compensatorios')
    ;[24, 8, 12, 30, 12, 30, 10].forEach((w, i) => { ws2.getColumn(i + 1).width = w })

    ws2.mergeCells(1, 1, 1, 7)
    const t2 = ws2.getCell(1, 1)
    t2.value = `COMPENSATORIOS — ${monthLabel}`
    t2.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF' + C.TITLE_FG } }
    t2.alignment = { horizontal: 'center', vertical: 'middle' }
    t2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.TITLE_BG } }
    ws2.getRow(1).height = 22

    ;['NOMBRE','SALDO','# CAUSADOS','FECHAS CAUSADAS','# PAGADOS','FECHAS PAGADAS','# PENDIENTE']
      .forEach((h, i) => sc(ws2, 2, i + 1, h, { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG, align: i === 0 ? 'left' : 'center' }))
    ws2.getRow(2).height = 18

    rows.forEach((row, idx) => {
      const r  = 3 + idx
      const bg = idx % 2 !== 0 ? C.ALT_BG : null
      sc(ws2, r, 1, row.emp,        { align: 'left', bg })
      sc(ws2, r, 2, row.pend,       { bg })
      sc(ws2, r, 3, row.caused,     { bold: true, fgColor: C.WORK_FG, bg })
      sc(ws2, r, 4, row.causedStr || '', { align: 'left', size: 9, bg })
      sc(ws2, r, 5, row.paid,       { bold: true, fgColor: C.ABS_FG, bg })
      sc(ws2, r, 6, row.paidStr || '',   { align: 'left', size: 9, bg })
      sc(ws2, r, 7, row.closure,    { bold: true, fgColor: row.closure < 0 ? C.ABS_FG : C.WORK_FG, bg })
      ws2.getRow(r).height = 15
    })

    const cTotR = 3 + rows.length
    ws2.mergeCells(cTotR, 1, cTotR, 6)
    sc(ws2, cTotR, 1, 'TOTAL COMPENSATORIOS', { bold: true, bg: C.TOTAL_BG, align: 'left' })
    sc(ws2, cTotR, 7, totalClosure,            { bold: true, bg: C.TOTAL_BG })
    ws2.getRow(cTotR).height = 16

    // ===================================================
    // SHEET 3 — Programacion
    // ===================================================
    const ws3 = wb.addWorksheet('Programacion')
    ;[15, 26, 10, 10, 10, 10, 18].forEach((w, i) => { ws3.getColumn(i + 1).width = w })

    ws3.mergeCells(1, 1, 1, 7)
    const t3 = ws3.getCell(1, 1)
    t3.value = 'PROGRAMACION DE HORARIOS'
    t3.font  = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + C.TITLE_FG } }
    t3.alignment = { horizontal: 'center', vertical: 'middle' }
    t3.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.TITLE_BG } }
    ws3.getRow(1).height = 26

    ;['Fecha','Empleado','Cod Tur','H. Entrada','H. Salida','Duración','Tarea']
      .forEach((h, i) => sc(ws3, 2, i + 1, h, { bold: true, bg: C.HEAD_BG, fgColor: C.HEAD_FG, align: i < 2 ? 'left' : 'center' }))
    ws3.getRow(2).height = 18
    ws3.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 7 } }

    if (globalSchedule && config) {
      let pRow = 3
      for (let d = 1; d <= daysInMonth; d++) {
        const ds  = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
        const hol = isHoliday(ds)
        const fechaStr = new Date(year, month - 1, d)
          .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          .replace(/ /g, '-')

        config.employees.forEach(emp => {
          const entry = globalSchedule[emp.name]?.[ds]
          if (!entry || (!entry.duration && !entry.startTime && !entry.code)) return

          const isAbs = entry.duration && absenceCodes.includes(entry.duration)
          const rowBg = hol ? 'FFF0E0' : (pRow % 2 !== 0 ? C.ALT_BG : null)

          if (isAbs) {
            const label    = absenceLabels[entry.duration] ?? entry.duration
            const durHours = { 36: 6, 42: 7, 44: 8 }[emp.maxHours] ?? 8
            sc(ws3, pRow, 1, fechaStr,                { align: 'left', bold: hol, bg: rowBg })
            sc(ws3, pRow, 2, emp.name,                { align: 'left', bg: rowBg })
            sc(ws3, pRow, 3, entry.duration,          { bg: rowBg })
            sc(ws3, pRow, 4, '',                      { bg: rowBg })
            sc(ws3, pRow, 5, '',                      { bg: rowBg })
            sc(ws3, pRow, 6, `${label} ${durHours}H`, { fgColor: C.ABS_FG, bg: rowBg })
            sc(ws3, pRow, 7, 'Ausente',               { align: 'left', fgColor: C.ABS_FG, bg: rowBg })
          } else {
            const codeInfo  = entry.code ? SHIFT_CODE_INFO[entry.code] : null
            const hours     = codeInfo ? codeInfo.hours : (parseInt(entry.duration) || 0)
            const startTime = entry.startTime || (codeInfo ? codeInfo.start : '')
            const endTime   = startTime && hours > 0
              ? computeEndTimeWithMargin(startTime, hours, emp.jefatura ?? false)
              : ''
            sc(ws3, pRow, 1, fechaStr,                        { align: 'left', bold: hol, bg: rowBg })
            sc(ws3, pRow, 2, emp.name,                        { align: 'left', bg: rowBg })
            sc(ws3, pRow, 3, entry.code || entry.duration || '',{ bg: rowBg })
            sc(ws3, pRow, 4, startTime,                       { bg: rowBg })
            sc(ws3, pRow, 5, endTime,                         { bg: rowBg })
            sc(ws3, pRow, 6, hours > 0 ? `${hours}h` : '',   { bg: rowBg })
            sc(ws3, pRow, 7, entry.task || '',                { align: 'left', bg: rowBg })
          }
          ws3.getRow(pRow).height = 15
          pRow++
        })
      }
    }

    // Download
    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Resumen_${yearStr}-${monthStr}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    })
  })
}
