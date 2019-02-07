import Koa from 'koa';
import Cors from '@koa/cors';
import { Server, RequestListener } from '@5qtrs/server';
import { ApiConfig } from './ApiConfig';
import { routes } from './routes';

export class Api extends Server {
  private constructor(requestListener: RequestListener, port: number) {
    super(requestListener, port);
  }

  public static async create(environment: string) {
    const config = await ApiConfig.create(environment);

    const koa = new Koa();
    if (config.useCors) {
      koa.use(Cors());
    }
    koa.use(routes(config));

    return new Api(koa.callback(), config.port);
  }
}
