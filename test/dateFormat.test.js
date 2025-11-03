import { describe, test, expect, vi, beforeEach } from 'vitest';

import formatDate from '../src/formatDate.js';

describe('Pattern date format', () => {
  test('ISO8601 date-format', async () => {
    const pattern = 'Date: %d';
    const expected = 'Date: 2025-12-31T09:01:05.075Z';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);

  });

  test('date', async () => {
    const pattern = 'Date: %d{YYYY-MM-DD}';
    const expected = 'Date: 2025-12-31';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('time', async () => {
    const pattern = 'Time: %d{HH:mm:ss}';
    const expected = 'Time: 09:01:05';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('timestamp', async () => {
    const pattern = 'Timestamp: %d{ts}';
    const expected = 'Timestamp: 1767168065';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('timestamp.milliseconds', async () => {
    const pattern = 'Timestamp: %d{ts.sss}';
    const expected = 'Timestamp: 1767168065.075';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('full year', async () => {
    const pattern = '%d{YYYY}';
    const expected = '2025';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('short year', async () => {
    const pattern = '%d{YY}';
    const expected = '25';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('special date-format', async () => {
    const pattern = '%d{YYYY/MM/DD-HH.mm.ss}';
    const expected = '2025/12/31-09.01.05';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('single date-format pattern', async () => {
    const pattern = '[%d{YYYY-MM-DD HH:mm:ss.sss}]';
    const expected = '[2025-12-31 09:01:05.075]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('multiple date-format pattern', async () => {
    const pattern = '[Date: %d{YYYY-MM-DD}] [Time: %d{HH:mm:ss}] [Milliseconds: %d{sss}]';
    const expected = '[Date: 2025-12-31] [Time: 09:01:05] [Milliseconds: 075]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('date tokens as legend', async () => {
    const pattern = 'Date: %d{YYYY-MM-DD} (format: YYYY-MM-DD)';
    const expected = 'Date: 2025-12-31 (format: YYYY-MM-DD)';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });
});

describe('Malformed pattern', () => {
  test('malformed single date-format pattern', async () => {
    const pattern = 'Date %d{YYYY-MM-DD HH:mm:ss.sss malformed';
    const expected = pattern;
    const received = formatDate(pattern,{ date: new Date('2025-12-31T09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('malformed multiple date-format pattern: missing first "}"', async () => {
    const pattern = '[Date: %d{YYYY-MM-DD] [Time: %d{HH:mm:ss}] [Milliseconds: %d{sss}]';
    const expected = '[Date: %d{YYYY-MM-DD] [Time: 09:01:05] [Milliseconds: 075]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('malformed multiple date-format pattern: missing two "}"', async () => {
    const pattern = '[Date: %d{YYYY-MM-DD] [Time: %d{HH:mm:ss] [Milliseconds: %d{sss}]';
    const expected = '[Date: %d{YYYY-MM-DD] [Time: %d{HH:mm:ss] [Milliseconds: 075]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('malformed multiple date-format pattern: missing middle "}"', async () => {
    const pattern = '[Date: %d{YYYY-MM-DD}] [Time: %d{HH:mm:ss] [Milliseconds: %d{sss}]';
    const expected = '[Date: 2025-12-31] [Time: %d{HH:mm:ss] [Milliseconds: 075]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });

  test('malformed multiple date-format pattern: missing last "}"', async () => {
    const pattern = '[Date: %d{YYYY-MM-DD}] [Time: %d{HH:mm:ss}] [Milliseconds: %d{sss]';
    const expected = '[Date: 2025-12-31] [Time: 09:01:05] [Milliseconds: %d{sss]';
    const received = formatDate(pattern,{ date: new Date('2025-12-31 09:01:05.075') });

    expect(received).toBe(expected);
  });
});
