import { ServiceConfig } from '../ServiceConfig';

export function message(config: ServiceConfig) {
  return async (context: any) => {
    context.body = `Function API`;
  };
}
