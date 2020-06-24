import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'http';

// --------------
// Internal Types
// --------------

type CodedError = {
  code?: string;
} & Error;

// --------------
// Exported Types
// --------------

export type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

// ----------------
// Exported Classes
// ----------------

export class Server {
  private server?: HttpServer;
  private requestListener: RequestListener;
  private port: number;
  private hostname: string;

  public constructor(requestListener: RequestListener, port: number, hostname: string = 'localhost') {
    this.requestListener = requestListener;
    this.port = port;
    this.hostname = hostname;
  }

  public async start() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return resolve();
      }
      this.server = createServer(this.requestListener);
      this.server.on('error', (error: CodedError) => {
        if (error.code === 'EADDRINUSE') {
          reject(error);
        }
      });
      this.server.listen(this.port, this.hostname, () => resolve());
    });
  }

  public async stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }
      this.server.close(() => {
        this.server = undefined;
        resolve();
      });
    });
  }
}
