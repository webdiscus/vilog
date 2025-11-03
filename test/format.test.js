import { describe, test, expect, vi, beforeEach } from 'vitest';
import color, { Ansis } from 'ansis';
import os from 'node:os';
import { importModule, sleep } from './util/testHelpers.js';
import timer from '../src/timer.js';

const importVilog = async () => importModule('../../src/index.js');

vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(3); // force init with truecolor
  return { default: ansis, Ansis };
});

describe('Level: default', () => {
  test('remove unnecessary spaces between tokens if namespace is empty', async () => {
    const Vilog = await importVilog();

    // layout contains `name` tag but name is empty or undefined
    const log = new Vilog({ levels: { default: { layout: '[time] name msg' } } });

    const received = log('Two spaces "  "');

    expect(received).contains('] Two spaces "  "', 'Between `]` and `Two` should be single space');
  });

  test('style: default with all tokens', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test', levels: { default: { label: 'MYLOG', layout: '[time] [label] name msg +duration (elapsed)' } } });

    const received = log('Message');
    //expect(received).contains('');
  });

  test('style: default + styled label', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test', levels: { default: { label: ' MYLOG ', layout: '[time] label msg', style: { label: 'bgGray' } } } });

    const received = log('Message');
    //expect(received).contains('');
  });

  test('style: custom template', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        default: {
          label: 'MYLOG',
          layout: '[time] [label] name msg +duration (elapsed)',
        },
      },
    });

    const received = log('ok');
    //expect(received).contains('');
  });

  test('custom tokens', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      tokens: {
        host: () => '127.0.0.1',
      },
      levels: {
        default: {
          label: 'MYLOG',
          layout: '[time] [label] [host] name msg +duration (elapsed)',
        },
      },
    });

    const received = log('ok');
    //expect(received).contains('');
  });

  test('custom format', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      format: (value) => value.toUpperCase(),
      levels: { default: { layout: '[name] msg' } },
    });

    const received = log('Message');
    expect(color.strip(received)).equal('[test] MESSAGE');
  });

  test('render to json', async () => {
    const Vilog = await importVilog();
    const jsonLog = new Vilog({
      name: 'json',
      // serialize log
      render: ({ dateISO, name, level, data, duration, elapsed }) => {
        let out = {
          dateISO,
          duration,
          elapsed,
          level,
          name,
          data,
        };

        return JSON.stringify(out);
      },
    });

    await sleep(2);
    const res1 = jsonLog('one', 'two');
    await sleep(1);
    const res2 = jsonLog.info(['foo', 'bar']);
    await sleep(10);
    const res3 = jsonLog.debug('one', { arr: ['foo', 'bar'] });
    //expect(res).toEqual(``);
  });
});

describe('Default layout of levels', () => {
  test('default style, default layout', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test' });

    const resDefault = log('Message');
    const resInfo = log.info('Message');
    const resWarn = log.warn('Message');
    const resErr = log.error('Message');
    const resDebug = log.debug('Message');
    //expect(received).contains('');
  });

  test('default style, layout with all tokens', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        default: { label: 'MYLOG', layout: '[datetime] [label] name msg +duration (elapsed)' },
        //default: { label: 'MYLOG', layout: '[time] msg4'},
        info: { layout: '[date time] [label] name msg +duration (elapsed)' },
        warn: { layout: '[date time] [label] name msg +duration (elapsed)' },
        error: { layout: '[date time] [label] name msg +duration (elapsed)' },
        //error: { layout: '[label] msg'},
        debug: { layout: '[date time] [label] name msg +duration (elapsed)' },
      },
    });

    const resDefault = log('Message');
    const resInfo = log.info('Message');
    const resWarn = log.warn('Message');
    const resErr = log.error('Message');
    const resDebug = log.debug('Message');
    //expect(received).contains('');
  });
});

describe('Level: info', () => {
  test('style: default', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test' });

    const received = log.info('ok');
    //expect(received).contains('');
  });

  test('style: custom style for duration', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        info: { style: { duration: 'cyanBright.italic.underline' } },
      },
    });

    const received = log.info('ok');
    //expect(received).contains('');
  });

  test('style: custom style for level', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        info: { label: ' INFO ', style: { level: 'whiteBright.bgBlue' } },
      },
    });

    const received = log.info('ok');
    //expect(received).contains('');
  });

  test('style: custom render', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        info: {
          style: { label: 'whiteBright.bgBlue' },
          render: ({ time, name, level, label, data, msg, duration, elapsed }, style) => {
            return `${time} ${style.label(' INFO ')} ${msg}`;
          },
        },
      },
    });

    const received = log.info('ok');
    //expect(received).contains('');
  });

  test('style: disable timestamp and namespace', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        info: { style: { time: false, name: false, duration: 'cyanBright.italic.underline' } },
      },
    });

    const received = log.info('ok');
    //expect(received).contains('');
  });
});

describe('Level: warn', () => {
  test('style: default', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test' });

    const received = log.warn('Missing arguments');
    //expect(received).contains('');
  });

  test('custom style for level', async () => {
    const Vilog = await importVilog();
    const name = 'test';
    const log = new Vilog({
      name: 'test',
      tokens: {
        host: () => os.hostname(),
      },
      levels: {
        warn: { label: ' WARN ', style: { label: 'black.bgYellow' } },
      },
    });

    const received = log.warn('Missing arguments');
    //expect(received).contains('');
  });

  test('custom tag style for custom level', async () => {
    const Vilog = await importVilog();
    const name = 'test';
    const log = new Vilog({
      name: 'test',
      tokens: {
        host: () => os.hostname(), // add custom token
      },
      levels: {
        warn: { label: ' WARN ', style: { label: 'black.bgYellow' } },
        // add custom level
        myLevel: {
          layout: '[date time] [host] msg +duration (elapsed)',
          style: {
            host: 'magenta', // add style for the custom token
          },
        },
      },
    });

    log.myLevel('Message');

    const received = log.warn('Missing arguments');
    //expect(received).contains('');
  });
});

describe('Level: error', () => {
  test('style: default', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test' });

    const received = log.error('Task fails');
    //expect(received).contains('');
  });
});

describe('Level: debug', () => {
  test('style: default', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({ name: 'test' });

    const received = log.debug('ID: %d', 123);
    log.debug('Res: %j', { code: 200, message: 'ok' });
    //expect(received).contains('');
  });
});

describe('Custom tests', () => {
  test('prerender static tokens', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      levels: {
        info: {
          //layout: '[%d] [{label}] [{pidLabel} {pid}] [{name}] {msg}',
          layout: '[%d{YYYY-MM-DD} %d{HH:mm:ss} %d{ts}] [{label}] [{pidLabel} {pid}] <{type}> [{name}] {msg}',
          style: { pidLabel: 'green', pid: 'yellow' },
        },
        warn: {
          layout: '[{date} {time} {timestamp}] [{label}] [{pidLabel} {pid}] [{name}] {msg}',
          // TODO: test the case when a style is configured as a function, e.g. ansis.hex()
          style: { date: 'green', time: 'yellow', timestamp: 'cyan', pidLabel: 'green', pid: color.hex('#1D89D9') },
        },
      },
      tokens: {
        date: '%d{YYYY-MM-DD}',
        time: '%d{HH:mm:ss}',
        timestamp: '%d{ts.sss}',
        pidLabel: 'PID:',
        type: 'static', // token w/o style
        pid: () => 61280, // process.pid, should be dynamic called in runtime
      }
    });

   log.info('Text');
   log.warn('The source file not found');
    //expect(received).contains('');
  });
});

describe('Logging name', () => {
  test('group logs by name', async () => {
    const Vilog = await importVilog();

    const levels = {
      info: { layout: '[%d{YYYY-MM-DD HH:mm:ss} +{duration}] [{label}] [{name}] {msg}' },
      warn: { layout: '[%d{YYYY-MM-DD HH:mm:ss} +{duration}] [{label}] [{name}] {msg}' },
      error: { layout: '[%d] [{label}] [{name}] {msg} [{file}:{line}:{column}]' },
      // custom tokens: tsHis, host
      debug: {
        layout: '[%d{ts.sss}] <{name}> [{host}] {user} {msg} +{duration} ({elapsed}), {file}:{line}',
        style: { timestamp: 'cyan', host: 'yellow.italic', user: 'bgCyanBright.black' },
      },
      myLevel: {
        layout: '[%d{YYYY-MM-DD}] [{pidLabel} {pid}] {user} {msg} +{duration} ({elapsed})',
        style: { pidLabel: 'green', pid: 'yellow', user: 'bgCyanBright.black' },
      },
      perf: {
        layout: '{perfLabel} {msg} | Duration: {duration}, Start: {elapsed}',
        style: { perfLabel: 'bgYellowBright.black' },
      },
    };

    const tokens = {
      perfLabel: () => ' Perf ',
      pidLabel: () => 'PID:', // define a label for the token to style it
      pid: () => 61280, // process.pid,
      user: () => 'username', // process.env.USER
      //user: 'username', // process.env.USER
      host: () => 'localhost', // os.hostname(),
    };

    const silent = true;
    const authLog = new Vilog({ name: 'auth', silent, levels, tokens });
    const paymentLog = new Vilog({ name: 'payment', silent, levels, tokens });
    const httpLog = new Vilog({ name: 'http', silent, levels, tokens });

    //await sleep(2000);

    httpLog.debug('Start debugging');
    httpLog.myLevel('Message 1');

    httpLog.info('User %s GET %s', 'alex', '/login');
    authLog.warn('Failed login for %s', 'alex');
    authLog.info('User %s logged in', 'alex');

    httpLog.info('User %s GET %s', 'alex', '/api/products');
    httpLog.warn('Slow request by %s: %dms', 'alex', 1200);

    paymentLog.info('%s started checkout', 'alex');
    paymentLog.warn('PIN required for %s', 'alex');
    httpLog.info('User %s POST %s', 'alex', '/3ds/complete');
    paymentLog.info('Order %d placed by %s', 88422, 'alex');

    paymentLog.error('Timeout for %s', 'alex');
    paymentLog.warn('Webhook retry %d for %s', 1, 'alex');
    paymentLog.info('Payment captured for %s', 'alex');

    //await sleep(1000);

    httpLog.info('User %s GET %s', 'alex', '/account');
    authLog.info('User %s logged out', 'alex');

    authLog.warn('%s used old password %d times', 'alex', 2);
    authLog.info('Password reset by %s', 'alex');

    authLog.myLevel('My message 2');

    httpLog.perf(null, 'Start fetch');
    await sleep(50); // do something
    httpLog.perf('fetch data');

    httpLog.debug('End debugging');

    Vilog.flush();

    // TODO: experimental options
    //Vilog.flush({ orderBy: 'name' });
    //Vilog.flush({ orderBy: 'time' });

    // TODO: experimental options
    //let res = Vilog.flush({ colored: false});
    //let res = Vilog.flush({ colored: false, ret: true });
    //console.log(res);

    // TODO: experimental static method
    //console.log(Vilog.peek('http'));

  });
});

describe('Pattern format', () => {
  const date = new Date('2025-11-02 14:29:17');

  test('date-format ISO8601 - %d', async () => {
    const Vilog = await importVilog();
    const silent = true;
    const log = new Vilog({
      name: 'perf',
      silent,
      levels: {
        default: {
          layout: '%d{YYYY-MM-DD HH:mm:ss} {perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          style: { perfLabel: 'bgYellowBright.black' },
        },
      },
      tokens: {
        perfLabel: () => ' Perf ',
        date: () => date, // provide fixed date for the test only
      },
    });

    await sleep(1200);

    log('Start debugging');
    log('');
    log('End debugging');

    Vilog.flush();
  });

  test('empty output', async () => {
    const Vilog = await importVilog();
    const { now } = timer;
    const perfLog = new Vilog({
      name: 'perf',
      silent: true,
      levels: {
        default: {
          layout: '%d{YYYY-MM-DD HH:mm:ss} {perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          //layout: '%d {perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          //layout: '{perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          style: { perfLabel: 'bgYellowBright.black' },
        },
      },
      tokens: {
        'perfLabel': () => ' Perf ',
      },
    });

    perfLog('Start');
    perfLog('point 1');
    perfLog('point 2');
    await sleep(10);

    // TODO: add note to docs - the measure error is ~5µs to compare directly using `now() - start`
    perfLog(null, 'start point 3'); // not visible checkpoint
    let start = now();
    await sleep(50); // load
    let diff = now() - start;
    perfLog('point 3 ' + diff);

    perfLog('End');

    Vilog.flush();
  });
});

describe('Performance timer', () => {
  test('now()', () => {
    const { now } = timer;
    let start = now();
    now();
    let delta = now() - start;

    // ~0.00016
    console.log(delta);
  });

  test('now() - start', () => {
    const { now } = timer;
    let start = now();
    let delta = now() - start;

    // ~0.00004
    console.log(delta);
  });

  test('performance.now() - start', () => {
    let start = performance.now();
    let delta = performance.now() - start;

    // ~0.00020
    console.log(delta);
  });

  test('timer.start() -> stop()', () => {
    let stop = timer.start();
    let delta = stop();

    // ~0.0030
    console.log(delta);
  });

  test('timer.diff()', () => {
    let start = timer.now();
    let delta = timer.diff(start);

    // ~0.0035
    console.log(delta);
  });

  test('timer.measure() timing', () => {
    const { measure } = timer;

    timer.precision = 9;

    // set actual time for inner timer
    timer.updateTimer();
    const mes0 = timer.measure(); // before JIT optimization

    // warm up the code before measure
    timer.measure();
    timer.measure();
    timer.measure();
    timer.measure();
    timer.measure();

    // measure warmed code (after JIT optimization)
    const mes1 = timer.measure(); // duration relative to last call
    const mes2 = timer.measure(); // duration relative to mes1
    const mes3 = timer.measure(); // duration relative to mes2

    // Duration: ~0.014 ms (~14 µs)
    console.log('Cold: ', mes0.duration, 'Overhead: ' + mes0.overhead);
    // Duration: ~0.000167 ms (~167 ns)
    console.log('Warm: ', mes1.duration, 'Overhead: ' + mes1.overhead);
    console.log('Warm: ', mes2.duration, 'Overhead: ' + mes2.overhead);
    console.log('Warm: ', mes3.duration, 'Overhead: ' + mes3.overhead);
  });

  test('empty output', async () => {
    const Vilog = await importVilog();
    const { now } = timer;
    const log = new Vilog({
      name: 'perf',
      silent: true,
      levels: {
        default: {
          layout: '{msg}, duration: {duration}',
          style: { perfLabel: 'bgYellowBright.black' },
        },
      },
      tokens: {
        //'perfLabel': () => ' Perf ',
      },
    });

    log('Start (since create context)');

    // measure error is ~0.0003ms (300ns)
    for (let i = 1; i <= 5; i++) log('warm up ' + i);

    log(null, 'start point 1'); // set timer mark, no output
    //await sleep(10); // do something
    log('Do something'); // elapsed since last log call

    Vilog.flush();
  });

  test('log() overhead', async () => {
    const Vilog = await importVilog();
    const { now } = timer;

    const perfLog = new Vilog({
      name: 'perf',
      silent: true,
      levels: {
        default: {
          layout: '%d{YYYY-MM-DD HH:mm:ss} {perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          //layout: '%d {perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          //layout: '{perfLabel} {msg} [Self time: {duration}] [Total time: {elapsed}]',
          style: { perfLabel: 'bgYellowBright.black' },
        },
      },
      tokens: {
        'perfLabel': () => ' Perf ',
      },
    });

    perfLog('Start');
    perfLog('warm up 1');
    //perfLog('warm up 2');
    //perfLog('warm up 3');
    //perfLog(null, 'start');

    let start = now();
    perfLog('measure');
    let delta = now() - start;

    console.log(delta);
  });
});

describe('Performance of function calling', () => {
  test('now() call delta', () => {
    const { now } = timer;

    let start = now();
    let delta = now() - start;

    // ~0.000084ms -> 84ns
    console.log(delta);
  });

  test('function call duration', () => {
    const { now } = timer;

    // simple function
    const fn = () => 1;

    let start = now();
    fn();
    let delta = now() - start;

    // ~0.00225
    console.log(delta);
  });

  test('object method call duration', () => {
    const { now } = timer;

    // simple function
    const lib = {
      fn: () => 1,
    };

    let start = now();
    lib.fn();
    let delta = now() - start;

    // ~0.00258
    console.log(delta);
  });

  test('destruct returning object', () => {
    const { now } = timer;

    // simple function
    const fn = () => {
      return { a: 1, b: 2, c: 3, d: 4, e: 5 };
    };

    let start = now();
    let { a, b, c, d, e } = fn();
    let delta = now() - start;

    // ~0.00058
    console.log(delta);
  });

  test('destruct returning array', () => {
    const { now } = timer;

    // simple function
    const fn = () => {
      return [1, 2, 3, 4, 5];
    };

    let start = now();
    let [a, b, c, d, e] = fn();
    let delta = now() - start;

    // ~0.00039
    console.log(delta);
  });

});
