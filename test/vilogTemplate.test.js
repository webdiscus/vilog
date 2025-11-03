import { describe, test, expect, vi, beforeEach } from 'vitest';
import color, { Ansis } from 'ansis';
import { importModule, sleep } from './testHelpers.js';

const importVilog = async () => importModule('../src/index.js');

let outSpy;

vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(3); // force init with truecolor
  return { default: ansis, Ansis };
});

describe('Vilog layouts', () => {
  test('colored default output', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo');

    // override color theme
    log.themes.info.msg = color.whiteBright;
    log.themes.info.total = color.hex('#a48');

    const res = log('ping'); // sane as the `log.info()`
    expect(res).toEqual(`[[36mfoo[39m] [97mping[39m [96m+0ms[39m ([38;2;170;68;136m0ms[39m)`);

    await sleep(10);
    log.info('Info message');

    await sleep(100);
    log.warn('Warning message');

    await sleep(55);
    log.error('Error message');

    await sleep(35);
    log.debug('Debug message');
  });

  test('colored custom render: ns level(bg) msg diff total', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo', {
      render: ({ ns, level, msg, diff, total }, theme) => {
        return `${theme.ns(ns)} ${theme.level(` ${level} `)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    // customize color theme
    log.themes.info.level = color.bgBlueBright;
    log.themes.warn.level = color.bgYellow.black;
    log.themes.error.level = color.bgRed;
    log.themes.debug.level = color.bgMagenta.black;

    const res = log('Info message');
    expect(res).toEqual(`[36mfoo[39m [104m info [49m Info message [96m+0ms[39m ([94m0ms[39m)`);

    await sleep(10);
    log.warn('Warning message');

    await sleep(55);
    log.error('Error message');

    await sleep(35);
    log.debug('Debug message');
  });

  test('colored custom render: ns(bg) level(bg) msg diff total', async () => {
    const Vilog = await importVilog();
    const log = new Vilog(' foo ', {
      // customize color theme: set background colors
      themes: {
        info: {
          ns: color.bgWhite.black,
          level: color.bgBlueBright,
        },
        warn: {
          ns: color.bgWhite.black,
          level: color.bgYellow.black,
        },
        error: {
          ns: color.bgWhite.black,
          level: color.bgRed,
        },
        debug: {
          ns: color.bgWhite.black,
          level: color.bgMagenta.black,
        },
      },
      render: ({ ns, level, msg, diff, total }, theme) => {
        return `${theme.ns(ns)}${theme.level(` ${level} `)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    const res = log('Info message');
    expect(res).toEqual(`[47m[30m foo [39m[49m[104m info [49m Info message [96m+0ms[39m ([94m0ms[39m)`);

    await sleep(10);
    log.warn('Warning message');

    await sleep(55);
    log.error('Error message');

    await sleep(35);
    log.debug('Debug message');
  });

  test('custom render by level', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo', {
      render: ({ ns, level, msg, diff, total }, theme) => {
        switch (level) {
          case 'info':
            return `${theme.ns(ns)} ${theme.msg(msg)}`;
          case 'warn':
          case 'error':
            return `${theme.ns(ns)} ${theme.level(level)} ${theme.msg(msg)}`;
        }

        return `${theme.ns(ns)} ${theme.level(level)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    const res = log('Some message');
    expect(res).toEqual(`[36mfoo[39m Some message`);

    await sleep(10);
    const res2 = log.warn('Warning message');
    expect(res2).toEqual(`[33mfoo[39m [33mwarn[39m [3m[93mWarning message[39m[23m`);

    await sleep(55);
    const res3 = log.error('Error message');
    expect(res3).toEqual(`[31mfoo[39m [31merror[39m [91mError message[39m`);

    await sleep(35);
    log.debug('Debug message');
  });

  test('custom render with user token: datetime', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo', {
      render: ({ ns, level, msg, diff, total }, theme) => {
        const dt = new Date().toISOString();
        return `${dt} ${theme.ns(ns)} ${theme.level(level)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    const res = log('Some message');
    //expect(res).toEqual(``);

    await sleep(10);
    log.warn('Warning message');

    await sleep(55);
    log.error('Error message');

    await sleep(35);
    log.debug('Debug message');
  });

  test('custom render for level', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo', {
      render: ({ ns, level, msg, diff, total }, theme) => {
        return `${theme.ns(ns)} ${theme.level(` ${level.toUpperCase()} `)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    // customize level color
    log.themes.info.level = color.bgBlueBright;
    log.themes.warn.level = color.bgYellow.black;
    log.themes.error.level = color.bgRed;
    log.themes.debug.level = color.bgMagenta.black;

    const res = log('Info message');
    //expect(res).toEqual(``);

    await sleep(10);
    log.warn('Warning message');

    await sleep(55);
    log.error('Error message');

    await sleep(35);
    log.debug('Debug message');
  });

  test('multiline message', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('foo', {
      render: ({ ns, level, msg, diff, total }, theme) => {
        return `${theme.ns(ns)} ${theme.level(level)} ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
      },
    });

    await sleep(5);
    const res = log('Info message\nNew line\n');
    //expect(res).toEqual(``);
  });
});

describe('default levels', () => {
  // *** NEW ****
  test('log default', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('task');

    const res = log('Message');
    //expect(res).toEqual(``)
  });

  test('debug', async () => {
    const Vilog = await importVilog();
    const log = new Vilog('task');

    const res = log.debug('Debug message');
    //expect(res).toEqual(``);
  });

});

describe('Vilog timing', () => {
  beforeEach(() => {
    outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  test('diff and total', async () => {
    const Vilog = await importVilog();

    const log = new Vilog('foo', {
      precision: 5,
      render ({ ns, msg, diff, total }) {
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
    expect(outSpy).toHaveBeenCalledTimes(3);

    // grab the two printed strings
    const calls = outSpy.mock.calls.map(([s]) => s);

    // 1st line should start with our prefix
    expect(calls[0]).toMatch(/^\[foo] ping/);

    // 2nd line should include +<ms> and (<ms>) with ~1.1s values
    expect(calls[1]).toMatch(/^\[foo] ping2 \+\d+(?:\.\d+)?ms \(\d+(?:\.\d+)?ms\)/);

    // 3rd line should include +<ms> and (<ms>) with ~1.3s values
    expect(calls[2]).toMatch(/^\[foo] ping3 \+\d+(?:\.\d+)?ms \(\d+(?:\.\d+)?s\)/);

    // extract numeric ms for precise range checks
    const m = calls[2].match(/\+(\d+(?:\.\d+)?)ms \((\d+(?:\.\d+)?)s\)/);
    expect(m).not.toBeNull();

    const diff = Number(m[1]);
    const total = Number(m[2]);

    // allow some jitter; set a reasonable lower bound and no strict upper bound
    expect(diff).toBeGreaterThanOrEqual(800);  // ≥800ms
    expect(total).toBeGreaterThanOrEqual(1.300); // ≥1.3s
  });

});
