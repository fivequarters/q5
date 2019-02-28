import { RequestListener, Server } from '@5qtrs/server';
import Cors from '@koa/cors';
import Koa from 'koa';
import BodyParser from 'koa-bodyparser';
import Morgan from 'koa-morgan';
import { ApiConfig } from './ApiConfig';
import { routes } from './routes';

export class Api extends Server {
  public static async create(environment: string) {
    const config = await ApiConfig.create(environment);

    const koa = new Koa();
    if (config.enableDevLogs) {
      koa.use(Morgan('dev'));
    }

    if (config.useCors) {
      koa.use(Cors());
    }

    koa.use(BodyParser());
    koa.use(routes(config));

    return new Api(koa.callback(), config.port);
  }
  private constructor(requestListener: RequestListener, port: number) {
    super(requestListener, port);
  }
}
