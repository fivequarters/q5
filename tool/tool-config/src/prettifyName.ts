// ------------------
// Internal Constants
// ------------------

const dashCharacters = '_-';

// ------------------
// Internal Functions
// ------------------

function getNameWithoutOrg(nameWithOrg: string) {
  const index = nameWithOrg.indexOf('/');
  return index >= 0 ? nameWithOrg.substring(index + 1) : nameWithOrg;
}

function isDash(character: string) {
  return dashCharacters.indexOf(character) >= 0;
}

// ------------------
// Exported Functions
// ------------------

export function prettifyName(nameWithOrg: string) {
  const name = getNameWithoutOrg(nameWithOrg);

  const characters = name.split('');
  characters[0] = characters[0].toUpperCase();
  for (let current = 1; current < characters.length; current++) {
    const previous = current - 1;
    if (isDash(characters[previous])) {
      characters[previous] = ' ';
      characters[current] = characters[current].toUpperCase();
    }
  }

  return characters.join('');
}
