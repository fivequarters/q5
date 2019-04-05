// ------------------
// Exported Functions
// ------------------

export function same<T>(array1: T[], array2: T[], areEqual?: (array1: T, array2: T) => boolean) {
  areEqual = areEqual || ((first: T, second: T) => first === second);
  if (array1.length !== array2.length) {
    return false;
  }

  array2 = array2.slice();

  for (let i = 0; i < array1.length; i++) {
    let match = false;
    for (let j = 0; j < array2.length; j++) {
      if (areEqual(array1[i], array2[j])) {
        match = true;
        array2.splice(j, 1);
        j = array2.length;
      }
    }
    if (!match) {
      return false;
    }
  }

  return true;
}
