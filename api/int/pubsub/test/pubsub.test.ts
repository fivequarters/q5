import PubSub from '../src';
import Zmq from 'zeromq';

const server = new PubSub();

describe('pubsub', () => {
  beforeAll(() => {
    server.start();
  });

  afterAll(() => {
    server.stop();
  });

  it('server start and stop work', () => {
    expect(true);
  });

  it('publish works', done => {
    let psock = Zmq.socket('pub');
    psock.monitor(); // enables connect event
    psock.connect(server.xsubListener);
    psock.on('connect', () => {
      psock.send('channel5 message');
      psock.close();
      done();
    });
  });

  it('subscribe works', done => {
    let ssock = Zmq.socket('sub');
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
    let ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('channel5');
    ssock.on('message', data => {
      expect(data.toString()).toEqual('channel5 message');
      ssock.disconnect(server.xpubListener);
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
    // subscribe
    let ssock = Zmq.socket('sub');
    ssock.connect(server.xpubListener);
    ssock.subscribe('app-');
    let count = 0;
    ssock.on('message', data => {
      expect(data.toString()).toMatch(/^app\-/);
      if (++count == 2) {
        ssock.disconnect(server.xpubListener);
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
