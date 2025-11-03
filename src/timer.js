import format from './formatDuration.js';

/**
 * Ultra-light singleton timer for high-resolution elapsed-time measurements.
 *
 * Usage:
 *   import timer from './timer.js'
 *   const { duration, elapsed } = timer.measure();
 */

/**
 * Factory the fastest available high-resolution clock.
 * Monotonic when possible: performance.now() or hrtime.bigint().
 *
 * @returns {() => number} Returns a timestamp in milliseconds.
 */
function createNow () {
  // modern: Node 18.8+ / Deno / Bun / Browsers
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    // cache the function once to avoid property lookup, it is 1.4x faster then call performance.now();
    return performance.now.bind(performance);
  }
  // older: Node.js v10.7+
  if (typeof process !== 'undefined' && typeof process.hrtime === 'function' && process.hrtime.bigint) {
    return () => Number(process.hrtime.bigint() / 1_000_000n);
  }
  // fallback
  return () => Date.now();
}

/** @type {() => number} Milliseconds; monotonic if supported. */
const now = createNow();

/** @type {number} Global start time shared by the singleton. */
const startTime = now();

/** @type {number} Timestamp of the previous `measure()` call. */
let lastTime = startTime;

/**
 * @typedef {Object} Timer
 * @property {number} startTime Global start time in ms.
 * @property {number} lastTime The last measure time in ms.
 * @property {() => number} now High-resolution timestamp function (ms).
 * @property {function} updateTimer Update inner timer.
 * @property {(ms: number) => string} format Format milliseconds into a compact, human-readable string.
 * @property {() => {now:number, diff:string, duration:string, elapsed:string}} measure
 *   Measure time since the previous call (`duration`) and since `startTime` (`elapsed`).
 */

/**
 * Performance measure utility.
 *
 * @type {Timer}
 */
const timer = {
  /** Global creation time (ms). */
  startTime,

  get lastTime () {
    return lastTime;
  },

  set lastTime (time) {
    lastTime = time;
  },

  /**
   * High-resolution timestamp function (ms).
   */
  now,

  /**
   * Update inner timer.
   */
  updateTimer () {
    lastTime = now();
  },

  /**
   * The stopwatch.
   *
   * @return {function(): *}
   *
   * @example
   * let stop = timer.start();
   * doSomething();
   * let duration = stop();
   */
  start () {
    const t = now();
    return () => now() - t;
  },

  /**
   * Format milliseconds into a compact, human-readable string.
   */
  format,

  /**
   * Measure timings.
   * - `duration`: time since the previous call
   * - `elapsed`: time since global `startTime`
   * - `durationFmt`: formatted duration
   * - `elapsedFmt`: formatted elapsed
   *
   * @returns {{duration:number, elapsed:number, durationFmt:string, elapsedFmt:string}}
   */
  measure () {
    const end = now();
    const duration = end - lastTime;
    const elapsed = end - startTime;
    const durationFmt = format(duration);
    const elapsedFmt = format(elapsed);

    let detail = { duration, elapsed, durationFmt, elapsedFmt };
    detail.overhead = now() - end; // TODO: used only for debug/profiling

    // exclude the runtime overhead of the method itself (object creation, function calls, etc.)
    // measured on M1 Max machine (may vary by CPU/Node):
    // - cold calls (before JIT optimization): ~0.06 ms (~60 µs)
    // - warm calls (after JIT optimization):  ~0.001 ms (~1 µs)
    lastTime = now();

    return detail;
  },
};

export default timer;
