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
      layout: '%d{ts.sss} {name} {pidLabel}{pid} {memLabel}{mem} {msg} +{duration} ({uptime})',
      style: { pidLabel: 'green', pid: 'yellow', memLabel: 'green', mem: 'yellow' },
    },
    // custom log level
    trace: {
      //level: 10,
      label: 'TRACE', // human-readable label
      layout: '{ label } {name} {msg} {file}:{line}:{column}',
      style: { label: 'black.bgYellow' },
    },
    // custom level with custom JSON render
    json: {
      // serialize only the relevant fields, omit the rest
      render: ({ date, name, level, data }) => JSON.stringify({ date, name, level, data }),
    },
  },

  // custom tokens used in layouts
  tokens: {
    pidLabel: 'PID:', // static token (precompiled once)
    pid: process.pid, // static token
    memLabel: 'Mem:', // static token (precompiled once)
    mem: () => process.memoryUsage().heapUsed, // dynamic token (evaluated at runtime)

    // mock token values for nice README output (remove to see real values)
    file: '/path/to/app.js',
    line: 1080,
    column: 57,
  },
});
log.json('qq', { foo: 'bar' });

let err = new Error('request failed!');
err.stack = `Error: request failed!
    at file:///Projects/vilog/examples/readme/02-style-example.js:56:5
    at ModuleJob.run (node:internal/modules/esm/module_job:345:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:665:26)`;

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
log.debug('processed %d orders', 50);
log.debug('processed %d orders', 99);

console.log();
