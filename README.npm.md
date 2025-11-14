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

[Full documentation on Github](../../)