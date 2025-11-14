import Vilog from 'Vilog';

const levels = {
  info: { layout: '[%d{HH:MM:ss} +{duration}] [Start: {elapsed}] [{label}] {name} {msg}' },
  warn: { layout: '[%d{HH:MM:ss} +{duration}] [Start: {elapsed}] [{label}] {name} {msg}' },
  error: { layout: '[%d{HH:MM:ss} +{duration}] [Start: {elapsed}] [{label}] {name} {msg} {file}:{line}:{column}' },
};

const silent = true;
const authLog = new Vilog({ name: 'auth', silent, levels});
const paymentLog = new Vilog({ name: 'payment', silent, levels });
const httpLog = new Vilog({ name: 'http', silent, levels });

authLog('Starting app');

httpLog.info('User %s GET %s', 'alex', '/login');
authLog.warn('Failed login for %s', 'alex');
authLog.info('User %s logged in', 'alex');

httpLog.info('User %s GET %s', 'alex', '/api/products');
httpLog.warn('Slow request by %s: %dms', 'alex', 1200);

paymentLog.info('%s started checkout', 'alex');
paymentLog.warn('3DS required for %s', 'alex');
httpLog.info('User %s POST %s', 'alex', '/3ds/complete');
paymentLog.info('Order %d placed by %s', 88422, 'alex');

paymentLog.error('PSP timeout for %s', 'alex');
paymentLog.warn('Webhook retry %d for %s', 1, 'alex');
paymentLog.info('Payment captured for %s', 'alex');

httpLog.info('User %s GET %s', 'alex', '/account');
authLog.info('User %s logged out', 'alex');

authLog.warn('%s used old password %d times', 'alex', 2);
authLog.info('Password reset by %s', 'alex');

Vilog.flush({});
