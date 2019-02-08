import PubSub from '../src';
import Zmq from 'zeromq';

describe('pubsub', () => {
  let server: PubSub | undefined = undefined;

  beforeAll(() => {
    server = new PubSub();
    server.start();
  });

  afterAll(() => {
    if (server) {
      server.stop();
      server = undefined;
    }
  });

  it('server start and stop work', () => {
    expect(true);
  });

  it('publish works', () => {
    if (!server) return;
    let psock = Zmq.socket('pub');

    // publish
    psock.connect(server.xsubListener);
    psock.send('channel5 message');
    psock.disconnect(server.xsubListener);
  });

  it('subscribe works', () => {
    if (!server) return;

    // subscribe
    let ssock = Zmq.socket('sub');
    ssock.subscribe('channel5');
    ssock.connect(server.xpubListener);
    ssock.disconnect(server.xpubListener);
  });

  it('publish/subscribe works', done => {
    if (!server) return;

    // subscribe
    let ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('channel5');
    ssock.on('message', data => {
      expect(data.toString()).toEqual('channel5 message');
      server && ssock.disconnect(server.xpubListener);
      done();
    });

    // publish
    let psock = Zmq.socket('pub');
    psock.monitor(); // enables connect event
    psock.connect(server.xsubListener);
    psock.on('connect', () => {
      psock.send('channel5 message');
      psock.close();
    });
  });

  it('topic prefix publish/subscribe works', done => {
    if (!server) return;

    // subscribe
    let ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('app-');
    let count = 0;
    ssock.on('message', data => {
      expect(data.toString()).toMatch(/^app\-/);
      if (++count == 2) {
        server && ssock.disconnect(server.xpubListener);
        done();
      }
    });

    // publish
    let psock = Zmq.socket('pub');
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
