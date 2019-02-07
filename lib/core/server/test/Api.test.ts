import { Server, RequestListener } from '../src';
import { request } from '@5qtrs/request';
import packageJson from '../package.json';

//@ts-ignore
const port = packageJson.devServer.port;
const requestListener: RequestListener = (req, res) => {
  res.statusCode = 205;
  res.end();
};

describe('Server', () => {
  describe('constructor()', () => {
    it('should return an Server instance', () => {
      const server = new Server((req, res) => {}, port);
      expect(server).toBeInstanceOf(Server);
    });
  });
  describe('Start()', () => {
    it('should start the server', async () => {
      const server = new Server(requestListener, port);
      await server.start();

      const response = await request(`http://localhost:${port}`);
      expect(response.status).toBe(205);

      await server.stop();
    });

    it('should do nothing if the server is already started', async () => {
      const server = new Server(requestListener, port);
      await server.start();
      await server.start();

      const response = await request(`http://localhost:${port}`);
      expect(response.status).toBe(205);

      await server.stop();
    });

    it('should return an error if the port is in use', async () => {
      const server = new Server(requestListener, port);
      await server.start();

      const server2 = new Server(requestListener, port);

      let message = '';
      try {
        await server2.start();
      } catch (error) {
        message = error.message;
      }

      await server.stop();
      expect(message).toBe(`listen EADDRINUSE: address already in use 127.0.0.1:${port}`);
    });
  });
  describe('Stop()', () => {
    it('should do nothing if the server is not started', async () => {
      const server = new Server(requestListener, port);
      await server.stop();

      let message = '';
      try {
        await await request(`http://localhost:${port}`);
      } catch (error) {
        message = error.message;
      }

      expect(message).toBe(`connect ECONNREFUSED 127.0.0.1:${port}`);
    });

    it('should do nothing if the server is already stopped', async () => {
      const server = new Server(requestListener, port);
      await server.start();
      await server.stop();
      await server.stop();

      let message = '';
      try {
        await await request(`http://localhost:${port}`);
      } catch (error) {
        message = error.message;
      }

      expect(message).toBe(`connect ECONNREFUSED 127.0.0.1:${port}`);
    });
  });
});
