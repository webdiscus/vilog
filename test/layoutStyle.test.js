import { describe, test, expect, vi } from 'vitest';
import color, { Ansis } from 'ansis';

const importVilog = async () => importModule('../../src/index.js');

import Vilog from '../src/index.js';
import { importModule, sleep } from './util/helpers.js';

// static values for mocked dynamic tokens
const date = new Date('2025-11-11 11:59:01.075');

// silent mode: true - not display log, false - display log
const silent = false;

vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(3); // force init with truecolor
  return { default: ansis, Ansis };
});

describe('Date styling', () => {
  test('default', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '%d {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[90m2025-11-11T11:59:01.075Z[39m text');
  });

  test('chained style: green.bold', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '%d {msg}',
          style: { '%d': 'green.bold' },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[32m[1m2025-11-11T11:59:01.075Z[22m[39m text');
  });

  test('style as truecolor function', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '%d {msg}',
          style: { '%d': color.hex('#1D89D9') },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[38;2;29;137;217m2025-11-11T11:59:01.075Z[39m text');
  });

  test('default style for date: %d{YYYY-MM-DD HH:mm:ss}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{YYYY-MM-DD HH:mm:ss}] {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[90m2025-11-11 11:59:01[39m] text');
  });

  test('style multiple dates: %d{YYYY-MM-DD} %d{HH:mm:ss}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{YYYY-MM-DD} %d{HH:mm:ss}] {msg}',
          style: { '%d': 'green' },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[32m2025-11-11[39m [32m11:59:01[39m] text');
  });

  test('different style multiple dates: %d{YYYY-MM-DD} %d{HH:mm:ss}.%d{sss}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{YYYY-MM-DD} %d{HH:mm:ss}.%d{sss}] {msg}',
          style: { 'YYYY-MM-DD': 'green', 'HH:mm:ss': 'cyanBright', 'sss':  'cyan' },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[32m2025-11-11[39m [96m11:59:01[39m.[36m075[39m] text');
  });

  test('different style multiple dates: %d{YYYY-MM-DD} %d{HH:mm:ss}%d{.sss}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{YYYY-MM-DD} %d{HH:mm:ss}%d{.sss}] {msg}',
          style: { 'YYYY-MM-DD': 'green', 'HH:mm:ss': 'cyanBright', '.sss':  'cyan' },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[32m2025-11-11[39m [96m11:59:01[39m[36m.075[39m] text');
  });

  test('different style multiple dates as static tokens: [{date} {time}{ms}]', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{date} {time}{ms}] {msg}',
          style: { date: 'green', time: 'cyanBright', ms: 'cyan' },
        },
      },
      tokens: {
        // define formatted date/time parts as tokens
        date: '%d{YYYY-MM-DD}',
        time: '%d{HH:mm:ss}',
        ms: '%d{.sss}',

        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[32m2025-11-11[39m [96m11:59:01[39m[36m.075[39m] text');
  });

  test('style custom and undefined {token}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '{host} {myToken} | {msg}',
          style: { host: 'green', myToken: 'red' },
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
        // myToken: '[my token]' // used in layout token is undefined but still be styled
      },
    });

    const received = log('text');
    expect(received).toBe('[32mlocalhost[39m [31m{myToken}[39m | text');
  });

  test('style empty token', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '{host} {myToken} | {msg}',
          style: { host: 'green', myToken: 'red' },
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
        myToken: '' //  collapse the space around of empty token
      },
    });

    const received = log('text');
    expect(received).toBe('[32mlocalhost[39m | text');
  });

  test('style custom token and its label', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{pidLabel} {pid}] [{userIdLabel} {userId}] {msg}',
          style: { pidLabel: 'green', pid: 'greenBright', userIdLabel: 'magenta', userId: 'magentaBright', },
        },
      },
      // custom tokens
      tokens: {
        pidLabel: 'Process ID:',
        pid: () => 61280,
        userIdLabel: 'User ID:',
        userId: () => 123,
      },
    });

    const received = log('text');
    expect(received).toBe('[[32mProcess ID:[39m [92m61280[39m] [[35mUser ID:[39m [95m123[39m] text');
  });
});

describe('custom style build-in tokens of default layout', () => {
  test('default layout', async () => {
    const log = new Vilog({
      name: 'test', // `name` option should be styled
      levels: { default: { layout: '[%d] {name} {msg}', } },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[90m2025-11-11T11:59:01.075Z[39m] [35mtest[39m text');
  });

  test('missing `name` option', async () => {
    const log = new Vilog({
      // name: 'test', // missing or empty `name` option should not be styled as empty string
      levels: { default: { layout: '[%d] {name} {msg}', } },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[90m2025-11-11T11:59:01.075Z[39m] text');
  });

  test('empty `name` option', async () => {
    const log = new Vilog({
      name: '', // missing or empty `name` option should not be styled as empty string
      levels: { default: { layout: '[%d] {name} {msg}', } },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[[90m2025-11-11T11:59:01.075Z[39m] text');
  });

  test('date token as `%d`', async () => {
    const log = new Vilog({
      levels: {
        default: { style: { '%d': 'cyanBright.italic' } },
      },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[96m[3m2025-11-11T11:59:01.075Z[23m[39m text');
  });

  test('date token alias as `date`', async () => {
    const log = new Vilog({
      levels: {
        default: { style: { date: 'cyanBright.italic' } },
      },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[96m[3m2025-11-11T11:59:01.075Z[23m[39m text');
  });
});

describe('custom rendering', () => {
  test('default level', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        myLevel: {
          label: 'CUSTOM',
          // NOTE: custom render receives only built-in tokens, custom tokens are not passed by design
          render: ({ date, name, level, label, data, msg, duration, elapsed }, style) => {
            return `${style.yellow(label)} | ${style.magenta(name)} | ${msg}`;
          },
        },
      },
    });

    const received = log.myLevel('text');
    expect(received).toBe('[33mCUSTOM[39m | [35mtest[39m | text');
  });

  test('render all tokens to json', async () => {
    const Vilog = await importVilog();

    const jsonLog = new Vilog({
      name: 'json',
      levels: {
        default: {
          // serialize all log fields
          render: (tokens) => JSON.stringify(tokens),
        },
      },
      // mock built-in dynamic tokens
      // note: only functions can be mocked by the render function
      tokens: {
        '%d': () => date,
        elapsed: () => '111.11ms',
        duration: () => '11.01ns',
        file: () => '/path/to/app.js',
        line: () => 1080,
        column: () => 57,
      },
    });

    const expected = '{"name":"json","level":"default","label":"","msg":"My data {\\"arr\\":[\\"foo\\",\\"bar\\"]}","data":["My data",{"arr":["foo","bar"]}],"date":"2025-11-11T10:59:01.075Z","duration":"11.01ns","elapsed":"111.11ms"}';
    const received = jsonLog('My data', { arr: ['foo', 'bar'] });
    expect(received).toBe(expected)
  });

  test('render only log data to json', async () => {
    const Vilog = await importVilog();

    const jsonLog = new Vilog({
      name: 'json',
      levels: {
        default: {
          // serialize only log arguments (from 2nd)
          render: (tokens) => JSON.stringify(tokens.data),
        },
      },
      // mock built-in dynamic tokens
      // note: only functions can be mocked by the render function
      tokens: {
        '%d': () => date,
        elapsed: () => '111.11ms',
        duration: () => '11.01ns',
        file: () => '/path/to/app.js',
        line: () => 1080,
        column: () => 57,
      },
    });

    const expected = '["My data",{"arr":["foo","bar"]}]';
    const received = jsonLog('My data', { arr: ['foo', 'bar'] });
    expect(received).toBe(expected)
  });

  test('render required fields to json', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'json',
      levels: {
        json: {
          // serialize only the relevant fields, omit the rest
          render: ({ date, level, duration, data }) => JSON.stringify({ date, level, duration, data }),
        },
      },
      // mock built-in dynamic tokens
      // note: only functions can be mocked by the render function
      tokens: {
        '%d': () => date,
        elapsed: () => '111.11ms',
        duration: () => '11.01ns',
        file: () => '/path/to/app.js',
        line: () => 1080,
        column: () => 57,
      },
    });

    const expected = '{"date":"2025-11-11T10:59:01.075Z","level":"json","duration":"11.01ns","data":["request response",{"status":200,"recordIds":[123,45,678]}]}';
    const received = log.json('request response', { status: 200, recordIds: [123, 45, 678] });
    expect(received).toBe(expected)
  });
});

describe('spacing around tokens in layout', () => {
  test('custom token w/o space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '{host} {msg}',
          style: { host: 'bgMagenta.black' },
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[45m[30mlocalhost[39m[49m text');
  });

  test('custom static token with space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '{ host } {msg}',
          style: { host: 'bgMagenta.black' },
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[45m[30m localhost [39m[49m text');
  });

  test('custom dynamic token with space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'pid:{ pid } {msg}',
          style: { pid: 'bgCyan' },
        },
      },
      // custom tokens
      tokens: {
        pid: () => 8086,
      },
    });

    const received = log('text');
    expect(received).toBe('pid:[46m 8086 [49m text');
  });

  test('built-in static token with space around', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      silent,
      levels: {
        default: {
          layout: '{ name } {msg}', // name is static built-in token
          style: { name: 'bgMagenta.black' },
        },
      },
    });

    const received = log('text');
    expect(received).toBe('[45m[30m test [39m[49m text');
  });

  test('built-in dynamic token with space around', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      silent,
      levels: {
        default: {
          layout: 'start:{ elapsed } duration:{ duration } {msg}', // 'elapsed' and 'duration' are dynamic built-in token
          style: { elapsed: 'bgCyan', duration: 'bgCyan' },
        },
      },

      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
        elapsed: '111.587ms', // define as static
        duration: () => '11.01ns', // define as function
      },
    });

    const received = log('text');
    expect(received).toBe('start:[46m 111.587ms [49m duration:[46m 11.01ns [49m text');
  });

  test('elapsed token with space around and plus char', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      silent,
      levels: {
        default: {
          layout: 'duration:{ duration } {msg}', // 'duration' are dynamic built-in token
          style: { duration: 'bgCyan' },
        },
      },

      tokens: {
        // mock built-in dynamic tokens
        duration: (val) => '+11.01ns', // mock value
        //duration: (val) => `+${val}`, // modify built-in token value, e.g. add prefix `+` char
      },
    });

    const received = log('text');
    expect(received).toBe('duration:[46m +11.01ns [49m text');
  });
});

describe('default levels', () => {
  test('default style, default layout', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
        elapsed: '111.11ms',
        duration: '11.01ns',
      },
    });

    expect(log('Message')).toBe('[90m2025-11-11T11:59:01.075Z[39m Message');
    expect(log.info('Message')).toBe('[90m2025-11-11T11:59:01.075Z[39m [36m[1mINFO[22m[39m Message');
    expect(log.warn('Message')).toBe('[90m2025-11-11T11:59:01.075Z[39m [33m[1mWARN[22m[39m Message');
    expect(log.error('Message')).toBe('[90m2025-11-11T11:59:01.075Z[39m [31m[1mERROR[22m[39m [31mMessage[39m');
    expect(log.debug('Message')).toBe('[35mtest[39m Message +[36m11.01ns[39m ([36m111.11ms[39m)');
  });

  test('custom style, custom layout', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'http',
      // test mock of '%d': override layouts for all levels so that none contain a plain '%d' token
      levels: {
        default: {
          layout: '%d{ YYYY-MM-DD HH:mm:ss } {msg}',
          style: { '%d': 'bgWhiteBright.gray' },
        },
        info: {
          layout: '%d{ YYYY-MM-DD HH:mm:ss }{ label } {msg}',
          style: { '%d': 'bgWhiteBright.gray', label: 'bgBlue.whiteBright' },
        },
        warn: {
          layout: '%d{ YYYY-MM-DD HH:mm:ss }{ label } {msg}',
          style: { '%d': 'bgWhiteBright.gray', label: 'bgYellow.black' },
        },
        error: {
          layout: '%d{ YYYY-MM-DD HH:mm:ss }{ label } {msg}',
          style: { '%d': 'bgWhiteBright.gray', label: 'bgRed' },
        },
        debug: {
          layout: '%d{ ts.sss }{ name } {msg} { duration }{elapsed }',
          style: {
            '%d': 'bgWhiteBright.gray',
            name: 'bgMagenta.whiteBright',
            duration: 'bgCyan.black',
            elapsed: 'bgCyan.gray',
          },
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
        //elapsed: (val) => `(${val})`, // modify original value of built-in dynamic token
        elapsed: (val) => '(111.11ms)', // mock value
        //duration: (val) => `+${val}`, // modify original value of built-in dynamic token
        duration: (val) => '+11.01ns', // mock value
      },
    });

    expect(log('Message\n')).toBe('[107m[90m 2025-11-11 11:59:01 [39m[49m Message\n');
    expect(log.info('Message\n')).toBe('[107m[90m 2025-11-11 11:59:01 [39m[49m[44m[97m INFO [39m[49m Message\n');
    expect(log.warn('Message\n')).toBe('[107m[90m 2025-11-11 11:59:01 [39m[49m[43m[30m WARN [39m[49m Message\n');
    expect(log.error('Message\n')).toBe('[107m[90m 2025-11-11 11:59:01 [39m[49m[41m ERROR [49m [31mMessage\n[39m');
    expect(log.debug('Message')).toBe('[107m[90m 1762858741.075 [39m[49m[45m[97m http [39m[49m Message [46m[30m +11.01ns [39m[49m[46m[90m(111.11ms) [39m[49m');
  });
});

describe('custom levels', () => {
  test('trace', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        trace: {
          label: 'TRACE',
          layout: '[%d{HH:mm:ss.sss}] { label } {msg} {file}:{line}:{column}',
          style: { label: 'bgYellow.black' },
        },
      },

      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
        elapsed: '111.11ms',
        duration: '11.01ns',
        file: '/path/to/app.js',
        line: 1080,
        column: 57,
      },
    });

    const received = log.trace('text');
    expect(received).toBe('[[90m11:59:01.075[39m] [43m[30m TRACE [39m[49m text [94m[4m/path/to/app.js[24m[39m:[36m1080[39m:[36m57[39m');
  });
});
