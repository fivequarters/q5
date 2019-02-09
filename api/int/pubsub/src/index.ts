import Zmq from 'zeromq';
import Dotenv from 'dotenv';
Dotenv.config();

export default class PubSub {
  xpubListener = `tcp://127.0.0.1:${process.env.XPUBPORT || 5001}`;
  xsubListener = `tcp://127.0.0.1:${process.env.XSUBPORT || 5000}`;
  hwm = 1000;
  verbose = 0;
  xsubSock?: Zmq.Socket;
  xpubSock?: Zmq.Socket;

  constructor() {}

  start() {
    if (this.xsubSock) {
      throw new Error('Server is already started');
    }
    // The xsub listener is where pubs connect to
    this.xsubSock = Zmq.socket('xsub');
    this.xsubSock.identity = `subscriber:${process.pid}`;
    this.xsubSock.bindSync(this.xsubListener);

    // The xpub listener is where subs connect to
    this.xpubSock = Zmq.socket('xpub');
    this.xpubSock.identity = `publisher-${process.pid}`;
    //@ts-ignore
    this.xpubSock.setsockopt(Zmq.ZMQ_SNDHWM, this.hwm);
    // By default xpub only signals new subscriptions
    // Settings it to verbose = 1 , will signal on every new subscribe
    //@ts-ignore
    this.xpubSock.setsockopt(Zmq.ZMQ_XPUB_VERBOSE, this.verbose);
    this.xpubSock.bindSync(this.xpubListener);

    // When we receive data on xsub, it means someone is publishing
    this.xsubSock.on('message', (data: any) => {
      // We just relay it to the pubSock, so subscribers can receive it
      if (this.xpubSock) {
        this.xpubSock.send(data);
      }
    });

    // When xpub receives a message, it is a subscribe requests
    this.xpubSock.on('message', (data: any) => {
      if (this.xsubSock) {
        // The data is a slow Buffer
        // The first byte is the subscribe (1) /unsubscribe flag (0)
        let type = data[0] === 0 ? 'unsubscribe' : 'subscribe';
        // The channel name is the rest of the buffer
        let channel = data.slice(1).toString();
        console.log(`${type} ${channel}`);
        // We send it to subSock, so it knows to what channels to listen to
        this.xsubSock.send(data);
      }
    });
  }

  stop() {
    if (!this.xsubSock) {
      throw new Error('Server is not started.');
    }

    if (this.xpubSock) {
      this.xpubSock.close();
    }
    this.xsubSock.close();
    this.xpubSock = this.xsubSock = undefined;
  }
}

if (!module.parent) {
  new PubSub().start();
}
