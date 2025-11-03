import { describe, test, expect, afterAll } from 'vitest';

import timer from '../src/timer.js';
import { durationFormat } from '../src/durationFormat.js';

const { now } = timer;

describe('durationFormat auto-scale to a neighbor unit in range [ns, s])', () => {
  let elapsed = 0;
  let buf = [];

  // Sub-minute (< 60 000 ms) rules:
  // - Format as seconds with up to 3 decimals, using round half-up to milliseconds.
  // - If the rounded value hits 60.000s, render "1m 0s" (don't print 60.000s).
  // Examples:
  // - 59 999.499 ms → rounds to 59.999s → 59.999s
  // - 59 999.500 ms → rounds to 60.000s → 1m 0s
  // - 59 999.999 ms → rounds to 60.000s → 1m 0s

  test.each([
    // edge cases about 1m
    [59_999.499,   undefined, '59.999s'], // stay in sub-minute range
    [59_999.500,   undefined, '1m 0s'], // carry to minute-up range

    // seconds (s)
    [59_999,       undefined, '59.999s'],
    [59_000,       undefined, '59s'],
    [58_999,       undefined, '58.999s'],
    [58_999.999,   undefined, '59s'],     // rounds up to 59.000s
    [1_309,        undefined, '1.309s'],  // fractional s
    [1_300,        undefined, '1.3s'],
    [1000,        undefined, '1s'],      // exact 1s
    [999.9996,    undefined, '1s'],      // ms->s carry after rounding
    [999.99961234,undefined, '1s'],      // ms->s carry after rounding

    // milliseconds (ms)
    [999,         undefined, '999ms'],
    [200.12345678,undefined, '200.123ms'],
    [1.2345,      undefined, '1.235ms'], // rounding
    [1.234,       undefined, '1.234ms'],
    [1,           undefined, '1ms'],
    [0.9999994,undefined, '999.999µs'],
    [0.9999995,undefined, '1ms'],        // rounds up to 1ms

    // microseconds (µs)
    [0.5,         undefined, '500µs'],
    [0.123456789, undefined, '123.457µs'],
    [0.001,       undefined, '1µs'],

    // nanoseconds (ns)
    [0.000999999, undefined, '999.999ns'],
    [0.0009999994,undefined, '999.999ns'], // near 1000ns but without carry
    [0.0009999996,undefined, '1µs'],       // ns->µs carry after rounding
    [0.000456789, undefined, '456.789ns'],
    [0.000001,    undefined, '1ns'],
    [0.000000789, undefined, '0.789ns'],
    [0.0000009994,undefined, '0.999ns'],
    [0.0000009995,undefined, '1ns'],       // 0.9995ns rounded to 1.000ns
    [0.00000099956,undefined,'1ns'],       // 0.99956ns rounded to 1.000ns
    [0.0000009996,undefined, '1ns'],       // 0.9996ns rounded to 1.000ns

    [0.0000000012341310065, undefined, '0.001ns'], // smallest displayable unit
    [0.0000000002341310065, undefined, '0ns'], // less than smallest displayable unit, no real-world usage, just a noise

    // remove trailing zeros
    [1000.001,    undefined, '1s'],       // 1.000s -> "1s"
    [1100,        undefined, '1.1s'],     // 1.100s -> "1.1s"
    [1110,        undefined, '1.11s'],    // 1.110s -> "1.11s"
    [1,           undefined, '1ms'],      // 1.000ms -> "1ms"
    [1.1,         undefined, '1.1ms'],    // 1.100ms -> "1.1ms"
    [1.11,        undefined, '1.11ms'],   // 1.110ms -> "1.11ms"

    // remove zeros
    [1,    true, '1ms'],
    [1.1,  true, '1.1ms'],
    [1.11, true, '1.11ms'],
    [0.1230001, true, '123µs'],
    [0.1231001, true, '123.1µs'],
    [0.1231201, true, '123.12µs'],
    [0.1231231, true, '123.123µs'],

    // keeps trailing zeros
    [1000, false, '1.000s'],
    [1100, false, '1.100s'],
    [1110, false, '1.110s'],
    [1,    false, '1.000ms'],
    [1.1,  false, '1.100ms'],
    [1.11, false, '1.110ms'],
  ])('durationFormat(%s, %o) => %s', (input, trimTrailingZeros, expected) => {
    let start = now();
    const received = durationFormat(input, trimTrailingZeros);
    let duration = now() - start

    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    process.stdout.write(`Duration:\n${buf.join('\n')}`);
    process.stdout.write(`\n---\nElapsed: ${elapsed}`);
  });
});

describe('durationFormat auto-scale to a neighbor unit in range [seconds, days])', () => {
  // durations in milliseconds
  const DAY = 86_400_000;
  const HOUR = 3_600_000;
  const MINUTE = 60_000;

  let elapsed = 0;
  let buf = [];

  // Minute-up (>= 60 000 ms) rules:
  // - Not round boundary values of microseconds -> milliseconds -> seconds
  // - Truncate milliseconds

  test.each([
    [60_000, undefined, '1m 0s'],
    [60_000.999, undefined, '1m 0s'], // truncate microseconds in minute range
    [60_001.123456, undefined, '1m 0s'],

    [60_499.999, undefined, '1m 0s'], // truncate milliseconds in minute range
    [60_500.999, undefined, '1m 0s'],

    [119_999, undefined, '1m 59s'],

    // truncate milliseconds, no "round up to next unit"
    [119_998.4, undefined, '1m 59s'], // not 1m 59.998s
    [119_998.5, undefined, '1m 59s'], // not 1m 59.999s
    [119_999.4, undefined, '1m 59s'], // not 1m 59.999s
    [119_999.5, undefined, '1m 59s'], // not 2m 0s (don't round in minute-up range)

    [60_000, undefined, '1m 0s'],
    [59 * MINUTE + 59999, undefined, '59m 59s'],
    [3_726_789, undefined, '1h 2m 6s'],
    [3_600_501, undefined, '1h 0m 0s'],
    [3_600_500, undefined, '1h 0m 0s'],
    [3_600_000, undefined, '1h 0m 0s'],
    [172_800_000, undefined, '2d 0h 0m 0s'],
    [172_801_234, undefined, '2d 0h 0m 1s'],
    [172_901_234, undefined, '2d 0h 1m 41s'],
    [179_901_234, undefined, '2d 1h 58m 21s'],
    [259_199_234, undefined, '2d 23h 59m 59s'],
    [259_200_234, undefined, '3d 0h 0m 0s'],
    [25 * DAY, undefined, '25d 0h 0m 0s'],
    [31 * DAY + 12 * HOUR + 40 * MINUTE, undefined, '31d 12h 40m 0s'],
    [365 * DAY + 23 * HOUR + 59 * MINUTE + 59999, undefined, '365d 23h 59m 59s'],
  ])('durationFormat(%s, %o) => %s', (input, trimTrailingZeros, expected) => {
    let start = now();
    const received = durationFormat(input, trimTrailingZeros);
    let duration = now() - start

    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    process.stdout.write(`Duration:\n${buf.join('\n')}`);
    process.stdout.write(`\n---\nElapsed: ${elapsed}`);
  });
});
