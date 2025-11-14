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

  test('elapsed', async () => {
    const log = new Vilog({
      silent,
      levels: {
        default: {
          layout: 'elapsed: {elapsed}, {msg}',
        },
      },
      tokens: {
        // mock built-in dynamic tokens
        elapsed: '111.11ms',
      },
    });

    const received = log('text');
    expect(received).toBe('elapsed: 111.11ms, text');
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
});
