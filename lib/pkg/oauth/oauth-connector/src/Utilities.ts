import { Connector } from '@fusebit-int/framework';

type Entries<T extends Record<string, any>> = [keyof T, any][];

export const ObjectEntries = <T>(obj: T): Entries<T> => {
  return Object.entries(obj) as Entries<T>;
};

export const httpErrorHandling = async (ctx: Connector.Types.Context, error: any) => {
  if (error.message === 'Forbidden') {
    return ctx.throw(403, error.message);
  }
  if (error.message === 'Not Found') {
    return ctx.throw(404, error.message);
  }

  return ctx.throw(500, error.message);
};
