import color from 'ansis';

import timer from './timer.js';
import formatDate from './formatDate.js';
import formatString from './formatString.js';
import parse from './parse.js';
import { getCaller, getEnv, isFn, mergeDeep, matchPattern, view } from './helpers.js';
import { domainToASCII } from 'node:url';

const { now, measure, updateTimer } = timer;

/**
 * Build styler function.
 *
 * @param {string|function} style Can be a chained styles of the ansis or a function.
 * @return {*|null}
 */
const buildStyler = (style) =>
  typeof style === 'function'
    ? style
    : style
      ? style.split('.').reduce((acc, name) => (acc ?? color)[name], null)
      : null;

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
 * Logging levels priority.
 * Lowest value has maximal priority.
 *
 * @type {{error: number, warn: number, default: number, info: number, debug: number}}
 */
let levels = {
  error: 0,
  warn: 1,
  default: 2,
  info: 3,
  debug: 4,
}

/**
 * Log index for auto creating the unique namespace when it is not specified.
 * @type {number}
 */
let logIdx = 1;

/** Default tokens styles */
const defaultStyle = {
  '%d': 'gray', // %d
  duration: 'gray', // time elapsed last call of log
  elapsed: 'gray', // total time elapsed since app started (lib is imported)
  label: 'white.bold',
  name: 'magenta',
  file: 'blueBright.underline',
  line: 'cyan',
  column: 'cyan',
};

class Vilog {
  /** @type Map<Vilog> All created instances keyed by namespace. */
  static instances = new Map();

  /** @type Set<string> Disabled namespace patterns: '*', 'foo:*', or exact names. */
  static #disabled = new Set();

  /** @type array<{}> Store for captured logs in silent mode. */
  static #buffer = [];

  /** @type number Global cap for buffered entries in silent mode (FIFO eviction). */
  static #maxBuffer = 10_000;

  /** @type number Monotonic sequence for strict ordering. */
  static #seqBuffer = 0;

  /** @type string Order used for auto-flush. */
  static #flushOrderBy = 'time'; // 'time' | 'name'

  /** @type Ansis Exposed Ansis instance used for color styling. */
  static color = color;

  /**
   * The maximal level of logging.
   *
   * @type {number}
   */
  _level = 4;

  get level() {
    return this._level;
  }

  set level(level) {
    // -1 for still, no logging
    this._level = Math.max(-1, level);
  }

  /**
   * True if this namespace would emit.
   **/
  get enabled () {
    return !Vilog.isDisabled(this._id);
  }

  /**
   * Toggle only this namespace on/off (global '*' still has highest priority).
   **/
  set enabled (value) {
    if (value) Vilog.enable(this._id);
    else Vilog.disable(this._id);
  }

  /**
   * Return namespace of the instance.
   * @return {string}
   */
  get name () {
    return this._id;
  }

  set name (value) {
    // do nothing
  }


  /**
   * Level options.
   * @type {{default: Theme, info: Theme, warn: Theme, error: Theme, debug: Theme}}
   */
  _levels = {
    // 0
    error: {
      label: 'ERROR',
      layout: '%d {label} {msg}',
      style: {
        label: 'red.bold',
        msg: 'red',
      },
    },
    // 1
    warn: {
      label: 'WARN',
      layout: '%d {label} {msg}',
      style: {
        label: 'yellow.bold',
        //msg: '',
      },
    },
    // 2
    default: {
      // if label undefined, then use the key as level label
      label: '',
      layout: '%d {msg}',
      style: {},
    },
    // 3
    info: {
      label: 'INFO',
      layout: '%d {label} {msg}',
      style: {
        label: 'cyan.bold',
      },
    },
    // 4
    debug: {
      label: 'DEBUG',
      layout: '{name} {msg} +{duration} ({elapsed})',
      style: {
        duration: 'cyan',
        elapsed: 'cyan',
      },
    },
  };

  _tokens = {};
  _tokenFns = {};

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
    let id = hasName ? options.name : 'vilog' + logIdx++;

    const existing = Vilog.instances.get(id);
    if (existing) {
      console.warn(`[Vilog] instance "${id}" already exists.`);
      return existing;
    }

    let { levels, tokens, format, render, output } = options;

    this._id = id;
    this._options = options;
    this._tokens.name = hasName ? options.name : '';

    // @TODO: enable/disable via ENV var is experimental, undocumented
    let envName = options.env || 'DEBUG';
    let enabledPattern = (envName ? getEnv(envName) : '') ?? '';
    if (options.enabled === false && !matchPattern(enabledPattern, this._id)) Vilog.disable(this._id);

    // TODO: implement common render for all levels, level.render overrides it
    //if (isFn(render)) this._render = render;

    if (isFn(format)) this._format = format;
    if (isFn(output)) this._out = output;
    if (levels) mergeDeep(this._levels, levels);
    if (tokens) this._tokens = mergeDeep(this._tokens, tokens);

    this._init(this._levels);

    // callable instance
    const fn = (...args) => this._log('default', ...args);
    Object.setPrototypeOf(fn, this);

    Vilog.instances.set(this._id, fn);

    timer.updateTimer();

    return fn;
  }

  /**
   * Disable logs by pattern.
   * If pattern is empty, disables all.
   * @param {string} [pattern] Pattern like '*', 'foo:*', or exact name.
   *
   * @TODO: it's experimental, undocumented
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
   *
   * @TODO: it's experimental, undocumented
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
   *
   * @TODO: it's experimental, undocumented
   */
  static isDisabled (name) {
    const disabled = this.#disabled;
    if (disabled.has('*')) return true;

    for (let pattern of disabled) {
      if (matchPattern(pattern, name)) return true;
    }
    return false;
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
    this.#buffer = [];

    // display colored log
    if (!ret) view(result);

    return colored ? result : color.strip(result);
  }

  /**
   * Initialize levels for this instance.
   *
   * @param {object} levels Levels options.
   * @private
   */
  _init (levels) {
    let tokens = this._tokens;
    let resolvers = this._tokenFns;

    if (isFn(tokens['%d'])) resolvers['%d'] = tokens['%d'];

    for (let level in levels) {
      if (Object.prototype.hasOwnProperty.call(this, level)) {
        console.warn(`[Vilog] level name "${level}" already present.`);
        continue;
      }

      let opts = levels[level];
      let styles = { ...defaultStyle, ...opts.style };
      let dateStyler = buildStyler(styles['date'] || styles['%d']); // token style `date` is alias to `%d`
      let layout = opts.layout || '';
      let parts = parse(layout);
      let chunks = [];
      let pos = 0;

      if (!('label' in opts)) opts.label = ''; // set missing level label as empty string
      if (!isFn(opts.render)) opts.render = null;
      opts.useTrace = false;
      opts.chunks = chunks; // chunks to render at runtime

      for (let item of parts) {
        let { type, token, name, start, end, padLeft = '', padRight = '' } = item;
        let spec = tokens[name];
        let useFn = isFn(spec);
        let styler = name === '%d' ? dateStyler : buildStyler(styles[name]);
        let chunk = '';

        if (type === 'date') {
          if (!styler) styler = dateStyler;
          // `%d` or `%d{...}`
          chunk = { name: 'date', fn: (date) => formatDate(token, date) };
        } else if (spec == null) { // if not in custom tokens
          // try to get token value at runtime by name (built-in or dynamic tokens), fall back to the token specified in layout
          chunk = { name, token };
        } else if (!useFn && String(spec).startsWith('%d')) {
          chunk = { name: 'date', fn: (date) => formatDate(spec, date) };
        } else if (useFn) {
          chunk = { name, token };
        } else {
          chunk = spec;
        }

        if (name === 'file' || name === 'line') opts.useTrace = true;

        // save dynamic tokens which will be evaluated at runtime
        if (useFn) resolvers[name] = spec;

        // layout chunk before token
        if (pos < start) chunks.push(layout.slice(pos, start));

        // apply style and inner spaces for non-empty tokens, e.g.
        // - `{label}` -> `INFO`
        // - `{ label }` -> ` INFO ` (useful for colored background)
        if (spec !== '') {
          styler
            ? chunks.push(styler.open, padLeft, chunk, padRight, styler.close)
            : chunks.push(padLeft, chunk, padRight);
        }

        pos = end;
      }

      // tail layout
      if (pos < layout.length) {
        chunks.push(layout.slice(pos));
      }

      // define a dynamic level method
      Object.defineProperty(this, level, {
        value (...args) {
          return this._log(level, ...args);
        },
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
  _log (level, ...data) {
    let msg = data[0];
    let lastTime = timer.lastTime;
    let measured = measure();

    // allowed logging level is lower or this namespace is disabled
    if (levels[level] > this._level || Vilog.isDisabled(this._id)) {
      // restore timing state
      timer.lastTime = lastTime;
      return;
    }

    if (!msg) {
      // mark timer only
      updateTimer();
      return;
    }

    if (msg instanceof Error) {
      level = 'error';
      msg = msg.stack || msg.message;
    } else {
      msg = data.length > 1 ? this._format(...data) : '' + msg;
    }

    let { label, chunks, render, useTrace } = this._levels[level];
    let { durationFmt: duration, elapsedFmt: elapsed } = measured;
    // TODO: add to readme - WARNING: Detection the caller is slow. Never use this option in production.
    let { file, line, column } = useTrace ? getCaller(2) : {};
    let resolvers = this._tokenFns;
    let tokens = { name: this._tokens.name, level, label, msg, data, date: new Date(), duration, elapsed, file, line, column };
    let output = '';

    // evaluate dynamic tokens, can override default tokens (it's the feature, e.g. to mock for testing)
    for (let name in resolvers) {
      // note: token name - `%d` map to `date` for intern usage
      let key = name === '%d' ? 'date' : name;
      let val = tokens[key];
      tokens[key] = resolvers[name](val); // provide the original value of the built-in token into the resolver
    }

    if (render) {
      // use custom render function defined for the layout
      output = render(tokens, color);
    } else {
      // render layout with tokens
      for (let chunk of chunks) {
        if (typeof chunk === 'object') {
          let value = tokens[chunk.name];
          if (chunk.fn) {
            output += chunk.fn(value);
          } else {
            // normalize spacing before inject message
            if (chunk.name === 'msg') {
              if (output.includes('  ')) output = output.replace(/\s{2,}/g, ' ');
            }
            output += value ?? chunk.token;
          }
        } else {
          output += chunk;
        }
      }
    }

    if (this._options.silent) {
      // if buffer would exceed capacity, auto-flush once
      if (Vilog.#maxBuffer !== Infinity && (Vilog.#buffer.length + 1) > Vilog.#maxBuffer) {
        Vilog.flush({ orderBy: Vilog.#flushOrderBy, ret: false });
      }
      Vilog.#buffer.push({
        seq: Vilog.#seqBuffer++,
        t: now(),
        id: this._id,
        name: this._tokens.name,
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
