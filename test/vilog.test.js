import { describe, test, expect, vi, beforeEach } from 'vitest';
import {importModule} from './util/helpers.js';

const importVilog = async ()=> importModule('../../src/index.js')

let outSpy;
let consoleLogSpy;
let consoleWarnSpy;

beforeEach(() => {
  outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
  //consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// full module mock
vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(0); // force disable colors
  return { default: ansis, Ansis }
});

describe('Vilog API', () => {
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
