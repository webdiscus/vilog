import fs from 'node:fs';
import Vilog from 'vilog';

// 1) save json to file immediately
const logStream = fs.createWriteStream('./app.log', { flags: 'a' });
const logJson = new Vilog({
  name: 'api:user',
  render: ({ date, level, name, data, duration, uptime }) => JSON.stringify({
    date,
    level,
    name,
    ...data[0],
    duration,
    uptime,
  }),
  output: (line) => {
    logStream.write(line + '\n');
  },
});

logJson.info({ event: 'user.login', userId: 42, ip: '127.0.0.1' });
logJson.warn({ event: 'user.login', userId: 57, ip: '127.0.0.2', reason: '5 unsuccessful login attempts'});

// 2) save log line to file immediately
const logStream2 = fs.createWriteStream('./app2.log', { flags: 'a' });
const logFile2 = new Vilog({
  name: 'api:user2',
  output: (line) => {
    // remove ANSI codes to save plain text
    logStream2.write(Vilog.color.strip(line) + '\n');
  },
});

logFile2.info(`event: %s, userId: %d, ip: %s`, 'user.login', 63, '127.0.0.2');

// 3) save buffered log lines to file once
const logStream3 = fs.createWriteStream('./app3.log', { flags: 'a' });
const logFile3 = new Vilog({
  silent: true,
  name: 'api:user3',
});

logFile3.info(`event: %s, userId: %d, ip: %s`, 'user.login', 71, '127.0.0.3');

// save buffer to file
const logEntries = Vilog.flush({ ret: true, color: false })
logStream3.write(logEntries + '\n');
