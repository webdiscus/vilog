/**
 * CLI example for Vilog in silent mode.
 *
 * Demonstrates capturing all log entries globally
 * and printing the history once at the end instead of
 * emitting logs immediately.
 *
 * Runs two simulated tasks for ~3 seconds, then outputs
 * the collected log history to the console.
 */

import Vilog from 'vilog';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const app = new Vilog('app');
const appName = 'Demo';

// emit the info directly
app('Starting %s... Wait ~3 seconds to finish.', appName);

// configure these logs in silent mode
const logOne = new Vilog({ name: 'task:one', silent: true });
const logTwo = new Vilog({
  name: 'task:two',
  silent: true,
  levels: { debug: { style: { name: 'magentaBright' } } },
});

async function runTaskOne (finish) {
  while (Date.now() < finish) {
    // collects log
    logOne.debug('processing random workload');
    await sleep(Math.random() * 500);
  }
}

async function runTaskTwo (finish) {
  while (Date.now() < finish) {
    // collects log
    logTwo.debug('checking result');
    await sleep(Math.random() * 1000);
  }
}

function onFinish () {
  console.log('--- log history ---');
  const output = Vilog.flush();
  console.log(output);
}

async function main () {
  const end = Date.now() + 3000; // ~3s
  await Promise.all([runTaskOne(end), runTaskTwo(end)]);
  onFinish();
}

main();
