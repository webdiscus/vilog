import { describe, test, expect } from 'vitest';

import formatString from '../src/formatString.js';

describe('Format message', () => {
  const obj = {
    res: null,
    item: undefined,
    str: 'ok',
    num: 3,
    arr: ['foo', 'bar'],
    obj: { s: 'abc', n: 123},
  }

  test('null', async () => {
    const expected = 'null';
    const received = formatString(null);

    expect(received).toBe(expected);
  });

  test('undefined', async () => {
    const expected = 'undefined';
    const received = formatString();

    expect(received).toBe(expected);
  });

  test('string', async () => {
    const args = [
      'text'
    ];
    const expected = 'text';
    const received = formatString('text');

    expect(received).toBe(expected);
  });

  test('number - Math.PI', async () => {
    const expected = '3.141592653589793';
    const received = formatString(Math.PI);

    expect(received).toBe(expected);
  });

  test('object', async () => {
    const expected = '{"res":null,"str":"ok","num":3,"arr":["foo","bar"],"obj":{"s":"abc","n":123}}';
    const received = formatString(obj);

    expect(received).toBe(expected);
  });

  test('message w/o placeholders and object as argument', async () => {
    const expected = 'Data: {"res":null,"str":"ok","num":3,"arr":["foo","bar"],"obj":{"s":"abc","n":123}}';
    const received = formatString('Data:', obj);

    expect(received).toBe(expected);
  });

  test('message with %j placeholder and object as argument', async () => {
    const expected = 'Data {"res":null,"str":"ok","num":3,"arr":["foo","bar"],"obj":{"s":"abc","n":123}} was received';
    const received = formatString('Data %j was received', obj);

    expect(received).toBe(expected);
  });

  test('Current %%avr is 50%', async () => {
    const expected = 'Current %avr is 50%';
    const received = formatString('Current %%avr is %d%', 50);

    expect(received).toBe(expected);
  });

  test('Hello %s!', async () => {
    const expected = 'Hello world!';
    const received = formatString('Hello %s!', 'world');

    expect(received).toBe(expected);
  });

  test('Directory has %d files', async () => {
    const expected = 'Directory has 123 files';
    const received = formatString('Directory has %d files', 123);

    expect(received).toBe(expected);
  });

  test('Repo %s has over %d stars', async () => {
    const expected = 'Repo Vilog has over 1000 stars';
    const received = formatString('Repo %s has over %d stars', 'Vilog', 1000);

    expect(received).toBe(expected);
  });

  test('Object with circular dependencies', async () => {
    const data = {};
    data.self = data;

    const expected = '[Circular]';
    const received = formatString(data);

    expect(received).toBe(expected);
  });
});
