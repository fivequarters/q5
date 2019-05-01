import * as AWS from 'aws-sdk';
import Dotenv from 'dotenv';
import Jwt from 'jsonwebtoken';
import { Server } from 'ws';
import { AWSError } from 'aws-sdk';
import { createLogger } from 'bunyan';

Dotenv.config();

const dynamo = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
});

const wsPort = +(process.env.LOGS_WS_PORT as string) || 5002;
if (!process.env.DEPLOYMENT_KEY) {
  throw new Error('DEPLOYMENT_KEY environment variable must be set');
}
const logTableName = `${process.env.DEPLOYMENT_KEY}.log`;

export class PubSub {
  public ws?: Server;
  public logger: any = createLogger({ name: 'pubsub' });
  public maxActiveWsConnections: number = +(process.env.LOGS_WS_MAX_ACTIVE_CONNECTIONS as string) || 1000;

  constructor() {
    // do nothing
  }

  public start() {
    // Set up Websocket listener and pump messages to DynamoDB

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
        let now = Date.now();
        dynamo.putItem(
          {
            Item: {
              subscriptionBoundary: { S: `${token.subscriptionId}/${token.boundaryId}` },
              // Precision of timestamp field is 1/1000 of a millisecond, with the sub-millisecond part
              // randomized to ensure uniqueness of the hash/sort key.
              timestamp: { N: (now * 1000 + Math.floor(Math.random() * 999)).toString() },
              functionId: { S: token.functionId },
              entry: { S: message.toString() },
              // The TTL is merely 60 seconds from now
              ttl: { N: (Math.floor(now / 1000) + 60).toString() },
            },
            TableName: logTableName,
          },
          (e: AWSError) => {
            if (e && this.logger) {
              this.logger.warn({ topic, activeConnections, error: e.message }, 'error publishing logs to DynamoDB');
            }
          }
        );
      });
    });

    if (this.logger) {
      this.logger.info({ ports: { ws: wsPort } }, 'pubsub server started');
    }
  }

  public stop() {
    if (this.ws) {
      this.ws.close();
    }

    if (this.logger) {
      this.logger.info({ ports: { ws: wsPort } }, 'pubsub server stopped');
      this.logger.close();
    }

    this.ws = undefined;
  }
}
