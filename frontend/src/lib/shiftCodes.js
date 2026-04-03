/**
 * shiftCodes.js
 * Módulo ES6 con todas las constantes y funciones relacionadas con turnos y ausencias.
 * Portado desde app.html (secciones de catálogos) y new_shift_codes_multiline.js.
 * No tiene dependencias externas.
 */

// ---------------------------------------------------------------------------
// SHIFT_CODE_INFO — mapa de código → {hours, start, break, breakMinutes}
// Fuente: new_shift_codes_multiline.js
// ---------------------------------------------------------------------------
export const SHIFT_CODE_INFO = {
  "280": {"hours": 0, "start": "", "break": "00:00", "breakMinutes": 0},
  "22188": {"hours": 4, "start": "01:30", "break": "00:00", "breakMinutes": 0},
  "22326": {"hours": 4, "start": "02:30", "break": "00:00", "breakMinutes": 0},
  "22156": {"hours": 4, "start": "03:45", "break": "00:00", "breakMinutes": 0},
  "1": {"hours": 4, "start": "04:00", "break": "00:00", "breakMinutes": 0},
  "2": {"hours": 4, "start": "04:30", "break": "00:00", "breakMinutes": 0},
  "22383": {"hours": 4, "start": "04:45", "break": "00:00", "breakMinutes": 0},
  "3": {"hours": 4, "start": "05:00", "break": "00:00", "breakMinutes": 0},
  "4": {"hours": 4, "start": "05:30", "break": "00:00", "breakMinutes": 0},
  "22270": {"hours": 4, "start": "05:45", "break": "00:00", "breakMinutes": 0},
  "5": {"hours": 4, "start": "06:00", "break": "00:00", "breakMinutes": 0},
  "22090": {"hours": 4, "start": "06:15", "break": "00:00", "breakMinutes": 0},
  "6": {"hours": 4, "start": "06:30", "break": "00:00", "breakMinutes": 0},
  "21972": {"hours": 4, "start": "06:45", "break": "00:00", "breakMinutes": 0},
  "7": {"hours": 4, "start": "07:00", "break": "00:00", "breakMinutes": 0},
  "21887": {"hours": 4, "start": "07:15", "break": "00:00", "breakMinutes": 0},
  "8": {"hours": 4, "start": "07:30", "break": "00:00", "breakMinutes": 0},
  "21886": {"hours": 4, "start": "07:45", "break": "00:00", "breakMinutes": 0},
  "9": {"hours": 4, "start": "08:00", "break": "00:00", "breakMinutes": 0},
  "21874": {"hours": 4, "start": "08:15", "break": "00:00", "breakMinutes": 0},
  "10": {"hours": 4, "start": "08:30", "break": "00:00", "breakMinutes": 0},
  "21854": {"hours": 4, "start": "08:45", "break": "00:00", "breakMinutes": 0},
  "11": {"hours": 4, "start": "09:00", "break": "00:00", "breakMinutes": 0},
  "21896": {"hours": 4, "start": "09:15", "break": "00:00", "breakMinutes": 0},
  "12": {"hours": 4, "start": "09:30", "break": "00:00", "breakMinutes": 0},
  "21880": {"hours": 4, "start": "09:45", "break": "00:00", "breakMinutes": 0},
  "13": {"hours": 4, "start": "10:00", "break": "00:00", "breakMinutes": 0},
  "21929": {"hours": 4, "start": "10:15", "break": "00:00", "breakMinutes": 0},
  "14": {"hours": 4, "start": "10:30", "break": "00:00", "breakMinutes": 0},
  "21902": {"hours": 4, "start": "10:45", "break": "00:00", "breakMinutes": 0},
  "15": {"hours": 4, "start": "11:00", "break": "00:00", "breakMinutes": 0},
  "21901": {"hours": 4, "start": "11:15", "break": "00:00", "breakMinutes": 0},
  "16": {"hours": 4, "start": "11:30", "break": "00:00", "breakMinutes": 0},
  "21857": {"hours": 4, "start": "11:45", "break": "00:00", "breakMinutes": 0},
  "17": {"hours": 4, "start": "12:00", "break": "00:00", "breakMinutes": 0},
  "21872": {"hours": 4, "start": "12:15", "break": "00:00", "breakMinutes": 0},
  "18": {"hours": 4, "start": "12:30", "break": "00:00", "breakMinutes": 0},
  "19": {"hours": 4, "start": "12:45", "break": "00:00", "breakMinutes": 0},
  "20": {"hours": 4, "start": "13:00", "break": "00:00", "breakMinutes": 0},
  "21931": {"hours": 4, "start": "13:15", "break": "00:00", "breakMinutes": 0},
  "21": {"hours": 4, "start": "13:30", "break": "00:00", "breakMinutes": 0},
  "21979": {"hours": 4, "start": "13:45", "break": "00:00", "breakMinutes": 0},
  "22": {"hours": 4, "start": "14:00", "break": "00:00", "breakMinutes": 0},
  "21954": {"hours": 4, "start": "14:15", "break": "00:00", "breakMinutes": 0},
  "23": {"hours": 4, "start": "14:30", "break": "00:00", "breakMinutes": 0},
  "21897": {"hours": 4, "start": "14:45", "break": "00:00", "breakMinutes": 0},
  "24": {"hours": 4, "start": "15:00", "break": "00:00", "breakMinutes": 0},
  "21891": {"hours": 4, "start": "15:15", "break": "00:00", "breakMinutes": 0},
  "25": {"hours": 4, "start": "15:30", "break": "00:00", "breakMinutes": 0},
  "21865": {"hours": 4, "start": "15:45", "break": "00:00", "breakMinutes": 0},
  "26": {"hours": 4, "start": "16:00", "break": "00:00", "breakMinutes": 0},
  "21888": {"hours": 4, "start": "16:15", "break": "00:00", "breakMinutes": 0},
  "27": {"hours": 4, "start": "16:30", "break": "00:00", "breakMinutes": 0},
  "21876": {"hours": 4, "start": "16:45", "break": "00:00", "breakMinutes": 0},
  "28": {"hours": 4, "start": "17:00", "break": "00:00", "breakMinutes": 0},
  "21875": {"hours": 4, "start": "17:15", "break": "00:00", "breakMinutes": 0},
  "29": {"hours": 4, "start": "17:30", "break": "00:00", "breakMinutes": 0},
  "21930": {"hours": 4, "start": "17:45", "break": "00:00", "breakMinutes": 0},
  "30": {"hours": 4, "start": "18:00", "break": "00:00", "breakMinutes": 0},
  "22004": {"hours": 4, "start": "18:15", "break": "00:00", "breakMinutes": 0},
  "31": {"hours": 4, "start": "18:30", "break": "00:00", "breakMinutes": 0},
  "22349": {"hours": 4, "start": "18:45", "break": "00:00", "breakMinutes": 0},
  "32": {"hours": 4, "start": "19:00", "break": "00:00", "breakMinutes": 0},
  "33": {"hours": 4, "start": "19:30", "break": "00:00", "breakMinutes": 0},
  "22033": {"hours": 4, "start": "19:45", "break": "00:00", "breakMinutes": 0},
  "34": {"hours": 4, "start": "20:00", "break": "00:00", "breakMinutes": 0},
  "35": {"hours": 5, "start": "04:00", "break": "00:00", "breakMinutes": 0},
  "36": {"hours": 5, "start": "04:30", "break": "00:00", "breakMinutes": 0},
  "37": {"hours": 5, "start": "05:00", "break": "00:00", "breakMinutes": 0},
  "38": {"hours": 5, "start": "05:30", "break": "00:00", "breakMinutes": 0},
  "39": {"hours": 5, "start": "06:00", "break": "00:00", "breakMinutes": 0},
  "40": {"hours": 5, "start": "06:30", "break": "00:00", "breakMinutes": 0},
  "41": {"hours": 5, "start": "07:00", "break": "00:00", "breakMinutes": 0},
  "22284": {"hours": 5, "start": "07:15", "break": "00:00", "breakMinutes": 0},
  "42": {"hours": 5, "start": "07:30", "break": "00:00", "breakMinutes": 0},
  "22016": {"hours": 5, "start": "07:45", "break": "00:00", "breakMinutes": 0},
  "43": {"hours": 5, "start": "08:00", "break": "00:00", "breakMinutes": 0},
  "22022": {"hours": 5, "start": "08:15", "break": "00:00", "breakMinutes": 0},
  "44": {"hours": 5, "start": "08:30", "break": "00:00", "breakMinutes": 0},
  "22029": {"hours": 5, "start": "08:45", "break": "00:00", "breakMinutes": 0},
  "21990": {"hours": 5, "start": "09:00", "break": "00:00", "breakMinutes": 0},
  "22070": {"hours": 5, "start": "09:15", "break": "00:00", "breakMinutes": 0},
  "46": {"hours": 5, "start": "09:30", "break": "00:00", "breakMinutes": 0},
  "22158": {"hours": 5, "start": "09:45", "break": "00:00", "breakMinutes": 0},
  "48": {"hours": 5, "start": "10:00", "break": "00:00", "breakMinutes": 0},
  "22071": {"hours": 5, "start": "10:15", "break": "00:00", "breakMinutes": 0},
  "49": {"hours": 5, "start": "10:30", "break": "00:00", "breakMinutes": 0},
  "22084": {"hours": 5, "start": "10:45", "break": "00:00", "breakMinutes": 0},
  "50": {"hours": 5, "start": "11:00", "break": "00:00", "breakMinutes": 0},
  "51": {"hours": 5, "start": "11:30", "break": "00:00", "breakMinutes": 0},
  "22020": {"hours": 5, "start": "11:45", "break": "00:00", "breakMinutes": 0},
  "52": {"hours": 5, "start": "12:00", "break": "00:00", "breakMinutes": 0},
  "22027": {"hours": 5, "start": "12:15", "break": "00:00", "breakMinutes": 0},
  "53": {"hours": 5, "start": "12:30", "break": "00:00", "breakMinutes": 0},
  "22021": {"hours": 5, "start": "12:45", "break": "00:00", "breakMinutes": 0},
  "54": {"hours": 5, "start": "13:00", "break": "00:00", "breakMinutes": 0},
  "22026": {"hours": 5, "start": "13:15", "break": "00:00", "breakMinutes": 0},
  "55": {"hours": 5, "start": "13:30", "break": "00:00", "breakMinutes": 0},
  "22057": {"hours": 5, "start": "13:45", "break": "00:00", "breakMinutes": 0},
  "56": {"hours": 5, "start": "14:00", "break": "00:00", "breakMinutes": 0},
  "22187": {"hours": 5, "start": "14:15", "break": "00:00", "breakMinutes": 0},
  "57": {"hours": 5, "start": "14:30", "break": "00:00", "breakMinutes": 0},
  "22189": {"hours": 5, "start": "14:45", "break": "00:00", "breakMinutes": 0},
  "58": {"hours": 5, "start": "15:00", "break": "00:00", "breakMinutes": 0},
  "22055": {"hours": 5, "start": "15:15", "break": "00:00", "breakMinutes": 0},
  "59": {"hours": 5, "start": "15:30", "break": "00:00", "breakMinutes": 0},
  "22032": {"hours": 5, "start": "15:45", "break": "00:00", "breakMinutes": 0},
  "60": {"hours": 5, "start": "16:00", "break": "00:00", "breakMinutes": 0},
  "21893": {"hours": 5, "start": "16:15", "break": "00:00", "breakMinutes": 0},
  "61": {"hours": 5, "start": "16:30", "break": "00:00", "breakMinutes": 0},
  "22009": {"hours": 5, "start": "16:45", "break": "00:00", "breakMinutes": 0},
  "62": {"hours": 5, "start": "17:00", "break": "00:00", "breakMinutes": 0},
  "22297": {"hours": 5, "start": "17:15", "break": "00:00", "breakMinutes": 0},
  "63": {"hours": 5, "start": "17:30", "break": "00:00", "breakMinutes": 0},
  "64": {"hours": 5, "start": "18:00", "break": "00:00", "breakMinutes": 0},
  "65": {"hours": 5, "start": "18:30", "break": "00:00", "breakMinutes": 0},
  "66": {"hours": 5, "start": "19:00", "break": "00:00", "breakMinutes": 0},
  "22417": {"hours": 6, "start": "04:00", "break": "00:30", "breakMinutes": 30},
  "22419": {"hours": 6, "start": "04:30", "break": "00:30", "breakMinutes": 30},
  "22420": {"hours": 6, "start": "05:00", "break": "00:30", "breakMinutes": 30},
  "22421": {"hours": 6, "start": "05:30", "break": "00:30", "breakMinutes": 30},
  "22422": {"hours": 6, "start": "06:00", "break": "00:30", "breakMinutes": 30},
  "22423": {"hours": 6, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "22424": {"hours": 6, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "22425": {"hours": 6, "start": "07:30", "break": "00:30", "breakMinutes": 30},
  "22426": {"hours": 6, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "22427": {"hours": 6, "start": "08:30", "break": "00:30", "breakMinutes": 30},
  "22428": {"hours": 6, "start": "09:00", "break": "00:30", "breakMinutes": 30},
  "22418": {"hours": 6, "start": "09:30", "break": "00:30", "breakMinutes": 30},
  "22429": {"hours": 6, "start": "10:00", "break": "00:30", "breakMinutes": 30},
  "22439": {"hours": 6, "start": "10:30", "break": "00:30", "breakMinutes": 30},
  "22440": {"hours": 6, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "22441": {"hours": 6, "start": "11:30", "break": "00:30", "breakMinutes": 30},
  "22430": {"hours": 6, "start": "12:00", "break": "00:30", "breakMinutes": 30},
  "22431": {"hours": 6, "start": "12:30", "break": "00:30", "breakMinutes": 30},
  "22432": {"hours": 6, "start": "13:00", "break": "00:30", "breakMinutes": 30},
  "22433": {"hours": 6, "start": "14:00", "break": "00:30", "breakMinutes": 30},
  "22434": {"hours": 6, "start": "14:30", "break": "00:30", "breakMinutes": 30},
  "22435": {"hours": 6, "start": "15:00", "break": "00:30", "breakMinutes": 30},
  "22436": {"hours": 6, "start": "15:30", "break": "00:30", "breakMinutes": 30},
  "22437": {"hours": 6, "start": "16:00", "break": "00:30", "breakMinutes": 30},
  "22438": {"hours": 6, "start": "16:30", "break": "00:30", "breakMinutes": 30},
  "22442": {"hours": 6, "start": "17:30", "break": "00:30", "breakMinutes": 30},
  "22455": {"hours": 6, "start": "21:00", "break": "00:30", "breakMinutes": 30},
  "22138": {"hours": 7, "start": "03:00", "break": "00:30", "breakMinutes": 30},
  "22006": {"hours": 7, "start": "05:30", "break": "00:30", "breakMinutes": 30},
  "22306": {"hours": 7, "start": "05:45", "break": "00:30", "breakMinutes": 30},
  "279": {"hours": 7, "start": "06:00", "break": "00:30", "breakMinutes": 30},
  "21939": {"hours": 7, "start": "06:15", "break": "00:30", "breakMinutes": 30},
  "21937": {"hours": 7, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "21956": {"hours": 7, "start": "06:45", "break": "00:30", "breakMinutes": 30},
  "278": {"hours": 7, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "21981": {"hours": 7, "start": "07:15", "break": "00:30", "breakMinutes": 30},
  "21844": {"hours": 7, "start": "07:30", "break": "00:30", "breakMinutes": 30},
  "21864": {"hours": 7, "start": "07:45", "break": "00:30", "breakMinutes": 30},
  "250": {"hours": 7, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "21860": {"hours": 7, "start": "08:15", "break": "00:30", "breakMinutes": 30},
  "21850": {"hours": 7, "start": "08:30", "break": "00:30", "breakMinutes": 30},
  "21955": {"hours": 7, "start": "08:45", "break": "00:30", "breakMinutes": 30},
  "300": {"hours": 7, "start": "09:00", "break": "00:30", "breakMinutes": 30},
  "21861": {"hours": 7, "start": "09:15", "break": "00:30", "breakMinutes": 30},
  "21907": {"hours": 7, "start": "09:30", "break": "00:30", "breakMinutes": 30},
  "21959": {"hours": 7, "start": "09:45", "break": "00:30", "breakMinutes": 30},
  "302": {"hours": 7, "start": "10:00", "break": "00:30", "breakMinutes": 30},
  "22081": {"hours": 7, "start": "10:15", "break": "00:30", "breakMinutes": 30},
  "21928": {"hours": 7, "start": "10:30", "break": "00:30", "breakMinutes": 30},
  "21845": {"hours": 7, "start": "10:45", "break": "00:30", "breakMinutes": 30},
  "141": {"hours": 7, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "22130": {"hours": 7, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "21980": {"hours": 7, "start": "11:15", "break": "00:30", "breakMinutes": 30},
  "21953": {"hours": 7, "start": "11:30", "break": "00:30", "breakMinutes": 30},
  "21890": {"hours": 7, "start": "11:45", "break": "00:30", "breakMinutes": 30},
  "308": {"hours": 7, "start": "12:00", "break": "00:30", "breakMinutes": 30},
  "21932": {"hours": 7, "start": "12:15", "break": "00:30", "breakMinutes": 30},
  "21849": {"hours": 7, "start": "12:30", "break": "00:30", "breakMinutes": 30},
  "21885": {"hours": 7, "start": "12:45", "break": "00:30", "breakMinutes": 30},
  "213": {"hours": 7, "start": "13:00", "break": "00:30", "breakMinutes": 30},
  "21870": {"hours": 7, "start": "13:15", "break": "00:30", "breakMinutes": 30},
  "21853": {"hours": 7, "start": "13:30", "break": "00:30", "breakMinutes": 30},
  "21908": {"hours": 7, "start": "13:45", "break": "00:30", "breakMinutes": 30},
  "215": {"hours": 7, "start": "14:00", "break": "00:30", "breakMinutes": 30},
  "21858": {"hours": 7, "start": "14:15", "break": "00:30", "breakMinutes": 30},
  "311": {"hours": 7, "start": "14:30", "break": "00:30", "breakMinutes": 30},
  "21927": {"hours": 7, "start": "14:45", "break": "00:30", "breakMinutes": 30},
  "332": {"hours": 7, "start": "15:00", "break": "00:30", "breakMinutes": 30},
  "21942": {"hours": 7, "start": "15:15", "break": "00:30", "breakMinutes": 30},
  "21952": {"hours": 7, "start": "15:30", "break": "00:30", "breakMinutes": 30},
  "22468": {"hours": 7, "start": "21:00", "break": "00:30", "breakMinutes": 30},
  "22129": {"hours": 7, "start": "22:00", "break": "00:30", "breakMinutes": 30},
  "21997": {"hours": 8, "start": "00:00", "break": "00:30", "breakMinutes": 30},
  "21994": {"hours": 8, "start": "00:45", "break": "00:30", "breakMinutes": 30},
  "21958": {"hours": 8, "start": "01:00", "break": "00:30", "breakMinutes": 30},
  "161": {"hours": 8, "start": "04:00", "break": "00:30", "breakMinutes": 30},
  "162": {"hours": 8, "start": "04:30", "break": "00:30", "breakMinutes": 30},
  "163": {"hours": 8, "start": "05:00", "break": "00:30", "breakMinutes": 30},
  "164": {"hours": 8, "start": "05:30", "break": "00:30", "breakMinutes": 30},
  "21941": {"hours": 8, "start": "05:45", "break": "00:30", "breakMinutes": 30},
  "165": {"hours": 8, "start": "06:00", "break": "00:30", "breakMinutes": 30},
  "350": {"hours": 8, "start": "06:00", "break": "00:30", "breakMinutes": 30},
  "21871": {"hours": 8, "start": "06:15", "break": "00:30", "breakMinutes": 30},
  "166": {"hours": 8, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "355": {"hours": 8, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "21847": {"hours": 8, "start": "06:45", "break": "00:30", "breakMinutes": 30},
  "167": {"hours": 8, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "378": {"hours": 8, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "21883": {"hours": 8, "start": "07:15", "break": "00:30", "breakMinutes": 30},
  "168": {"hours": 8, "start": "07:30", "break": "00:30", "breakMinutes": 30},
  "292": {"hours": 8, "start": "07:45", "break": "00:30", "breakMinutes": 30},
  "169": {"hours": 8, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "341": {"hours": 8, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "170": {"hours": 8, "start": "08:15", "break": "00:30", "breakMinutes": 30},
  "171": {"hours": 8, "start": "08:30", "break": "00:30", "breakMinutes": 30},
  "21926": {"hours": 8, "start": "08:45", "break": "00:30", "breakMinutes": 30},
  "172": {"hours": 8, "start": "09:00", "break": "00:30", "breakMinutes": 30},
  "21855": {"hours": 8, "start": "09:15", "break": "00:30", "breakMinutes": 30},
  "173": {"hours": 8, "start": "09:30", "break": "00:30", "breakMinutes": 30},
  "174": {"hours": 8, "start": "09:45", "break": "00:30", "breakMinutes": 30},
  "175": {"hours": 8, "start": "10:00", "break": "00:30", "breakMinutes": 30},
  "345": {"hours": 8, "start": "10:00", "break": "00:30", "breakMinutes": 30},
  "21921": {"hours": 8, "start": "10:15", "break": "00:30", "breakMinutes": 30},
  "176": {"hours": 8, "start": "10:30", "break": "00:30", "breakMinutes": 30},
  "177": {"hours": 8, "start": "10:45", "break": "00:30", "breakMinutes": 30},
  "178": {"hours": 8, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "20133": {"hours": 8, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "179": {"hours": 8, "start": "11:15", "break": "00:30", "breakMinutes": 30},
  "180": {"hours": 8, "start": "11:30", "break": "00:30", "breakMinutes": 30},
  "21879": {"hours": 8, "start": "11:45", "break": "00:30", "breakMinutes": 30},
  "181": {"hours": 8, "start": "12:00", "break": "00:30", "breakMinutes": 30},
  "182": {"hours": 8, "start": "12:15", "break": "00:30", "breakMinutes": 30},
  "183": {"hours": 8, "start": "12:30", "break": "00:30", "breakMinutes": 30},
  "184": {"hours": 8, "start": "12:45", "break": "00:30", "breakMinutes": 30},
  "185": {"hours": 8, "start": "13:00", "break": "00:30", "breakMinutes": 30},
  "403": {"hours": 8, "start": "13:00", "break": "00:30", "breakMinutes": 30},
  "186": {"hours": 8, "start": "13:15", "break": "00:30", "breakMinutes": 30},
  "187": {"hours": 8, "start": "13:30", "break": "00:30", "breakMinutes": 30},
  "188": {"hours": 8, "start": "13:45", "break": "00:30", "breakMinutes": 30},
  "189": {"hours": 8, "start": "14:00", "break": "00:30", "breakMinutes": 30},
  "190": {"hours": 8, "start": "14:15", "break": "00:30", "breakMinutes": 30},
  "191": {"hours": 8, "start": "14:30", "break": "00:30", "breakMinutes": 30},
  "192": {"hours": 8, "start": "15:00", "break": "00:30", "breakMinutes": 30},
  "193": {"hours": 8, "start": "15:30", "break": "00:30", "breakMinutes": 30},
  "22050": {"hours": 8, "start": "18:00", "break": "00:30", "breakMinutes": 30},
  "22469": {"hours": 8, "start": "21:00", "break": "00:30", "breakMinutes": 30},
  "194": {"hours": 8, "start": "22:00", "break": "00:30", "breakMinutes": 30},
  "353": {"hours": 8, "start": "22:00", "break": "00:30", "breakMinutes": 30},
  "195": {"hours": 8, "start": "22:30", "break": "00:30", "breakMinutes": 30},
  "196": {"hours": 8, "start": "23:00", "break": "00:30", "breakMinutes": 30},
  "197": {"hours": 8, "start": "23:30", "break": "00:30", "breakMinutes": 30},
  "198": {"hours": 9, "start": "04:00", "break": "00:30", "breakMinutes": 30},
  "199": {"hours": 9, "start": "04:30", "break": "00:30", "breakMinutes": 30},
  "200": {"hours": 9, "start": "05:00", "break": "00:30", "breakMinutes": 30},
  "201": {"hours": 9, "start": "05:30", "break": "00:30", "breakMinutes": 30},
  "202": {"hours": 9, "start": "06:00", "break": "00:30", "breakMinutes": 30},
  "22371": {"hours": 9, "start": "06:15", "break": "00:30", "breakMinutes": 30},
  "203": {"hours": 9, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "20124": {"hours": 9, "start": "06:30", "break": "00:30", "breakMinutes": 30},
  "21957": {"hours": 9, "start": "06:45", "break": "00:30", "breakMinutes": 30},
  "204": {"hours": 9, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "340": {"hours": 9, "start": "07:00", "break": "00:30", "breakMinutes": 30},
  "205": {"hours": 9, "start": "07:30", "break": "00:30", "breakMinutes": 30},
  "342": {"hours": 9, "start": "07:30", "break": "00:30", "breakMinutes": 30},
  "21859": {"hours": 9, "start": "07:45", "break": "00:30", "breakMinutes": 30},
  "206": {"hours": 9, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "339": {"hours": 9, "start": "08:00", "break": "00:30", "breakMinutes": 30},
  "21905": {"hours": 9, "start": "08:15", "break": "00:30", "breakMinutes": 30},
  "207": {"hours": 9, "start": "08:30", "break": "00:30", "breakMinutes": 30},
  "21862": {"hours": 9, "start": "08:45", "break": "00:30", "breakMinutes": 30},
  "208": {"hours": 9, "start": "09:00", "break": "00:30", "breakMinutes": 30},
  "21966": {"hours": 9, "start": "09:15", "break": "00:30", "breakMinutes": 30},
  "209": {"hours": 9, "start": "09:30", "break": "00:30", "breakMinutes": 30},
  "22132": {"hours": 9, "start": "09:45", "break": "00:30", "breakMinutes": 30},
  "210": {"hours": 9, "start": "10:00", "break": "00:30", "breakMinutes": 30},
  "22241": {"hours": 9, "start": "10:15", "break": "00:30", "breakMinutes": 30},
  "211": {"hours": 9, "start": "10:30", "break": "00:30", "breakMinutes": 30},
  "21991": {"hours": 9, "start": "10:45", "break": "00:30", "breakMinutes": 30},
  "212": {"hours": 9, "start": "11:00", "break": "00:30", "breakMinutes": 30},
  "22139": {"hours": 9, "start": "11:15", "break": "00:30", "breakMinutes": 30},
  "214": {"hours": 9, "start": "11:30", "break": "00:30", "breakMinutes": 30},
  "21869": {"hours": 9, "start": "11:45", "break": "00:30", "breakMinutes": 30},
  "216": {"hours": 9, "start": "12:00", "break": "00:30", "breakMinutes": 30},
  "21963": {"hours": 9, "start": "12:15", "break": "00:30", "breakMinutes": 30},
  "218": {"hours": 9, "start": "12:30", "break": "00:30", "breakMinutes": 30},
  "22244": {"hours": 9, "start": "12:45", "break": "00:30", "breakMinutes": 30},
  "220": {"hours": 9, "start": "13:00", "break": "00:30", "breakMinutes": 30},
  "221": {"hours": 9, "start": "13:30", "break": "00:30", "breakMinutes": 30},
  "222": {"hours": 9, "start": "14:00", "break": "00:30", "breakMinutes": 30},
  "223": {"hours": 9, "start": "20:00", "break": "00:30", "breakMinutes": 30},
  "224": {"hours": 9, "start": "20:30", "break": "00:30", "breakMinutes": 30},
  "225": {"hours": 9, "start": "21:00", "break": "00:30", "breakMinutes": 30},
  "226": {"hours": 9, "start": "21:30", "break": "00:30", "breakMinutes": 30},
  "227": {"hours": 9, "start": "22:00", "break": "00:30", "breakMinutes": 30},
  "228": {"hours": 9, "start": "22:30", "break": "00:30", "breakMinutes": 30},
  "229": {"hours": 9, "start": "23:00", "break": "00:30", "breakMinutes": 30},
  "230": {"hours": 9, "start": "23:30", "break": "00:30", "breakMinutes": 30},
};

// ---------------------------------------------------------------------------
// shiftCodeByDurationStart — Map "hours|startTime" → code
// Construido al cargar el módulo desde SHIFT_CODE_INFO.
// Para claves duplicadas (mismo hours|start) se conserva la primera entrada
// encontrada, que coincide con el comportamiento de new_shift_codes_multiline.js.
// ---------------------------------------------------------------------------
export const shiftCodeByDurationStart = (() => {
  const map = {};
  for (const [code, info] of Object.entries(SHIFT_CODE_INFO)) {
    if (info.hours === 0) continue; // código 280 (sin turno) se excluye del lookup
    const key = `${info.hours}|${info.start}`;
    if (!map[key]) {
      map[key] = code;
    }
  }
  return map;
})();

// ---------------------------------------------------------------------------
// Catálogos de ausencias
// Fuente: app.html líneas 2188-2258
// ---------------------------------------------------------------------------

/** Todos los códigos reconocidos como ausencia (letras y numéricos). */
export const absenceCodes = [
  "C","D","I","S","V","DF","LC","F","B","Sin Codigo",
  "268","22443","267","22444","100","22445","289","22446",
  "269","22474","272","273","22475"
];

/** Etiqueta legible para cada código de ausencia. */
export const absenceLabels = {
  C: "Compensatorio",
  D: "Descanso",
  I: "Incapacidad",
  S: "Suspensión",
  V: "Vacaciones",
  DF: "Día de la familia",
  LC: "Licencia",
  F: "Festivo",
  B: "Beneficio",
  "Sin Codigo": "Sin codigo",
  "268": "Compensatorio",
  "22443": "Compensatorio",
  "267": "Descanso",
  "22444": "Descanso",
  "100": "Día de la familia",
  "22445": "Día de la familia",
  "289": "Festivo",
  "22446": "Festivo",
  "269": "Incapacidad",
  "22474": "Incapacidad",
  "272": "Suspensión",
  "273": "Vacaciones",
  "22475": "Vacaciones",
};

/**
 * Descripciones detalladas por tipo de contrato (36 / 42 / 44 h).
 * Fuente: app.html líneas 2220-2230.
 */
export const absenceDescriptions = {
  C:  {36: "Compensatorio 6H",    42: "Compensatorio 8H",    44: "Compensatorio 8H"},
  D:  {36: "Descanso 6H",         42: "Descanso 8H",         44: "Descanso 8H"},
  DF: {36: "Día de la familia 6H",42: "Día de la familia 8H",44: "Día de la familia 8H"},
  F:  {36: "Festivo 6H",          42: "Festivo 8H",          44: "Festivo 8H"},
  I:  {36: "Incapacidad 6H",      42: "Incapacidad 8H",      44: "Incapacidad 8H"},
  LC: {36: "Licencia 6H",         42: "Licencia 8H",         44: "Licencia 8H"},
  S:  {36: "Suspensión",          42: "Suspensión",          44: "Suspensión"},
  V:  {36: "Vacaciones 6H",       42: "Vacaciones 8H",       44: "Vacaciones 8H"},
  B:  {36: "Beneficio",           42: "Beneficio",           44: "Beneficio"},
};

/**
 * Código numérico de cada ausencia según abreviatura y tipo de contrato.
 * Fuente: app.html líneas 2235-2245.
 */
export const absenceCodeByAbbrAndContract = {
  C:  {36: "22443",     42: "268",       44: "268"},
  D:  {36: "22444",     42: "267",       44: "267"},
  DF: {36: "22445",     42: "100",       44: "100"},
  F:  {36: "22446",     42: "289",       44: "289"},
  I:  {36: "22474",     42: "269",       44: "269"},
  LC: {36: "Sin Codigo",42: "Sin Codigo",44: "Sin Codigo"},
  S:  {36: "272",       42: "272",       44: "272"},
  V:  {36: "22475",     42: "273",       44: "273"},
  B:  {36: "Sin Codigo",42: "Sin Codigo",44: "Sin Codigo"},
};

/**
 * Mapa inverso: código numérico → abreviatura.
 * Generado programáticamente igual que en app.html líneas 2252-2258.
 */
export const absenceCodeToAbbr = (() => {
  const map = {};
  for (const [abbr, contractMap] of Object.entries(absenceCodeByAbbrAndContract)) {
    for (const code of Object.values(contractMap)) {
      if (code && code !== "Sin Codigo" && !map[code]) {
        map[code] = abbr;
      }
    }
  }
  return map;
})();

// ---------------------------------------------------------------------------
// Opciones de turno y tiempos
// Fuente: app.html líneas 2260-2262
// ---------------------------------------------------------------------------

/** Opciones de duración en horas disponibles en el selector. */
export const shiftOptions = [0, 4, 5, 6, 7, 8, 9];

/** Horas de inicio disponibles para asignar un turno. */
export const startTimes = [
  "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30",
];

/** Slots de cobertura (incluye hasta las 22:30). */
export const coverageTimes = [
  "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30",
  "22:00","22:30",
];

// ---------------------------------------------------------------------------
// Festivos
// Fuente: app.html líneas 2265-2302
// ---------------------------------------------------------------------------

/** Set de fechas festivas en formato "YYYY-MM-DD". */
export const festivosSet = new Set([
  "2025-01-01","2025-01-05","2025-01-06","2025-01-12","2025-01-19","2025-01-26",
  "2025-02-02","2025-02-09","2025-02-16","2025-02-23",
  "2025-03-02","2025-03-09","2025-03-16","2025-03-23","2025-03-24","2025-03-30",
  "2025-04-06","2025-04-13","2025-04-17","2025-04-18","2025-04-20","2025-04-27",
  "2025-05-01","2025-05-04","2025-05-11","2025-05-25",
  "2025-06-01","2025-06-02","2025-06-08","2025-06-15","2025-06-22","2025-06-23","2025-06-29","2025-06-30",
  "2025-07-06","2025-07-13","2025-07-20","2025-07-27",
  "2025-08-03","2025-08-07","2025-08-10","2025-08-17","2025-08-18","2025-08-24","2025-08-31",
  "2025-09-07","2025-09-14","2025-09-21","2025-09-28",
  "2025-10-05","2025-10-12","2025-10-13","2025-10-19","2025-10-26",
  "2025-11-02","2025-11-03","2025-11-09","2025-11-16","2025-11-17","2025-11-23","2025-11-30",
  "2025-12-07","2025-12-08","2025-12-14","2025-12-21","2025-12-25","2025-12-28",
  "2026-01-01","2026-01-04","2026-01-11","2026-01-12","2026-01-18","2026-01-25",
  "2026-02-01","2026-02-08","2026-02-15","2026-02-22",
  "2026-03-01","2026-03-08","2026-03-15","2026-03-22","2026-03-23","2026-03-29",
  "2026-04-02","2026-04-03","2026-04-05","2026-04-12","2026-04-19","2026-04-26",
  "2026-05-01","2026-05-03","2026-05-10","2026-05-17","2026-05-18","2026-05-24","2026-05-31",
  "2026-06-07","2026-06-08","2026-06-14","2026-06-21","2026-06-28",
  "2026-07-05","2026-07-06","2026-07-11","2026-07-18","2026-07-19","2026-07-25",
  "2026-08-02","2026-08-07","2026-08-09","2026-08-15","2026-08-16","2026-08-23","2026-08-30",
  "2026-09-06","2026-09-13","2026-09-20","2026-09-27",
  "2026-10-04","2026-10-11","2026-10-18","2026-10-19","2026-10-25",
  "2026-11-01","2026-11-08","2026-11-15","2026-11-16","2026-11-22","2026-11-29",
  "2026-12-06","2026-12-08","2026-12-13","2026-12-20","2026-12-25","2026-12-27",
  "2027-01-01","2027-01-03","2027-01-06","2027-01-10","2027-01-17","2027-01-24","2027-01-31",
  "2027-02-07","2027-02-14","2027-02-21","2027-02-28",
  "2027-03-07","2027-03-14","2027-03-21","2027-03-28","2027-03-29",
  "2027-04-04","2027-04-08","2027-04-09","2027-04-11","2027-04-18","2027-04-25",
  "2027-05-01","2027-05-02","2027-05-09","2027-05-16","2027-05-17","2027-05-23","2027-05-30",
  "2027-06-06","2027-06-07","2027-06-13","2027-06-20","2027-06-27",
  "2027-07-04","2027-07-05","2027-07-11","2027-07-18","2027-07-19","2027-07-25",
  "2027-08-01","2027-08-07","2027-08-08","2027-08-15","2027-08-22","2027-08-29",
  "2027-09-03","2027-09-10","2027-09-17","2027-09-24",
  "2027-10-01","2027-10-08","2027-10-15","2027-10-16","2027-10-22","2027-10-29","2027-10-31",
  "2027-11-05","2027-11-12","2027-11-19","2027-11-26",
  "2027-12-03","2027-12-10","2027-12-17","2027-12-24","2027-12-31",
]);

// ---------------------------------------------------------------------------
// Ausencias permitidas según tipo de día
// Fuente: app.html líneas 3441 y 3677 (idénticas en ambas apariciones)
// ---------------------------------------------------------------------------

/** Ausencias permitidas en festivos / domingos (6 elementos). */
export const allowedFestivo = ["D","F","267","22444","289","22446"];

/** Ausencias permitidas en días laborables normales. */
export const allowedNormal = [
  "C","I","S","V","DF","LC","B",
  "268","22443","269","22474","272","273","22475","100","22445","Sin Codigo",
];

// ---------------------------------------------------------------------------
// computeEndTimeWithMargin
// Fuente: app.html líneas 2923-2937, adaptada para aceptar isJefatura explícita
// en lugar del global employeeJefatura.
// ---------------------------------------------------------------------------

/**
 * Calcula la hora de fin de un turno a partir de la hora de inicio, la duración
 * y si el empleado es jefatura.
 *
 * Regla: turnos de 4h o 5h no tienen descanso.
 * Para el resto: 30 min normales, 120 min si isJefatura === true.
 *
 * @param {string} startTime  - Hora de inicio en formato "HH:MM".
 * @param {number} hours      - Duración del turno en horas.
 * @param {boolean} isJefatura - Si el empleado es jefatura.
 * @returns {string} Hora de fin en formato "HH:MM", o "" si los parámetros son inválidos.
 */
export function computeEndTimeWithMargin(startTime, hours, isJefatura) {
  if (
    !startTime ||
    typeof startTime !== "string" ||
    !/^(\d{1,2}):(\d{2})$/.test(startTime) ||
    isNaN(hours)
  ) {
    return "";
  }
  const [h, m] = startTime.split(":").map(v => parseInt(v, 10));
  const startDate = new Date(2000, 0, 1, h, m, 0, 0);
  const durH = parseInt(hours, 10);
  const extra = durH === 4 || durH === 5 ? 0 : (isJefatura ? 120 : 30);
  const endDate = new Date(startDate.getTime() + (durH * 60 + extra) * 60 * 1000);
  const hh = endDate.getHours().toString().padStart(2, "0");
  const mm = endDate.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// isHoliday
// Fuente: app.html líneas 2303-2307
// ---------------------------------------------------------------------------

/**
 * Indica si una fecha es festiva o domingo.
 *
 * @param {string} dateKey - Fecha en formato "YYYY-MM-DD".
 * @returns {boolean}
 */
export function isHoliday(dateKey) {
  if (festivosSet.has(dateKey)) return true;
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay() === 0;
}
