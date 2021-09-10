const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

// CGI-on-a-shoestring:
// Read JSON from stdin, pass it as argument to the function exported by the `path` module,
// and return the resulting JSON as a message over IPC to the parent process. Then exit.
(async () => {
  try {
    const request = JSON.parse(await readStdin());
    const func = require(request.path);
    const body = await func(request.body);
    //@ts-ignore
    process.send({ ok: true, body });
  } catch (e) {
    //@ts-ignore
    process.send({ ok: false, error: e.stack || e.message || e || 'N/A' });
  }
})();
