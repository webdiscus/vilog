import Vilog from 'Vilog';

const levels = {
  info: { layout: '[time +diff] [elapsed] [label] [name] msg' },
  warn: { layout: '[time +diff] [elapsed] [label] [name] msg' },
  error: { layout: '[time +diff] [elapsed] [label] [name] msg [file:line:column]' },
};

const silent = true;
const authLog = new Vilog({ name: 'auth', silent, precision: 8, levels});
const paymentLog = new Vilog({ name: 'payment', silent, precision: 8, levels });
const httpLog = new Vilog({ name: 'http', silent, precision: 8, levels });

//await sleep(2000);

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


//Vilog.flush({ orderBy: 'name' });
//Vilog.flush({ orderBy: 'time' });
Vilog.flush({});
