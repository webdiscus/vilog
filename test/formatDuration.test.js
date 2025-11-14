import { describe, test, expect, afterAll } from 'vitest';

import timer from '../src/timer.js';
import formatDuration from '../src/formatDuration.js';
import { sleep, syncSleep } from './util/helpers.js';

const { now } = timer;

describe('epsilon-sensitive cases', () => {
  test.each([
    [0.001234489999999999, '1.234µs'],
    [0.001234499999999999, '1.235µs'],
    [0.001234500999999999, '1.235µs'],

    [0.001000489999999999, '1µs',],
    [0.001000499999999999, '1.001µs'],
    [0.001000500999999999, '1.001µs'],

    // very tiny ns
    [0.000000000489999999999, '0ns'],
    [0.000000000499999999999, '0.001ns'],
    [0.000000000500999999999, '0.001ns'],
    [0.000000001499999999999, '0.002ns'],
  ])('%s → %s|%s (depends on epsilon)', (ms, expected) => {
    const received = formatDuration(ms);
    expect(received).toBe(expected);
  });
});

describe('nanosecond range', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    [0.000_000_001, '0.001ns'], // smallest displayable unit, no scaling to picoseconds

    [0.000_000_000_240_777_0165, '0ns'], // below measurable range, <0.001ns treated as noise
    [0.000_000_000_499_720_0165, '0ns'], // still below rounding threshold (no carry to 0.001ns)

    [0.000_000_000_540_777_0165, '0.001ns'], // round within normalized unit: 0.540 → 0.001ns;
                                             // rounding applied only to the thousandths after the point
                                             // normalize first, then round within measurable range

    [0.000_000_001_499_999_0165, '0.001ns'], // below rounding threshold (stays 0.001ns)
    [0.000_000_001_500_777_0165, '0.002ns'], // above rounding threshold (0.0015ns → 0.002ns)
    [0.000_000_009_500_777_0165, '0.01ns'],  // above rounding threshold (0.0095ns → 0.01ns)

    [0.000_000_021_499_999_0165, '0.021ns'],
    [0.000_000_021_500_777_0165, '0.022ns'], // round up: 0.0215ns → 0.022ns
    [0.000_000_099_500_777_0165, '0.1ns'],   // round up: 0.0995ns → 0.1ns

    [0.000_000_120_499_999_0165, '0.12ns'],
    [0.000_000_120_500_777_0165, '0.121ns'], // round up: 0.1205ns → 0.121ns
    [0.000_000_199_500_777_0165, '0.2ns'],   // round up: 0.1995ns → 0.2ns

    [0.000_000_999_499_999_0165, '0.999ns'],
    [0.000_000_999_500_777_0165, '1ns'],     // round up: 0.9995ns → 1ns

    [0.000_001_900_499_999_0165, '1.9ns'],
    [0.000_001_909_500_777_0165, '1.91ns'],  // round up: 1.9095ns → 1.91ns
    [0.000_001_900_500_777_0165, '1.901ns'], // round up: 1.9005ns → 1.901ns

    [0.000_098_999_500_777_0165, '99ns'],     // round up: 98.9995 → 99ns
    [0.000_099_900_499_999_0165, '99.9ns'],
    [0.000_099_989_500_777_0165, '99.99ns'],  // round up: 99.9895 → 99.99ns
    [0.000_099_998_500_777_0165, '99.999ns'], // round up: 98.9985 → 99.999ns
    [0.000_099_999_500_777_0165, '100ns'],    // round up: 99.9995 → 100ns

    [0.000_999_099_500_777_0165, '999.1ns'],  // round up: 999.0995 → 999.1ns
    [0.000_999_119_500_777_0165, '999.12ns'],  // round up: 999.1995 → 999.12ns
    [0.000_999_120_500_777_0165, '999.121ns'],  // round up: 999.1205 → 999.121ns
    [0.000_999_998_500_777_0165, '999.999ns'],  // round up: 999.9985 → 999.999ns

    [0.000_999_999_499_999_0165, '999.999ns'],
  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start

    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    // process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    // process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('microsecond range', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    [0.001, '1µs'],
    [0.000_999_999_500_777_0165, '1µs'],  // carry after rounding: 999.9995ns → 1µs
    [0.001_900_499_999_888_0165, '1.9µs'],
    [0.001_909_500_777_888_0165, '1.91µs'], // round up: 1.9095 → 1.91µs

    [0.098_999_500_777_888_0165, '99µs'],     // round up: 98.9995 → 99µs
    [0.099_998_500_777_888_0165, '99.999µs'], // round up: 98.9985 → 99.999µs

    [0.999_119_500_777_888_0165, '999.12µs'],  // round up: 999.1995 → 999.12µs
    [0.999_998_500_777_888_0165, '999.999µs'], // round up: 999.9985 → 999.999µs

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    // process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    // process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('millisecond range', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    [1, '1ms'],
    [0.999_999_500_777_888_0165, '1ms'],  // carry after rounding: 999.9995µs → 1ms
    [1.900_499_999_888_999_0165, '1.9ms'],
    [1.909_500_777_888_999_0165, '1.91ms'], // round up: 1.9095 → 1.91ms

    [98.999_500_777_888_999_0165, '99ms'],     // round up: 98.9995 → 99ms
    [99.998_500_777_888_999_0165, '99.999ms'], // round up: 98.9985 → 99.999ms

    [999.119_500_777_888_999_0165, '999.12ms'],  // round up: 999.1995 → 999.12ms
    [999.998_500_777_888_999_0165, '999.999ms'], // round up: 999.9985 → 999.999ms

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    // process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    // process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

// Around minute rule:
// - if value < 60_000 ms, format as s.xxx with round half-up to milliseconds
// - if rounding yields 60.000s, promote to 1m 0s
// - if value >= 60_000 ms, truncate milliseconds

describe('second range', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    [1000, '1s'],
    [999.999_500_777_888_0165, '1s'],  // carry after rounding: 999.9995ms → 1s

    [1909.499_999_888_0165, '1.909s'],
    [1909.500_777_888_0165, '1.91s'], // round up: 1.9095 → 1.91s

    [58999.500_777_888_999_0165, '59s'],     // round up: 58.9995 → 59s
    [59899.500_777_888_999_0165, '59.9s'],   // round up: 59.8995 → 59.9s
    [59989.500_777_888_999_0165, '59.99s'],  // round up: 59.9895 → 59.99s
    [59998.500_777_888_999_0165, '59.999s'], // round up: 59.9985 → 59.999s
    [59999.499_999_888_999_0165, '59.999s'],
  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

// Minute-up (>= 60 000 ms) rules:
// - Not round boundary values of microseconds -> milliseconds -> seconds
// - Truncate milliseconds

describe('minute range', () => {
  // durations in milliseconds
  let elapsed = 0;
  let buf = [];

  test.each([
    [60_000, '1m 0s'],
    [59_999.599, '1m 0s'], // carry after rounding: 59.9995s → 60.000s promote → 1m 0s

    [60_000.499, '1m 0s'], // truncate microseconds
    [60_000.599, '1m 0s'], // truncate microseconds

    [60_499.599, '1m 0s'], // truncate milliseconds
    [60_999.599, '1m 0s'], // truncate milliseconds, not round up → 1m 1s

    [61_999.599, '1m 1s'], // truncate milliseconds

    [119_999.599, '1m 59s'], // not round up → 2m 0s

    [3_599_999.599, '59m 59s'], // not round up → 1h 0m 0s

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('hour range', () => {
  // durations in milliseconds
  let elapsed = 0;
  let buf = [];

  test.each([
    [3_600_000, '1h 0m 0s'],
    [3_600_999.599, '1h 0m 0s'], // truncate ms
    [3_726_999.599, '1h 2m 6s'], // truncate ms
    [86_399_999.599, '23h 59m 59s'], // truncate ms

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('day range', () => {
  // durations in milliseconds
  let elapsed = 0;
  let buf = [];

  test.each([
    [86_400_000, '1d 0h 0m 0s'],
    [86_400_999.999, '1d 0h 0m 0s'], // truncate ms
    [86_459_999.999, '1d 0h 0m 59s'], // truncate ms
    [86_460_999.999, '1d 0h 1m 0s'], // truncate ms
    [89_999_999.999, '1d 0h 59m 59s'], // truncate ms
    [90_000_999.999, '1d 1h 0m 0s'], // truncate ms
    [172_799_999.999, '1d 23h 59m 59s'], // truncate ms
    [172_800_999.999, '2d 0h 0m 0s'], // truncate ms

    [2_073_600_999.999, '24d 0h 0m 0s'], // truncate ms
    [2_678_400_999.999, '31d 0h 0m 0s'], // truncate ms
    [31_536_000_999.999, '365d 0h 0m 0s'], // truncate ms

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('keep trailing zeros', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    [1000, '1.000s'],
    [1100, '1.100s'],
    [1110, '1.110s'],
    [1,    '1.000ms'],
    [1.1,  '1.100ms'],
    [1.11, '1.110ms'],

  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms, { trim: false });
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('remove trailing zeros (default)', () => {
  let elapsed = 0;
  let buf = [];

  test.each([
    // remove zeros
    [1, '1ms'],
    [1.1, '1.1ms'],
    [1.11, '1.11ms'],
    [0.1230001, '123µs'],
    [0.1231001, '123.1µs'],
    [0.1231201, '123.12µs'],
    [0.1231231, '123.123µs'],
  ])('%s → %s', (ms, expected) => {
    let start = now();
    const received = formatDuration(ms);
    let duration = now() - start
    elapsed += duration;
    buf.push(duration);

    expect(received).toBe(expected);
  });

  afterAll(() => {
    //process.stdout.write(`Duration:\n${buf.join('\n')}\n`);
    //process.stdout.write(`\n---\nElapsed: ${elapsed}\n`);
  });
});

describe('Visual check of formatting of measured duration', () => {
  test('format nanoseconds', async() => {
    let i;
    let start = now();
    for (i = 0; i < 10; i++) {
      // do something
    }
    let duration = now() - start;
    let durationFmt = formatDuration(duration);

    console.log({duration, formated: durationFmt});
  });

  test('format microseconds', () => {
    let i;
    let start = now();
    for (i = 0; i < 1000; i++) {
      // do something
    }
    let duration = now() - start;
    let durationFmt = formatDuration(duration);

    console.log({duration, formated: durationFmt});
  });

  test('format milliseconds', async() => {
    let start = now();
    await sleep(50);
    let duration = now() - start;
    let durationFmt = formatDuration(duration);

    console.log({duration, formated: durationFmt});
  });

  test('format ~1 second', async() => {
    let start = now();
    await sleep(1500);
    let duration = now() - start;
    let durationFmt = formatDuration(duration);

    console.log({duration, formated: durationFmt});
  });
});
