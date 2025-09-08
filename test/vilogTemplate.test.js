import { describe, test, expect, vi, beforeEach } from 'vitest';
import color, { Ansis } from 'ansis';
import { importModule, sleep } from './testHelpers.js';

const importVilog = async () => importModule('../src/index.js');

let consoleLogSpy;
let consoleWarnSpy;

vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(3); // force init with truecolor
  return { default: ansis, Ansis }
});

describe('Vilog templates', () => {
  test('colored outputs', async () => {
    const Vilog = await importVilog();
    const log = new Vilog(' foo ');

    // override color theme
    log.themes.info.msg = color.whiteBright;
    log.themes.info.total = color.hex('#a48');

    const res = log('ping'); // sane as the `log.info()`
    expect(res).toEqual(`[[36m foo [39m] [97mping[39m [96m+0ms[39m ([38;2;170;68;136m0ms[39m)`);

    await sleep(10);
    const res1 = log.info('Info message');

    await sleep(100);
    const res2 = log.warn('Warning message');

    await sleep(55);
    const res3 = log.debug('Debug message');

    await sleep(35);
    const res4 = log.error('Error message');
  });
});

describe('Vilog timing', () => {
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('diff and total', async () => {
    const Vilog = await importVilog();

    const log = new Vilog('foo', {
      precision: 5,
      format ({ ns, msg, diff, total }) {
        return `[${ns}] ${msg} +${diff} (${total})`;
      },
    });

    // 1st call: immediate
    log('ping');

    // 2nd call: after ~500ms
    await sleep(500);
    log('ping2');

    // 3rd call: after ~800ms
    await sleep(800);
    log('ping3');

    // outputs like:
    // [foo] ping +0.06ms (0.06ms)
    // [foo] ping2 +502.76ms (502.82ms)
    // [foo] ping3 +802.98ms (1.3058s)

    // we should have exactly two console.log() calls
    expect(consoleLogSpy).toHaveBeenCalledTimes(3);

    // grab the two printed strings
    const calls = consoleLogSpy.mock.calls.map(([s]) => s);

    // 1st line should start with our prefix
    expect(calls[0]).toMatch(/^\[foo] ping/);

    // 2nd line should include +<ms> and (<ms>) with ~1.1s values
    expect(calls[1]).toMatch(/^\[foo] ping2 \+\d+(?:\.\d+)?ms \(\d+(?:\.\d+)?ms\)$/);

    // 3rd line should include +<ms> and (<ms>) with ~1.3s values
    expect(calls[2]).toMatch(/^\[foo] ping3 \+\d+(?:\.\d+)?ms \(\d+(?:\.\d+)?s\)$/);

    // extract numeric ms for precise range checks
    const m = calls[2].match(/\+(\d+(?:\.\d+)?)ms \((\d+(?:\.\d+)?)s\)$/);
    expect(m).not.toBeNull();

    const diff = Number(m[1]);
    const total = Number(m[2]);

    // allow some jitter; set a reasonable lower bound and no strict upper bound
    expect(diff).toBeGreaterThanOrEqual(800);  // ≥800ms
    expect(total).toBeGreaterThanOrEqual(1.300); // ≥1.3s
  });

});
