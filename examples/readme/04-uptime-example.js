import Vilog from 'vilog';

const { now, format } = Vilog.timer;

console.log(` app uptime: ${format(Vilog.timer.uptime)}`);

let start = now();
const log = new Vilog();
const initDuration = now() - start;

start = now();
log.debug('start app');
const logDuration = now() - start;

log.debug(null, 'start');
// do something
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');
log.debug('done');

console.log(`   app uptime: ${format(Vilog.timer.uptime)}`);
console.log(`init duration: ${format(initDuration)}`);
console.log(` log duration: ${format(logDuration)}`);
