import { describe, it, expect } from 'vitest';
import { computeModuleStatuses } from '../src/services/prerequisites.js';

describe('computeModuleStatuses', () => {
  const modules = [
    { code: 'CS1010', prerequisites: [] },
    { code: 'CS2030', prerequisites: ['CS1010'] },
    { code: 'CS2040', prerequisites: ['CS1010'] },
    { code: 'CS3230', prerequisites: ['CS2030', 'CS2040'] },
    { code: 'CS4231', prerequisites: ['CS3230'] },
  ];

  it('marks completed modules as completed', () => {
    const completed = new Set(['CS1010', 'CS2030']);
    const statuses = computeModuleStatuses(modules, completed);
    expect(statuses.get('CS1010')).toBe('completed');
    expect(statuses.get('CS2030')).toBe('completed');
  });

  it('marks modules with all prerequisites completed as available', () => {
    const completed = new Set(['CS1010', 'CS2030']);
    const statuses = computeModuleStatuses(modules, completed);
    // CS2040 requires CS1010 (completed) → available
    expect(statuses.get('CS2040')).toBe('available');
  });

  it('marks modules with missing prerequisites as locked', () => {
    const completed = new Set(['CS1010', 'CS2030']);
    const statuses = computeModuleStatuses(modules, completed);
    // CS3230 requires CS2030 (completed) + CS2040 (not completed) → locked
    expect(statuses.get('CS3230')).toBe('locked');
    // CS4231 requires CS3230 (not completed) → locked
    expect(statuses.get('CS4231')).toBe('locked');
  });

  it('marks modules with no prerequisites as available when not completed', () => {
    const completed = new Set<string>();
    const statuses = computeModuleStatuses(modules, completed);
    expect(statuses.get('CS1010')).toBe('available');
  });

  it('handles all modules completed', () => {
    const completed = new Set(['CS1010', 'CS2030', 'CS2040', 'CS3230', 'CS4231']);
    const statuses = computeModuleStatuses(modules, completed);
    for (const mod of modules) {
      expect(statuses.get(mod.code)).toBe('completed');
    }
  });
});
