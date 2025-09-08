/**
 * Clock factory (ms).
 **/
function createNow () {
  // browsers / Deno / Bun / modern Node v18.8+
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return () => performance.now();
  }

  // older Node.js v10.7+, process.hrtime.bigint() returns a monotonic in nanoseconds
  if (
    typeof process !== 'undefined' &&
    typeof process.hrtime === 'function' &&
    process.hrtime.bigint
  ) {
    return () => Number(process.hrtime.bigint() / 1_000_000n);
  }

  // fallback: wall clock (not monotonic)
  return () => Date.now();
}

// resolve once per module/runtime
export const now = createNow();

/**
 * Format milliseconds into a compact, human-readable string.
 *
 * Thresholds
 * - < 1000 ms  → `"Xms"`
 * - < 60 s     → `"Xs"`
 * - ≥ 60 s     → always include lower units down to seconds:
 *                days  → `"Xd Xh Xm Ys"`
 *                hours → `"Xh Xm Ys"`
 *                mins  → `"Xm Ys"`
 *
 * Precision behavior
 * - `options.precision` controls **decimal places for seconds** (default: `3`).
 * - For **milliseconds** (`ms < 1000`), decimals are shown only at higher precision to avoid noisy sub-ms output.
 *   The number of ms decimals is: `msDecimals = max(0, precision - 3)`
 *
 *   This maps to:
 *   - `precision ≤ 3` → integer ms (no decimals)
 *   - `precision = 4` → 1 decimal in **ms** (0.1 ms = 100 µs)
 *   - `precision = 5` → 2 decimals in **ms** (0.01 ms = 10 µs)
 *   - `precision = 8` → 5 decimals in **ms** (0.00001 ms = 10 ns)
 *
 * - For **seconds** (`ms ≥ 1000` and `< 60_000`), the number of decimals equals
 *   `precision` directly:
 *   - `precision = 1` → 0.1 s = 100 ms
 *   - `precision = 3` → 0.001 s = 1 ms
 *   - `precision = 4` → 0.0001 s = 100 µs
 *   - `precision = 8` → 0.00000001 s = 10 ns
 *
 * Notes
 * - Trailing zeros (and a trailing decimal point) are trimmed.
 * - For durations ≥ 60 s, output is split into units (d/h/m) plus seconds;
 *   seconds may include decimals per `precision`.
 *
 * Examples
 * - `formatMs(200.12345678, {precision: 8}) → "200.12346ms"`  // 200 ms + 123 µs + 460 ns
 * - `formatMs(1309, {precision: 1})         → "1.3s"`
 * - `formatMs(1309, {precision: 3})         → "1.309s"`
 * - `formatMs(119999, {precision: 3})       → "1m 59.999s"`
 * - `formatMs(3600000, {precision: 3})      → "1h 0m 0s"`
 *
 * @param {number} ms
 * @param {{ precision?: number }} [options] Decimal places for seconds. Default: `3`.
 * @returns {string}
 */
export function formatMs (ms, options) {
  const precision = options && Number.isInteger(options.precision) ? options.precision : 3;

  if (ms < 1000) {
    const msDecimals = Math.max(0, precision - 3);
    return toFixedTrim(ms, msDecimals) + 'ms';
  }

  if (ms < 60_000) {
    return toFixedTrim(ms / 1000, precision) + 's';
  }

  const DAY = 86_400_000;
  const HOUR = 3_600_000;
  const MINUTE = 60_000;

  const days = (ms / DAY) | 0;
  ms -= days * DAY;

  const hours = (ms / HOUR) | 0;
  ms -= hours * HOUR;

  const minutes = (ms / MINUTE) | 0;
  ms -= minutes * MINUTE;

  const seconds = ms / 1000; // fractional seconds

  const parts = [];

  if (days) parts.push(days + 'd');
  if (days || hours) parts.push(hours + 'h');
  if (days || hours || minutes) parts.push(minutes + 'm');

  parts.push(toFixedTrim(seconds, precision) + 's');

  return parts.join(' ');
}

/**
 * @param {number} num
 * @param {number} precision
 * @return {string}
 */
function toFixedTrim (num, precision) {
  if (precision <= 0) return String(Math.round(num));

  let str = num.toFixed(precision);

  // trim trailing zeros and a trailing dot
  let i = str.length - 1;
  while (i >= 0 && str[i] === '0') i--;
  if (i >= 0 && str[i] === '.') i--;

  return str.slice(0, i + 1);
}
