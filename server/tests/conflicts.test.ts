import { describe, it, expect } from 'vitest';
import { detectConflicts, parseDaysAndTime, ScheduleEntry } from '../src/services/conflicts.js';

describe('parseDaysAndTime', () => {
  it('parses multi-day schedule like "Mon/Wed 14:00"', () => {
    const slots = parseDaysAndTime('Mon/Wed 14:00');
    expect(slots).toHaveLength(2);
    expect(slots[0].day).toBe('Mon');
    expect(slots[1].day).toBe('Wed');
    expect(slots[0].startMinutes).toBe(14 * 60);
    expect(slots[0].endMinutes).toBe(14 * 60 + 90);
  });

  it('parses full day name like "Friday 11:00"', () => {
    const slots = parseDaysAndTime('Friday 11:00');
    expect(slots).toHaveLength(1);
    expect(slots[0].day).toBe('Fri');
  });
});

const stub = { course_name: 'Test', professor: 'TBD', semester: 'S1' };

describe('detectConflicts', () => {
  it('detects overlap on the same day', () => {
    const entries: ScheduleEntry[] = [
      { id: '1', module_code: 'CS1010', schedule: 'Mon/Wed 14:00', credits: 4, ...stub },
      { id: '2', module_code: 'CS2030', schedule: 'Mon/Fri 14:30', credits: 4, ...stub },
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    const monConflict = conflicts.find(c => c.day === 'Mon');
    expect(monConflict).toBeDefined();
    expect(monConflict!.modules).toContain('CS1010');
    expect(monConflict!.modules).toContain('CS2030');
  });

  it('returns no conflicts for different days', () => {
    const entries: ScheduleEntry[] = [
      { id: '1', module_code: 'CS1010', schedule: 'Mon/Wed 14:00', credits: 4, ...stub },
      { id: '2', module_code: 'CS2030', schedule: 'Tue/Thu 14:00', credits: 4, ...stub },
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts).toHaveLength(0);
  });

  it('returns no conflicts when times do not overlap on same day', () => {
    const entries: ScheduleEntry[] = [
      { id: '1', module_code: 'CS1010', schedule: 'Mon 09:00', credits: 4, ...stub },
      { id: '2', module_code: 'CS2030', schedule: 'Mon 11:00', credits: 4, ...stub },
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts).toHaveLength(0);
  });

  it('detects overlap at boundary (start == other end is not overlap)', () => {
    const entries: ScheduleEntry[] = [
      { id: '1', module_code: 'CS1010', schedule: 'Mon 09:00', credits: 4, ...stub },
      { id: '2', module_code: 'CS2030', schedule: 'Mon 10:30', credits: 4, ...stub }, // exactly at end of first block
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts).toHaveLength(0);
  });
});
