import { describe, test, expect, vi, beforeEach } from 'vitest';
import {importModule} from './testHelpers.js';

const importVilog = async ()=> importModule('../src/index.js')

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
  const ansis = new Ansis(0); // force init with level 0
  return { default: ansis, Ansis }
});

describe('Vilog API', () => {
  test('returns compiled string and default out prints', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo');

    const received = log('test');
    expect(received).toEqual(expect.stringMatching(/foo test/));
    expect(outSpy).toHaveBeenCalledWith(expect.stringMatching(/foo test/));
  });

  test('duplicate namespace returns same instance and warns once', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('foo:bar');
    const b = new Vilog('foo:bar');

    expect(a).toBe(b);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(/already exists/i);
  });

  test('override log method via options', async () => {
    const Vilog = await importVilog();
    const outSpy = vi.fn();

    const log = new Vilog('foo:bar', {
      log(message) {
        outSpy(message);
      },
    });

    const received = log('x', 1, 2);
    expect(received).toEqual(expect.stringMatching(/foo:bar x/));
    expect(outSpy).toHaveBeenCalledWith(expect.stringMatching(/foo:bar x/));
  });

  test('override render via options', async () => {
    const Vilog = await importVilog();
    const outSpy = vi.fn();

    const log = new Vilog('foo:bar', {
      render({ ns, msg, diff, total }) {
        return `<<${ns}>> ${msg}`;
      },
      log(message) {
        outSpy(message);
      },
    });

    const received = log('test');
    expect(received).toBe('<<foo:bar>> test');
    expect(outSpy).toHaveBeenCalledWith('<<foo:bar>> test');
  });
});

describe('Vilog enable/disable', () => {
  test('options.enabled=false disables this namespace', async () => {
    const Vilog = await importVilog();

    const log = new Vilog('init:off', { enabled: false });
    expect(log.enabled).toBe(false);

    const received = log('hidden');
    expect(received).toBeUndefined();
    expect(outSpy).not.toHaveBeenCalled();
  });

  test('options.enabled=false, DEBUG=*', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = '*';

    const log1 = new Vilog('foo', { enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog('bar', { enabled: false });
    expect(log2.enabled).toBe(true);
  });

  test('options.enabled=false, DEBUG=foo', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'foo';

    const log1 = new Vilog('foo', { enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog('bar', { enabled: false });
    expect(log2.enabled).toBe(false);
  });

  test('options.enabled=false, DEBUG=foo:*', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'foo:*';

    const log1 = new Vilog('foo:one', { enabled: false });
    expect(log1.enabled).toBe(true);

    const log2 = new Vilog('foo:two', { enabled: false });
    expect(log2.enabled).toBe(true);

    const log3 = new Vilog('bar:one', { enabled: false });
    expect(log3.enabled).toBe(false);
  });

  test('options.enabled=false, DEBUG=not_matched', async () => {
    const Vilog = await importVilog();

    process.env.DEBUG = 'not_matched';

    const log = new Vilog('foo', { enabled: false });
    expect(log.enabled).toBe(false);
  });

  test('enabled getter/setter toggles per ns (no global override)', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('a:x');
    const b = new Vilog('b:x');

    expect(a.enabled).toBe(true);
    expect(b.enabled).toBe(true);

    a.enabled = false;
    expect(a('test a')).toBe(undefined);
    expect(b('test b')).toEqual(expect.stringMatching(/b:x test b/));

    a.enabled = true;
    expect(a('test a')).toEqual(expect.stringMatching(/a:x test a/));
  });

  test('disable() -> all off; enable() -> clear all rules', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('a');
    const b = new Vilog('b');

    Vilog.disable(); // same as '*'
    expect(a.enabled).toBe(false);
    expect(b.enabled).toBe(false);

    Vilog.enable(); // clear all rules
    expect(a.enabled).toBe(true);
    expect(b.enabled).toBe(true);

    // also accept explicit '*'
    Vilog.disable('*');
    expect(a.enabled).toBe(false);
    Vilog.enable('*'); // clears all
    expect(a.enabled).toBe(true);
  });

  test('disable("b:*") disables namespace by prefix', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('a:x');
    const b1 = new Vilog('b:x');
    const b2 = new Vilog('b:y');

    a('ok');
    b1('ok');
    b2('ok');

    expect(outSpy).toHaveBeenCalledTimes(3);
    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('a:x ok')],
      [expect.stringContaining('b:x ok')],
      [expect.stringContaining('b:y ok')],
    ]);

    outSpy.mockClear();

    Vilog.disable('b:*');

    a('ok2');
    b1('hidden1');
    b2('hidden2');

    expect(outSpy).toHaveBeenCalledTimes(1);
    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('a:x ok2')],
    ]);
  });

  test('disable exact namespace', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('foo:a');
    const b = new Vilog('foo:b');

    Vilog.disable('foo:b');

    a('keep');
    b('drop');

    expect(outSpy.mock.calls).toEqual([
      [expect.stringContaining('foo:a keep')],
    ]);
  });

  test('enable(pattern) removes rule', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('a:x');

    Vilog.disable('a:*');
    a('hidden');
    expect(outSpy).not.toHaveBeenCalled();

    Vilog.enable('a:*');
    a('shown');
    expect(outSpy).toHaveBeenCalledWith(expect.stringMatching(/a:x shown/));
  });

  test('enable per instance does not override global "*"', async () => {
    const Vilog = await importVilog();

    const a = new Vilog('a');

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
