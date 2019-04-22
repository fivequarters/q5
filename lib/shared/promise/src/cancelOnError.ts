// ------------------
// Exported Functions
// ------------------

export async function cancelOnError<T1, T2>(promise1: Promise<T1>, promise2: Promise<T2>): Promise<T2> {
  promise2.catch(() => {});
  await promise1;
  return promise2;
}
