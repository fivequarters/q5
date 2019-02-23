import Zmq from 'zeromq';
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

  it('publish works', done => {
    const psock = Zmq.socket('pub');
    psock.monitor(); // enables connect event
    psock.connect(server.xsubListener);
    psock.on('connect', () => {
      psock.send('channel5 message');
      psock.close();
      done();
    });
  });

  it('subscribe works', done => {
    const ssock = Zmq.socket('sub');
    ssock.subscribe('channel5');
    ssock.monitor(); // enables connect event
    ssock.connect(server.xpubListener);
    ssock.on('connect', () => {
      ssock.close();
      done();
    });
  });

  it('publish/subscribe works', done => {
    // subscribe
    const ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('channel5');
    ssock.on('message', data => {
      expect(data.toString()).toEqual('channel5 message');
      ssock.disconnect(server.xpubListener);
      ssock.close();
      done();
    });

    // publish
    const psock = Zmq.socket('pub');
    psock.monitor(); // enables connect event
    psock.connect(server.xsubListener);
    psock.on('connect', () => {
      psock.send('channel5 message');
      psock.close();
    });
  });

  it('topic prefix publish/subscribe works', done => {
    // subscribe
    const ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('app-');
    let count = 0;
    ssock.on('message', data => {
      expect(data.toString()).toMatch(/^app\-/);
      if (++count === 2) {
        ssock.disconnect(server.xpubListener);
        ssock.close();
        done();
      }
    });

    // publish
    const psock = Zmq.socket('pub');
    psock.monitor(); // enables connect event
    psock.connect(server.xsubListener);
    psock.on('connect', () => {
      psock.send('app-1 message');
      psock.send('system-1 message');
      psock.send('system-2 message');
      psock.send('app-2 message');
      psock.close();
    });
  });
});
