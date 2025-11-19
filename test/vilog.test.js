import { describe, test, expect, vi, beforeEach } from 'vitest';
import {importModule} from './util/helpers.js';
import Vilog from '../src/index.js';

const importVilog = async ()=> importModule('../../src/index.js')

let outSpy;
let consoleLogSpy;
let consoleWarnSpy;

// static values for mocked dynamic tokens
const date = new Date('2025-11-11 11:59:01.075');

beforeEach(() => {
  outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
  //consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// full module mock
vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(3); // force enable colors
  return { default: ansis, Ansis }
});

describe('Vilog API', () => {
  test('property `name`', async () => {
    const log = new Vilog({ name: 'myApp' });
    expect(log.name).toBe('myApp');
  });

  test('duplicate namespace returns same instance and warns once', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'foo:bar' });
    const b = new Vilog({ name: 'foo:bar' });

    expect(a).toBe(b);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(/already exists/i);
  });

  test('options.enabled=false disables this namespace', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({ name: 'init:off', enabled: false });
    expect(log.enabled).toBe(false);

    const received = log('hidden');
    expect(received).toBeUndefined();
    expect(outSpy).not.toHaveBeenCalled();
  });

  test('options.enabled=false, DEBUG=*', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = '*';

    const log1 = new Vilog({ name: 'foo', enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog({ name: 'bar', enabled: false });
    expect(log2.enabled).toBe(true);
  });

  test('options.enabled=false, DEBUG=foo', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'foo';

    const log1 = new Vilog({ name: 'foo', enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog({ name: 'bar', enabled: false });
    expect(log2.enabled).toBe(false);
  });

  test('options.enabled=false, DEBUG=foo:*', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'foo:*';

    const log1 = new Vilog({ name: 'foo:one', enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog({ name: 'foo:two', enabled: false });
    expect(log2.enabled).toBe(true);

    const log3 = new Vilog({ name: 'bar:one', enabled: false });
    expect(log3.enabled).toBe(false);
  });

  test('options.enabled=false, DEBUG=not_matched', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'not_matched';

    const log = new Vilog({ name: 'foo', enabled: false });
    expect(log.enabled).toBe(false);
  });

  test('enabled getter/setter toggles per ns (no global override)', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'a:x' });
    const b = new Vilog({ name: 'b:x' });

    expect(a.enabled).toBe(true);
    expect(b.enabled).toBe(true);

    a.enabled = false;
    expect(a('test a')).toBe(undefined);
    expect(b('test b')).toEqual(expect.stringMatching(/test b/));

    a.enabled = true;
    expect(a('test a')).toEqual(expect.stringMatching(/test a/));
  });

  test('disable() -> all off; enable() -> clear all rules', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'a' });
    const b = new Vilog({ name: 'b' });

    // disable all
    Vilog.disable(); // empty no arguments is the same as '*'
    expect(a.enabled).toBe(false);
    expect(b.enabled).toBe(false);

    // enable all
    Vilog.enable();
    expect(a.enabled).toBe(true);
    expect(b.enabled).toBe(true);

    // disable all
    Vilog.disable('*');
    expect(a.enabled).toBe(false);

    // enable all
    Vilog.enable('*'); // clears all
    expect(a.enabled).toBe(true);
  });

  test('disable("b:*") disables namespace by prefix', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'a:x' });
    const b1 = new Vilog({ name: 'b:x' });
    const b2 = new Vilog({ name: 'b:y' });

    a('a ok');
    b1('b1 ok');
    b2('b2 ok');

    expect(outSpy).toHaveBeenCalledTimes(3);
    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('a ok')],
      [expect.stringContaining('b1 ok')],
      [expect.stringContaining('b2 ok')],
    ]);

    outSpy.mockClear();

    Vilog.disable('b:*');

    a('a ok2');
    b1('hidden1');
    b2('hidden2');

    expect(outSpy).toHaveBeenCalledTimes(1);
    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('a ok2')],
    ]);
  });

  test('disable exact namespace', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'foo:a' });
    const b = new Vilog({ name: 'foo:b' });

    Vilog.disable('foo:b');

    a('a keep');
    b('b drop');

    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('a keep')],
    ]);
  });

  test('enable(pattern) removes rule', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'a:x' });

    Vilog.disable('a:*');
    a('hidden');
    expect(outSpy).not.toHaveBeenCalled();

    Vilog.enable('a:*');
    a('shown');
    expect(outSpy).toHaveBeenCalledWith(expect.stringMatching(/shown/));
  });

  test('enable per instance does not override global "*"', async () => {
    const Vilog = await importVilog();

    const a = new Vilog({ name: 'a' });

    Vilog.disable('*'); // global off
    a.enabled = true; // try to re-enable this namespace

    expect(a.enabled).toBe(false); // global still wins

    const received = a('hidden');
    expect(received).toBeUndefined();
    expect(outSpy).not.toHaveBeenCalled();

    Vilog.enable('*'); // global on
    expect(a.enabled).toBe(true);
  });
});

describe('silent mode', () => {
  test('options.silent=false', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({ silent: false });
    log('text');
    expect(outSpy).toHaveBeenCalled();
  });

  test('options.silent=true', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({ silent: true });
    log('text');
    expect(outSpy).not.toHaveBeenCalled();
  });

  test('options.silent=true, flush()', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      silent: true,
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    log('one');
    log.info('two');

    expect(outSpy).not.toHaveBeenCalled();

    Vilog.flush();
    const expected = `[90m2025-11-11T11:59:01.075Z[39m one
[90m2025-11-11T11:59:01.075Z[39m [36m[1mINFO[22m[39m two
`;

    expect(outSpy).toHaveBeenCalled();
    expect(outSpy).toHaveBeenCalledWith(expected);
  });

  test('options.silent=true, flush({ ret: true, color: false })', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      silent: true,
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    log('one');
    log.info('two');

    expect(outSpy).not.toHaveBeenCalled();

    const received = Vilog.flush({ ret: true, color: false });
    const expected = `2025-11-11T11:59:01.075Z one
2025-11-11T11:59:01.075Z INFO two`;

    expect(outSpy).not.toHaveBeenCalled();
    expect(received).toBe(expected);
  });

  test('options.silent=true, flush({ ret: false })', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      silent: true,
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    log('one');
    log.info('two');

    expect(outSpy).not.toHaveBeenCalled();

    Vilog.flush({ ret: false });
    const expected = `[90m2025-11-11T11:59:01.075Z[39m one
[90m2025-11-11T11:59:01.075Z[39m [36m[1mINFO[22m[39m two
`;

    expect(outSpy).toHaveBeenCalled();
    expect(outSpy).toHaveBeenCalledWith(expected);
  });
});
