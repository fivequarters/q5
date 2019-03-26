import Koa from 'koa';
import Cors from '@koa/cors';
import Morgan from 'koa-morgan';
import BodyParser from 'koa-bodyparser';
import { ApiConfig } from './ApiConfig';
import { AccountStore } from './AccountStore';
import { AwsAccountStore } from './AwsAccountStore';
import { routes } from './routes';

export async function app(config: ApiConfig) {
  const koa = new Koa();
  if (config.enableDevLogs) {
    koa.use(Morgan('dev'));
  }

  if (config.useCors) {
    koa.use(Cors());
  }

  let store;
  if (config.inMemory) {
    store = new AccountStore();
  } else {
    const deployment = config.deployment;
    if (deployment === undefined) {
      throw new Error("A deployment is required whne not using the 'inMemory' config option.");
    }
    store = await AwsAccountStore.create({ deployment });
  }

  koa.use(async (context, next) => {
    try {
      await next();
    } catch (error) {
      context.body = { message: error.message };
      context.status = 400;
      context.app.emit('error', error, context);
    }
  });

  koa.use(BodyParser());
  koa.use(routes(config, store));

  return koa;
}
