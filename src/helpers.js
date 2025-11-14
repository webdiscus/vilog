/**
 * View output factory.
 * Node.js - process.stdout
 * Browser - console.log
 */
function createView () {
  if (process && 'write' in process.stdout) {
    return (v) => process.stdout.write(v + '\n');
  }

  return console.log;
}

export const view = createView();

export const isFn = (v) => typeof v === 'function';

/**
 * Deeply merges values from the source object into the target object.
 * Only keys that already exist in the target are considered.
 * Unknown keys in the source are ignored.
 * Objects are merged recursively, primitives and functions are overwritten.
 *
 * @param {Record<string, any>} target The target object to mutate.
 * @param {Record<string, any>} source The source object with overrides.
 * @returns {Record<string, any>} The mutated target object.
 */
export function mergeDeep (target, source) {
  for (const key in source) {
    //if (!(key in target)) continue; // ignore unknown keys

    const val = source[key];
    if (val && typeof val === 'object' && typeof target[key] === 'object') {
      mergeDeep(target[key], val);
    } else {
      target[key] = val;
    }
  }

  return target;
}

export function getEnv (name, mockThis) {
  // Note: In Deno 2.0+, the `process` is available globally
  let thisRef = mockThis ?? globalThis;
  let proc = thisRef.process ?? {};
  let env = proc.env ?? {};

  try {
    // keys(env) triggers a Deno permission request; throws if access is denied
    // stringify environment variable keys to check for specific ones using a RegExp
    Object.keys(env);
  } catch (error) {
    // if the permission is not granted, environment variables have no effect, even variables like DEBUG will be ignored
    // env now points to a new empty object to avoid Deno requests for every env access in code below
    env = {};
  }

  return env[name];
}

export function matchPattern (pattern, str) {
  if (pattern === '*') return true;

  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    if (str.startsWith(prefix)) return true;
  }

  return pattern === str;
}

/**
 * Get caller stack trace information.
 *
 * @param {number} depth 0 = immediate caller, 1 = caller’s caller, etc.
 * @return {{file: string|null, line: number|null, column: number|null } | null}
 */
export function getCaller (depth = 0) {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, callSites) => callSites;

  const err = new Error();
  Error.captureStackTrace(err, getCaller);
  const stack = /** @type {import('v8').CallSite[]} */(err.stack) || [];
  const site = stack[depth];

  Error.prepareStackTrace = orig;

  if (!site) return null;

  return {
    file: site.getFileName() || site.getScriptNameOrSourceURL() || null,
    line: site.getLineNumber() || null,
    column: site.getColumnNumber() || null,
  };
}
