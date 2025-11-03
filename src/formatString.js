// see: https://nodejs.org/download/release/v4.4.2/docs/api/util.html#util_util_format_format

function formatString (tmpl, ...args) {
  let i = 0;

  return tmpl.replace(/%[sdj%]/g, (field) => {
    if (field === '%%') return '%';
    const value = args[i++];
    switch (field) {
      case '%s':
        return String(value);
      case '%d':
        return Number(value);
      case '%j':
        try { return JSON.stringify(value); } catch { return '[Circular]'; }
      default:
        return field;
    }
  }) + (i < args.length ? ' ' + args.slice(i).map(String).join(' ') : '');
}

export default formatString;
