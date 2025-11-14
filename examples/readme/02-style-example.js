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
      render: ({ date, duration, data }) =>
        JSON.stringify({ date, duration, data }),
    },
  },

  // custom tokens used in layouts
  tokens: {
    pidLabel: 'PID:', // static token (precompiled once)
    pid: () => process.pid, // dynamic token (evaluated at runtime)

    // mock token values for nice README output (remove to see real values)
    file: '/path/to/app.js',
    line: 1080,
    column: 57,
  },
});


let err = new Error('request failed!');
err.stack = `Error: request failed!
    at file:///Projects/vilog/examples/readme/02-style-example.js:56:5
    at ModuleJob.run (node:internal/modules/esm/module_job:345:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:665:26)`;

log('starting app');
// colorize placeholders in the message
log.info(`fetched ${cyan`%d`} records from ${yellow`%s`}`, 120, '/api/data');
log.error('request key is empty'); // outputs error message only
log.warn(`request retry ${cyan`%d`} pending`, 5);
//log(new Error('request failed!')); // outputs error stack with error level
log(err); // mock error stack for pretty readme output
log.trace('called at'); // outputs with caller info

// mark a profiling point (no output, only sets the timer)
log.debug(null, 'start processing');
// ... do something
// log message with elapsed time since last mark or log call
log.debug('processed %d orders', 99);
// log as serialized json
log.json('response', { status: 200 });

console.log();
