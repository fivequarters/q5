import { ServiceConfig } from '../ServiceConfig';

export function message(config: ServiceConfig) {
  return async (context: any) => {
    context.body = `User API 4`;
  };
}
