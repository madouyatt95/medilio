const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RECURRENCE_DAYS = { daily: 1, weekly: 7, biweekly: 14 };

function parseDate(date) {
  if (!DATE_PATTERN.test(date || '')) throw new Error('Date de mission invalide.');
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Date de mission invalide.');
  }
  return parsed;
}

function addMonth(date, anchorDay) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(anchorDay, lastDay)));
}

export function buildRecurringDates(startDate, recurrence = 'none', endDate = null, limit = 60) {
  const start = parseDate(startDate);
  if (recurrence === 'none' || !endDate) return [startDate];
  if (!Object.hasOwn(RECURRENCE_DAYS, recurrence) && recurrence !== 'monthly') {
    throw new Error('Récurrence invalide.');
  }

  const end = parseDate(endDate);
  if (end < start) throw new Error('La fin de récurrence doit suivre la première mission.');

  const dates = [startDate];
  let cursor = start;
  const anchorDay = start.getUTCDate();
  while (dates.length < limit) {
    if (recurrence === 'monthly') {
      cursor = addMonth(cursor, anchorDay);
    } else {
      const next = new Date(cursor);
      next.setUTCDate(next.getUTCDate() + RECURRENCE_DAYS[recurrence]);
      cursor = next;
    }
    if (cursor > end) break;
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}
