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

console.log();
