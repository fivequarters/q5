import { ApiConfig } from '../ApiConfig';

export function message(config: ApiConfig) {
  return async (context: any) => {
    context.body = `${config.message} ${context.params.name}!`;
  };
}
