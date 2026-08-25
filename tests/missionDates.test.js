import { describe, expect, it } from 'vitest';
import { buildRecurringDates } from '../src/utils/missionDates';

describe('buildRecurringDates', () => {
  it('returns only the requested date without recurrence', () => {
    expect(buildRecurringDates('2026-08-25')).toEqual(['2026-08-25']);
  });

  it('builds an inclusive weekly series', () => {
    expect(buildRecurringDates('2026-08-25', 'weekly', '2026-09-15')).toEqual([
      '2026-08-25', '2026-09-01', '2026-09-08', '2026-09-15',
    ]);
  });

  it('keeps the original day when a short month intervenes', () => {
    expect(buildRecurringDates('2027-01-31', 'monthly', '2027-03-31')).toEqual([
      '2027-01-31', '2027-02-28', '2027-03-31',
    ]);
  });

  it('caps generated instances to prevent abuse', () => {
    expect(buildRecurringDates('2026-01-01', 'daily', '2027-01-01')).toHaveLength(60);
  });

  it('rejects malformed dates and inverted periods', () => {
    expect(() => buildRecurringDates('2026-02-30')).toThrow('Date de mission invalide');
    expect(() => buildRecurringDates('2026-08-25', 'daily', '2026-08-24')).toThrow('fin de récurrence');
  });
});
