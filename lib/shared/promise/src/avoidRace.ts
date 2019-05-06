// ------------------
// Exported Functions
// ------------------

export function avoidRace<T>(func: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined;
  return () => {
    if (!promise) {
      promise = func();
      promise.finally(() => promise === undefined);
    }
    return promise;
  };
}
