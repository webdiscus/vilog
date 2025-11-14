const textEncoder = new TextEncoder();

/**
 * Parses a layout string and returns a flat, ordered list of tokens.
 *
 * Format:
 *  - `{name}`                   → type: 'any'
 *  - `%x{name}` (e.g. `%d{ts}`) → type: 'date' if x === 'd', else 'any'
 *  - `%x` (e.g. `%d`, `%t`)     → type: 'date' if x === 'd', else 'any'
 *
 * @param {string} layout The input layout string.
 * @returns {Array<{ type: 'date'|'any', token: string, name: string, start: number, end: number, padLeft?: number, padRight?: number }>}
 *   Each entry represents one parsed token, in the order they appear.
 *   - `type`:  'date' for `%d{...}` and `%d`, otherwise 'field'.
 *   - `token`: verbatim token text (`%x`, `{name}`, or `%x{name}`).
 *   - `name`: present for braced tokens (content inside `{}`).
 *   - `start`: the index of start token
 *   - `end`: the index of end token
 *   - `padLeft`: spaces inside the braces, on the left side
 *   - `padRight`: spaces inside the braces, on the right side
 */
function parse (layout) {
  const codes = textEncoder.encode(layout);
  const n = codes.length;
  const out = [];

  for (let i = 0; i < n; i++) {
    let c = codes[i];
    let type = 'any';

    // %x or %x{...}
    if (c === 37 /* % */ && i + 1 < n) {
      let spec = layout[i + 1];
      if (spec === 'd') type = 'date';

      // %x{...}, the token name is the token option string, e.g.: `%d{YYYY-MM-DD}` -> `YYYY-MM-DD`
      if (i + 2 < n && codes[i + 2] === 123 /* { */) {
        let start = i + 3;
        let j = codes.indexOf(125, start);
        if (j >= n || j < 0) break;
        if (j > start) {
          // NOTE: for %x{...} we keep name as-is, we don't play with inner spacing here
          let name = layout.slice(start, j);
          out.push({ type, token: `%${spec}{${name}}`, name, start: i, end: j + 1 });
        }
        i = j;
        continue;
      }

      // %x, the token name is the same as itself token, e.g.: `%d` -> `%d`
      out.push({ type, token: `%${spec}`, name: `%${spec}`, start: i, end: i + 2 });
      i++;
      continue;
    }

    // {name}, the token name is token w/o brackets, e.g.: `{name}` -> `name`
    if (c === 123 /* { */) {
      let start = i + 1;
      let j = codes.indexOf(125, start);
      if (j >= n || j < 0) break;
      if (j > start) {
        let raw = layout.slice(start, j);
        let name = raw.trim();

        // spaces around the trimmed name inside the braces
        let padLeft = '';
        let padRight = '';
        if (name) {
          for (let li = start; codes[li++] === 32;) padLeft += ' ';
          for (let ri = j - 1; codes[ri--] === 32;) padRight += ' ';
        }

        out.push({ type, token: `{${raw}}`, name, start: i, end: j + 1, padLeft, padRight });
      }
      i = j;
    }
  }

  return out;
}

export default parse;
