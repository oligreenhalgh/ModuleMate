type ModulePrereqs = { code: string; prerequisites: string[] };

export function computeModuleStatuses(
  modules: ModulePrereqs[],
  completedCodes: Set<string>
): Map<string, 'completed' | 'available' | 'locked'> {
  const result = new Map<string, 'completed' | 'available' | 'locked'>();
  for (const mod of modules) {
    if (completedCodes.has(mod.code)) {
      result.set(mod.code, 'completed');
    } else if (mod.prerequisites.every(p => completedCodes.has(p))) {
      result.set(mod.code, 'available');
    } else {
      result.set(mod.code, 'locked');
    }
  }
  return result;
}
