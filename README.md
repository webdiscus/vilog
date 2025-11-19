<a id="top"></a>
# Vilog

A fast logger for Node.js with flexible, colorized templates, multi-argument message formatting, and built-in profiling.

[→ Table of Contents](#toc)

---

<a id="install"></a>
## Install

```bash
npm install vilog
```

<a id="features"></a>
## Features

- **Pre-compiled layouts - minimal runtime overhead**\
  Layout strings are parsed once into chunks, so at log time only dynamic tokens are evaluated and joined.

- **Flexible layout templates with built-in and custom tokens**
  - date token `%d` for an ISO-formatted date/time string: `2025-11-11T11:11:01.075Z`
  - date token `%d{...}` with placeholders like `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, `SSS`\
    Examples: `%d{YYYY-MM-DD HH:mm:ss}`, `%d{HH:mm:ss}`, `%d{ts}`, `%d{ts.sss}`, etc.
  - log tokens: `{level}`, `{label}`, `{name}`, `{msg}`
  - profiling tokens: `{duration}`, `{uptime}`
  - caller info tokens: `{file}`, `{line}`, `{column}`
  - custom user-defined tokens such as `{pid}`, `{memory}`, `%x`, etc.

- **Built-in profiling with auto-scaled human-friendly units** (`ns`, `µs`, `ms`, `s`, `m`, `h`, `d`)
  - `{duration}` - time since the previous log
  - `{uptime}` - time since application start

- **Custom tokens for layout templates**
  - static — rendered once at initialization: `tokens: { pid: process.pid }`
  - dynamic — evaluated on each log call: `tokens: { memory: () => process.memoryUsage().heapUsed }`

- **Flexible color styling for any token in a layout**
  - chained style strings: `style: { label: 'bold.yellow.bgRed' }`
  - truecolor styles via functions: `style: { label: Vilog.color.hex('#1D89D9') }`

- **Smart spacing and padding in layouts**
  - `{token}` vs `{ token }` preserves inner spaces, useful for background-colored labels
  - automatically collapses multiple spaces in layout templates
  - empty tokens (e.g. `myToken: ''`) collapse their surrounding spaces

- **Custom levels**
  Define your own levels (`trace`, `json`, `audit`, …) with:
  - `level` - numeric priority
  - `label` - human-readable label of the `level`
  - `layout` - template using built-in and custom tokens
  - `style` - color styling for any token in the layout
  - `render()` - custom render function for full control

- **Custom render per level**
  For special formats you can bypass layouts and return any string
  - render a JSON string:
  ```js
  render: ({ date, name, level, data }) => JSON.stringify({ date, level, name, data });
  ```
  - render a custom colorized string:
  ```js
  render: ({ name, label, msg }, color) => `${color.green(name)} ${color.red(label)} ${msg}`;
  ```

- **Silent mode and buffered flush**\
  Run loggers in `silent` mode to buffer output in memory.\
  Flush all buffered logs later in chronological order, with optional colored or plain-text output.

- **Test-friendly by design** Built-in dynamic tokens for time, date, and duration can be fully mocked in tests.

---

<a id="toc"></a>
# Table of Contents

1. [Features](#features)
2. [Install](#install)
3. [Quick Start](#quick-start)
4. [Advanced Example](#advanced-example)
5. [Layouts & Tokens](#layouts-and-tokens)
   - [Date/time token](#date-tokens)
   - [Log tokens](#log-tokens)
   - [Message token](#message-token)
   - [Profiling tokens](#profiling-tokens)
   - [Duration format](#duration-format)
   - [Trace tokens](#trace-tokens)
   - [Custom tokens](#custom-tokens)
   - [Custom render](#custom-render)
1. [Color Styling](#styling)
   - [Styling Dates](#styling-dates)
   - [Styling Tokens](#styling-tokens)
1. [Levels](#levels)
1. [Silent Mode & Buffering](#silent-mode-and-buffering)
1. [API Reference](#api-reference)
1. [Recipes](#recipes)
1. [License](#license)

<a id="quick-start"></a>
## Quick Start

#### Create a logger

Define the `name` option if you want to use a namespace.

```js
import Vilog from 'vilog';

const log = new Vilog({ name: 'api:sync' });
```

#### Basic logging

```js
log('starting app');
log.info('server connected');
log.warn('slow connection', { ms: 350 });

const err = new Error('request failed');
log.error('failure:', err);
```

Output:

```
2025-11-15T17:12:15.125Z starting app
2025-11-15T17:12:16.385Z INFO server connected
2025-11-15T17:12:16.387Z WARN slow connection {"ms":350}
2025-11-15T17:12:16.387Z ERROR failure: Error: request failed
```

#### Multiple arguments

```js
const field = 'user';
const ids = [42, 768, 15];
const sort = { orderBy: 'crdate' };

log.debug('request values:', field, ids, sort);
```

Output:
```
api:sync request values: user [42,768,15] {"orderBy":"crdate"} +5.708µs (2.478ms)
```

#### Message formatting

```js
log.info('fetched %d records from %s', 120, '/api/data');
```

Output:
```
2025-11-15T17:12:16.385Z INFO fetched 120 records from /api/data
```

#### Profiling

```js
// mark a profiling point (no output, only sets the timer)
log.debug(null, 'start fetching');

// ... do something

// log message with elapsed time since the last mark or log call
log.debug('fetching done');
```

Output:
```
api:sync fetching done +85.067ms (2.478ms)
```

<a id="advanced_example"></a>
## Advanced example

Customize layouts, colors, levels and tokens.

```js
import Vilog from 'vilog';

// destructure colors from the exposed Ansis instance
const { cyan, yellow, hex } = Vilog.color;

const log = new Vilog({
  name: 'api:sync',

  levels: {
    default: {
      // custom default layout
      layout: '%d{YYYY-MM-DD HH:mm:ss} {msg}',
    },
    info: {
      // custom date/time layout
      layout: '%d{YYYY-MM-DD} %d{HH:mm:ss} {label} {msg}',
      // custom styles for date parts, using green and truecolor via hex()
      style: { 'YYYY-MM-DD': 'green', 'HH:mm:ss': hex('#1D89D9') },
    },
    debug: {
      // layout with PID, memory usage and profiling
      layout: '%d{ts.sss} {name} {pidLabel}{pid} {memoryLabel}{memory} {msg} +{duration} ({uptime})',
      style: { pidLabel: 'green', pid: 'yellow', memoryLabel: 'green', memory: 'yellow' },
    },
    // custom log level
    trace: {
      level: 10, // level priority
      label: 'TRACE', // human-readable label
      layout: '{ label } {name} {msg} {file}:{line}:{column}',
      style: { label: 'black.bgYellow' },
    },
  },

  // custom tokens used in layouts
  tokens: {
    pidLabel: 'PID:', // static token (precompiled once)
    memoryLabel: 'Memory:', // static token
    pid: process.pid, // static token
    memory: () => process.memoryUsage().heapUsed, // dynamic token (evaluated at runtime)
  },
});
```

Log messages:
```js
log('starting app');

// colorize placeholders in the message
log.info(`fetched ${cyan`%d`} records from ${yellow`%s`}`, 120, '/api/data');

log.warn(`request retry ${cyan`%d`} pending`, 5);
log.error('request failed!'); // outputs error message only
log(new Error('request failed!')); // outputs error stack with error level
log.trace('called at'); // outputs with caller info

// mark a profiling point (no output, only sets the timer)
log.debug(null, 'start processing');

// ... do something

// log message with elapsed time since last mark or log call
log.debug('processed %d orders', 99);
```

Output:

![Output of advanced example](https://github.com/webdiscus/vilog/raw/master//docs/example-02.png)


#### [↑ Table of Contents](#toc)
<a id="layouts-and-tokens"></a>
## Layouts & Tokens

Vilog uses **layout strings** as templates for rendering each log line.
A layout is just a plain string with **tokens**.

When a logger is created, Vilog pre-compiles the layout into chunks
so that during runtime only the *dynamic* tokens (time, message, duration, caller, etc.) are evaluated.
This minimizes per-log overhead and keeps logging fast even under high frequency.

### Layout syntax

Inside a layout you can combine:

- Plain text.
- **Date tokens** starting with `%d`.
- **Short %-tokens**: `%` followed by a single char (e.g. `%x`)
- **Named tokens** wrapped in `{...}`, e.g. `{label}`, `{myToken}`.

Each built-in log level has its own default layout:

```js
const log = new Vilog();

log.info('Hello');
```

Output:
```
2025-11-15T17:12:16.385Z INFO Hello
```

You can override the layout per level:

```js
const log = new Vilog({
  name: 'app',
  levels: {
    info: {
      layout: '%d{HH:mm:ss} {label} [{name}] {msg}',
    }
  },
});
```

Output:
```
17:12:16 INFO [app] Hello
```

<a id="date-tokens"></a>
### Date/time token `%d{...}`

The `%d` token prints the current date/time.

- `%d` - ISO-formatted date/time string, e.g. `2025-11-11T11:11:01.075Z`
- `%d{...}` - custom format using placeholders:
  - `YYYY`   4-digit year
  - `YY`     2-digit year
  - `MM`     Month 01-12
  - `DD`     Day 01-31
  - `HH`     Hours 00-23
  - `mm`     Minutes 00-59
  - `ss`     Seconds 00-59
  - `sss`    Milliseconds 000-999
  - `ts`     Unix timestamp seconds (no milliseconds)

You can freely combine placeholders to create any date format.

Examples:

| Date pattern              | Output                     |
|---------------------------|----------------------------|
| `%d`                      | `2025-12-31T09:01:05.075Z` |
| `%d{YYYY/MM/DD-HH.mm.ss}` | `2025/12/31-09.01.05`      |
| `%d{YYYY-MM-DD HH:mm:ss}` | `2025-12-31 09:01:05`      |
| `%d{YYYY-MM-DD}`          | `2025-12-31`               |
| `%d{HH:mm:ss}`            | `09:01:05`                 |
| `%d{HH:mm:ss.sss}`        | `09:01:05.075`             |
| `%d{ts}`                  | `1763160223`               |
| `%d{ts.sss}`              | `1763160223.075`           |


<a id="log-tokens"></a>
### Log tokens

These refer to standard log fields:

- `{level}` The internal level name (`info`, `warn`, `error`, ...)
- `{label}` Level label (`INFO`, `WARN`, `ERROR`, ...)
- `{name}` Logger name / namespace (`app`, `db`, `task:one`, ...)

<a id="message-token"></a>
### Message token

The `{msg}` token prints the formatted message.

Supported Node-style printf templates with the placeholders:

- `%s` Convert to string via `String(value)`
- `%d` Convert to number via `Number(value)`
- `%j` JSON.stringify (falls back to `[Circular]`)
- `%%` Escaped percent sign.

Example:

```js
log.info('fetched %d records from %s', 120, '/api/data');
```

Output:

```
2025-11-15T17:12:16.385Z INFO fetched 120 records from /api/data
```

#### Multiple arguments

If the message string has no placeholders, additional arguments are appended in order:

```js
const a = 'hello';
const b = [42, 768, 15];
const c = { foo: 'bar' };

log.info('values:', a, b, c);
```

Output:

```
2025-11-15T17:12:16.385Z INFO values: hello [42,768,15] {"foo":"bar"}
```

#### Error argument handling

If an argument is an Error instance,
Vilog automatically prints it as an **error-level** entry, even if the original call used a different level:

```js
try {
  throw new Error('something is wrong');
} catch (err) {
  log(err); // called without .error(), but printed as error level
}
```

Output:

```
2025-11-17T13:57:23.982Z ERROR Error: something is wrong
    at getStatus (file:///path/to/app.js:27:9)
    at file:///path/to/app.js:31:23
    at ModuleJob.run (node:internal/modules/esm/module_job:345:25)
```

If you want a plain red error message (without stack):

```js
log.error('something is wrong');
```

Output:

```
2025-11-15T17:12:16.385Z ERROR something is wrong
```

<a id="profiling-tokens"></a>
### Profiling tokens

Vilog provides **built-in high-precision profiling** using monotonic timer.
This guarantees stable and drift-free measurements even under heavy load.

- `{uptime}` Time elapsed since the application started and `Vilog` was imported.
- `{duration}` Time elapsed since the previous log call.\
  The internal logging overhead is excluded to show the *actual execution time* of your code.

Both tokens auto-scale to human-friendly units: `ns` → `µs` → `ms` → `s` → `m` → `h` → `d`.

Scaling behavior:

- Very small values stay in `ns`
- Intermediate values stay compact (`µs`, `ms`, `s`)
- Long-running values switch to `m`/`h`/`d` for readability

See details in [Duration format](#duration-format).

> [!NOTE]
>
> `{uptime}` is Vilog's built-in token for the **application uptime**.
>
> If you want to expose the actual Node.js *process uptime* (`process.uptime()`) as a custom token,
> use a different, explicit token name to avoid confusion, for example `{procUptime}`.
>
> ```js
> const log = new Vilog({
>   tokens: {
>     procUptime: () => process.uptime(), // seconds
>   },
>   levels: {
>     debug: {
>       layout: '{msg} (app: {uptime}, proc: {procUptime}s)',
>     },
>   },
> });
> ```
>
> Where:
> - `{uptime}` The Vilog's precise application uptime
> - `{procUptime}` The real Node.js process uptime from `process.uptime()`


#### Marking a starting point

To measure only a part of code, you can **mark** the starting point without printing any output.

Set the message (first argument) to `null`.
The second argument may contain a comment for your own understanding (not printed):

```js
log.debug(null, 'start'); // marks the starting point
```

This does not create a log entry.\
This resets `{duration}` so the next log call measures from this exact point.

Example with custom layout:

```js
const log = new Vilog({
  name: 'app',
  levels: {
    debug: {
      layout: '%d{ts.sss} [{name}] {msg} +{duration} (start: {uptime})',
    },
  },
});

log.debug(null, 'start');  // marker, no output
// ... do something
log.debug('done');
```

Output:
```
1731681136.389 [app] done +85.067ns (start: 2.478ms)
```

Explain:
- `85.067ns` Time elapsed between the `start` marker and `done` log call
- `2.478ms` Total application uptime since the app started

<a id="duration-format"></a>
### Duration format

**Nanosecond edge case**

Durations smaller than `1 ns` cannot be measured in real-world JavaScript environments.
Even the minimal interval between consecutive `performance.now()` calls is already larger than `1 ns`.

For completeness, values below `1 ns` are still formatted within the nanosecond scale as fractional nanoseconds (`0.xxx ns`),
but such values represent theoretical precision only, not real measurements.

```
0.0000000002341310065ms -> 0ns // values <0.001ns are treated as noise
0.0000000012341310065ms -> 0.001ns
```

**Display precision rule**

1. Normalize the value to the target display unit.
2. Round or truncate only inside that unit's visible precision.
3. Apply auto-scaling if rounding exceeds the unit's maximum (e.g., `999.9995ns` → `1µs`).

Nanoseconds:
```
0.0004999994ms → normalize to nanoseconds → 499.9994ns → truncate   → 499.999ns
0.0004999995ms → normalize to nanoseconds → 499.9995ns → round up   → 500ns
0.0009999995ms → normalize to nanoseconds → 999.9995ns → auto-scale → 1µs
```

Microseconds:
```
0.4999994ms → normalize to microseconds → 499.9994µs → truncate   → 499.999µs
0.4999995ms → normalize to microseconds → 499.9995µs → round up   → 500µs
0.9999995ms → normalize to microseconds → 999.9995µs → auto-scale → 1ms
```

Milliseconds:
```
499.9994ms → truncate   → 499.999ms
499.9995ms → round up   → 500ms
999.9995ms → auto-scale → 1s
```

**Around minute rule**

- For values < `60 000 ms`, format as `s.xxx` with round half-up to milliseconds.
- If rounding results is `60 000 ms`, the value is auto-scaled to `1m 0s`
- For values >= `60 000 ms`, truncate milliseconds (no rounding) to avoid artificial carry-over in long durations.

Sub-minute range:
```
 1999.4ms → normalize to seconds →  1.9994s → truncate   → 1.999s
 1999.5ms → normalize to seconds →  1.9995s → round up   → 2s
59999.5ms → normalize to seconds → 59.9995s → auto-scale → 1m 0s
```

Minute-up range:
```
  60999.999ms → normalize to seconds →   60.999s → truncate ms →  1m 0s  (not round up to 1m 1s)
 119999.999ms → normalize to seconds →  119.999s → truncate ms →  1m 59s (not round up to 2m)
3599999.999ms → normalize to seconds → 3599.999s → truncate ms → 59m 59s (not round up to 1h)
```

<a id="trace-tokens"></a>
### Trace tokens

Trace tokens allow you to include caller location in the log output.
Caller detection is automatically enabled when the layout contains any of the following tokens:

- `{file}` Source file path
- `{line}` Line number in the source file
- `{column}` Column number in the source line

> [!WARNING]
>
> Caller detection is slow. Avoid using trace tokens in production.

Example:

```js
const log = new Vilog({
  levels: {
    // custom level
    trace: {
      label: 'TRACE',
      layout: '{label} {msg} {file}:{line}:{column}',
    },
  },
});

log.trace('called at');
```

Output:
```
TRACE called at /path/to/file.js:84:17
```

<a id="custom-tokens"></a>
### Custom tokens

Custom tokens allow you to extend layouts with your own data.\
They can be **static** (pre-rendered once at initialization) or **dynamic** (evaluated on each log call).

```js
const log = new Vilog({
  levels: {
    debug: {
      // layout with custom PID and memory tokens
      layout: '{ts} | Uptime: {uptime} | PID: {pid} | Memory usage: {memory} | {msg}',
    },
  },
  // custom tokens used in layout
  tokens: {
    pid: process.pid,                             // static token
    memory: () => process.memoryUsage().heapUsed, // dynamic token
  },
});

log.debug('Task one');
log.debug('Task two');
```

Output:
```
1763415969 | Uptime: 2.588ms | PID: 24153 | Memory usage: 5128416 | Task one
1763415969 | Uptime: 2.615ms | PID: 24153 | Memory usage: 5141728 | Task two
```

<a id="named-token"></a>
#### Named token - `{token}`

Named tokens use the brace `{...}` syntax.
Their names make layouts more readable.

Inside braces, spaces are preserved around the resolved value.

Example:

| Layout token | Resolved output (name="app") |
|--------------|------------------------------|
| `[{name}]`   | `[app]`                      |
| `[{ name }]` | `[ app ]`                    |
| `[{name }]`  | `[app ]`                     |
| `[{ name}]`  | `[ app]`                     |

The padding is especially useful for [background styling](#background-styling).

<a id="short-token"></a>
#### Short token - `%x`

Short tokens are single-char tokens with `%`.
They can be useful when you have many custom values and want compact syntax.

```js
const log = new Vilog({
  levels: {
    default: {
      layout: '%h | PID: %p | Memory usage: %m | {msg}',
    },
  },
  // custom tokens
  tokens: {
    '%h': 'localhost',
    '%p': process.pid,
    '%m': () => process.memoryUsage().heapUsed,
  },
});
```

Plain `%` characters can follow the token:
```
layout: "Complete: %z% | {msg}"
tokens: { '%z': () => 97.5 }

→ "Complete: 97.5% | text"
```


#### Collapse Spaces

If a custom token resolves to an empty string, the surrounding spaces and padding collapses automatically:

```
layout: "{host} { myToken } | {msg}"
tokens: { host: "localhost", myToken: "" }
```

Output:

```
localhost | text
```

#### Undefined Tokens

If a token is used in the layout but is not defined in `tokens` option, it is preserved as is:

```js
const log = new Vilog({
  levels: {
    default: {
      layout: '{pid} | %h | {msg}',
    },
  },
  tokens: {
    // pid: process.pid,
    // '%h': 'localhost',
  },
});

log('text');
```

Output:
```
{pid} | %h | text
```

<a id="custom-render"></a>
### Custom render

A custom **render** function gives you full control over how a log line is produced.

This is useful for:
- JSON or structured logs
- full-line custom styling

The function arguments are:

- `tokens` - an object containing all runtime values
- `color` - the Ansis instance for manual styling

Available fields in the `tokens` object:

| Field             | Description                                                                    |
|-------------------|--------------------------------------------------------------------------------|
| `date`            | Current timestamp (`Date` object) or modified by `%d` resolver                 |
| `name`            | Logger name / namespace                                                        |
| `level`           | Level key (`'info'`, `'warn'`, `'debug'`, custom, etc.)                        |
| `label`           | Human-readable level label (e.g. `'INFO'`, `'WARN'`)                           |
| `msg`             | Formatted message string                                                       |
| `data`            | Original arguments array passed to log method                                  |
| `duration`        | Time since previous log call (auto-scaled)                                     |
| `uptime`          | Time since application start (auto-scaled)                                     |
| `file`            | Caller file path (only when `{file}` or `{line}` or `{column}` used in layout) |
| `line`            | Caller line                                                                    |
| `column`          | Caller column                                                                  |
| **custom tokens** | From `tokens: { ... }`                                                         |


Example:

```js
const log = new Vilog({
  name: 'app',
  levels: {
    myLevel: {
      label: 'CUSTOM',
      render: ({ date, name, level, label, data, msg, duration, uptime }, color) => {
        return `${color.green(label)} | ${color.magenta(name)} | ${msg}`;
      },
    },
    toJson: {
      render: ({ date, name, memory, data }) => JSON.stringify({ date, name, memory, data }),
    },
  },
  tokens: {
    memory: () => process.memoryUsage().heapUsed,
  },
});

log.myLevel('text'); // → CUSTOM | app | text

log.toJson({ foo: 'bar' });
// → {"date":"2025-11-11T10:11:01.075Z","name":"app","host":"10.0.0.1","data":[{"foo","bar"}]}
```

#### [↑ Table of Contents](#toc)
<a id="styling"></a>
## Color Styling

Vilog uses the [Ansis](https://github.com/webdiscus/ansis?#styles) for color output.
Tokens in a layout can be styled using the level's `style` object,
or you can override their appearance with a custom [render](#custom-render) function.

All styles are applied once during initialization. At runtime, styling adds no overhead.

#### Style syntax

Vilog supports all [Ansis features](https://github.com/webdiscus/ansis#-features).

Examples:

|                      |                              |
|----------------------|------------------------------|
| Single color         | `"yellow"`                   |
| Background           | `"bgYellow"`                 |
| Multiple styles      | `"bold.black.bgYellow"`      |
| Truecolor (function) | `Vilog.color.hex('#1D89D9')` |

<a id="background-styling"></a>
Example:

```js
import Vilog from 'vilog';

const log = new Vilog({
  name: 'app',
  levels: {
    info: {
      layout: '{ label } {name} {msg}',
      style: {
        label: 'black.bgCyan', // background for the ` INFO ` label (incl padding)
        name: 'magenta',
      },
    },
  },
});
```

> [!NOTE]
>
> Spaces inside braces `{ token }` are preserved around the resolved value. Useful for background styling.

#### Access to the color instance

You can use the exposed Ansis instance via `Vilog.color` to style parts of your message manually.

```js
import Vilog from 'vilog';

const { cyan, yellow, bold, hex } = Vilog.color;

const log = new Vilog({
  name: 'app',
  levels: {
    info: {
      layout: '{label} {name} {msg}',
      style: {
        label: 'black.bgCyan', // background for the INFO label
        name: hex('#1D89D9'), // truecolor for the 'app' name
      },
    },
  },
});

// colorize placeholders in the message
log.info(`fetched ${cyan`%d`} records from ${yellow`%s`}`, 120, '/api/data');
```

<a id="styling-dates"></a>
### Styling date

The built-in date token `%d` can be styled like any other token.

```js
const log = new Vilog({
  levels: {
    default: {
      layout: '%d {msg}',
      style: { '%d': 'green' },
    },
    info: {
      layout: '%d{YYYY-MM-DD HH:mm:ss} {label} {msg}',
      style: { '%d': 'cyan' },
    },
  },
});
```

#### Styling date parts separately

If a layout contains multiple date tokens, each `%d{...}` part can be styled individually:

```js
const log = new Vilog({
  levels: {
    default: {
      layout: '%d{YYYY-MM-DD} %d{HH:mm:ss}.%d{sss} {msg}',
      style: {
        'YYYY-MM-DD': 'green',
        'HH:mm:ss':   'cyanBright',
        'sss':        'cyan',
      },
    },
  },
});
```

Each date fragment (`YYYY-MM-DD`, `HH:mm:ss`, `sss`) will have its own style.

<a id="styling-tokens"></a>
### Styling custom tokens

Styling works the same for user-defined tokens.

```js
const log = new Vilog({
  levels: {
    verbose: {
      layout: '{memoryLabel} {memory} | {msg}',
      style: {
        memoryLabel: 'green',  // style the custom label
        memory: 'greenBright', // style the dynamic value
      },
    },
  },
  tokens: {
    memoryLabel: 'Memory usage:',
    memory: () => process.memoryUsage().heapUsed,
  },
});
```

#### [↑ Table of Contents](#toc)
<a id="levels"></a>
## Levels

The default logging levels are pre-defined.

| No | Level   | Default layout                         |
|----|---------|----------------------------------------|
| 0  | error   | `%d {label} {msg}`                     |
| 1  | warn    | `%d {label} {msg}`                     |
| 2  | info    | `%d {label} {msg}`                     |
| 3  | default | `%d {msg}`                             |
| 4  | debug   | `{name} {msg} +{duration} ({uptime})`  |

Each level includes its own default layout (and optional style), which can be overridden with `options.levels`.

You can define additional custom levels:

```js
const log = new Vilog({
  name: 'app',
  levels: {
    // the key defines the log method
    trace: {
      level: 5, // optional priority (auto-indexed if omitted)
      label: 'TRACE', // human-readable level label
      layout: '%d{HH:mm:ss.sss} {label} {msg} {file}:{line}:{column}', // log format
      style: { label: 'yellow' }, // style for the label
    },
  },
});

log.trace('called at'); // → [11:10:01.075] TRACE called at /path/to/app.js:890:25
```

#### [↑ Table of Contents](#toc)
<a id="silent-mode-and-buffering"></a>
## Silent Mode & Buffering

Silent mode allows you to buffer all log entries instead of printing them immediately.
This is useful for tests, batch processing, or aggregating logs before output.

Enable it with:

```js
const log = new Vilog({ silent: true });
```

All instances created with `silent: true` write to an internal buffer.

To print (or return) the buffered logs, call:

```js
Vilog.flush();
```

**Options `Vilog.flush()`**

| Option | Type    | Default | Description                                                |
|--------|---------|---------|------------------------------------------------------------|
| ret    | boolean | false   | When `true`, return output as a string instead of printing |
| color  | boolean | true    | When `false`, strip all ANSI colors from the result        |


Example:

```js
const logOne = new Vilog({ name: 'task:one', silent: true });
const logTwo = new Vilog({ name: 'task:two', silent: true });

// buffered logs
logOne('1');
logTwo('2');
logOne('3');

// print buffered output
Vilog.flush();

// return colored string
const output = Vilog.flush({ ret: true });

// return plain text (no colors)
const output = Vilog.flush({ ret: true, color: false });
```

> [!NOTE]
> `Vilog.flush()` outputs **all buffered entries** from all silent logger instances,
> in their correct sequence order, and then **clears the buffer**.

#### [↑ Table of Contents](#toc)
<a id="api-reference"></a>
## API Reference

#### Options

Type:

```ts
type Options = {
  /**
   * Logger name (namespace).
   * Appears in `{name}` and can be used in filtering (enable/disable patterns).
   **/
  name?: string;

  /** Override environment name for enabled/disabled pattern matching. */
  env?: string;

  /** Enable or disable this logger instance. Default: true. */
  enabled?: boolean;

  /**
   * When true, log entries are collected to the internal buffer instead of printing.
   * Use `Vilog.flush()` to print or return the buffered logs.
   **/
  silent?: boolean;

  /**
   * General render function for all levels.
   * The level-specific `levels.xxx.render` has higher priority.
   * Default is `null` (layout templates are used).
   */
  render?: (tokens: Tokens, color: Ansis) => string;

  /**
   * Custom output function. Default: console.log.
   * Ignored when `silent: true`.
   **/
  output?: (message: string) => void;

  /**
   * Level configuration.
   * Keys define method names.
   **/
  levels?: Record<string, {
    /** Numeric priority. Auto-indexed when omitted. */
    level?: number;

    /** Human-readable label printed in {label}. */
    label?: string;

    /** Layout string for this level. */
    layout?: string;

    /** Style rules for named tokens inside the layout. */
    style?: Record<string, string | ((s: string) => string)>;

    /** Custom renderer for the final line (overrides layout and style). */
    render?: (tokens: Tokens, color: Ansis) => string;
  }>;

  /** Custom token resolvers. */
  tokens?: Record<string, string | number | ((value: any) => any)>;
};
```

Default properties:


```js
const defaultStyle = {
  '%d': 'gray',
  duration: 'gray',
  uptime: 'gray',
  label: 'white.bold',
  name: 'magenta',
  file: 'blueBright.underline',
  line: 'cyan',
  column: 'cyan',
};

const options = {
  name: '',
  env: undefined,
  enabled: true,
  silent: false,
  output: null,
  levels: {
    // log.error()
    error: {
      level: 0,
      label: 'ERROR',
      layout: '%d {label} {msg}',
      style: {
        ...defaultStyle,
        label: 'red.bold',
        msg: 'red',
      },
    },
    // log.warn()
    warn: {
      level: 1,
      label: 'WARN',
      layout: '%d {label} {msg}',
      style: {
        ...defaultStyle,
        label: 'yellow.bold',
      },
    },
    // log.info()
    info: {
      level: 2,
      label: 'INFO',
      layout: '%d {label} {msg}',
      style: {
        ...defaultStyle,
        label: 'cyan.bold',
      },
    },
    // log()
    default: {
      level: 3,
      label: '',
      layout: '%d {msg}',
      style: {
        ...defaultStyle,
      },
    },
    // log.debug()
    debug: {
      level: 4,
      label: 'DEBUG',
      layout: '{name} {msg} +{duration} ({uptime})',
      style: {
        ...defaultStyle,
        duration: 'cyan',
        uptime: 'cyan',
      },
    },
  },
  tokens: {},
}
```

#### Token resolvers

For built-in dynamic tokens like `uptime`, `duration`, `%d` (date),
the resolver receives the _original rendered value_ and should return a new value:

```js
tokens: {
  uptime:   (value) => `(${value})`, // → "(200ms)"
  duration: (value) => `+${value}`,  // → "+40.123ns"
  "%d":     () => new Date('2025-12-31 23:59:59'), // fixed date time
}
```

For custom dynamic tokens, the resolver receives `undefined` and should return the token value:

```js
tokens: {
  host: () => detectHost(),
  memory: () => process.memoryUsage().heapUsed,
}
```

<a id="methods"></a>
### Methods & Properties

#### Instance properties

- `log.name` Readonly name (namespace) of the logger.
- `log.level` Numeric priority setter/getter.\
   - `-1` - silent,
   - `0` - only errors,
   - `1` - error + warn,
   etc.
- `log.enabled` Boolean setter/getter to enable/disable this instance.

#### Instance methods

Each logger instance created with:

```js
const log = new Vilog({ name: 'app' });
```

provides the following methods:

- `log(msg, ...args)` Log a message at the **default** level.
- `log.info(msg, ...args)`
- `log.warn(msg, ...args)`
- `log.error(msg, ...args)`
- `log.debug(msg, ...args)`

In addition, every custom level defined in `options.levels` creates its own method.\
For example, defining a `trace` level allows you to call the auto-generated method by the level key:

```js
log.trace('message');
```

#### Static properties

- `Vilog.instances`
  `Map<string, VilogInstance>` All created instances.

- `Vilog.color`
  Exposed `Ansis` instance for manual color styling.

#### Static methods

- `Vilog.flush(options?)`
  Flush buffered logs in silent mode.
  Can print or return the output (`ret: true`).

- `Vilog.disable(pattern?)`
  Disable loggers matching a name pattern (`'*'` disables all).

- `Vilog.enable(pattern?)`
  Re-enable loggers matching a name pattern (`'*'` enables all).

#### [↑ Table of Contents](#toc)
<a id="recipes"></a>
## Recipes

- [Customize date/time tokens](#recipe-custom-date-tokes)
- [Namespaced loggers with enable/disable patterns](#recipe-namespace-pattern)
- [Save JSON output to file](#recipe-save-json)
- [Save log output to file](#recipe-save-log)
- [Dynamically adjust log level at runtime](#recipe-log-level)
- [Capture and assert logs in tests (silent mode)](#recipe-flush-logs)

<a id="recipe-custom-date-tokes"></a>
### Customize date/time tokens

You can define your own named tokens that internally use `%d{...}` formats.
This allows you to style or reuse date/time parts more easily:

```js
const log = new Vilog({
  levels: {
    default: {
      layout: '[{date} {time}{ms}] [{timestamp}] {msg}',
      style: { date: 'green', time: 'cyanBright', ms: 'yellow', timestamp: 'blueBright' },
    },
  },
  tokens: {
    date: '%d{YYYY-MM-DD}', // date format in a custom token
    time: '%d{HH:mm:ss}',
    ms:   '%d{.sss}',
    timestamp: '%d{ts}',
  },
});

log('text'); // → [2025-11-11 11:11:01.075] [1763160223.075] text
```

<a id="recipe-namespace-pattern"></a>
### Namespaced loggers with enable/disable patterns

Use `name` to group loggers by subsystem and control them via `Vilog.enable()` / `Vilog.disable()`.

```js
const logHttp = new Vilog({ name: 'app:http' });
const logDb   = new Vilog({ name: 'app:db' });
const logTask  = new Vilog({ name: 'app:task' });

logHttp.info('request started');
logDb.debug('query executed');
logTask.warn('task took too long');

// disable all app logs
Vilog.disable('app:*');

// later enable only http-related logs
Vilog.enable('app:http');
```

Pattern examples you can mention:

- `*` - all loggers
- `app:*` - all app-related loggers
- `app:http` - only `app:http`


<a id="recipe-save-json"></a>
### Save JSON output to file

Use a custom `output` option to save structured JSON to a file.

```js
import fs from 'node:fs';
import Vilog from 'vilog';

const logStream = fs.createWriteStream('./app.log', { flags: 'a' });

const log = new Vilog({
  name: 'api:user',
  // global render: applied to all levels unless a level-specific render is defined
  render: ({ date, level, name, data, duration, uptime }) => JSON.stringify({
    date,
    level,
    name,
    ...data[0],
    duration,
    uptime,
  }),
  output: (line) => {
    logStream.write(line + '\n');
  },
});

// save json data to the file
log.info({ event: 'user.login', userId: 42, ip: '127.0.0.1' });
```

<a id="recipe-save-log"></a>
### Save log output to file

Use a custom `output` option to save the generated log to a file.

```js
import fs from 'node:fs';
import Vilog from 'vilog';

const logStream = fs.createWriteStream('./app.log', { flags: 'a' });

const log = new Vilog({
  name: 'api:user',
  output: (line) => {
    // remove ANSI codes to save plain text
    logStream.write(Vilog.color.strip(line) + '\n');
  },
});

// save log message to the file
log.info(`event: %s, userId: %d, ip: %s`, 'user.login', 63, '127.0.0.2');
```


<a id="recipe-log-level"></a>
### Dynamically adjust log level at runtime

You can change `log.level` at runtime to control verbosity.

```js
const log = new Vilog({ name: 'app' });

// default: all predefined levels are allowed (error, warn, info, default, debug)
log.error('startup failed check');      // printed
log.warn('config value missing');       // printed
log.info('starting app');               // printed
log.debug('debug details are visible'); // printed

// reduce verbosity: warnings and errors only
log.level = 1; // 0 = error, 1 = error + warn
log.info('this will NOT be printed');
log.warn('this WILL be printed');
log.error('this WILL be printed');

// error-only mode
log.level = 0; // only "error" is allowed
log.warn('this will NOT be printed');
log.error('this WILL be printed');

// mute everything
log.level = -1;
log.error('this will NOT be printed');
```

<a id="recipe-flush-logs"></a>
### Capture and assert logs in tests (silent mode)

Silent mode with `flush({ ret: true })` makes it easy to assert log output in tests.

```js
const log = new Vilog({ name: 'test', silent: true });

function doWork() {
  log.info('step 1');
  log.info('step 2');
}

doWork();

const output = Vilog.flush({ ret: true, color: false });

expect(output).toContain('step 1');
expect(output).toContain('step 2');
```

#### [↑ Table of Contents](#toc)
---

#### [↑ top](#top)
<a id="license"></a>
## License

Licensed under the [ISC](https://github.com/webdiscus/vilog/blob/master/LICENSE) license.