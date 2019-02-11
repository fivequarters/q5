// ------------------
// Internal Constants
// ------------------

const dummyListener = () => {
  // do nothing
};

// ----------------
// Internal Globals
// ----------------

let supportsPassive = false;

// ------------------
// On Module Imported
// ------------------

try {
  const options = Object.defineProperty({}, 'passive', {
    get() {
      supportsPassive = true;
    },
  });
  window.addEventListener('testPassive', dummyListener, options);
  window.removeEventListener('testPassive', dummyListener, options);
} catch (e) {
  // ignore
}

// ------------------
// Exported Functions
// ------------------

export function asPassive(options?: any): any {
  if (!options) {
    return supportsPassive ? { passive: true } : false;
  }
  if (supportsPassive) {
    options.passive = true;
  }
  return options;
}

export function setSupport(support: boolean) {
  supportsPassive = support;
}
