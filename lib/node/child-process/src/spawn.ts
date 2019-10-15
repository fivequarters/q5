import childProcess from 'child_process';
import { Readable, Writable } from 'stream';

process.setMaxListeners(1000);

// ------------------
// Internal Constants
// ------------------

const emptyBuffer = Buffer.alloc(0);

// ------------------
// Exported Functions
// ------------------

export default function spawn(
  command: string,
  options: {
    cwd?: string;
    args?: string[];
    env?: {};
    stdin?: Readable;
    stdout?: Writable;
    stderr?: Writable;
    shell?: boolean;
  } = {}
): Promise<{
  code?: number;
  stdout: Buffer;
  stderr: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const spawnOptions: any = {
      cwd: options.cwd,
      env: options.env,
    };

    const stdio = {
      stderr: emptyBuffer,
      stdout: emptyBuffer,
    };

    if (options.shell) {
      spawnOptions.shell = true;
    }

    const child = childProcess.spawn(command, options.args || [], spawnOptions);
    if (options.stdin) {
      options.stdin.pipe(child.stdin);
    }
    process.on('beforeExit', () => {
      child.kill();
    });
    child.on('exit', code => {
      // Add a trivial delay to allow stdio to flush before resolving the promise
      setTimeout(() => {
        resolve({
          code: code || 0,
          stderr: stdio.stderr,
          stdout: stdio.stdout,
        });
      }, 100);
    });
    child.on('error', reject);
    child.stdout.on('data', chunk => {
      if (options.stdout) {
        options.stdout.write(chunk);
      } else {
        stdio.stdout = Buffer.concat([stdio.stdout, chunk as Buffer]);
      }
    });
    child.stderr.on('data', chunk => {
      if (options.stderr) {
        options.stderr.write(chunk);
      } else {
        stdio.stderr = Buffer.concat([stdio.stderr, chunk as Buffer]);
      }
    });
  });
}
