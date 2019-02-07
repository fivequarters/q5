import Router from 'koa-router';
import { ApiConfig } from '../ApiConfig';
import { message } from './message';

export function routes(config: ApiConfig) {
  const router = new Router();
  router.get('/', async context => context.redirect('/stranger'));
  router.get('/:name', message(config));

  return router.routes();
}
