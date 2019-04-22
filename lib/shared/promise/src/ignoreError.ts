// ------------------
// Exported Functions
// ------------------

export async function ignoreError<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {});
  return promise;
}
