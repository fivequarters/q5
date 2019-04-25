#!/usr/bin/env node

const spawn = require('child_process').spawn;
const Path = require('path');

function execute() {
  const processes = [
    [Path.join(__dirname, '../../api/int/pubsub/libc/index.js')],
    [Path.join(__dirname, '../../api/function-api/libc/index.js')],
  ];

  let children: any[] = [];

  processes.forEach(p => {
    let child = spawn('node', p, {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    children.push(child);
    child.on('close', onClose(p));
    child.on('error', onError(p));
  });

  process.on('SIGTERM', onSignalTerminate);
  process.on('SIGINT', onSignalTerminate);

  function onSignalTerminate(signal: any) {
    console.log(`Received ${signal}. Terminating.`);
    terminate(0);
  }

  function onClose(p: string[]) {
    // @ts-ignore
    return (code, signal) => {
      console.log(`Process ${p} exited with code ${code} and signal ${signal}.`);
      terminate(code);
    };
  }

  function onError(p: string[]) {
    // @ts-ignore
    return error => {
      console.log(`Process ${p} exited with error ${error.message || error}.`);
      terminate(13);
    };
  }

  function terminate(code: any) {
    children.forEach(c => {
      try {
        c.kill();
      } catch (_) {}
    });
    setTimeout(() => process.exit(code), 100);
  }
}

if (!module.parent) {
  execute();
}
