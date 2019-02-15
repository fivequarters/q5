import { ApiConfig } from '../../src/ApiConfig';
import { message } from '../../src/routes/message';

describe('message route', () => {
  test('should return hello message', async () => {
    const config = await ApiConfig.create('unit');
    const context = { params: { name: 'Bob' }, body: '' };
    const handler = message(config);
    await handler(context);
    expect(context.body).toBe('Hello there Bob!');
  });
});
