import color from 'ansis';

import timer from './timer.js';
import formatDate, { styleDate } from './formatDate.js';
import formatString from './formatString.js';
import { mergeDeep, getEnv, matchPattern, getCaller, view } from './helpers.js';

const { now, measure, updateTimer } = timer;

const wrapToken = t => `{${t}}`;

function buildStyler(style) {
  if (!style) return null;
  if (typeof style === 'function') return style;
  return style.split('.').reduce((acc, name) => (acc ?? color)[name], null);
}

const applyToken = (str, token, val, styler) => str.replace('{' + token + '}', styler ? styler(val) : val);

/**
 * @typedef {import('ansis').Ansis} Ansis
 */

/**
 * @typedef {object} Theme
 * A value is the string contains a color name of Ansis lib, e.g. `red` or `red.bold`.
 * At runtime, values are compiled to functions: (s: string) => string.
 * If the property is undefined, then the token in layout will not be styled.
 *
 * @property {string} date The date.
 * @property {string} duration The elapsed since last log call.
 * @property {string} elapsed The elapsed time since app start.
 * @property {string} name The logger's name.
 * @property {string} label The level label.
 * @property {string} msg The formatted message string.
 * @property {string} file The caller file, where was the log called.
 * @property {string} line The caller line number in the code.
 * @property {string} column The caller position in the code line.
 */

/**
 * Log index for auto creating the unique namespace when it is not specified.
 * @type {number}
 */
let logIdx = 1;

// TODO: implements it like https://log4js-node.github.io/log4js-node/layouts.html
//   pattern - string - specifier for the output format, using placeholders as described below
//   tokens - object (optional) - user-defined tokens to be used in the pattern

/** Default style of tokens */
const defaultStyle = {
  '%d': 'gray.italic', // %d
  duration: 'white', // self time elapsed last call of log
  elapsed: 'white', // total time elapsed since app started (lib is imported)
  label: 'white.bold',
  name: 'white',
  file: 'white',
  line: 'cyan',
  column: 'cyan',
};

const BASE_DYNAMIC_TOKENS = Object.freeze(['duration', 'elapsed', 'file', 'line', 'column']);

class Vilog {
  /** All created instances keyed by namespace. */
  static instances = new Map();

  /** Disabled namespace patterns: '*', 'foo:*', or exact names. */
  static #disabled = new Set();

  /** Store for captured logs in silent mode. */
  static #buffer = [];

  /** Global cap for buffered entries in silent mode (FIFO eviction). */
  static #maxBuffer = 10_000;

  /** Monotonic sequence for strict ordering. */
  static #seqBuffer = 0;

  /** Order used for auto-flush. */
  static #flushOrderBy = 'time'; // 'time' | 'name'

  /**
   * Level options.
   * @type {{default: Theme, info: Theme, warn: Theme, error: Theme, debug: Theme}}
   */

  _levels = {
    default: {
      // if label undefined, then use the key as level label
      label: '',
      layout: '[%d] {name} {msg}',
      style: {},
    },
    info: {
      label: 'INFO',
      layout: '[%d] [{label}] {msg}',
      style: {
        label: 'blue.bold',
      },
    },
    warn: {
      label: 'WARN',
      layout: '[%d] [{label}] {msg}',
      style: {
        label: 'yellow.bold',
        msg: 'yellow',
      },
    },
    error: {
      label: 'ERROR',
      layout: '[%d] [{label}] {msg}',
      style: {
        label: 'red.bold',
        msg: 'red',
      },
    },
    debug: {
      label: 'DEBUG',
      layout: '[{label}] {name} {msg} +{duration} ({elapsed})',
      style: {
        name: 'magenta.dim',
        label: 'magenta',
      },
    },
  };

  _tokens = {};
  _tokensFn = {};

  /**
   * Create a callable logger instance.
   * @param {object} [options] The options.
   * @param {string} [options.name] The logger's name.
   * @param {function} [options.format] The custom format of output message.
   * @param {function} [options.render] The custom render of output.
   * @param {function} [options.log] The output method. E.g. to write log into a file.
   * @param {object} [options.levels] The configuration of levels.
   * @param {string} [options.env='DEBUG'] An environment variable to enable logs by workspace.
   *   Use it with options.enabled=false to output log only if set environment variable.
   * @param {boolean} [options.enabled] Initial toggle for this namespace.
   *
   * @param {boolean} [options.silent] Whether the log should output immediately.
   *   If true, then all logs will be accumulated in the global Vilog.#buffer Set.
   *   If false (default), then output log immediately.
   * @param {boolean} [options.maxBuffer] Global buffer capacity. Use Infinity to disable capping.
   * @param {string: 'time' | 'name'} [options.flushOrderBy='time'] Order used for auto-flush..
   */
  constructor (options = {}) {
    let hasName = !!options.name;
    let loggerName = hasName ? options.name : 'log' + logIdx++;

    const existing = Vilog.instances.get(loggerName);
    if (existing) {
      console.warn(`[Vilog] instance "${loggerName}" already exists.`);
      return existing;
    }

    // keep instance state on the hidden instance
    this._optName = hasName ? options.name : '';
    this._name = loggerName;
    this._options = options;

    // callable instance
    const fn = (...args) => {
      return this._log('default', ...args);
    };

    // expose prototype methods and properties to the function
    Object.setPrototypeOf(fn, this);

    const { levels, tokens, format, render, output } = options;

    if (typeof format === 'function') this._format = format;
    if (typeof render === 'function') this._render = render; // common render for all levels
    if (typeof output === 'function') this._out = output;
    if (levels) mergeDeep(this._levels, levels);
    if (tokens) this._tokens = { ...this._tokens, ...tokens };

    const tokenList = new Set([
      'label', 'name', '%d', 'msg',
      ...BASE_DYNAMIC_TOKENS.slice(),
      ...Object.keys(this._tokens),
    ]);

    let envName = options.env || 'DEBUG';
    let enabledPattern = (envName ? getEnv(envName) : '') ?? '';

    if (options.enabled === false && !matchPattern(enabledPattern, this._name)) Vilog.disable(this._name);

    // allow early global cap override from first-created instance
    if (options.maxBuffer != null) {
      if (!Number.isFinite(options.maxBuffer) && options.maxBuffer !== Infinity) {
        throw new TypeError('Vilog: maxBuffer option must be a finite number or Infinity');
      }
      Vilog.#maxBuffer = options.maxBuffer;
    }
    if (options.flushOrderBy != null) {
      Vilog.#flushOrderBy = options.flushOrderBy;
    }

    this._registerLevels(this._levels, tokenList);
    Vilog.instances.set(this._name, fn);

    timer.updateTimer();

    return fn;
  }

  /**
   * True if this namespace would emit.
   **/
  get enabled () {
    return !Vilog.isDisabled(this._name);
  }

  /**
   * Toggle only this namespace on/off (global '*' still has highest priority).
   **/
  set enabled (value) {
    if (value) Vilog.enable(this._name);
    else Vilog.disable(this._name);
  }

  /**
   * Return namespace of the instance.
   * @return {string}
   */
  get name () {
    return this._name;
  }

  set name (value) {
    // do nothing
  }

  /**
   * Flush buffered logs in silent mode.
   *
   * @param {{}} [opts]
   * @param {'time'|'name'} [opts.orderBy='time']
   *   'time' -> strict chronological (ts/t, then seq, then name)
   *   'name' -> by name, then chronological (only makes sense when flushing all)
   * @param {boolean} [opts.colored=true] When true, return the colored output, when false - plain text, w/o ANSI codes.
   * @param {boolean} [opts.ret=false] When true, return the output instead of writing via `view()`.
   * @returns {string} The joined output ('' if nothing flushed).
   */
  static flush ({ orderBy, colored, ret } = { orderBy: '', colored: true, ret: false }) {
    const list = this.#buffer;
    if (!list.length) return '';

    // sort in place
    if (orderBy === 'name') {
      list.sort((a, b) =>
        a.name.localeCompare(b.name) || a.t - b.t || a.seq - b.seq,
      );
    } else if (orderBy === 'time') {
      list.sort((a, b) =>
        a.t - b.t || a.seq - b.seq || a.name.localeCompare(b.name),
      );
    }

    let result = list.map(item => item.output).join('\n');
    this.#buffer = []; // reset fast

    if (!ret) view(result); // display colored log
    if (!colored) result = color.strip(result); // return non colored, to save to file

    return result;
  }

  /**
   * Get buffered output for a specific logger name without mutating the buffer.
   *
   * @param {string} name The logger's name to match exactly.
   * @returns {string} Joined log lines or an empty string if none.
   */
  static peek (name) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('Vilog.peek: "name" must be a non-empty string.');
    }
    if (!this.#buffer.length) return '';

    // collect matches
    const items = [];
    for (let i = 0; i < this.#buffer.length; i++) {
      const item = this.#buffer[i];
      if (item && item.name === name) items.push(item);
    }
    if (!items.length) return '';

    return items.map(item => item.output).join('\n');
  }

  /**
   * Disable logs by pattern.
   * If pattern is empty, disables all.
   * @param {string} [pattern] Pattern like '*', 'foo:*', or exact name.
   */
  static disable (pattern) {
    // disable all
    if (!pattern) {
      this.#disabled.clear();
      pattern = '*';
    }
    this.#disabled.add(pattern);
  }

  /**
   * Enable logs by pattern.
   * If pattern is empty or '*', clears all rules.
   * @param {string} [pattern] Pattern like '*', 'foo:*', or exact name.
   */
  static enable (pattern) {
    if (!pattern || pattern === '*') {
      this.#disabled.clear();
      return;
    }
    this.#disabled.delete(pattern);
  }

  /**
   * Check if a logger's name is disabled by current rules.
   * @param {string} name The logger's name.
   * @returns {boolean} True if disabled.
   */
  static isDisabled (name) {
    const disabled = this.#disabled;
    if (disabled.has('*')) return true;

    // TODO: enable when patterns are supported
    // for (const pattern of disabled) {
    //   if (matchPattern(pattern, name)) return true;
    // }
    return false;
  }

  /**
   * Register default and custom levels on this instance.
   *
   * @param {object} levels Levels options.
   * @param {Set<string>} tokens The token list.
   * @private
   */
  _registerLevels (levels, tokens) {
    for (const level in levels) {
      if (Object.prototype.hasOwnProperty.call(this, level)) {
        console.warn(`[Vilog] level name "${level}" already present.`);
        continue;
      }

      const opts = levels[level];
      const styles = { ...defaultStyle, ...opts.style };
      const stylers = {};
      opts.useTrace = false;

      // init missing level label as empty string
      if (!('label' in opts)) opts.label = '';
      if (typeof opts.render !== 'function') opts.render = this._render;

      // TODO: refactor
      // render only dynamic tokens
      opts._dynamicTokens = BASE_DYNAMIC_TOKENS.slice();

      for (const token of tokens) {
        const needle = token.startsWith('%') ? token : `{${token}}`;
        if (!opts.layout.includes(needle)) continue;

        if ('file:line:column'.includes(token)) opts.useTrace = true;

        let tokenValue = this._tokens[token];
        let isTokenFn = typeof tokenValue === 'function';
        let style = styles[token];
        let styler = typeof style === 'function'
          ? style
          : style
            ? style.split('.').reduce((acc, name) => (acc ?? color)[name], null)
            : null;

        stylers[token] = styler;

        if (isTokenFn) {
          // TODO: optimize
          this._tokensFn[token] = tokenValue;
          opts._dynamicTokens.push(token);
        }

        // all tokens will be styled once
        // static tokens will be pre-rendered once
        // at runtime (log) will be rendered only dynamic tokens and injected into already styled pre-rendered layout

        // pre-style all occurrences
        if (token === '%d') {
          opts.layout = styleDate(opts.layout, styler);
        } else {
          let replacement = !isTokenFn && tokenValue ? tokenValue : needle;
          opts.layout = opts.layout.replace(needle, styler ? styler(replacement) : replacement);
        }
      }

      // pre-render label/name once
      opts.layout = applyToken(opts.layout, 'label', opts.label, stylers['label']);
      opts.layout = applyToken(opts.layout, 'name', this._optName, stylers['name']);

      // define level method
      Object.defineProperty(this, level, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: (...args) => this._log(level, ...args),
      });
    }
  }

  /**
   * Builds the log string and outputs or buffers it based on the mode.
   *
   * Note:
   * The method's own overhead is ~0.005(warmed)–0.080(cold) ms (5–80 µs).
   * This overhead is excluded from the measure, leaving a residual measure error of ~0.0003 ms (300 ns).
   *
   * @param {string} level
   * @param {*} msg
   * @param {...*} data
   * @return {string|void}
   * @private
   */
  _log (level, msg, ...data) {
    const lastTime = timer.lastTime;
    const measured = measure();

    // 0.01 - 0.0009 ms
    if (Vilog.isDisabled(this._name)) {
      // restore timing state
      timer.lastTime = lastTime;
      return;
    }

    if (!msg) {
      // mark only
      updateTimer();
      return;
    }

    // 0.0007 - 0.0003 ms
    if (msg instanceof Error) {
      level = 'error';
      msg = msg.stack || msg.message;
    } else {
      msg = data.length > 0 ? this._format(msg, ...data) : '' + msg;
    }

    // 0.0007 - 0.0003
    const { label, layout, render, _dynamicTokens, useTrace } = this._levels[level];
    const { file, line, column } = useTrace ? getCaller(2) : {};
    const { durationFmt: duration, elapsedFmt: elapsed } = measured;
    const tokens = this._tokensFn;
    const date = new Date();

    // 0.0072 - 0.002 ms (text message)
    const values = { name: this._optName, level, label, data, msg, date, duration, elapsed, file, line, column };

    // 0.005 - 0.0003 ms
    for (let name in tokens) {
      // set dynamic token values in runtime, can override default token values
      values[name] = tokens[name]();
    }

    // 0.060 - 0.001 ms
    const output = render(layout, values, _dynamicTokens);

    // 0.009 - 0.0015 ms (in silent mode)
    if (this._options.silent) {
      // if buffer would exceed capacity, auto-flush once
      if (Vilog.#maxBuffer !== Infinity && (Vilog.#buffer.length + 1) > Vilog.#maxBuffer) {
        Vilog.flush({ orderBy: Vilog.#flushOrderBy, ret: false });
      }
      Vilog.#buffer.push({
        seq: Vilog.#seqBuffer++,
        t: now(),
        name: this._name,
        level,
        output,
      });
    } else {
      this._out(output);
    }

    // exclude run time of this function
    updateTimer();

    return output;
  }

  /**
   * Format message string.
   *
   * @param args
   * @return {*}
   * @private
   */
  _format (...args) {
    return formatString(...args);
  };

  /**
   * Render layout with tokens to output string.
   *
   * @param {string} out The output pattern string containing placeholders.
   *
   * @param {object} tokens The tokens used to build log message. The pattern format: '{tokenname}' - token name must be wrapped with '{}'.
   * @param {string} tokens.name The loggers's name.
   * @param {string} tokens.level The level name.
   * @param {string} tokens.label The level label.
   * @param {any} tokens.data The raw arguments of the log function.
   * @param {string} tokens.msg The formatted data to the string.
   * @param {Date} tokens.date The current Date or provided via custom token.
   * @param {string} tokens.duration The difference time (ms) since previous call.
   * @param {string} tokens.elapsed The elapsed time (ms) since creation.
   *
   * @param {object} stylers The stylers for each token.
   * @param {Ansis} stylers.date The date-formate.
   * @param {Ansis} stylers.name The color for namespace token.
   * @param {Ansis} stylers.label The color for level label token.
   * @param {Ansis} stylers.msg The color for msg token.
   * @param {Ansis} stylers.duration The color for duration token.
   * @param {Ansis} stylers.elapsed The color for elapsed token.
   *
   * @return {string} Return final string.
   * @private
   */
  //_render (out, tokens, stylers) {
  _render (out, tokens, renderTokens) {
    // 1) inject dynamic tokens
    for (let token of renderTokens) {
      out = out.replace('{' + token + '}', tokens[token]);
    }

    // 2) render date placeholders if present
    if (out.includes('%d')) {
      out = formatDate(out, { date: tokens.date });
    }

    // 3) normalize spacing only if needed
    if (out.includes('  ')) {
      out = out.replace(/\s{2,}/g, ' ');
    }

    // 4) always replace {msg} last (message may contain braces/spaces)
    return out.replace('{msg}', tokens.msg);
  }

  /**
   * Output the string.
   * Default writes to process.stdout, as fallback to console.log.
   * Define in options to write to file.
   *
   * @param {string} message
   */
  _out (message) {
    view(message);
  }
}

module.exports = Vilog;

// ensure default import works in ESM and TypeScript: import Vilog from 'vilog'
Vilog.default = Vilog;
