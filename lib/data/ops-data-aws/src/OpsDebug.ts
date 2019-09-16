export async function debug(...args: any[]) {
  if (process.env.FUSEBIT_DEBUG === '1') {
    console.log.call(null, ...args);
  }
}
