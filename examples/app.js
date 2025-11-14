import Vilog from 'vilog';

const log = new Vilog({ name: 'app'});
const appName = 'Demo';

log('Starting %s...', appName);

const logOne = new Vilog({
  name: 'task:one',
  // customize colors
  levels: { debug: { style: { name: 'magentaBright' } } },
});
const logTwo = new Vilog({ name: 'task:two' });

function runTaskOne() {
  logOne.debug('processing random workload');
  setTimeout(runTaskOne, Math.random() * 1000);
}

function runTaskTwo() {
  logTwo.debug('checking result');
  setTimeout(runTaskTwo, Math.random() * 1500);
}

runTaskOne();
runTaskTwo();

setTimeout(() => {
  logTwo(new Error('unexpected issue'));
}, 2000);
