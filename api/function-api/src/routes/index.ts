import Router from 'koa-router';
import { ServiceConfig } from '../ServiceConfig';
import { message } from './message';

export function routes(config: ServiceConfig) {
  const router = new Router();
  router.get('/subscription', message(config));

  return router.routes();
}
