import { vi } from 'vitest';

/**
 * Always re-import a fresh module to avoid cross-test state leaks.
 * @return {Promise<Vilog|{}>}
 */
export async function importModule(file) {
  vi.resetModules();
  const mod = await import(file);
  return mod.default || mod;
}

/**
 * @param {number} ms
 * @return {Promise<unknown>}
 */
export const sleep = async (ms) => new Promise((r) => setTimeout(r, ms));
