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


// Reuse a single SAB across calls (no per-call allocations)
const _sab = new SharedArrayBuffer(4);
const _i32 = new Int32Array(_sab);

/**
 * Blocks the current thread for millisecond.
 * Note: This blocks the event loop while sleeping.
 */
export function syncSleep(ms) {
  if (ms > 0) Atomics.wait(_i32, 0, 0, Math.ceil(ms));
}
