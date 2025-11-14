const DEFAULT_FMT = 'YYYY-MM-DDTHH:mm:ss.sssZ';
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
const pad3 = (n) => (n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n);

/**
 * Render `%d{...}` date pattern string.
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
 * @param {Date} [date=new Date()] Date instance used for formatting.
 * @returns {string} The pattern with the rendered placeholder(s).
 *
 * @example
 * renderDate('%d{YYYY/MM/DD-HH.mm.ss} My text', { date: new Date('2025-12-31T09:01:05') });
 * Outputs: '2025/12/31-09.01.05 My text'
 */
function formatDate (pattern, date = new Date()) {
  let Y   = '' + date.getFullYear();
  let y   = Y.slice(-2);
  let MM  = pad2(date.getMonth() + 1);
  let DD  = pad2(date.getDate());
  let HH  = pad2(date.getHours());
  let mm  = pad2(date.getMinutes());
  let ss  = pad2(date.getSeconds());
  let sss = pad3(date.getMilliseconds());
  let ts  = '' + Math.floor(date.getTime() / 1000);

  let fmt = pattern === '%d' ? DEFAULT_FMT : pattern.slice(3, -1);

  return fmt
  .replace('YYYY', Y)
  .replace('YY', y)
  .replace('MM', MM)
  .replace('DD', DD)
  .replace('HH', HH)
  .replace('mm', mm)
  .replace('sss', sss)
  .replace('ss', ss)
  .replace('ts', ts);
}

export default formatDate;
