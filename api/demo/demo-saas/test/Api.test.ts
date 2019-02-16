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

describe('message handler', () => {
  test('should return hello message', async () => {
    const response = await request(hostUrl + '/randall');
    expect(response.data);
  });
});
