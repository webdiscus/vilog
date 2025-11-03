/**
 * Render `%d{...}` date placeholder(s) in a pattern string.
 *
 * Supported tokens:
 *   - YYYY  4-digit year
 *   - YY    2-digit year
 *   - MM    Month 01–12
 *   - DD    Day 01–31
 *   - HH    Hours 00–23
 *   - mm    Minutes 00–59
 *   - ss    Seconds 00–59
 *   - sss   Milliseconds 000–999
 *   - ts    Unix timestamp seconds (no milliseconds)
 *
 * If a `%d` appears without `{...}`, it's treated as `%d{YYYY-MM-DDTHH:mm:ss.sssZ}`.
 *
 * @param {string} pattern Pattern string containing a date placeholder.
 * @param {object} [options] Options to control rendering.
 * @param {Date} [options.date=new Date()] Date instance used for formatting.
 * @param {(s: string) => string} [options.styler=null] Optional wrapper for the formatted date.
 * @returns {string} The pattern with the rendered placeholder(s).
 *
 * @example
 * renderDate('%d{YYYY/MM/DD-HH.mm.ss} My text', { date: new Date('2025-12-31T09:01:05') });
 * Outputs: '2025/12/31-09.01.05 My text'
 */
function formatDate (pattern, { date = new Date(), styler = null } = {}) {
  if (typeof pattern !== 'string' || pattern.length === 0) return '';

  let start = pattern.indexOf('%d');

  if (start < 0) return pattern;

  // default is iso8601 date-format if `%d` has no `{...}`
  if (pattern[start + 2] !== '{') {
    // note:
    // - it works on 50 microseconds faster then toISOString()
    // - it uses local timezone but toISOString() uses UTC timezone
    pattern = pattern.replace('%d', '%d{YYYY-MM-DDTHH:mm:ss.sssZ}');
  }

  // date parts
  const Y = '' + date.getFullYear();
  const y = Y.slice(-2);
  const M = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ms = date.getMilliseconds();
  const ts = '' + Math.floor(date.getTime() / 1000); // timestamp seconds

  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
  const pad3 = (n) => (n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n);

  // replace tokens in a single date-format substring
  const render = (str) =>
    str
      .replace('YYYY', Y)
      .replace('YY', y)
      .replace('MM', pad2(M))
      .replace('DD', pad2(d))
      .replace('HH', pad2(h))
      .replace('mm', pad2(m))
      .replace('sss', pad3(ms))
      .replace('ss', pad2(s))
      .replace('ts', ts);

  const open = '%d{';
  let out = '';
  let pos = 0;

  for (; start !== -1; start = pattern.indexOf(open, pos)) {
    out += pattern.slice(pos, start);

    // find closing brace or next opening tag
    let fmtStart = start + open.length;
    let end = pattern.indexOf('}', fmtStart);
    let nextOpen = pattern.indexOf(open, fmtStart);

    // missing "}" or before next open: leave segment untouched
    if (end === -1 || (nextOpen !== -1 && end > nextOpen)) {
      if (nextOpen === -1) {
        out += pattern.slice(start);
        return out;
      }
      out += pattern.slice(start, nextOpen);
      pos = nextOpen;
      continue;
    }

    let dateFmt = render(pattern.slice(fmtStart, end));
    if (styler) dateFmt = styler(dateFmt);

    out += dateFmt;
    pos = end + 1;
  }

  return out + pattern.slice(pos);
}

// TODO: style placeholder in prerender
function styleDate(pattern, styler) {
  if (typeof pattern !== 'string' || pattern.length === 0) return '';
  if (typeof styler !== 'function') return pattern;

  const OPEN = '%d';
  const OPEN_BRACED = '%d{';

  let out = '';
  let pos = 0;

  // find next '%d'
  for (let start = pattern.indexOf(OPEN, pos); start !== -1; start = pattern.indexOf(OPEN, pos)) {
    // copy literal chunk before '%d'
    out += pattern.slice(pos, start);

    // check if it's '%d{...}'
    const hasBrace = pattern[start + OPEN.length] === '{';
    if (!hasBrace) {
      // plain %d
      out += styler('%d');
      pos = start + OPEN.length;
      continue;
    }

    // braced: find closing '}', but avoid crossing into the next '%d{'
    const fmtStart = start + OPEN_BRACED.length; // position after '%d{'
    let end = pattern.indexOf('}', fmtStart);
    const nextOpen = pattern.indexOf(OPEN_BRACED, fmtStart);

    // If '}' is missing or comes after the next '%d{', treat as malformed.
    if (end === -1 || (nextOpen !== -1 && end > nextOpen)) {
      if (nextOpen === -1) {
        // no further '%d{': leave the rest untouched and finish
        out += pattern.slice(start);
        return out;
      }
      // keep the malformed chunk verbatim up to the next '%d{' and continue
      out += pattern.slice(start, nextOpen);
      pos = nextOpen;
      continue;
    }

    const token = pattern.slice(start, end + 1);
    out += styler(token);
    pos = end + 1;
  }

  return out + pattern.slice(pos);
}

export default formatDate;
export { styleDate };
