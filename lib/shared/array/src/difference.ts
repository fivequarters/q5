// ------------------
// Exported Functions
// ------------------

export function difference<T>(array1: T[], array2: T[], areEqual?: (target: T, search: T) => boolean) {
  areEqual = areEqual || ((first: T, second: T) => first === second);

  const difference = [];
  for (let i = 0; i < array1.length; i++) {
    let found = false;
    for (let j = 0; j < array2.length; j++) {
      if (areEqual(array1[i], array2[j])) {
        found = true;
        j = array2.length;
      }
    }
    if (!found) {
      difference.push(array1[i]);
    }
  }

  return difference;
}
