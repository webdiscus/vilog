# Vilog (view log)

A tiny tool for colorful debug output and performance profiling

## Usage

Here is a very simple example:
```js
import Vilog from 'vilog';

const log = new Vilog(' foo ');

log('ping'); // default log

log.info('Info message');
log.warn('Warning message');
log.debug('Debug message');
log.error('Error message');
```

TODO: complete the readme ...


## Duration format

### Nanosecond edge case

Durations smaller than one nanosecond cannot be measured in real-world JavaScript environments.
Even the minimal measurable interval between consecutive `performance.now()` calls exceeds 1 ns.
For completeness, values below 1 ns are still formatted within the nanosecond scale as fractional nanoseconds (0.xxx ns),
but such values represent theoretical precision only, not real measurements.

```
0.0000000002341310065 -> 0ns // values <0.001ns are treated as noise
0.0000000012341310065 -> 0.001ns
```

## Display precision rule

First normalize the value to the target display unit,
then round or truncate only within that unit's visible precision.

### Examples

For nanoseconds:
```
0.0004999994ms → normalize to nanoseconds → 499.9994ns → truncate   → 499.999ns
0.0004999995ms → normalize to nanoseconds → 499.9995ns → round up   → 500ns
0.0009999995ms → normalize to nanoseconds → 999.9995ns → auto-carry → 1µs
```

For microseconds:
```
0.4999994ms → normalize to microseconds → 499.9994µs → truncate   → 499.999µs
0.4999995ms → normalize to microseconds → 499.9995µs → round up   → 500µs
0.9999995ms → normalize to microseconds → 999.9995µs → auto-carry → 1ms
```

For milliseconds:
```
499.9994ms → truncate   → 499.999ms
499.9995ms → round up   → 500ms
999.9995ms → auto-carry → 1s
```

**Around minute rule**
- if value < 60000 ms, format as s.xxx with round half-up to milliseconds
- if rounding yields 60.000s, promote to 1m 0s
- if value >= 60000 ms, truncate milliseconds

For sub-minute range:
```
 1999.4ms → normalize to seconds →  1.9994s → truncate   → 1.999s
 1999.5ms → normalize to seconds →  1.9995s → round up   → 2s
59999.5ms → normalize to seconds → 59.9995s → auto-carry → 1m 0s
```

For minute-up range:
```
  60999.999ms → normalize to seconds →   60.999s → truncate ms →  1m 0s  (not round up to 1m 1s)
 119999.999ms → normalize to seconds →  119.999s → truncate ms →  1m 59s (not round up to 2m)
3599999.999ms → normalize to seconds → 3599.999s → truncate ms → 59m 59s (not round up to 1h)
```