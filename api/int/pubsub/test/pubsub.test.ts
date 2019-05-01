import { PubSub } from '../src/Pubsub';

const server = new PubSub();
beforeAll(() => {
  server.start();
});

afterAll(() => {
  server.stop();
});

describe('pubsub', () => {
  it('server start and stop work', () => {
    expect(true);
  });
});
