import Koa from 'koa';
import Cors from '@koa/cors';
import Morgan from 'koa-morgan';
import { ServiceConfig } from './ServiceConfig';
import { routes } from './routes';

export function app(config: ServiceConfig) {
  const koa = new Koa();
  if (config.enableDevLogs) {
    koa.use(Morgan('dev'));
  }

  if (config.useCors) {
    koa.use(Cors());
  }

  koa.use(routes(config));

  return koa;
}
