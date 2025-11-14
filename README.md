# Vilog

Pretty logging for Node.js with customizable layouts, buffered output, and precise profiling.
Designed for real-world production workloads.
Optimized for speed and visual clarity.

## Features

- Fast logging core optimized for high-frequency logs.\
  Layouts are _compiled once_ into a pre-processed buffer — minimal runtime overhead.
- Customizable layouts with tokens: `%d{HH:mm:ss}`, `{elapsed}`, `{duration}`, `{name}`, `{msg}`, `{file}`, etc.
  - Built-in tokens for time, duration, level, namespace, caller, and more
  - Support for both static tokens (pre-compiling) and dynamic tokens (runtime)
- Flexible color themes for levels with multi-style support.
- Custom render function to fully control how a log line is produced.
- Buffered logging mode with manual `flush()` for batch output or silent mode.\
  In `silent` mode, logs are stored in memory and not outputted until flushed.
- Logger namespaces with independent layouts, styles, and settings.
- Precise profiling with auto-scaled units: `ns`, `μs`, `ms`, `s`, `m`, `h`, `d`
  - `{duration}` - time since the previous log
  - `{elapsed}` - total time since application start
- Handles any value type: objects, arrays, errors, primitives, and multiple arguments.
- Test-friendly design with predictable output and mockable time, duration, and colors.

## Install

```bash
npm install vilog
```

## Basic example

```js
import Vilog from 'vilog';

const log = new Vilog({ name: 'api:sync' });

log('starting app');
log.info('fetched %d records from %s', 120, '/api/data');
log.warn('request retry %d pending', 5);
log.error('request failed', new Error('Boom!'));

// mark a profiling point (no output, only sets the timer)
log.debug(null, 'start processing');
// ... do something
// log message with elapsed time since last mark or log call
log.debug('processed %d orders', 99);
```

**Output example**
![Output of basic example](https://github.com/webdiscus/vilog/raw/master//docs/example-01.png)

## Advanced example

```js
import Vilog from 'vilog';

// destructure colors from the exposed Ansis instance
const { cyan, yellow, hex } = Vilog.color;

const log = new Vilog({
  name: 'api:sync',

  levels: {
    default: {
      // customize default layout
      layout: '%d{YYYY-MM-DD HH:mm:ss} {msg}',
    },
    info: {
      // customize date format
      layout: '%d{YYYY-MM-DD} %d{HH:mm:ss} {label} {msg}',
      // custom styles for date parts, using green and truecolor via hex()
      style: { 'YYYY-MM-DD': 'green', 'HH:mm:ss': hex('#1D89D9') },
    },
    debug: {
      // custom layout with profiling and PID
      layout: '%d{ts.sss} {name} {pidLabel}{pid} {msg} +{duration} ({elapsed})',
      style: { pidLabel: 'green', pid: 'yellow' },
    },
    // custom log level
    trace: {
      label: 'TRACE', // human-readable label for the level
      layout: '{ label } {name} {msg} {file}:{line}:{column}',
      style: { label: 'black.bgYellow' },
    },
    // custom level with custom render to json
    json: {
      // serialize only the relevant fields, omit the rest
      render: ({ date, duration, data }) => JSON.stringify({ date, duration, data }),
    },
  },

  // custom tokens used in layouts
  tokens: {
    pidLabel: 'PID:', // static token (precompiled once)
    pid: () => process.pid, // dynamic token (evaluated at runtime)
  },
});

log('starting app');
// colorize placeholders in the message
log.info(`fetched ${cyan`%d`} records from ${yellow`%s`}`, 120, '/api/data');
log.warn(`request retry ${cyan`%d`} pending`, 5);
log.error('request key is empty'); // outputs error message only
log(new Error('request failed!')); // outputs error stack with error level
log.trace('called at'); // outputs with caller info

// mark a profiling point (no output, only sets the timer)
log.debug(null, 'start processing');
// ... do something
// log message with elapsed time since last mark or log call
log.debug('processed %d orders', 99);

// log as serialized json
log.json('request response', { foo: 'bar', baz: 200 });
```

**Output example**
![Output of advanced example](https://github.com/webdiscus/vilog/raw/master//docs/example-01.png)


TODO: complete the readme ...


## Duration format

### Nanosecond edge case

Durations smaller than one nanosecond cannot be measured in real-world JavaScript environments.
Even the minimal measurable interval between consecutive `performance.now()` calls exceeds 1 ns.
For completeness, values below 1 ns are still formatted within the nanosecond scale as fractional nanoseconds (0.xxx ns),
but such values represent theoretical precision only, not real measurements.

```
0.0000000002341310065 -> 0ns // values <0.001ns are treated as noise
0.0000000012341310065 -> 0.001ns
```

## Display precision rule

First normalize the value to the target display unit,
then round or truncate only within that unit's visible precision.

### Examples

For nanoseconds:
```
0.0004999994ms → normalize to nanoseconds → 499.9994ns → truncate   → 499.999ns
0.0004999995ms → normalize to nanoseconds → 499.9995ns → round up   → 500ns
0.0009999995ms → normalize to nanoseconds → 999.9995ns → auto-carry → 1µs
```

For microseconds:
```
0.4999994ms → normalize to microseconds → 499.9994µs → truncate   → 499.999µs
0.4999995ms → normalize to microseconds → 499.9995µs → round up   → 500µs
0.9999995ms → normalize to microseconds → 999.9995µs → auto-carry → 1ms
```

For milliseconds:
```
499.9994ms → truncate   → 499.999ms
499.9995ms → round up   → 500ms
999.9995ms → auto-carry → 1s
```

**Around minute rule**
- if value < 60000 ms, format as s.xxx with round half-up to milliseconds
- if rounding yields 60.000s, promote to 1m 0s
- if value >= 60000 ms, truncate milliseconds

For sub-minute range:
```
 1999.4ms → normalize to seconds →  1.9994s → truncate   → 1.999s
 1999.5ms → normalize to seconds →  1.9995s → round up   → 2s
59999.5ms → normalize to seconds → 59.9995s → auto-carry → 1m 0s
```

For minute-up range:
```
  60999.999ms → normalize to seconds →   60.999s → truncate ms →  1m 0s  (not round up to 1m 1s)
 119999.999ms → normalize to seconds →  119.999s → truncate ms →  1m 59s (not round up to 2m)
3599999.999ms → normalize to seconds → 3599.999s → truncate ms → 59m 59s (not round up to 1h)
```