import { LogLevelString, ZmqLogger } from '@5qtrs/zmq-logger';
import Dotenv from 'dotenv';
import Jwt from 'jsonwebtoken';
import { Server } from 'ws';
import Zmq from 'zeromq';
import { tsModuleBlock } from '@babel/types';

Dotenv.config();

const xpubPort = process.env.XPUBPORT || 5001;
const xsubPort = process.env.XSUBPORT || 5000;
const wsPort = +(process.env.LOGS_WS_PORT as string) || 5002;
const zmqPublishUrl = process.env.ZMQ_XSUB || '';
const zmqPublishLevel = (process.env.ZMQ_PUBLISH_LEVEL || 'info') as LogLevelString;

export class PubSub {
  public xpubListener = `tcp://127.0.0.1:${xpubPort}`;
  public xsubListener = `tcp://127.0.0.1:${xsubPort}`;
  public hwm = 1000;
  public verbose = 0;
  public xsubSock?: Zmq.Socket;
  public xpubSock?: Zmq.Socket;
  public ws?: Server;
  public logger?: ZmqLogger;
  public maxActiveWsConnections: number = +(process.env.LOGS_WS_MAX_ACTIVE_CONNECTIONS as string) || 1000;

  constructor() {
    // do nothing
  }

  public start() {
    if (this.xsubSock) {
      throw new Error('Server is already started');
    }
    this.logger = ZmqLogger.create({ zmqPublishUrl, zmqPublishLevel, name: 'pubsub' });

    // The xsub listener is where pubs connect to
    this.xsubSock = Zmq.socket('xsub');
    this.xsubSock.identity = `subscriber:${process.pid}`;
    this.xsubSock.bindSync(this.xsubListener);

    // The xpub listener is where subs connect to
    this.xpubSock = Zmq.socket('xpub');
    this.xpubSock.identity = `publisher-${process.pid}`;
    // @ts-ignore
    this.xpubSock.setsockopt(Zmq.ZMQ_SNDHWM, this.hwm);
    // By default xpub only signals new subscriptions
    // Settings it to verbose = 1 , will signal on every new subscribe
    // @ts-ignore
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
        if (this.logger) {
          this.logger.info(
            { topic: data.slice(1).toString() },
            data[0] === 0 ? 'zmq topic unsubscribed' : 'zmq topic subscribed'
          );
        }
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
      const match = (req.headers.authorization || '').match(/\s*Bearer\s+(.+)$/i);
      if (!match) {
        return socket.terminate();
      }
      let token: any;
      try {
        token = Jwt.verify(match[1], process.env.LOGS_WS_TOKEN_SIGNATURE_KEY as string);
      } catch (e) {
        return socket.terminate();
      }
      if (!token.subscriptionId || !token.boundaryId || !token.functionId) {
        return socket.terminate();
      }

      const topic = `logs:application:${token.subscriptionId}:${token.boundaryId}:${token.functionId}:`;

      activeConnections++;
      if (this.logger) {
        this.logger.info({ topic, activeConnections }, 'websocket publisher connected');
      }

      const timer = setTimeout(() => {
        socket.terminate();
      }, +(process.env.LOGS_WS_MAX_CONNECTION_TIME as string) || 600000);

      socket.on('close', () => {
        activeConnections--;
        clearTimeout(timer);
        if (this.logger) {
          this.logger.info({ topic, activeConnections }, 'websocket publisher disconnected');
        }
      });

      // TODO tjanczuk, add limit for the max volume of data a single connection can log
      socket.on('message', message => {
        if (this.xpubSock) {
          this.xpubSock.send(`${topic} ${message.toString()}`);
        }
      });
    });

    if (this.logger) {
      this.logger.info({ ports: { xsub: xsubPort, xpub: xpubPort, ws: wsPort } }, 'pubsub server started');
    }
  }

  public stop() {
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

    if (this.logger) {
      this.logger.info({ ports: { xsub: xsubPort, xpub: xpubPort, ws: wsPort } }, 'pubsub server stopped');
      this.logger.close();
    }

    this.ws = this.xpubSock = this.xsubSock = this.logger = undefined;
  }
}
