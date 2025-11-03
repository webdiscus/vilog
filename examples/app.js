import Vilog from 'Vilog';

const log = new Vilog('app');
const appName = 'Demo';

log('Starting %s...', appName);

const logOne = new Vilog('task:one');
const logTwo = new Vilog('task:two', {
  // customize color themes
  theme: { info: { name: 'magenta' } },
});

function runTaskOne() {
  logOne('processing random workload');
  setTimeout(runTaskOne, Math.random() * 1000);
}

function runTaskTwo() {
  logTwo('checking result');
  setTimeout(runTaskTwo, Math.random() * 1500);
}

runTaskOne();
runTaskTwo();

setTimeout(() => {
  logTwo(new Error('unexpected issue'));
}, 2000);
