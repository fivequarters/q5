beforeAll(() => {
  // server.start();
});

afterAll(() => {
  // server.stop();
});

describe('health', () => {
  it('is healthy', () => {
    expect(true);
  });

  // it('publish works', done => {
  //   const psock = Zmq.socket('pub');
  //   psock.monitor(); // enables connect event
  //   psock.connect(server.xsubListener);
  //   psock.on('connect', () => {
  //     psock.send('channel5 message');
  //     psock.close();
  //     done();
  //   });
  // });
});
