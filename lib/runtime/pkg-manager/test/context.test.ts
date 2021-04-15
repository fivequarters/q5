import FusebitRouter, { FusebitManager, Context, Next, IStorage } from '../src';

describe('Context', () => {
  it('validate routable contexts have correct values', async () => {
    const storage = {};
    const manager = new FusebitManager(storage as IStorage);

    const fctx = {
      path: '/PATH',
      method: 'XXX',
      params: {
        param1: 'param1_value',
      },
      query: {
        query1: 'query1_value',
      },
      headers: {
        header1: 'header1_value',
      },
    };

    const kctx = manager.createRouteableContext(fctx);
    expect(kctx.header.header1).toBe(fctx.headers.header1);
    expect(kctx.method).toBe(fctx.method);
    expect(kctx.query.query1).toBe(fctx.query.query1);
    expect(kctx.params.param1).toBe(fctx.params.param1);
  });
});
