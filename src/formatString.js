/**
 * Tiny and fast rough converter for any value to its string representation.
 *
 * Objects and arrays are converted via JSON.stringify.
 * Circular references are handled as "[Circular]".
 *
 * @param {*} value Value to stringify.
 * @returns {string} String representation of the value.
 */
function toString (value) {
  let type = typeof value;

  if (type === 'string') {
    return value;
  }

  if (value == null || type === 'number' || type === 'boolean' || value instanceof Error) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[Circular]';
  }
}

/**
 * Lightweight, browser-compatible formatter for log messages, inspired by Node.js util.format().
 *
 * Supported placeholders in the template:
 *   %s  String interpolation using safe string conversion.
 *   %d  Number interpolation using Number(value).
 *   %j  JSON interpolation using JSON.stringify, falling back to "[Circular]".
 *   %%  Escaped percent sign.
 *
 * See: https://nodejs.org/download/release/v4.4.2/docs/api/util.html#util_util_format_format
 *
 * @param {*} tmpl Template string containing optional placeholders or any value.
 * @param {...*} args Values to insert into the template.
 * @returns {string} Formatted string containing all arguments.
 */
function formatString (tmpl, ...args) {
  if (typeof tmpl !== 'string') {
    return [tmpl, ...args].map(toString).join(' ');
  }

  let i = 0;

  const result = tmpl.replace(/%[sdj%]/g, (field) => {
    if (field === '%%') return '%';

    const value = args[i++];

    switch (field) {
      case '%s':
        return toString(value);
      case '%d':
        return String(Number(value));
      case '%j':
        try { return JSON.stringify(value); } catch { return '[Circular]'; }
      default:
        return field;
    }
  });

  if (i < args.length) {
    return result + ' ' + args.slice(i).map(toString).join(' ');
  }

  return result;
}

export default formatString;
