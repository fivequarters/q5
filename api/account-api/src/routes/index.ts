import Router from 'koa-router';
import { AccountStore } from '../AccountStore';
import { ApiConfig } from '../ApiConfig';

export function routes(config: ApiConfig, store: AccountStore) {
  const router = new Router();
  router.get('/account/:id', async (context: any) => {
    const id = context.params.id;
    context.body = await store.getAccount(id);
  });

  router.get('/account', async (context: any) => {
    const limit = context.params.limit ? parseInt(context.params.limit, 10) : 100;
    if (limit === NaN) {
      throw new Error(`The value of '${context.params.limit}' is not a valid limit value.`);
    }
    const next = context.params.next;
    context.body = await store.listAccounts(next, limit);
  });

  router.post('/account', async (context: any) => {
    const body = context.request.body;

    if (body && body.displayName) {
      context.body = await store.addAccount(body.displayName);
      return;
    }

    throw new Error("A 'displayName' value must be provided in the body of the request.");
  });

  router.put('/account/:id', async (context: any) => {
    const id = context.params.id;
    const body = context.request.body;
    if (body && body.displayName) {
      const displayName = body.displayName;
      context.body = await store.updateAccount({ id, displayName });
    }
  });

  return router.routes();
}
