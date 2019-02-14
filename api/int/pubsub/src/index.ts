import Dotenv from 'dotenv';
Dotenv.config();
import Zmq from 'zeromq';
import { Server } from 'ws';
import Jwt from 'jsonwebtoken';
import CreateLogger from '@5qtrs/logger';

const xpubPort = process.env.XPUBPORT || 5001;
const xsubPort = process.env.XSUBPORT || 5000;
const wsPort = +(<string>process.env.LOGS_WS_PORT) || 5002;

let Logger = CreateLogger({ name: 'pubsub' });

export default class PubSub {
  xpubListener = `tcp://127.0.0.1:${xpubPort}`;
  xsubListener = `tcp://127.0.0.1:${xsubPort}`;
  hwm = 1000;
  verbose = 0;
  xsubSock?: Zmq.Socket;
  xpubSock?: Zmq.Socket;
  ws?: Server;
  maxActiveWsConnections: number = +(<string>process.env.LOGS_WS_MAX_ACTIVE_CONNECTIONS) || 1000;

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
        // The channel name is the rest of the buffer
        Logger.info(
          { topic: data.slice(1).toString() },
          data[0] === 0 ? 'zmq topic unsubscribed' : 'zmq topic subscribed'
        );
        // We send it to subSock, so it knows to what channels to listen to
        this.xsubSock.send(data);
      }
    });

    // Set up Websocket listener and pump messages to ZeroMQ

    // TODO tjanczuk move to secure websockets (terminate at ELB?)
    this.ws = new Server({ port: wsPort });
    let activeConnections = 0;
    this.ws.on('connection', (socket, req) => {
      if (activeConnections >= this.maxActiveWsConnections) {
        return socket.terminate();
      }
      let match = (req.headers['authorization'] || '').match(/\s*Bearer\s+(.+)$/i);
      if (!match) {
        return socket.terminate();
      }
      let token: any;
      try {
        token = Jwt.verify(match[1], <string>process.env.LOGS_WS_TOKEN_SIGNATURE_KEY);
      } catch (e) {
        return socket.terminate();
      }
      if (!token.boundary || !token.name) {
        return socket.terminate();
      }
      let topic = `logs:application:${token.boundary}:${token.name}:`;
      activeConnections++;
      Logger.info({ topic, activeConnections }, 'websocket publisher connected');
      let timer = setTimeout(() => {
        socket.terminate();
      }, +(<string>process.env.LOGS_WS_MAX_CONNECTION_TIME) || 600000);

      socket.on('close', () => {
        activeConnections--;
        clearTimeout(timer);
        Logger.info({ topic, activeConnections }, 'websocket publisher disconnected');
      });

      socket.on('message', message => {
        // console.log('MESSAGE', message);
        if (this.xpubSock) {
          this.xpubSock.send(`${topic} ${message.toString()}`);
        }
      });
    });

    Logger.info({ ports: { xsub: xsubPort, xpub: xpubPort, ws: wsPort } }, 'pubsub server started');
  }

  stop() {
    if (!this.xsubSock) {
      throw new Error('Server is not started.');
    }

    if (this.xpubSock) {
      this.xpubSock.close();
    }
    this.xsubSock.close();
    if (this.ws) {
      this.ws.close();
    }
    this.ws = this.xpubSock = this.xsubSock = undefined;
    Logger.info({ ports: { xsub: xsubPort, xpub: xpubPort, ws: wsPort } }, 'pubsub server stopped');
  }
}

if (!module.parent) {
  new PubSub().start();
}
