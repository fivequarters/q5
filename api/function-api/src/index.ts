import { Server, RequestListener } from '@5qtrs/server';
import { ServiceConfig } from './ServiceConfig';
import { app } from './app';

export default class Service extends Server {
  private constructor(requestListener: RequestListener, port: number) {
    super(requestListener, port);
  }

  public static async create(environment: string, port?: number) {
    const config = await ServiceConfig.create(environment);
    const application = app(config);
    return new Service(application.callback(), port || config.port);
  }
}

async function start() {
  const server = await Service.create('production', 80);
  server.start();
}

if (!module.parent) {
  start();
}
