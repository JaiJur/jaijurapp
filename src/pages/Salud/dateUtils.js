// Utilidades de fechas compartidas para Home / Historial de Salud

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// Array de fechas (inclusive) entre start y end
export function rangeDays(start, end) {
  const result = []
  const d = new Date(start + 'T12:00:00')
  const last = new Date(end + 'T12:00:00')
  while (d <= last) {
    result.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return result
}

// Últimos N días terminando hoy (incluye hoy)
export function lastNDays(n) {
  const today = todayISO()
  return rangeDays(addDays(today, -(n - 1)), today)
}
