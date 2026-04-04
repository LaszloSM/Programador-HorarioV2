import { describe, it, expect } from 'vitest'
import { computeMonthlySummaryData } from '../monthlySummary'

const BASE_MONTH = '2025-08'

const mockConfig = {
  employees: [{ name: 'Ana', maxHours: 44, jefatura: false }],
  tasks: [
    { name: 'Linea de cajas', group: 'CAJAS' },
    { name: 'Inventarios', group: 'GESTION' },
  ],
  initialPending: { Ana: 2 },
  groupColors: {},
  employeeMaxHours: { Ana: 44 },
}

describe('computeMonthlySummaryData', () => {
  it('returns correct structure with empty schedule', () => {
    const result = computeMonthlySummaryData(2025, 8, {}, mockConfig, BASE_MONTH)
    expect(result).toHaveProperty('rows')
    expect(result).toHaveProperty('dayCounts')
    expect(result.daysInMonth).toBe(31)
    expect(result.rows).toHaveLength(1)
  })

  it('uses initialPending for the baseMonth', () => {
    const result = computeMonthlySummaryData(2025, 8, {}, mockConfig, BASE_MONTH)
    expect(result.rows[0].pend).toBe(2)
  })

  it('initialPending is 0 for months before baseMonth', () => {
    const result = computeMonthlySummaryData(2025, 7, {}, mockConfig, BASE_MONTH)
    expect(result.rows[0].pend).toBe(0)
  })

  it('categorizes AM shift correctly (before 10:00)', () => {
    const sched = { Ana: { '2025-08-04': { duration: '8', startTime: '06:00', code: '', task: '' } } }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    expect(result.rows[0].codes[3]).toBe('AM') // day 4 = index 3
  })

  it('categorizes PM shift correctly (12:00 or later)', () => {
    const sched = { Ana: { '2025-08-05': { duration: '8', startTime: '13:00', code: '', task: '' } } }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    expect(result.rows[0].codes[4]).toBe('PM') // day 5 = index 4
  })

  it('categorizes INT shift correctly (10:00-11:59)', () => {
    const sched = { Ana: { '2025-08-06': { duration: '8', startTime: '10:00', code: '', task: '' } } }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    expect(result.rows[0].codes[5]).toBe('INT')
  })

  it('records absence code C correctly and counts paidCount', () => {
    const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    expect(result.rows[0].paid).toBe(1)
    expect(result.rows[0].codes[10]).toBe('C')
  })

  it('counts CAJAS task days for polivalencia', () => {
    const sched = {
      Ana: {
        '2025-08-04': { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' },
        '2025-08-05': { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' },
      }
    }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    // 2/11 * 100 = 18.18... → rounded to 18
    expect(result.rows[0].poliv).toBe(18)
  })

  it('caps polivalencia at 100%', () => {
    const sched = { Ana: {} }
    // 11+ cajas days
    for (let d = 1; d <= 12; d++) {
      sched.Ana[`2025-08-${String(d).padStart(2,'0')}`] = { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' }
    }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    expect(result.rows[0].poliv).toBe(100)
  })

  it('closure = pend + caused - paid', () => {
    // No holidays in data used here, so caused = 0
    const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
    const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
    // pend=2, paid=1, caused=0 → closure=1
    expect(result.rows[0].closure).toBe(1)
  })

  it('prior month closure carries to next month as pendStart', () => {
    // Aug: pend=2, paid=1 → closure=1
    const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
    const cache = {}
    computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH, cache)
    const sep = computeMonthlySummaryData(2025, 9, sched, mockConfig, BASE_MONTH, cache)
    expect(sep.rows[0].pend).toBe(1)
  })
})
