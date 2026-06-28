import { describe, it, expect } from 'vitest'
import {
  SHIFT_CODE_INFO,
  shiftCodeByDurationStart,
  absenceCodes,
  absenceLabels,
  absenceCodeByAbbrAndContract,
  absenceCodeToAbbr,
  allowedFestivo,
  allowedNormal,
  festivosSet,
  colombianHolidays,
  computeEndTimeWithMargin,
  isHoliday,
} from '../shiftCodes'

// ─── SHIFT_CODE_INFO ─────────────────────────────────────────────────────────

describe('SHIFT_CODE_INFO', () => {
  it('tiene el código "7" con 4 horas y start "07:00"', () => {
    expect(SHIFT_CODE_INFO['7']).toEqual(
      expect.objectContaining({ hours: 4, start: '07:00', breakMinutes: 0 })
    )
  })

  it('tiene el código "280" con 0 horas y start vacío', () => {
    expect(SHIFT_CODE_INFO['280'].hours).toBe(0)
    expect(SHIFT_CODE_INFO['280'].start).toBe('')
  })

  it('contiene más de 200 códigos', () => {
    expect(Object.keys(SHIFT_CODE_INFO).length).toBeGreaterThan(200)
  })
})

// ─── shiftCodeByDurationStart ─────────────────────────────────────────────────

describe('shiftCodeByDurationStart', () => {
  it('resuelve "4|07:00" al código "7"', () => {
    expect(shiftCodeByDurationStart['4|07:00']).toBe('7')
  })

  it('resuelve "4|06:00" al código "5"', () => {
    expect(shiftCodeByDurationStart['4|06:00']).toBe('5')
  })
})

// ─── absenceCodes ─────────────────────────────────────────────────────────────

describe('absenceCodes', () => {
  it('incluye las abreviaturas principales', () => {
    expect(absenceCodes).toContain('C')
    expect(absenceCodes).toContain('D')
    expect(absenceCodes).toContain('F')
    expect(absenceCodes).toContain('V')
  })

  it('incluye códigos numéricos', () => {
    expect(absenceCodes).toContain('268')
    expect(absenceCodes).toContain('267')
    expect(absenceCodes).toContain('289')
  })
})

// ─── allowedFestivo / allowedNormal ──────────────────────────────────────────

describe('allowedFestivo', () => {
  it('tiene exactamente 6 elementos', () => {
    expect(allowedFestivo).toHaveLength(6)
  })

  it('contiene D y F', () => {
    expect(allowedFestivo).toContain('D')
    expect(allowedFestivo).toContain('F')
  })

  it('NO contiene C (compensatorio no permitido en festivo)', () => {
    expect(allowedFestivo).not.toContain('C')
  })
})

describe('allowedNormal', () => {
  it('contiene C, I, V, S', () => {
    expect(allowedNormal).toContain('C')
    expect(allowedNormal).toContain('I')
    expect(allowedNormal).toContain('V')
    expect(allowedNormal).toContain('S')
  })

  it('NO contiene F (festivo no permitido en día normal)', () => {
    expect(allowedNormal).not.toContain('F')
  })
})

// ─── absenceCodeToAbbr ────────────────────────────────────────────────────────

describe('absenceCodeToAbbr', () => {
  it('mapea "268" a "C"', () => {
    expect(absenceCodeToAbbr['268']).toBe('C')
  })

  it('mapea "267" a "D"', () => {
    expect(absenceCodeToAbbr['267']).toBe('D')
  })

  it('mapea "289" a "F"', () => {
    expect(absenceCodeToAbbr['289']).toBe('F')
  })
})

// ─── absenceCodeByAbbrAndContract ─────────────────────────────────────────────

describe('absenceCodeByAbbrAndContract', () => {
  it('C para 44h → "268"', () => {
    expect(absenceCodeByAbbrAndContract['C'][44]).toBe('268')
  })

  it('C para 36h → "22443"', () => {
    expect(absenceCodeByAbbrAndContract['C'][36]).toBe('22443')
  })

  it('D para 42h → "267"', () => {
    expect(absenceCodeByAbbrAndContract['D'][42]).toBe('267')
  })
})

// ─── festivosSet ──────────────────────────────────────────────────────────────

describe('festivosSet', () => {
  it('contiene el 1 de enero de 2025', () => {
    expect(festivosSet.has('2025-01-01')).toBe(true)
  })

  it('contiene el 25 de diciembre de 2026', () => {
    expect(festivosSet.has('2026-12-25')).toBe(true)
  })

  it('tiene más de 150 fechas', () => {
    expect(festivosSet.size).toBeGreaterThan(150)
  })

  it('incluye el 13 de julio (lunes) desde 2026', () => {
    expect(festivosSet.has('2026-07-13')).toBe(true)
    expect(festivosSet.has('2027-07-13')).toBe(true)
  })
})

// ─── colombianHolidays ──────────────────────────────────────────────────────

describe('colombianHolidays', () => {
  it('incluye festivos de fecha fija', () => {
    const h = colombianHolidays(2026)
    expect(h).toContain('2026-01-01') // Año Nuevo
    expect(h).toContain('2026-05-01') // Día del Trabajo
    expect(h).toContain('2026-07-20') // Independencia
    expect(h).toContain('2026-08-07') // Batalla de Boyacá
    expect(h).toContain('2026-12-08') // Inmaculada
    expect(h).toContain('2026-12-25') // Navidad
  })

  it('agrega el 13 de julio solo desde 2026', () => {
    expect(colombianHolidays(2025)).not.toContain('2025-07-13')
    expect(colombianHolidays(2026)).toContain('2026-07-13')
    expect(colombianHolidays(2027)).toContain('2027-07-13')
  })

  it('aplica la Ley Emiliani: traslada al lunes siguiente', () => {
    // 2025-03-19 (San José) es miércoles -> lunes 2025-03-24
    expect(colombianHolidays(2025)).toContain('2025-03-24')
    // 2026-10-12 (Día de la Raza) ya es lunes -> no se traslada
    expect(colombianHolidays(2026)).toContain('2026-10-12')
    // 2026-11-01 (Todos los Santos) es domingo -> lunes 2026-11-02
    expect(colombianHolidays(2026)).toContain('2026-11-02')
  })

  it('calcula los festivos basados en la Pascua', () => {
    // Pascua 2025 = 20 abril
    const h = colombianHolidays(2025)
    expect(h).toContain('2025-04-17') // Jueves Santo
    expect(h).toContain('2025-04-18') // Viernes Santo
    expect(h).toContain('2025-06-02') // Ascensión
    expect(h).toContain('2025-06-23') // Corpus Christi
    expect(h).toContain('2025-06-30') // Sagrado Corazón
  })
})

// ─── isHoliday ────────────────────────────────────────────────────────────────

describe('isHoliday', () => {
  it('detecta un festivo del set', () => {
    expect(isHoliday('2025-01-01')).toBe(true)
  })

  it('detecta un domingo como festivo', () => {
    // 2025-01-05 es domingo
    expect(isHoliday('2025-01-05')).toBe(true)
  })

  it('un lunes normal NO es festivo', () => {
    // 2025-01-06 es lunes y NO está en el set (en Colombia sí, pero como muestra)
    // Usar una fecha que definitivamente no es festivo ni domingo
    // 2025-04-07 es lunes y no festivo
    expect(isHoliday('2025-04-07')).toBe(false)
  })
})

// ─── computeEndTimeWithMargin ─────────────────────────────────────────────────

describe('computeEndTimeWithMargin', () => {
  it('turno de 4h sin descanso: 07:00 + 4h = 11:00', () => {
    expect(computeEndTimeWithMargin('07:00', 4, false)).toBe('11:00')
  })

  it('turno de 5h sin descanso: 08:00 + 5h = 13:00', () => {
    expect(computeEndTimeWithMargin('08:00', 5, false)).toBe('13:00')
  })

  it('turno de 8h normal (30min descanso): 07:00 + 8h + 30min = 15:30', () => {
    expect(computeEndTimeWithMargin('07:00', 8, false)).toBe('15:30')
  })

  it('turno de 8h jefatura (120min descanso): 08:00 + 8h + 120min = 18:00', () => {
    expect(computeEndTimeWithMargin('08:00', 8, true)).toBe('18:00')
  })

  it('turno de 9h normal: 06:00 + 9h + 30min = 15:30', () => {
    expect(computeEndTimeWithMargin('06:00', 9, false)).toBe('15:30')
  })

  it('retorna cadena vacía para inputs inválidos', () => {
    expect(computeEndTimeWithMargin('', 8, false)).toBe('')
    expect(computeEndTimeWithMargin(null, 8, false)).toBe('')
  })
})
