export interface ScheduleEntry {
  id: string;
  module_code: string;
  schedule: string;
  credits: number;
}

export interface Conflict {
  modules: string[];
  day: string;
  description: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCK_MINUTES = 90;

interface TimeSlot {
  day: string;
  startMinutes: number;
  endMinutes: number;
}

export function parseDaysAndTime(schedule: string): TimeSlot[] {
  const parts = schedule.trim().split(/\s+/);
  const timeStr = parts[parts.length - 1];
  const dayStr = parts.slice(0, -1).join(' ');

  const [hour, minute] = timeStr.split(':').map(Number);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + BLOCK_MINUTES;

  const dayTokens = dayStr.split('/').map(d => {
    const normalized = d.trim().substring(0, 3);
    return DAYS.find(day => day.toLowerCase() === normalized.toLowerCase()) || normalized;
  });

  return dayTokens.map(day => ({ day, startMinutes, endMinutes }));
}

function timesOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return a.day === b.day && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function detectConflicts(entries: ScheduleEntry[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < entries.length; i++) {
    const slotsA = parseDaysAndTime(entries[i].schedule);
    for (let j = i + 1; j < entries.length; j++) {
      const slotsB = parseDaysAndTime(entries[j].schedule);
      for (const a of slotsA) {
        for (const b of slotsB) {
          if (timesOverlap(a, b)) {
            conflicts.push({
              modules: [entries[i].module_code, entries[j].module_code],
              day: a.day,
              description: `${entries[i].module_code} (${formatTime(a.startMinutes)}-${formatTime(a.endMinutes)}) overlaps with ${entries[j].module_code} (${formatTime(b.startMinutes)}-${formatTime(b.endMinutes)}) on ${a.day}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}
