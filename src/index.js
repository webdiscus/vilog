import color from 'ansis';

import { now, formatMs } from './helpers.js';

/**
 * The call pipeline:
 *
 * _entry(level, ...args)
 *   └─ render(...args) // raw args → plain message string
 *        └─ format({ ns, msg, diff, total }) // decorate message
 *             └─ log(formatted)  // sink
 */

class Vilog {
  /** All created instances keyed by namespace. */
  static instances = new Map();

  /** Disabled patterns: '*', 'foo:*', or exact names. */
  static disabledPatterns = new Set();

  /** Color themes */
  themes = {
    info: {
      ns: color.cyan,
      level: color.blue,
      msg: color.visible,
      diff: color.cyanBright,
      total: color.blueBright,
    },
    warn: {
      ns: color.yellow,
      level: color.yellow,
      msg: color.italic.yellowBright,
      diff: color.cyanBright,
      total: color.blueBright,
    },
    error: {
      ns: color.red,
      level: color.red,
      msg: color.redBright,
      diff: color.cyanBright,
      total: color.blueBright,
    },
    debug: {
      ns: color.magenta.inverse,
      level: color.magenta,
      msg: color.white,
      diff: color.cyanBright,
      total: color.blueBright,
    },
  };

  /**
   * Create a callable logger instance.
   * @param {string} ns The namespace.
   * @param {object} [options] The options.
   * @param {function} [options.render] The custom render of output message.
   * @param {function} [options.format] The custom formatter of output.
   * @param {function} [options.log] The output method. E.g. to write log into a file.
   * @param {number} [options.precision] Decimal places for timing (default 3).
   * @param {boolean} [options.enabled] Initial toggle for this namespace.
   */
  constructor (ns, options = {}) {
    const existing = Vilog.instances.get(ns);
    if (existing) {
      console.warn(`[Vilog] instance "${ns}" already exists.`);
      return existing;
    }

    // keep instance state on the hidden instance
    this.ns = ns;
    this.options = options;

    // callable instance
    const fn = function (...args) {
      return fn._entry('info', ...args);
    };

    // expose prototype methods and properties to the function
    Object.setPrototypeOf(fn, this);

    // initial timestamp in ms
    const initTime = now();
    Object.defineProperties(fn, {
      __now: { value: now, writable: false, configurable: true },
      __init: { value: initTime, writable: true, configurable: true },
      __last: { value: initTime, writable: true, configurable: true },
    });

    if (typeof options.render === 'function') fn.render = options.render;
    if (typeof options.format === 'function') fn.format = options.format;
    if (typeof options.log === 'function') fn.log = options.log;
    if (options.enabled === false) Vilog.disable(ns);

    Vilog.instances.set(ns, fn);

    return fn;
  }

  /**
   * True if this namespace would emit.
   **/
  get enabled () {
    return !Vilog.isDisabled(this.ns);
  }

  /**
   * Toggle only this namespace on/off (global '*' still wins).
   **/
  set enabled (value) {
    if (value) Vilog.enable(this.ns);
    else Vilog.disable(this.ns);
  }

  /**
   * Disable logs by pattern.
   * If pattern is empty, disables all.
   * @param {string} [pattern] Pattern like '*', 'foo:*', or exact name.
   */
  static disable (pattern) {
    // undefined/'' => disable all
    if (!pattern) {
      this.disabledPatterns.clear();
      pattern = '*';
    }
    this.disabledPatterns.add(pattern);
  }

  /**
   * Enable logs by pattern.
   * If pattern is empty or '*', clears all rules.
   * @param {string} [pattern] Pattern like '*', 'foo:*', or exact name.
   */
  static enable (pattern) {
    if (!pattern || pattern === '*') {
      this.disabledPatterns.clear();
      return;
    }
    this.disabledPatterns.delete(pattern);
  }

  /**
   * Check if a namespace is disabled by current rules.
   * @param {string} ns Namespace to check.
   * @returns {boolean} True if disabled.
   */
  static isDisabled (ns) {
    if (this.disabledPatterns.has('*')) return true;

    for (const pat of this.disabledPatterns) {
      if (pat.endsWith('*')) {
        const prefix = pat.slice(0, -1);
        if (ns.startsWith(prefix)) return true;
      } else if (pat === ns) {
        return true;
      }
    }
    return false;
  }

  /**
   *
   * @param {string} level
   * @param {...*} args
   * @return {string}
   * @private
   */
  _entry (level, ...args) {
    if (Vilog.isDisabled(this.ns)) {
      // no output
      return;
    }

    const { diff, total } = this._measurePerf();
    const msg = this.render(...args);
    const formatted = this.format({ ns: this.ns, level, msg, diff, total });

    this.log(formatted);
    return formatted;
  }

  // TODO: test, add to d.ts
  info (...args) {
    return this._entry('info', ...args);
  }

  // TODO: test, add to d.ts
  warn (...args) {
    return this._entry('warn', ...args);
  }

  // TODO: test, add to d.ts
  error (...args) {
    return this._entry('error', ...args);
  }

  // TODO: test, add to d.ts
  debug (...args) {
    return this._entry('debug', ...args);
  }

  /**
   * Turn raw arguments into a plain message string (before decoration).
   *
   * @param {string} message Template or base string.
   * @param {...any} [args] Values used to fill the template.
   * @returns {string} The rendered message.
   */
  render (message, ...args) {
    if (typeof message !== 'string') return String(message);

    // simple %s %d %j (Node-style) – extend later as needed
    let i = 0;

    return message.replace(/%[sdj%]/g, (format) => {
      if (format === '%%') return '%';
      const val = args[i++];
      switch (format) {
        case '%s':
          return `"${String(val)}"`;
        case '%d':
          return Number(val);
        case '%j':
          try {
            return JSON.stringify(val);
          } catch {
            return '[Circular]';
          }
        default:
          return format;
      }
    }) + (i < args.length ? ' ' + args.slice(i).map(String).join(' ') : '');
  }

  /**
   * Build the formatted message string. Override to change formatting.
   *
   * @param {object} tokens The named token used to build log message.
   * @param {string} tokens.ns The namespace.
   * @param {string} tokens.level The message level.
   * @param {string} tokens.msg The formatted message string.
   * @param {string} tokens.diff The difference time (ms) since previous call.
   * @param {string} tokens.total The total time (ms) since creation.
   * @return {string}
   */
  format ({ ns, level, msg, diff, total }) {
    //let dt = new Date().toISOString(); // TODO: implement custom date-(time) format as custom token
    //return `[${dt}] [${ns}] [${level}] ${msg} +${diff} (${total})`; // example of the full template
    //return `[${ns}] ${msg} +${diff} (${total})`; // no colors

    const theme = this.themes[level];

    return `[${theme.ns(ns)}] ${theme.msg(msg)} ${theme.diff`+${diff}`} (${theme.total(total)})`;
  }

  /**
   * Output the already formatted string.
   * Default writes to console.log. Override to write to file, stderr, etc.
   *
   * @param {string} message
   */
  log (message) {
    console.log(message);
  }

  /**
   * @return {{diff: string, total: string}}
   * @private
   */
  _measurePerf () {
    const now = this.__now();
    const rawDiff = now - this.__last; // since previous call (ms)
    const rawTotal = now - this.__init; // since instance creation (ms)
    this.__last = now;

    const diff = formatMs(rawDiff, { precision: this.options.precision });
    const total = formatMs(rawTotal, { precision: this.options.precision });

    return { diff, total };
  }
}

module.exports = Vilog;

// ensure default import works in ESM and TypeScript: import Vilog from 'vilog'
Vilog.default = Vilog;
