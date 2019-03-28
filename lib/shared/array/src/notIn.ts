// ------------------
// Exported Functions
// ------------------

export function notIn<T>(array1: T[], array2: T[], areEqual?: (target: T, search: T) => boolean) {
  areEqual = areEqual || ((first: T, second: T) => first === second);
  const notIn = [];
  for (let i = 0; i < array1.length; i++) {
    if (!areEqual(array1[i], array2[i])) {
      notIn.push(array1[i]);
    }
  }

  return notIn;
}
