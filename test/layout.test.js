import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Ansis } from 'ansis';

import { importModule } from './util/helpers.js';
import Vilog from '../src/index.js';

const importVilog = async () => importModule('../../src/index.js');

// static values for mocked dynamic tokens
const date = new Date('2025-11-11 11:11:01.075');

// silent mode: true - not display log, false - display log
const silent = false;

vi.mock('ansis', () => {
  const { Ansis } = require('ansis');
  const ansis = new Ansis(0); // force disable colors
  return { default: ansis, Ansis };
});

describe('built-in tokens', () => {
  test('date %d, mock as function', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '%d {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date, // the date token can by only a function
        // '%d': date,  // static date token doesn't works by design, since it make no sense
      },
    });

    const received = log('text');
    expect(received).toBe('2025-11-11T11:11:01.075Z text');
  });

  test('date %d{YYYY-MM-DD HH:mm:ss}', async () => {
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
    expect(received).toBe('[2025-11-11 11:11:01] text');
  });

  test('date %d{YYYY-MM-DD} %d{HH:mm:ss.sss} %d{ts}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{YYYY-MM-DD} %d{HH:mm:ss.sss}] [%d{ts}] {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[2025-11-11 11:11:01.075] [1762855861] text');
  });

  test('date %d{ts.sss}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[%d{ts.sss}] {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[1762855861.075] text');
  });

  test('date {date} {time}{ms} {timestamp}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{date} {time}{ms}] [{timestamp}] {msg}',
        },
      },
      tokens: {
        // define formatted date/time parts as tokens
        date: '%d{YYYY-MM-DD}',
        time: '%d{HH:mm:ss}',
        ms: '%d{.sss}',
        timestamp: '%d{ts}',

        // mock built-in dynamic tokens
        '%d': () => date,
      },
    });

    const received = log('text');
    expect(received).toBe('[2025-11-11 11:11:01.075] [1762855861] text');
  });

  test('duration as function', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '+{duration} {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        duration: () => '11.11ns', // test function token
      },
    });

    const received = log('text');
    expect(received).toBe('+11.11ns text');
  });

  test('duration as static', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '+{duration} {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        duration: '11.11ns', // test as static token
      },
    });

    const received = log('text');
    expect(received).toBe('+11.11ns text');
  });

  test('uptime', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'uptime: {uptime}, {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        uptime: '111.11ms',
      },
    });

    const received = log('text');
    expect(received).toBe('uptime: 111.11ms, text');
  });

  test('name msg', async () => {
    const log = new Vilog({
      silent,
      name: 'auth',
      levels: {
        default: {
          layout: '{name} | {msg}',
        },
      },
    });

    const received = log('User %s logged out', 'alex');
    expect(received).toBe('auth | User alex logged out');
  });

  test('missing name msg', async () => {
    const log = new Vilog({
      silent,
      // name: 'auth', missing log name/namespace
      levels: {
        default: {
          layout: '{name} {msg}',
        },
      },
    });

    const received = log('User %s logged out', 'alex');
    expect(received).toBe(' User alex logged out');
  });

  test('level msg', async () => {
    const log = new Vilog({
      silent,
      levels: {
        myLevel: {
          layout: '{level} | {msg}',
        },
      },
    });

    const received = log.myLevel('User %s logged out', 'alex');
    expect(received).toBe('myLevel | User alex logged out');
  });

  test('label msg', async () => {
    const log = new Vilog({
      silent,
      levels: {
        myLevel: {
          label: 'VIEW',
          layout: '{label} | {msg}',
        },
      },
    });

    const received = log.myLevel('User %s logged out', 'alex');
    expect(received).toBe('VIEW | User alex logged out');
  });

  test('level msg file', async () => {
    const log = new Vilog({
      silent,
      levels: {
        trace: {
          layout: '{level} | {msg} {file}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        file: '/path/to/app.js',
      },
    });

    const received = log.trace('called in');
    expect(received).toBe('trace | called in /path/to/app.js');
  });

  test('level msg file:line:column', async () => {
    const log = new Vilog({
      silent,
      levels: {
        trace: {
          layout: '{level} | {msg} {file}:{line}:{column}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        file: '/path/to/app.js',
        line: 267,
        column: 20,
      },
    });

    const received = log.trace('called in');
    expect(received).toBe('trace | called in /path/to/app.js:267:20');
  });
});

describe('custom tokens', () => {
  test('custom token as function', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{host}] {msg}',
        },
      },
      // custom tokens
      tokens: {
        host: () => 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[localhost] text');
  });

  test('custom token as static', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{host}] {msg}',
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[localhost] text');
  });

  test('custom %-token as function', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'PID: %z | {msg}',
        },
      },
      // custom tokens
      tokens: {
        '%z': () => 100500,
      },
    });

    const received = log('text');
    expect(received).toBe('PID: 100500 | text');
  });

  test('custom %-token as static', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'PID: %z | {msg}',
        },
      },
      // custom tokens
      tokens: {
        '%z': 100500,
      },
    });

    const received = log('text');
    expect(received).toBe('PID: 100500 | text');
  });

  test('custom %-token and %-char', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'Complete: %z% | {msg}',
        },
      },
      // custom tokens
      tokens: {
        '%z': 97.5,
      },
    });

    const received = log('text');
    expect(received).toBe('Complete: 97.5% | text');
  });

  test('custom %-token and undefined %-token', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'Complete: %z% (%x) | {msg}',
        },
      },
      // custom tokens
      tokens: {
        '%z': 97.5,
        //'%x': '97.5kB', // %x-token is used in layout but undefined -> stay as is
      },
    });

    const received = log('text');
    expect(received).toBe('Complete: 97.5% (%x) | text');
  });

  test('custom and undefined {token}', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '{host} {myToken} | {msg}',
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
        // myToken: '[my token]' // used in layout token is undefined -> stay as is
      },
    });

    const received = log('text');
    expect(received).toBe('localhost {myToken} | text');
  });
});

describe('spacing around tokens in layout', () => {
  test('custom token w/o space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{host}] {msg}',
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[localhost] text');
  });

  test('custom static token with space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: '[{ host }] {msg}',
        },
      },
      // custom tokens
      tokens: {
        host: 'localhost',
      },
    });

    const received = log('text');
    expect(received).toBe('[ localhost ] text');
  });

  test('custom dynamic token with space around', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'pid: [{ pid }] {msg}',
        },
      },
      // custom tokens
      tokens: {
        pid: () => 123,
      },
    });

    const received = log('text');
    expect(received).toBe('pid: [ 123 ] text');
  });

  test('built-in static token with space around', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      silent,
      levels: {
        default: {
          layout: '[{ name }] {msg}', // name is static built-in token
        },
      },
    });

    const received = log('text');
    expect(received).toBe('[ test ] text');
  });

  test('built-in dynamic token with space around', async () => {
    const Vilog = await importVilog();
    const log = new Vilog({
      name: 'test',
      silent,
      levels: {
        default: {
          layout: 'duration: [{ duration }] {msg}', // 'duration' is dynamic built-in token
        },
      },

      tokens: {
        // mock built-in dynamic tokens
        '%d': () => date,
        duration: '11.01ns',
      },
    });

    const received = log('text');
    expect(received).toBe('duration: [ 11.01ns ] text');
  });

  test('default level render data to json', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        default: {
          // serialize only log arguments (from 2nd)
          render: (tokens) => JSON.stringify(tokens.data),
        },
      },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
        uptime: () => '111.11ms',
        duration: () => '11.01ns',
      },
    });

    const expected = '["My data",{"arr":["foo","bar"]}]';
    const received = log('My data', { arr: ['foo', 'bar'] });
    expect(received).toBe(expected)
  });

  test('custom level render data to json', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        toJson: {
          // serialize only log arguments (from 2nd)
          render: ({ date, name, level, data }) => JSON.stringify({ date, name, level, data }),
        },
      },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
        uptime: () => '111.11ms',
        duration: () => '11.01ns',
      },
    });

    const expected = '{"date":"2025-11-11T10:11:01.075Z","name":"test","level":"toJson","data":["My data",{"arr":["foo","bar"]}]}';
    const received = log.toJson('My data', { arr: ['foo', 'bar'] });
    expect(received).toBe(expected)
  });

  test('custom general render', async () => {
    const Vilog = await importVilog();

    const log = new Vilog({
      name: 'test',
      levels: {
        // define the render for a level only
        toJson: {
          render: ({ date, level, data }) => JSON.stringify({ date, type: 'level', level, data }),
        },
      },
      // define general render function for all levels, level render has higher priority than general
      render: ({ date, level, data }) => JSON.stringify({ date, type: 'general', level, data }),

      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    // test custom level render
    let expected = '{"date":"2025-11-11T10:11:01.075Z","type":"level","level":"toJson","data":[{"event":"user.login","id":123}]}';
    let received = log.toJson({ event: 'user.login', id: 123 });
    expect(received).toBe(expected)

    // test general custom render for any level
    expected = '{"date":"2025-11-11T10:11:01.075Z","type":"general","level":"info","data":[{"event":"user.getInfo","id":456}]}';
    received = log.info({ event: 'user.getInfo', id: 456 });
    expect(received).toBe(expected)
  });
});

describe('normalize spacing in layout', () => {
  test('before message', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'begin   {msg} end',
        },
      },
    });

    const received = log('text');
    expect(received).toBe('begin text end');
  });

  test('in static token', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'begin {token} {msg} end',
        },
      },
      tokens: {
        'token': ' x ',
      },
    });

    const received = log('text');
    expect(received).toBe('begin x text end');
  });

  test('in dynamic token', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'begin  {token}  {msg} end',
        },
      },
      tokens: {
        'token': () => ' x ',
      },
    });

    const received = log('text');
    expect(received).toBe('begin x text end');
  });
});

describe('log arguments', () => {
  test('text, error', async () => {
    const log = new Vilog({
      silent,
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log.error('request failed', new Error('Boom!'));
    expect(received).contains('2025-11-11T11:11:01.075Z ERROR request failed Error: Boom!');
  });

  test('error', async () => {
    const log = new Vilog({
      silent,
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
    });

    const received = log(new Error('Boom!'));
    expect(received).contains('2025-11-11T11:11:01.075Z ERROR Error: Boom!');
  });
});

describe('recipes', () => {
  test('render to json via logJson', async () => {
    const log = new Vilog({
      silent,
      name: 'api:user1',
      levels: {
        info: {
          layout: '{msg}', // msg will be JSON string
        },
      },
    });

    function logJson(level, event, data = {}) {
      const entry = {
        date: date.toISOString(),
        level,
        name: log.name,
        event,
        ...data,
      };

      return log[level](JSON.stringify(entry));
    }

    const received = logJson('info', 'user.login', { userId: 42, ip: '127.0.0.1' });
    const expected = '{"date":"2025-11-11T10:11:01.075Z","level":"info","name":"api:user1","event":"user.login","userId":42,"ip":"127.0.0.1"}';
    expect(received).toBe(expected);
  });

  test('render to json, general', async () => {
    const log = new Vilog({
      silent,
      name: 'api:user2',
      levels: {
        info: {
          layout: '{msg}', // msg will be JSON string
        },
      },
      // mock built-in dynamic tokens
      tokens: {
        '%d': () => date,
      },
      render: ({ date, level, name, data }) => JSON.stringify({
        date: date.toISOString(),
        level,
        name,
        ...data[0]
      }),
    });

    const received = log.info({ event: 'user.login', userId: 24, ip: '127.0.0.7' });
    const expected = '{"date":"2025-11-11T10:11:01.075Z","level":"info","name":"api:user2","event":"user.login","userId":24,"ip":"127.0.0.7"}';
    expect(received).toBe(expected);
  });
});
