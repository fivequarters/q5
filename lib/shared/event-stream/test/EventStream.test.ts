import http from 'http';
import { EventStream, IEventMessage } from '../src';

const packageJson = require('../package.json');
const port = packageJson.devServer.port;

let server: http.Server;

beforeAll(async () => {
  return new Promise(resolve => {
    server = http
      .createServer((request, response) => {
        response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
        if (request.url === '/test1') {
          response.write('event: log\ndata: hello\n\n');
        } else if (request.url === '/test2') {
          response.write('event: log\n');
          response.write('data: hello\n');
          response.write('\n');
        }
        response.end();
      })
      .listen(port, undefined, resolve);
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('EventStream', () => {
  it('should correctly listen for messages', async () => {
    let messages: IEventMessage[] = [];
    await new Promise(resolve => {
      const options = {
        onMessage: (message: IEventMessage) => messages.push(message),
        onEnd: resolve,
      };
      EventStream.create(`http://localhost:${port}/test1`, options);
    });
    expect(messages).toEqual([{ name: 'log', data: 'hello' }]);
  });

  it('should correctly handle incomplete messages', async () => {
    let messages: IEventMessage[] = [];
    await new Promise(resolve => {
      const options = {
        onMessage: (message: IEventMessage) => messages.push(message),
        onEnd: resolve,
      };
      EventStream.create(`http://localhost:${port}/test2`, options);
    });
    expect(messages).toEqual([{ name: 'log', data: 'hello' }]);
  });
});
