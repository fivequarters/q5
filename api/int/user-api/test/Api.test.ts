import { request } from '@5qtrs/request';
import { default as Api } from '../src';

const hostUrl = `http://localhost:${process.env.PORT}`;
let server: Api;

beforeAll(async () => {
  server = await Api.create('unit');
  await server.start();
});

afterAll(async () => {
  if (server) {
    await server.stop();
  }
});

describe('tests', () => {
  test('should...', async () => {
    expect(true).toBe(true);
  });
});
