import { Writable } from 'stream';
import { spawn } from '../src';

describe('spawn()', () => {
  it('should spawn a child process', async () => {
    const actual = await spawn('pwd');
    expect(actual.stdout.toString().length).toBeGreaterThan(0);
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(0);
  });

  it('should spawn a child process with a cwd ', async () => {
    const actual = await spawn('pwd', { cwd: __dirname });
    expect(actual.stdout.toString()).toBe(`${__dirname}\n`);
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(0);
  });

  it('should spawn a child process with args', async () => {
    const actual = await spawn('node', { args: ['-e', 'console.log("hello")'] });
    expect(actual.stdout.toString()).toBe('hello\n');
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(0);
  });

  it('should write to stderr', async () => {
    const actual = await spawn('node', { args: ['-e', 'console.error("hello")'] });
    expect(actual.stdout.toString()).toBe('');
    expect(actual.stderr.toString()).toBe('hello\n');
    expect(actual.code).toBe(0);
  });

  it('should return exit codes', async () => {
    const actual = await spawn('node', { args: ['-e', 'process.exit(5)'] });
    expect(actual.stdout.toString()).toBe('');
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(5);
  });

  it('should write to the stdout stream option', async () => {
    const stream = new Writable();
    let stdout = '';
    stream._write = chunk => (stdout += chunk.toString());

    const actual = await spawn('node', { args: ['-e', 'console.log("hello")'], stdout: stream });
    expect(stdout).toBe('hello\n');
    expect(actual.stdout.toString()).toBe('');
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(0);
  });

  it('should write to stderr stream option', async () => {
    const stream = new Writable();
    let stderr = '';
    stream._write = chunk => (stderr += chunk.toString());

    const actual = await spawn('node', { args: ['-e', 'console.error("hello")'], stderr: stream });
    expect(stderr).toBe('hello\n');
    expect(actual.stdout.toString()).toBe('');
    expect(actual.stderr.toString()).toBe('');
    expect(actual.code).toBe(0);
  });
});
