import { describe, test, expect } from 'vitest';

import formatDate from '../src/formatDate.js';

describe('Format date pattern', () => {
  test('ISO8601 date-format', async () => {
    const pattern = '%d';
    const expected = '2025-12-31T09:01:05.075Z';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('date', async () => {
    const pattern = '%d{YYYY-MM-DD}';
    const expected = '2025-12-31';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('time', async () => {
    const pattern = '%d{HH:mm:ss}';
    const expected = '09:01:05';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('time with milliseconds', async () => {
    const pattern = '%d{HH:mm:ss.sss}';
    const expected = '09:01:05.075';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('timestamp', async () => {
    const pattern = '%d{ts}';
    const expected = '1767168065';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('timestamp.milliseconds', async () => {
    const pattern = '%d{ts.sss}';
    const expected = '1767168065.075';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('full year', async () => {
    const pattern = '%d{YYYY}';
    const expected = '2025';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('short year', async () => {
    const pattern = '%d{YY}';
    const expected = '25';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('special date-format', async () => {
    const pattern = '%d{YYYY/MM/DD-HH.mm.ss}';
    const expected = '2025/12/31-09.01.05';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });

  test('single date-format pattern', async () => {
    const pattern = '%d{YYYY-MM-DD HH:mm:ss.sss}';
    const expected = '2025-12-31 09:01:05.075';
    const received = formatDate(pattern, new Date('2025-12-31 09:01:05.075'));

    expect(received).toBe(expected);
  });
});
