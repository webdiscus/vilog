import { describe, test, expect, vi } from 'vitest';

import { formatMs } from '../src/helpers.js';

describe('formatMs', () => {
  test.each([
    // millisecond outputs, decimals are microseconds (µs = mcs)
    [200.12345678, { precision: 0 }, '200ms'], // rounded to 200ms
    [200.12345678, { precision: 2 }, '200ms'], // rounded to 200ms
    [200.12345678, { precision: 3 }, '200ms'], // rounded to 200ms
    [200.12345678, { precision: 4 }, '200.1ms'], // 200ms 100mcs
    [200.12345678, { precision: 5 }, '200.12ms'], // 200ms 120mcs
    [200.12345678, { precision: 8 }, '200.12346ms'], // 200ms 123mcs 460ns

    // second outputs, decimals are millisecond, from 4 pos - microseconds, from 7 pos - nanoseconds
    [1200.12345678, { precision: 3 }, '1.2s'], // 1s 200ms
    [1200.12345678, { precision: 4 }, '1.2001s'], // 1s 200ms 100mcs
    [1200.12345678, { precision: 5 }, '1.20012s'], // 1s 200ms 120mcs
    [1200.12345678, { precision: 8 }, '1.20012346s'], // 1s 200ms 123mcs 460ns
    [999, undefined, '999ms'],
    [1000, undefined, '1s'],
    [1309, undefined, '1.309s'],
    [3_724, undefined, '3.724s'],
    [6_001, undefined, '6.001s'],
    [1309, undefined, '1.309s'],
    [1309, { precision: 1 }, '1.3s'],
    [119_999, undefined, '1m 59.999s'],
    [60_000, undefined, '1m 0s'],
    [3_726_789, undefined, '1h 2m 6.789s'],
    [3_600_501, undefined, '1h 0m 0.501s'],
    [3_600_500, undefined, '1h 0m 0.5s'], // trim trailing zeros
    [3_600_000, undefined, '1h 0m 0s'],
    [172_801_234, undefined, '2d 0h 0m 1.234s'],
    [172_800_000, undefined, '2d 0h 0m 0s'],
  ])('formatMs(%s, %o) => %s', async (input, opts, expected) => {
    const received = formatMs(input, opts);
    expect(received).toBe(expected);
  });
});
