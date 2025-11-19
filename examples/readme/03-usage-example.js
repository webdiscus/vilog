import Vilog from 'vilog';

//const sleep = async (ms) => new Promise((r) => setTimeout(r, ms));
//await sleep(1000);

const log = new Vilog({ name: 'db:devel' });

log.info('database connected');
log.warn('slow query', { ms: 120 });

const err = new Error('operation failed');
log.error('failure:', err);

// Multiple arguments
const a = 'hello';
const b = [42, 768, 15];
const c = { foo: 'bar' };

log.debug('values:', a, b, c);

// Error argument handling
try {
  throw new Error('something is wrong');
} catch (err) {
  log(err); // called without .error(), but printed as error level
}
