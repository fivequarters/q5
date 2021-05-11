// ------------------
// Exported Functions
// ------------------

// Wait for promise1 to complete successfully before returning the value of promise2, or undefined if promise2
// was rejected.
export async function cancelOnError<T1, T2>(promise1: Promise<T1>, promise2: Promise<T2>): Promise<T2> {
  // Silence any exceptions coming from promise2 while waiting for promise1, otherwise they'll trip the
  // unhandled exception warnings.  Subsequent await's on promise2 after it rejects will return undefined.
  promise2.catch(() => {});

  // Make sure promise1 completes successfully.
  await promise1;
  return promise2;
}
