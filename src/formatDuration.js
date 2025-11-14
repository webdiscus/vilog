/**
 * Formats time (ms) duration to human readable string.
 */

// durations in milliseconds
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

/**
 * Postfix used to extend decimals to exactly 3 places (faster than pad).
 * @type {string[]}
 */
const zeros = ['00', '0'];

/**
 * Compact unit labels in order.
 * ns → µs → ms → s → m → h → d
 */
let units = ['ns', 'µs', 'ms', 's', 'm', 'h', 'd'];

/**
 * String to display between the count and the unit.
 * @type {string}
 */
let spacer = '';

/**
 * String to display between units.
 * @type {string}
 */
let delimiter = ' ';

/**
 * Scale from milliseconds to thousandths of the target unit.
 * Index mapping:
 *   0=ns (ms * 1e9) → thousandths of ns
 *   1=µs (ms * 1e6) → thousandths of µs
 *   2=ms (ms * 1e3) → thousandths of ms
 *   3=s  (ms * 1)   → thousandths of s (i.e., ms)
 */
const factor = [1e9, 1e6, 1e3, 1, 1e-3];

/**
 * A tiny bias for correct rounding near floating-point boundaries.
 * Real measurements like `1.235µs` may be stored as `1.23499999999999` due to binary representation limits.
 * This epsilon nudges rounding slightly upward, so values with binary rounding error still round correctly to `1.235µs`
 * instead of incorrectly truncating to `1.234µs`.
 */
const epsilon = 0.5 + 1e-12;

/**
 * Convert milliseconds to an integer count of thousandths of the target unit.
 *
 * @param {number} ms Milliseconds.
 * @param {0|1|2|3} idx Target unit index: 0=ns, 1=µs, 2=ms, 3=s.
 * @returns {number} Integer ≥ 0, thousandths of the target unit.
 */
const toUnit = (ms, idx) => Math.floor(ms * factor[idx] + epsilon);

/**
 * Format a duration (milliseconds) in a human-readable style.
 * The duration range is from nanosecond to days.
 *
 * Human-Readable compact style:
 * ```
 * 365d 23h 59m 10s ---------------┐
 *   3d 10h 59m 10s                |
 *       1h 59m 10s                ├- minute-up range (d, h, m, s)
 *          59m 10s ---------------┘
 *              10.201s -----------┐
 *                 201.302ms       ├- sub-minute range (s, ms, µs, ns)
 *                     302.401µs   |
 *                     401.512ns --┘
 * ```
 *
 * ## Display precision rule
 * First normalize the value to the target display unit,
 * then round or truncate only within that unit's visible precision.
 *
 * ## Behavior
 *
 * **Sub-minute (< 60_000 ms):** auto-scales across ns → µs → ms → s and prints up to 3 decimals
 *    (rounded). Trailing zeros are optionally trimmed.
 *
 * **Minute and up (≥ 60_000 ms):** prints `d h m s`, truncating milliseconds by design.
 *
 * **Around-minute rule:**
 *   - If value < 60_000 ms, format as `s.xxx` with round to milliseconds.
 *   - If rounding yields exactly `60.000s`, promote to `1m 0s`.
 *   - If value ≥ 60_000 ms, truncate milliseconds (no rounding to next minute).
 *
 * @param {number} ms Duration in milliseconds. Assumes `ms >= 0` and finite.
 * @param {object} options
 * @param {boolean} [options.trim=true] When true, trims trailing zeros in fractional part (sub-minute only).
 *   When false, always renders exactly 3 decimals (e.g., `1.230ms`).
 * @return {string} Human-readable duration string.
 *
 * @example
 * formatDuration(0.000456789)  // "456.789ns"
 * formatDuration(1.2345)       // "1.235ms"
 * formatDuration(58_999.999)    // "59s" (round up)
 * formatDuration(119_999)      // "1m 59s" (truncate 999ms, not round up to 2m)
 * formatDuration(3_726_789)    // "1h 2m 6s"
 */
function formatDuration(ms, { trim } = { trim: true }) {
  // sub-minute range: ns/µs/ms/s
  if (ms < MINUTE) {
    // pick unit index (0=ns, 1=µs, 2=ms, 3=s)
    let idx = ms < 1e-3 ? 0 : ms < 1 ? 1 : ms < 1e3 ? 2 : 3;

    // integer thousandths of target unit
    let val = toUnit(ms, idx);

    // carry once if rounding hit 1000.000 of current unit,
    // e.g.: 1000ns -> 1µs, 1000µs -> 1ms, 1000ms -> 1s
    if (idx < 3 && val >= 1e6) {
      return '1' + spacer + units[++idx];
    }

    // 59_999.999 ms rounds to 60.000s -> promote to "1m 0s"
    if (idx === 3 && val >= MINUTE) {
      return `1${spacer + units[4]} 0${spacer + units[3]}`;
    }

    // format fractional part (3 decimals max)
    let out = '' + (val / 1e3);

    if (!trim) {
      let pos = out.indexOf('.');
      out += ~pos ? zeros[out.length - pos - 2] : '.000';
    }

    return out + spacer + units[idx];
  }

  // minute-up range: decompose ms to days/hours/minutes/seconds and truncate milliseconds
  let d = (ms / DAY) | 0;
  ms -= d * DAY; // a tick faster than `rest %= DAY`

  let h = (ms / HOUR) | 0;
  ms -= h * HOUR;

  let m = (ms / MINUTE) | 0;
  ms -= m * MINUTE;

  // truncate milliseconds in minute-up range (e.g., 1m 59.999s → 1m 59s)
  let s = ms / 1000 | 0;

  // carry seconds -> minutes -> hours -> days
  if (s >= 60) {
    s = 0;
    m++;
    if (m === 60) {
      m = 0;
      h++;
      if (h === 24) {
        h = 0;
        d++;
      }
    }
  }

  // build trimming string "d h m s"
  let parts = [];
  if (d) parts.push(d + spacer + units[6]);
  if (d || h) parts.push(h + spacer + units[5]);
  if (d || h || m) parts.push(m + spacer + units[4]);
  parts.push(s + spacer + units[3]);

  return parts.join(delimiter);
}

export default formatDuration;
