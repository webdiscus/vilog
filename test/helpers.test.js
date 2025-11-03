import { describe, test, expect, vi } from 'vitest';

import { mergeDeep } from '../src/helpers.js';

describe('helpers', () => {
  test('mergeDeep: level options', async () => {
    let target = {
      warn: {
        ns: 'yellow',
        level: 'yellow',
        msg: 'italic.yellowBright',
        diff: 'cyanBright',
        total: 'blueBright',
      },
      debug: {
        ns: 'magenta',
        level: 'magenta',
        msg: 'white',
        diff: 'cyanBright',
        total: 'blueBright',
      },
    };

    const source = {
      custom: { ns: 'pink' }, // whole section ignored
      warn: { msg: 'yellow', diff: false, total: false, foo: 'bar' }, // foo is ignored
      debug: { ns: 'green' },
    };

    const expected = {
      'custom': {
        'ns': 'pink',
      },
      'debug': {
        'diff': 'cyanBright',
        'level': 'magenta',
        'msg': 'white',
        'ns': 'green',
        'total': 'blueBright',
      },
      'warn': {
        'diff': false,
        'foo': 'bar',
        'level': 'yellow',
        'msg': 'yellow',
        'ns': 'yellow',
        'total': false,
      },
    };

    const received = mergeDeep(target, source);

    expect(received).toEqual(expected);
  });
});
