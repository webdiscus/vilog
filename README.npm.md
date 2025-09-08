# Vilog (view log)

A tiny tool for colorful debug output and performance profiling

## Usage

Here is a very simple example:
```js
import Vilog from 'vilog';
import color from 'ansis';

const log = new Vilog(' foo ');

// override default color theme
log.themes.info.msg = color.whiteBright;
log.themes.info.total = color.hex('#a48');

log('ping'); // the same `log.info()`

log.info('Info message');
log.warn('Warning message');
log.debug('Debug message');
log.error('Error message');
```

TODO: complete the readme ...